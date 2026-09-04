import prisma from "@/utils/prisma.util";
import type { SpotifyArtistDTO } from "@/services/listening-history/platforms/spotify/types";
import type { Artist } from "@prisma/client";

export const findOrCreateArtist = async (
  artists: SpotifyArtistDTO[],
  platform: string,
): Promise<Artist[]> => {
  try {
    const results = await Promise.all(
      artists.map(async (artist) => {
        const existing = await prisma.platformArtist.findUnique({
          where: {
            platformArtistId_platformName: {
              platformName: platform,
              platformArtistId: artist.platformId,
            },
          },
          include: { artist: true },
        });

        if (existing) return existing.artist;

        return prisma.artist.create({
          data: {
            name: artist.name,
            imageUrl: artist.imageUrl,
            genres: artist.genres,
            platformArtists: {
              create: {
                platformName: platform,
                platformArtistId: artist.platformId,
              },
            },
          },
        });
      }),
    );

    return results;
  } catch (error: any) {
    if (error.code === "P2002") {
      return findOrCreateArtist(artists, platform);
    }
    throw error;
  }
};
