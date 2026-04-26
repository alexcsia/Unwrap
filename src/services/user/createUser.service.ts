import prisma from "@/utils/prisma.util";
import { ApiError } from "@/errors/ApiError";
import Big from "bcrypt";

/**
 * Service: createUserService
 *
 * Handles the registration of a new user by validating credentials and persisting hashed data.
 *
 * Flow:
 * - Checks the database for an existing user with the provided email to prevent duplicates.
 * - Salts and hashes the plain-text password using bcrypt for secure storage.
 * - Creates a new user record in the database with the hashed password and profile details.
 * - Selects and returns a sanitized user object, excluding sensitive fields like the password hash.
 *
 * Returns:
 * - A user object containing id, email, displayName, and createdAt timestamp.
 *
 * Errors:
 * - 409 if the email is already associated with an existing account.
 * - 500 (inherited) if hashing fails or database constraints are violated.
 */

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
