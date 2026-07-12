import { Queue } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL!;

const baseConfig = {
  connectTimeout: 5000, // fail if can't connect within 5s
  lazyConnect: true,
  retryStrategy: (times: number) => {
    if (times > 5) return null; // stop retrying after 5 attempts
    return Math.min(times * 200, 2000); // exponential backoff up to 2s
  },
};

export const redisConnection = new IORedis(REDIS_URL, {
  ...baseConfig,
  maxRetriesPerRequest: null,
});

export const historyQueue = new Queue("history-sync", {
  connection: redisConnection,
});

export const deleteQueue = new Queue("delete-user", {
  connection: redisConnection,
});

export const redisCache = new IORedis(REDIS_URL, {
  ...baseConfig,
  commandTimeout: 3000,
});
