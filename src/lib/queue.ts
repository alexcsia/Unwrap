import { Queue } from "bullmq";
import IORedis from "ioredis";

export const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
};

export const historyQueue = new Queue("history-sync", {
  connection: redisConnection,
});

export const redisCache = new IORedis(redisConnection);
