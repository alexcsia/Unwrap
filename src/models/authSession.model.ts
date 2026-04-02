import { Prisma } from "@prisma/client";

export const saveRefreshToken = async (
  client: Prisma.TransactionClient,
  userId: string,
  refreshTokenHash: string,
) => {
  return await client.internalAuthSessions.create({
    data: {
      userId: userId,
      RefreshToken: refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });
};

export const deleteRefreshToken = async (
  client: Prisma.TransactionClient,
  userId: string,
) => {
  await client.internalAuthSessions.delete({
    where: { userId: userId },
  });
};
