/*
  Warnings:

  - You are about to drop the column `platformId` on the `Artist` table. All the data in the column will be lost.
  - You are about to drop the column `albumName` on the `ListeningHistory` table. All the data in the column will be lost.
  - You are about to drop the column `durationMs` on the `ListeningHistory` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `ListeningHistory` table. All the data in the column will be lost.
  - You are about to drop the column `platformTrackId` on the `ListeningHistory` table. All the data in the column will be lost.
  - You are about to drop the column `trackName` on the `ListeningHistory` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,trackId,playedAt]` on the table `ListeningHistory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `trackId` to the `ListeningHistory` table without a default value. This is not possible if the table is not empty.

*/

-- DropForeignKey
ALTER TABLE "_TrackArtists" DROP CONSTRAINT "_TrackArtists_B_fkey";

-- DropIndex
DROP INDEX "Artist_name_idx";

-- DropIndex
DROP INDEX "Artist_platformId_key";

-- DropIndex
DROP INDEX "ListeningHistory_userId_platformTrackId_playedAt_key";

-- AlterTable
ALTER TABLE "Artist" DROP COLUMN "platformId";

-- AlterTable
ALTER TABLE "ListeningHistory" DROP COLUMN "albumName",
DROP COLUMN "durationMs",
DROP COLUMN "metadata",
DROP COLUMN "platformTrackId",
DROP COLUMN "trackName",
ADD COLUMN     "trackId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "PlatformTrack" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "platformName" TEXT NOT NULL,
    "platformTrackId" TEXT NOT NULL,

    CONSTRAINT "PlatformTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "trackName" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "metadata" JSONB,
    "isrc" TEXT,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformArtist" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "platformName" TEXT NOT NULL,
    "platformArtistId" TEXT NOT NULL,

    CONSTRAINT "PlatformArtist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformTrack_platformName_platformTrackId_key" ON "PlatformTrack"("platformName", "platformTrackId");

-- CreateIndex
CREATE UNIQUE INDEX "Track_isrc_key" ON "Track"("isrc");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformArtist_platformArtistId_platformName_key" ON "PlatformArtist"("platformArtistId", "platformName");

-- CreateIndex
CREATE UNIQUE INDEX "ListeningHistory_userId_trackId_playedAt_key" ON "ListeningHistory"("userId", "trackId", "playedAt");

-- AddForeignKey
ALTER TABLE "PlatformTrack" ADD CONSTRAINT "PlatformTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningHistory" ADD CONSTRAINT "ListeningHistory_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformArtist" ADD CONSTRAINT "PlatformArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrackArtists" ADD CONSTRAINT "_TrackArtists_B_fkey" FOREIGN KEY ("B") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
