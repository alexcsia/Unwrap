import prisma from "@/utils/prisma.util";

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

    if (affectedRows <= 0) {
      continueDeleting = false;
      console.log("Deleted:", totalDeleted, "rows");
    }
  }

  return totalDeleted;
};
