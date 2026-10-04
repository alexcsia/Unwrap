import { Queue } from "bullmq";
import { redisConnection } from "./redis";

export const historyQueue = new Queue("history-ingestion", {
  connection: redisConnection,
});
export const deleteQueue = new Queue("delete-user", {
  connection: redisConnection,
});
export const pollQueue = new Queue("platform-poll", {
  connection: redisConnection,
});
