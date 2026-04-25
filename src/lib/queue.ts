import { Queue, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL!;
export const redisConnection = REDIS_URL as ConnectionOptions;
export const historyQueue = new Queue("history-sync", {
  connection: {
    url: REDIS_URL,
  },
});

export const redisCache = new IORedis(REDIS_URL);
