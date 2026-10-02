import { Worker, Job } from "bullmq";
import type { DeleteUserJobData } from "../types";
import { redisConnection } from "@/lib/redis";
import { deleteUserData } from "./deleteUserData";

const BATCH_SIZE = 5000;

export const deleteUserWorker = new Worker<DeleteUserJobData>(
  "delete-user",
  async (job: Job<DeleteUserJobData>) => {
    console.log("In worker.");
    const { userId } = job.data;

    await deleteUserData(userId, BATCH_SIZE, (deleted) => {
      console.log(`Deleted ${deleted} rows for  ${userId}`);
    });
  },
  {
    connection: redisConnection,
  },
);

deleteUserWorker.on("completed", (job) =>
  console.log(`[Poller] Job ${job.id} completed`),
);
deleteUserWorker.on("failed", (job, err) =>
  console.error(`[Poller] Job ${job?.id} failed: ${err.message}`),
);
deleteUserWorker.on("error", (err) =>
  console.error(`[Poller] Connection error:`, err),
);
