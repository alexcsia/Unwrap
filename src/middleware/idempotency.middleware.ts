import { IdempotencyRepository } from "@/idempotency-repository";
import type { Request, Response, NextFunction } from "express";

export const idempotencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!["POST", "PUT", "PATCH"].includes(req.method)) return next();

  const key = req.headers["idempotency-key"] as string;

  if (!key) {
    res.status(400).json({ error: "Missing idempotency-key header" });
    return;
  }

  try {
    const isLocked = await IdempotencyRepository.tryLock(key);

    if (!isLocked) {
      const record = await IdempotencyRepository.get(key);

      console.log("found existing record ", record);
      if (record?.status === "PENDING") {
        res.status(409).json({
          error: "Concurrent request in progress. Retry shortly.",
        });
        return;
      }

      if (record?.status === "SUCCESS") {
        console.log("cached success");
        res.status(record.statusCode!).json(record.body);
        return;
      }

      res
        .status(429)
        .json({ error: "Lock state conflict. Please retry your request." });
      return;
    }

    // 3. If we won the lock, intercept res.send/res.json to catch the final payload

    const originalJson = res.json;

    res.json = function (body: any): Response {
      if (res.statusCode >= 200 && res.statusCode <= 300) {
        IdempotencyRepository.saveSuccess(
          key,
          res.statusCode,
          body,
          86400,
        ).catch((err) => {
          console.error("Failed to cache idempotency payload", err);
        });
      } else {
        IdempotencyRepository.releaseLock(key).catch((err) => {
          console.error("Failed to release idempotency lock", err);
        });
      }

      return originalJson.call(this, body);
    };
    next();
  } catch (error) {
    console.error("Idempotency failure", error);
    next(error);
  }
};
