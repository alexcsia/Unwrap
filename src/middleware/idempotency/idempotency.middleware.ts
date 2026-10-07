import { ApiError } from "@/errors/ApiError";
import { IdempotencyRepository } from "@/middleware/idempotency/idempotencyRepository";
import type { Request, Response, NextFunction } from "express";

const KEY_REGEX = /^[a-zA-Z0-9\-_]{8,128}$/;

export const createIdempotencyMiddleware =
  (repo: typeof IdempotencyRepository = IdempotencyRepository) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === "development") return next();

    if (!["POST", "PUT", "PATCH"].includes(req.method)) return next();

    const key = req.headers["idempotency-key"] as string;

    if (!key)
      throw new ApiError(400, "BAD_REQUEST", "Missing idempotency-key header");

    if (!KEY_REGEX.test(key))
      throw new ApiError(400, "BAD_REQUEST", "Invalid idempotency-key format");

    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "UNAUTHENTICATED");

    const scopedKey = `${userId}:${key}`;
    try {
      const isLocked = await repo.tryLock(scopedKey);

      if (!isLocked) {
        const record = await repo.get(scopedKey);

        if (!record) {
          // if key disappeared between tryLock and get
          //fall through to normal handling below by force-locking
          await repo.forceLock(scopedKey);
        } else if (repo.isGhostLock(record)) {
          //  previous request crashed before saving a result
          // overwrite and let this request proceed

          const validLock = await repo.forceLock(
            scopedKey,
            record.attempts ?? 0,
          );
          if (!validLock) {
            throw new ApiError(
              500,
              "DEFAULT",
              "Request failed repeatedly. Please try again later",
            );
          }
        } else if (record?.status === "PENDING") {
          throw new ApiError(
            409,
            "CONFLICT",
            "Concurrent request in progress. Retry shortly.",
          );
        } else if (record?.status === "SUCCESS") {
          console.log("cached success");
          res.status(record.statusCode!).json(record.body);
          return;
        }
      }

      // intercept both res.json and res.send to capture the final response
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      let responseHandled = false;

      const handleOutcome = (body: any) => {
        // guard against double-invocation
        if (responseHandled) return;
        responseHandled = true;

        if (res.statusCode >= 200 && res.statusCode < 300) {
          repo
            .saveSuccess(scopedKey, res.statusCode, body, 86400)
            .catch((err) =>
              console.error(
                "[idempotency] Failed to cache success payload",
                err,
              ),
            );
        } else {
          //release lock so client can retry with same key
          repo
            .releaseLock(scopedKey)
            .catch((err) =>
              console.error(
                "[idempotency] Failed to release lock after failure",
                err,
              ),
            );
        }
      };

      res.json = function (body: any): Response {
        handleOutcome(body);
        return originalJson(body);
      };

      res.send = function (body: any): Response {
        handleOutcome(body);
        return originalSend(body);
      };

      next();
    } catch (error) {
      await repo.releaseLock(scopedKey).catch(() => {});
      console.error("[idempotency] System failure", error);
      next(error);
    }
  };
