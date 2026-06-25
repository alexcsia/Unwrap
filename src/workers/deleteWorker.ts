import { Worker, Job } from "bullmq";
import type { DeleteUserJobData } from "./types";
import prisma from "@/utils/prisma.util";
import { redisConnection } from "@/lib/queue";

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

export const deleteUserData = async (
  userId: string,
  BATCH_SIZE: number,
  onBatch?: (deleted: number) => void,
) => {
  let continueDeleting = true;
  let totalDeleted = 0;

  while (continueDeleting) {
    const affectedRows = Number(
      await prisma.$executeRaw`
        DELETE FROM "ListeningHistory"
        WHERE id IN (
            SELECT id from "ListeningHistory"
            WHERE "userId" = ${userId}
            LIMIT ${BATCH_SIZE}

        )
        `,
    );

    onBatch?.(affectedRows);

    totalDeleted += affectedRows;

    // console.log(`deleted ${BATCH_SIZE} rows for ${userId}`);

    if (affectedRows <= 0) {
      continueDeleting = false;
      console.log("Deleted:", totalDeleted, "rows");
    }
  }

  return totalDeleted;
};
