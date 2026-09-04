import type { SpotifyListeningHistoryDTO } from "@/services/listening-history/platforms/spotify/types";
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
