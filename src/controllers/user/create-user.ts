import type { Request, Response, NextFunction } from "express";
import { createUserService } from "@/services/user/createUser.service";
import { ApiError } from "@/errors/ApiError";

export const createUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, displayName, password } = req.body;

    if (!email || !password || !displayName) {
      throw new ApiError(
        400,
        "BAD_REQUEST",
        "Email, displayName, and password are required.",
      );
    }

    const newUser = await createUserService({
      email,
      displayName,
      password,
    });

    res.status(201).json({
      success: true,
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
};
