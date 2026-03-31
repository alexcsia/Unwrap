import { PrismaClient } from "@prisma/client";

//TODO: move this line elsewhere
const prisma = new PrismaClient();

export const saveListeningHistory = async (
  userId: string,
  platformTrackId: string,
  playedAt: Date,
  trackName: string,
  artistName: string,
  albumName: string,
  durationMs: number,
  source: string = "manual_upload",
  metadata: Record<string, any> = {},
) => {
  try {
    return await prisma.listeningHistory.create({
      data: {
        userId,
        platformTrackId,
        platformName: "spotify",
        playedAt,
        trackName,
        artistName,
        albumName,
        durationMs,
        source,
        metadata,
      },
    });
  } catch (error: any | unknown) {
    if (error.code === "P2002") {
      console.warn("Duplicate entry for trackId:", platformTrackId);
      return null;
    }
    throw error;
  }
};
