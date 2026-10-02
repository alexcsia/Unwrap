import { Queue } from "bullmq";
import IORedis, { type RedisOptions } from "ioredis";

const REDIS_URL = process.env.REDIS_URL!;

const baseOptions: RedisOptions = {
  family: 4,
  connectTimeout: 5000,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 200, 2000),
};

export const redisConnection = new IORedis(REDIS_URL, baseOptions);

export const redisCache = new IORedis(REDIS_URL, {
  family: 4,
  connectTimeout: 5000,
  commandTimeout: 3000,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
});

redisConnection.on("error", (e) => console.error("[redis:bullmq]", e.message));
redisConnection.on("ready", () => console.log("[redis:bullmq] ready"));
redisCache.on("error", (e) => console.error("[redis:cache]", e.message));
redisCache.on("ready", () => console.log("[redis:cache] ready"));

export const historyQueue = new Queue("history-ingestion", {
  connection: redisConnection,
});
export const deleteQueue = new Queue("delete-user", {
  connection: redisConnection,
});
export const pollQueue = new Queue("platform-poll", {
  connection: redisConnection,
});
