/*
  Warnings:

  - You are about to drop the column `artistName` on the `ListeningHistory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ListeningHistory" DROP COLUMN "artistName";

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platformId" TEXT,
    "imageUrl" TEXT,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TrackArtists" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TrackArtists_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Artist_name_key" ON "Artist"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_platformId_key" ON "Artist"("platformId");

-- CreateIndex
CREATE INDEX "Artist_name_idx" ON "Artist"("name");

-- CreateIndex
CREATE INDEX "_TrackArtists_B_index" ON "_TrackArtists"("B");

-- AddForeignKey
ALTER TABLE "_TrackArtists" ADD CONSTRAINT "_TrackArtists_A_fkey" FOREIGN KEY ("A") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrackArtists" ADD CONSTRAINT "_TrackArtists_B_fkey" FOREIGN KEY ("B") REFERENCES "ListeningHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
