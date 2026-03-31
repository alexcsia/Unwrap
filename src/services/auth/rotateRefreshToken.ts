import { bcryptHash, generateTokens } from "./helpers";
import { ApiError } from "@/errors/ApiError";
import prisma from "@/utils/prisma.util";
import { Prisma, type InternalAuthSessions } from "@prisma/client";

import { saveRefreshToken } from "@/models/authSession.model";
import bcrypt from "bcrypt";

export const rotateRefreshToken = async (oldToken: string) => {
  const { sessionId, rawToken } = parseRefreshToken(oldToken);

  return prisma.$transaction(async (tx) => {
    const session = await getValidSession(tx, sessionId);

    await verifyRefreshToken(tx, rawToken, session);

    const tokens = await issueNewTokens(tx, session.userId);

    await deleteOldSession(tx, session.id);

    return tokens;
  });
};

const parseRefreshToken = (token: string) => {
  const parts = token.split(".");

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new ApiError(400, "BAD_REQUEST", "Invalid token format");
  }

  return { sessionId: parts[0], rawToken: parts[1] };
};

const getValidSession = async (
  tx: Prisma.TransactionClient,
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
  tx: Prisma.TransactionClient,
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
  const { accessToken, refreshToken: newRawToken } =
    await generateTokens(userId);

  const hashedRefreshToken = await bcryptHash(newRawToken);

  const newSession = await saveRefreshToken(tx, userId, hashedRefreshToken);

  return {
    accessToken,
    refreshToken: `${newSession.id}.${newRawToken}`,
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
