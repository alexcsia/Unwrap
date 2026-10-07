import { deleteUserService } from "@/services/user/deleteUser.service";
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";

// when a user is deleted:
// delete their history
// delete tokens for streaming platforms
// delete internal tokens

export const deleteUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "User session not found or expired",
    );
  }

  await deleteUserService(userId);

  res.status(200).json({ message: "Successfully deleted user" });
};
