-- CreateTable
CREATE TABLE "ListeningHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "trackName" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "uploaded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListeningHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListeningHistory_userId_playedAt_idx" ON "ListeningHistory"("userId", "playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListeningHistory_userId_trackId_playedAt_trackName_artistNa_key" ON "ListeningHistory"("userId", "trackId", "playedAt", "trackName", "artistName", "albumName", "durationMs", "source");

-- CreateIndex
CREATE UNIQUE INDEX "User_spotifyId_key" ON "User"("spotifyId");
