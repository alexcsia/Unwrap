import { deleteRefreshToken } from "@/models/authSession.model";
import prisma from "@/utils/prisma.util";

/**
 * Service: logoutUser
 *
 * Logs out a user by invalidating stored refresh tokens.
 *
 * Flow:
 * - Deletes refresh token session from database
 *
 * Effect:
 * - Prevents further token refresh for the user
 */

export const logoutUser = async (userId: string) => {
  await deleteRefreshToken(prisma, userId);
};
