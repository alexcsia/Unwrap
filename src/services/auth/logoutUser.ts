import { deleteRefreshToken } from "@/models/authSession.model";
import prisma from "@/utils/prisma.util";

export const logoutUser = async (userId: string) => {
  await deleteRefreshToken(prisma, userId);
};
