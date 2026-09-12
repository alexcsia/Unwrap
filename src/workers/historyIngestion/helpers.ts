import prisma from "@/utils/prisma.util";
import { saveListeningHistory } from "@/models/listeningHistory.model";
import { getSpotifyArtistIds } from "@/platforms/spotify/utils";
import type {
  SpotifyArtistDTO,
  SpotifyListeningHistoryDTO,
  SpotifyTrackDTO,
} from "@/platforms/spotify/types";
import { findOrCreateArtist } from "@/models/artist.model";
import {
  findOrCreateTrack,
  connectArtistsAndTrack,
} from "@/models/track.model";
import type { ConnectedPlatforms } from "@prisma/client";
import type {
  UploadData,
  UploadArtist,
  HistoryIngestionJobData,
} from "../types";
import { CACHE_TTL_SEC } from "../shared/rateLimit";
import { redisCache } from "@/lib/queue";

export const saveHistoryRecords = async (
  track: SpotifyTrackDTO,
  artists: SpotifyArtistDTO[],
  listeningHistory: SpotifyListeningHistoryDTO,
  entry: UploadData,
  userId: string,
) => {
  await prisma.$transaction(async () => {
    const savedTrack = await findOrCreateTrack(track, entry.platformName);
    if (!savedTrack) {
      throw new Error(`Failed to find or create track: ${entry.trackName}`);
    }

    const savedArtists = await findOrCreateArtist(artists, entry.platformName);

    await connectArtistsAndTrack(savedTrack, savedArtists);

    await saveListeningHistory(listeningHistory, savedTrack.id, userId);
  });
};

export const toSpotifyDTOs = (
  entry: UploadData,
  resolvedArtists: UploadArtist[],
): {
  track: SpotifyTrackDTO;
  listeningHistory: SpotifyListeningHistoryDTO;
  artists: SpotifyArtistDTO[];
} => {
  console.log("inside dto", resolvedArtists);
  const track: SpotifyTrackDTO = {
    platformTrackId: entry.platformTrackId,
    trackName: entry.trackName,
    albumName: entry.albumName,
    durationMs: entry.durationMs,
    metadata: entry.metadata,
    isrc: entry.isrc,
  };

  const listeningHistory: SpotifyListeningHistoryDTO = {
    playedAt: entry.playedAt,
    platformName: entry.platformName,
    source: entry.source,
    uploadedAt: entry.uploadedAt,
  };

  const artists: SpotifyArtistDTO[] = resolvedArtists.map((a) => ({
    name: a.name,
    genres: [],
    imageUrl: undefined,
    platformId: a.platformId,
  }));

  console.log("mapped to dto:", artists);
  return { track, listeningHistory, artists };
};

export const fetchAndCacheSpotifyArtists = async (
  entry: UploadData,
  connection: ConnectedPlatforms,
  cacheKey: string,
): Promise<UploadArtist[]> => {
  const artistsFromSpotify = await getSpotifyArtistIds(
    entry.platformTrackId,
    connection,
  );

  await redisCache.set(
    cacheKey,
    JSON.stringify(artistsFromSpotify),
    "EX",
    CACHE_TTL_SEC,
  );

  return artistsFromSpotify.map((a) => ({
    platformId: a.platformId,
    name: a.name,
  }));
};

export function toUploadData(
  userId: string,
  rawEntry: HistoryIngestionJobData["entry"],
): UploadData {
  return {
    userId,
    platformTrackId: rawEntry.platformTrackId,
    platformName: rawEntry.platformName,
    trackName: rawEntry.trackName,
    albumName: rawEntry.albumName,
    durationMs: rawEntry.durationMs,
    source: rawEntry.source,
    isrc: rawEntry.isrc || undefined,
    metadata: rawEntry.metadata ?? {},
    playedAt: new Date(rawEntry.playedAt),
    uploadedAt: rawEntry.uploadedAt
      ? new Date(rawEntry.uploadedAt)
      : new Date(),
    artists: rawEntry.artists
      .filter((a) => a?.name)
      .map((a) => ({
        platformId:
          a.platformId && a.platformId !== "undefined"
            ? a.platformId
            : `pending:${a.name}`,
        name: a.name,
      })),
  };
}
