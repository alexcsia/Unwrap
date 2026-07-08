import { redisCache } from "./lib/queue";

export interface CachedResponse {
  status: "PENDING" | "SUCCESS" | "FAILED";
  lockedAt?: number;
  attempts?: number;
  statusCode?: number;
  body?: any;
}

const GHOST_LOCK_THRESHOLD_MS = 120_000;
const MAX_ATTEMPTS = 3;

export const IdempotencyRepository = {
  tryLock: async (key: string, ttlSeconds = 86400): Promise<boolean> => {
    console.log("trying to lock for req ");

    const value: CachedResponse = {
      status: "PENDING",
      lockedAt: Date.now(),
    };

    const result = await redisCache.set(
      `idempotency:${key}`,
      JSON.stringify(value),
      "EX",
      ttlSeconds,
      "NX",
    );

    return result === "OK";
  },

  // overwrite a key to recover from ghost PENDING locks (ex:on redis failure)
  forceLock: async (
    key: string,
    ttlSeconds = 86400,
    currentAttempts = 0,
  ): Promise<boolean> => {
    const attempts = currentAttempts + 1;

    if (currentAttempts > MAX_ATTEMPTS) {
      return false;
    }

    const value: CachedResponse = {
      status: "PENDING",
      lockedAt: Date.now(),
      attempts,
    };

    await redisCache.set(
      `idempotency:${key}`,
      JSON.stringify(value),
      "EX",
      ttlSeconds,
    );
    return true;
  },

  get: async (key: string): Promise<CachedResponse | null> => {
    console.log("Checking if key exists in cache ");

    const data = await redisCache.get(`idempotency:${key}`);
    return data ? JSON.parse(data) : null;
  },

  isGhostLock: (record: CachedResponse): boolean => {
    if (record.status !== "PENDING") return false;
    if (!record.lockedAt) return true;
    return Date.now() - record.lockedAt > GHOST_LOCK_THRESHOLD_MS;
  },

  saveSuccess: async (
    key: string,
    statusCode: number,
    body: any,
    ttlSeconds: 86400,
  ) => {
    console.log("Cache successful request ");
    const value: CachedResponse = {
      status: "SUCCESS",
      statusCode,
      body,
    };

    await redisCache.set(
      `idempotency:${key}`,
      JSON.stringify(value),
      "EX",
      ttlSeconds,
    );
  },

  releaseLock: async (key: string) => {
    console.log("releasing lock");
    await redisCache.del(`idempotency:${key}`);
  },
};
