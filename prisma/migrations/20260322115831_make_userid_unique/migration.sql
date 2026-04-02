/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `InternalAuthSessions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[RefreshToken]` on the table `InternalAuthSessions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "InternalAuthSessions_userId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "InternalAuthSessions_userId_key" ON "InternalAuthSessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalAuthSessions_RefreshToken_key" ON "InternalAuthSessions"("RefreshToken");

-- CreateIndex
CREATE INDEX "InternalAuthSessions_userId_expiresAt_idx" ON "InternalAuthSessions"("userId", "expiresAt");
