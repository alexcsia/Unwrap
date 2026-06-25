import prisma from "@/utils/prisma.util";
import { deleteQueue } from "@/lib/queue";

export const deleteUserService = async (userId: string) => {
  //batch delete listening history in a queue
  //so that the huge cascade of user on the listening history doesnt lock the db
  /*Soft delete the user immediately and create a job for batch deletion of listenig history
   */
  console.log("In service");
  await softDeleteUser(userId);
  await deleteConnectedPlatforms(userId);
  await deleteInternalAuthSessions(userId);
  await queueDeletionJob(userId);
};

export const queueDeletionJob = async (userId: string) => {
  //load only userid to the queue and let worker fetch and delete
  console.log("Creating job");

  const createdJob = deleteQueue.add(
    "delete-user",
    { userId: userId },
    {
      removeOnComplete: true,
      removeOnFail: { count: 1000 },
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    },
  );
};

export const softDeleteUser = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: "undefined",
      displayName: "undefined",
      passwordHash: "undefined",
    },
  });
  console.log("Soft deleted user");
};

export const deleteConnectedPlatforms = async (userId: string) => {
  await prisma.connectedPlatforms.deleteMany({
    where: { id: userId },
  });
};

export const deleteInternalAuthSessions = async (userId: string) => {
  await prisma.internalAuthSessions.deleteMany({
    where: { id: userId },
  });
};
