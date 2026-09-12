import { Worker, Job } from "bullmq";
import type { DeleteUserJobData } from "../types";
import { redisConnection } from "@/lib/queue";
import { deleteUserData } from "./deleteUserData";

const BATCH_SIZE = 5000;

const worker = new Worker<DeleteUserJobData>(
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
