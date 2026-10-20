import type { RawLastFmTrack, LastFmTrack } from "./types";
import prisma from "@/utils/prisma.util";

export const toLastfmTrack = (rawTracks: RawLastFmTrack[]): LastFmTrack[] =>
  rawTracks
    .filter((t) => t.date?.uts !== undefined)
    .map((t) => ({
      trackName: t.name,
      trackMbid: t.mbid?.trim() ? t.mbid : null,
      url: t.url,
      artistName: t.artist["#text"],
      artistMbid: t.artist.mbid?.trim() ? t.artist.mbid : null,
      albumName: t.album["#text"],
      albumMbid: t.album.mbid?.trim() ? t.album.mbid : null,
      playedAt: t.date!.uts,
      source: "lastfm",
      durationMs: null,
    }));

export const needsEnrichment = async (trackId: string): Promise<boolean> => {
  const hasISRC = await prisma.trackIdentifier.findFirst({
    where: { trackId: trackId, type: "ISRC" },
    select: { id: true },
  });
  // make into model
  return hasISRC === null;
};
