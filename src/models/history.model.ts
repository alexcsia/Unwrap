import prisma from "@/utils/prisma.util";
import { z } from "zod";
import { listeningHistorySchema } from "@/services/listening-history/platforms/spotify/validators";

type ListeningHistoryDTO = z.infer<typeof listeningHistorySchema>;
export const saveListeningHistory = async (data: ListeningHistoryDTO) => {
  try {
    const entry = await prisma.listeningHistory.create({
      data: {
        user: {
          connect: { id: data.userId },
        },
        platformTrackId: data.platformTrackId,
        platformName: data.platformName,
        trackName: data.trackName,
        albumName: data.albumName,
        durationMs: data.durationMs,
        playedAt: new Date(data.playedAt),
        source: data.source,
        metadata: data.metadata || {},
        uploadedAt: data.uploadedAt ? new Date(data.uploadedAt) : new Date(),

        artists: {
          connectOrCreate: data.artists
            .filter((artist) => artist.platformId && artist.name) // ✅ HARD GUARD
            .map((artist) => ({
              where: { platformId: artist.platformId },
              create: {
                platformId: artist.platformId,
                name: artist.name,
              },
            })),
        },
      },
      include: {
        artists: true,
      },
    });

    return entry;
  } catch (error: any) {
    if (error.code === "P2002") {
      return null;
    }
    throw error;
  }
};
