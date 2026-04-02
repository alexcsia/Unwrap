-- CreateTable
CREATE TABLE "ListeningHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platformName" TEXT NOT NULL,
    "platformTrackId" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "trackName" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListeningHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalAuthSessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "RefreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalAuthSessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedPlatforms" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platformName" TEXT NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "AccessToken" TEXT NOT NULL,
    "RefreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectedPlatforms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListeningHistory_userId_playedAt_idx" ON "ListeningHistory"("userId", "playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListeningHistory_userId_platformTrackId_playedAt_key" ON "ListeningHistory"("userId", "platformTrackId", "playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedPlatforms_userId_platformName_key" ON "ConnectedPlatforms"("userId", "platformName");

-- AddForeignKey
ALTER TABLE "ListeningHistory" ADD CONSTRAINT "ListeningHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalAuthSessions" ADD CONSTRAINT "InternalAuthSessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedPlatforms" ADD CONSTRAINT "ConnectedPlatforms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
