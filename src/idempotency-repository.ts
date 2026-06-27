import { redis } from "bun";
import { redisCache } from "./lib/queue";

export interface CachedResponse {
  status: "PENDING" | "SUCCESS";
  statusCode?: number;
  body?: any;
}

export const IdempotencyRepository = {
  tryLock: async (key: string, ttlSeconds = 86400): Promise<boolean> => {
    console.log("trying to lock for req ");

    const value: CachedResponse = {
      status: "PENDING",
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

  get: async (key: string): Promise<CachedResponse | null> => {
    console.log("Checking if key exists in cache ");

    const data = await redisCache.get(`idempotency:${key}`);
    return data ? JSON.parse(data) : null;
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
