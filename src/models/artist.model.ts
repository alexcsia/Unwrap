import type { Artist } from "@prisma/client";
import prisma from "@/utils/prisma.util";

type ArtistInput = {
  name: string;
  platformId: string;
  genres?: string[];
  imageUrl?: string;
};

export const findOrCreateArtist = async (
  artists: ArtistInput[],
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
