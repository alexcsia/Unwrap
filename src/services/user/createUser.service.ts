import prisma from "@/utils/prisma.util";
import { ApiError } from "@/errors/ApiError";
import Big from "bcrypt";

export const createUserService = async (data: {
  email: string;
  displayName: string;
  password: string;
}) => {
  const { email, displayName, password } = data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(
      409,
      "CONFLICT",
      "A user with this email already exists.",
    );
  }

  const saltRounds = 10;
  const passwordHash = await Big.hash(password, saltRounds);

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
