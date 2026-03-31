/*
  Warnings:

  - A unique constraint covering the columns `[userId,platformName,platformUserId]` on the table `ConnectedPlatforms` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "ConnectedPlatforms_userId_platformName_key";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedPlatforms_userId_platformName_platformUserId_key" ON "ConnectedPlatforms"("userId", "platformName", "platformUserId");

-- CreateIndex
CREATE INDEX "InternalAuthSessions_userId_idx" ON "InternalAuthSessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
