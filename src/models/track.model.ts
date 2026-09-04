import prisma from "@/utils/prisma.util";
import type { SpotifyTrackDTO } from "@/services/listening-history/platforms/spotify/types";
import type { Track, Artist } from "@prisma/client";

export const findOrCreateTrack = async (
  track: SpotifyTrackDTO,
  platformName: string,
): Promise<Track> => {
  try {
    const existingPlatformTrack = await prisma.platformTrack.findUnique({
      where: {
        platformName_platformTrackId: {
          platformName,
          platformTrackId: track.platformTrackId,
        },
      },
      include: {
        track: true,
      },
    });

    if (existingPlatformTrack) {
      return existingPlatformTrack.track;
    }

    if (track.isrc) {
      const existingTrack = await prisma.track.findUnique({
        where: {
          isrc: track.isrc,
        },
      });

      if (existingTrack) {
        await prisma.platformTrack.create({
          data: {
            trackId: existingTrack.id,
            platformName,
            platformTrackId: track.platformTrackId,
          },
        });

        return existingTrack;
      }
    }

    const newTrack = await prisma.track.create({
      data: {
        trackName: track.trackName,
        albumName: track.albumName,
        durationMs: track.durationMs,
        metadata: {},
        isrc: track.isrc,
        platformTracks: {
          create: {
            platformName,
            platformTrackId: track.platformTrackId,
          },
        },
      },
    });

    return newTrack;
  } catch (error: any) {
    if (error.code === "P2002") {
      return findOrCreateTrack(track, platformName);
    }
    throw error;
  }
};

export const connectArtistsAndTrack = async (
  savedTrackEntry: Track,
  savedArtistEntry: Artist[],
) => {
  await prisma.track.update({
    where: { id: savedTrackEntry!.id },
    data: {
      artists: {
        connect: savedArtistEntry.map((a) => ({ id: a.id })),
      },
    },
  });
};
