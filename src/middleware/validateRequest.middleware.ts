import type { ZodSchema } from "zod";
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";

export const validateRequest = (
  schema: ZodSchema,
  source: "body" | "params" | "query",
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      throw new ApiError(400, "BAD_REQUEST", "Invalid body or parameters");
    }

    if (source === "query") {
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        configurable: true,
      });
    } else {
      req[source] = result.data;
    }

    next();
  };
};
