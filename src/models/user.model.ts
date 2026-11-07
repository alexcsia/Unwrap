import prisma from "@/utils/prisma.util";

export const findUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: { email: email },
  });
};

export const createUser = async (
  email: string,
  displayName: string,
  passwordHash: string,
) => {
  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      createdAt: true,
    },
  });

  return user;
};
