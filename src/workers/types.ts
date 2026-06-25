import { Prisma } from "@prisma/client";

export interface HistorySyncJobData {
  userId: string;
  entry: Prisma.ListeningHistoryCreateInput;
}

export interface DeleteUserJobData {
  userId: string;
}
