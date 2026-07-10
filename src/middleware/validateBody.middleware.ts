import type { ZodSchema } from "zod";
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ApiError(400, "BAD_REQUEST", `Invalid request body ${result}`);
    }
    req.body = result.data;
    next();
  };
};
