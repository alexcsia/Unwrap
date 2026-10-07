import type { SpotifyListeningHistoryDTO } from "@/platforms/spotify/types";
import prisma from "@/utils/prisma.util";
import type { ListeningHistory } from "@prisma/client";

export const saveListeningHistory = async (
  listeningHistory: SpotifyListeningHistoryDTO,
  trackId: string,
  userId: string,
): Promise<ListeningHistory> => {
  try {
    const entry = await prisma.listeningHistory.create({
      data: {
        userId: userId,
        platformName: listeningHistory.platformName,
        trackId: trackId,
        playedAt: listeningHistory.playedAt,
        source: listeningHistory.source,
        uploadedAt: listeningHistory.uploadedAt,
      },
    });

    return entry;
  } catch (error: any) {
    if (error.code === "P2002") {
      return saveListeningHistory(listeningHistory, trackId, userId);
    }
    throw error;
  }
};

export const getListeningHistoryForPeriod = (
  userId: string,
  start: Date,
  end: Date,
) =>
  prisma.listeningHistory.findMany({
    where: {
      userId,
      playedAt: { gte: start, lt: end },
    },
    select: {
      track: { select: { durationMs: true } },
    },
  });
