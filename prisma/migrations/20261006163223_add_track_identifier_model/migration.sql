/*
  Warnings:

  - You are about to drop the column `isrc` on the `Track` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "IdentifierType" AS ENUM ('ISRC', 'MBID');

-- DropIndex
DROP INDEX "Track_isrc_key";

-- AlterTable
ALTER TABLE "Track" DROP COLUMN "isrc";

-- CreateTable
CREATE TABLE "TrackIdentifier" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "type" "IdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackIdentifier_value_idx" ON "TrackIdentifier"("value");

-- CreateIndex
CREATE INDEX "TrackIdentifier_trackId_type_idx" ON "TrackIdentifier"("trackId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "TrackIdentifier_type_value_key" ON "TrackIdentifier"("type", "value");

-- AddForeignKey
ALTER TABLE "TrackIdentifier" ADD CONSTRAINT "TrackIdentifier_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
