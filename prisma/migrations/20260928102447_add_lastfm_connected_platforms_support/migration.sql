/*
  Warnings:

  - You are about to drop the column `AccessToken` on the `ConnectedPlatforms` table. All the data in the column will be lost.
  - You are about to drop the column `RefreshToken` on the `ConnectedPlatforms` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ConnectedPlatforms" DROP COLUMN "AccessToken",
DROP COLUMN "RefreshToken",
ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "platformUsername" TEXT,
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "sessionKey" TEXT,
ALTER COLUMN "platformUserId" DROP NOT NULL,
ALTER COLUMN "expiresAt" DROP NOT NULL;
