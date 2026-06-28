import { Queue } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL!;

console.log("REDIS URL", REDIS_URL);
export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const historyQueue = new Queue("history-sync", {
  connection: redisConnection,
});

export const deleteQueue = new Queue("delete-user", {
  connection: redisConnection,
});

export const redisCache = new IORedis(REDIS_URL);
