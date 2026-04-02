/*
  Warnings:

  - A unique constraint covering the columns `[userId,platformName]` on the table `ConnectedPlatforms` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ConnectedPlatforms_userId_platformName_platformUserId_key";

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedPlatforms_userId_platformName_key" ON "ConnectedPlatforms"("userId", "platformName");
