import { redisCache } from "../../lib/redis";

export interface CachedResponse {
  status: "PENDING" | "SUCCESS" | "FAILED";
  lockedAt?: number;
  attempts?: number;
  statusCode?: number;
  body?: any;
}

const GHOST_LOCK_THRESHOLD_MS = 120_000;
const MAX_ATTEMPTS = 3;

export const createIdempotencyRepository = (cache: typeof redisCache) => ({
  tryLock: async (key: string, ttlSeconds = 86400): Promise<boolean> => {
    console.log("trying to lock for req");

    const value: CachedResponse = {
      status: "PENDING",
      lockedAt: Date.now(),
    };

    const result = await cache.set(
      `idempotency:${key}`,
      JSON.stringify(value),
      "EX",
      ttlSeconds,
      "NX",
    );

    return result === "OK";
  },

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

    await cache.set(
      `idempotency:${key}`,
      JSON.stringify(value),
      "EX",
      ttlSeconds,
    );

    return true;
  },

  get: async (key: string): Promise<CachedResponse | null> => {
    console.log("Checking if key exists in cache");

    const data = await cache.get(`idempotency:${key}`);

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
    ttlSeconds = 86400,
  ) => {
    console.log("Cache successful request");

    const value: CachedResponse = {
      status: "SUCCESS",
      statusCode,
      body,
    };

    await cache.set(
      `idempotency:${key}`,
      JSON.stringify(value),
      "EX",
      ttlSeconds,
    );
  },

  releaseLock: async (key: string) => {
    console.log("releasing lock");

    await cache.del(`idempotency:${key}`);
  },
});

export const IdempotencyRepository = createIdempotencyRepository(redisCache);
