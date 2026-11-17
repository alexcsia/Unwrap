import prisma from "@/utils/prisma.util";
import type { Track } from "@prisma/client";
import type { FindOrCreateTrackInput } from "./track";

export const createPlatformTrack = async (
  track: Track,
  input: FindOrCreateTrackInput,
) => {
  await prisma.platformTrack.create({
    data: {
      trackId: track.id,
      platformName: input.platformName,
      platformTrackId: input.platformTrackId,
    },
  });
};

export const findUniquePlatformTrack = async (
  input: FindOrCreateTrackInput,
) => {
  const existingPlatformTrack = await prisma.platformTrack.findUnique({
    where: {
      platformName_platformTrackId: {
        platformName: input.platformName,
        platformTrackId: input.platformTrackId,
      },
    },
    include: { track: true },
  });
  return existingPlatformTrack;
};
