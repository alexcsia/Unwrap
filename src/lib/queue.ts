import { Queue, type ConnectionOptions } from "bullmq";
import IORedis, { type RedisOptions } from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

export const redisConnection = (
  REDIS_URL
    ? REDIS_URL
    : {
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT) || 6379,
      }
) as ConnectionOptions;

export const historyQueue = new Queue("history-sync", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
  },
});

export const redisCache = REDIS_URL
  ? new IORedis(REDIS_URL, { maxRetriesPerRequest: null })
  : new IORedis(redisConnection as RedisOptions);
