-- CreateTable
CREATE TABLE "Exclusion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "artistName" TEXT,
    "albumName" TEXT,
    "excludedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exclusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exclusion_userId_idx" ON "Exclusion"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Exclusion_userId_type_targetId_key" ON "Exclusion"("userId", "type", "targetId");

-- AddForeignKey
ALTER TABLE "Exclusion" ADD CONSTRAINT "Exclusion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
