-- CreateTable
CREATE TABLE "ArtistIdentifier" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "type" "IdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtistIdentifier_value_idx" ON "ArtistIdentifier"("value");

-- CreateIndex
CREATE INDEX "ArtistIdentifier_artistId_type_idx" ON "ArtistIdentifier"("artistId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistIdentifier_type_value_key" ON "ArtistIdentifier"("type", "value");

-- AddForeignKey
ALTER TABLE "ArtistIdentifier" ADD CONSTRAINT "ArtistIdentifier_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
