import type { ZodSchema } from "zod";
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";

export const validateRequest = (
  schema: ZodSchema,
  source: "body" | "params",
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      throw new ApiError(400, "BAD_REQUEST", "Invalid body or parameters");
    }

    req[source] = result.data;

    next();
  };
};
