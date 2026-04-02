import { ApiError } from "@/errors/ApiError";
import { comparePasswords, generateTokens } from "./helpers";
import { findUserByEmail } from "@/models/user.model";
import { saveRefreshToken } from "@/models/authSession.model";
import prisma from "@/utils/prisma.util";

export const authenticateUser = async (
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> => {
  const user = await findUserByEmail(email);
  if (!user)
    throw new ApiError(401, "UNAUTHENTICATED", `User email ${email} not found`);
  const passwordMatch = await comparePasswords(password, user.passwordHash);

  if (!passwordMatch)
    throw new ApiError(
      401,
      "UNAUTHENTICATED",
      "Password and email do not match",
    );

  const authTokens = await generateTokens(user.id);

  await saveRefreshToken(prisma, user.id, authTokens.refreshToken);

  return authTokens;
};
