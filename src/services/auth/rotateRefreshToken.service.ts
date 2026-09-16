import { bcryptHash, generateTokens } from "./helpers";
import { ApiError } from "@/errors/ApiError";
import prisma from "@/utils/prisma.util";
import { Prisma, type InternalAuthSessions } from "@prisma/client";
import { saveRefreshToken } from "@/models/authSession.model";
import bcrypt from "bcrypt";

/**
 * Service: rotateRefreshToken
 *
 * Rotates JWT refresh tokens and issues new access credentials.
 *
 * Flow:
 * - Parses refresh token into sessionId and raw token
 * - Validates session existence and expiry
 * - Verifies hashed refresh token against stored value
 * - Deletes old session
 * - Creates new session and tokens inside a DB transaction
 *
 * Returns:
 * - new accessToken
 * - new refreshToken (sessionId + raw token)
 *
 * Security:
 * - Invalid or expired sessions are removed
 * - Token mismatch invalidates all user sessions
 */

export const rotateRefreshToken = async (oldToken: string) => {
  const { sessionId, rawToken } = parseRefreshToken(oldToken);
  const session = await getValidSession(prisma, sessionId);
  await verifyRefreshToken(prisma, rawToken, session);

  return prisma.$transaction(async (tx) => {
    const tokens = await issueNewTokens(tx, session.userId);

    await deleteOldSession(tx, session.id);

    return tokens;
  });
};

const parseRefreshToken = (token: string) => {
  const cleanToken = token.trim();
  const parts = cleanToken.split(".");

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new ApiError(400, "BAD_REQUEST", "Invalid token format");
  }

  return { sessionId: parts[0], rawToken: parts[1] };
};

const getValidSession = async (
  tx: Prisma.TransactionClient | typeof prisma,
  sessionId: string,
) => {
  const session = await tx.internalAuthSessions.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await tx.internalAuthSessions.delete({ where: { id: session.id } });
    }
    throw new ApiError(401, "UNAUTHENTICATED", "Session expired.");
  }

  return session;
};

const verifyRefreshToken = async (
  tx: Prisma.TransactionClient | typeof prisma,
  rawToken: string,
  session: InternalAuthSessions,
) => {
  const isMatch = await bcrypt.compare(rawToken, session.RefreshToken);

  if (!isMatch) {
    await tx.internalAuthSessions.deleteMany({
      where: { userId: session.userId },
    });
    throw new ApiError(401, "UNAUTHENTICATED", "Invalid token.");
  }
};

const issueNewTokens = async (tx: Prisma.TransactionClient, userId: string) => {
  const { accessToken, refreshToken } = await generateTokens(userId);

  const hashedRefreshToken = await bcryptHash(refreshToken);

  const newSession = await saveRefreshToken(tx, userId, hashedRefreshToken);

  return {
    accessToken,
    refreshToken: `${newSession.id}.${refreshToken}`,
  };
};

const deleteOldSession = async (
  tx: Prisma.TransactionClient,
  sessionId: string,
) => {
  await tx.internalAuthSessions.delete({
    where: { id: sessionId },
  });
};
