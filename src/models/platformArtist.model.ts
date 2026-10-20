import type { Artist } from "@prisma/client";
import type { FindOrCreateArtistInput } from "./artist";
import prisma from "@/utils/prisma.util";

export const createPlatformArtist = async (
  matched: Artist,
  artist: FindOrCreateArtistInput,
) => {
  await prisma.platformArtist.create({
    data: {
      artistId: matched.id,
      platformName: artist.platformName,
      platformArtistId: artist.platformArtistId,
    },
  });
};

export const findPlatformArtist = async (artist: FindOrCreateArtistInput) => {
  const existingPlatformArtist = await prisma.platformArtist.findUnique({
    where: {
      platformArtistId_platformName: {
        platformArtistId: artist.platformArtistId,
        platformName: artist.platformName,
      },
    },
    include: { artist: true },
  });
  return existingPlatformArtist;
};
