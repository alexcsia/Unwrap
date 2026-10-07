import prisma from "@/utils/prisma.util";
import * as trackModel from "@/models/track.model";
import * as artistModel from "@/models/artist.model";
import * as listeningHistoryModel from "@/models/listeningHistory.model";
import * as spotifyUtils from "@/platforms/spotify/utils";
import { redisCache } from "@/lib/redis";
import type {
  SpotifyArtistDTO,
  SpotifyListeningHistoryDTO,
  SpotifyTrackDTO,
} from "@/platforms/spotify/types";
import type {
  UploadData,
  UploadArtist,
  HistoryIngestionJobData,
} from "../types";
import { CACHE_TTL_SEC } from "../shared/rateLimit";
import type { SpotifyConnection } from "@/models/connectedPlatforms/types";

export const toSpotifyDTOs = (
  entry: UploadData,
  resolvedArtists: UploadArtist[],
): {
  track: SpotifyTrackDTO;
  listeningHistory: SpotifyListeningHistoryDTO;
  artists: SpotifyArtistDTO[];
} => {
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

  return { track, listeningHistory, artists };
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

export type SaveHistoryRepo = {
  findOrCreateTrack: typeof trackModel.findOrCreateTrack;
  findOrCreateArtist: typeof artistModel.findOrCreateArtist;
  connectArtistsAndTrack: typeof trackModel.connectArtistsAndTrack;
  saveListeningHistory: typeof listeningHistoryModel.saveListeningHistory;
  transaction: <T>(fn: () => Promise<T>) => Promise<T>;
};

const defaultSaveHistoryRepo: SaveHistoryRepo = {
  findOrCreateTrack: trackModel.findOrCreateTrack,
  findOrCreateArtist: artistModel.findOrCreateArtist,
  connectArtistsAndTrack: trackModel.connectArtistsAndTrack,
  saveListeningHistory: listeningHistoryModel.saveListeningHistory,
  transaction: (fn) => prisma.$transaction(fn),
};

export const createSaveHistoryRecords =
  (repo: SaveHistoryRepo = defaultSaveHistoryRepo) =>
  async (
    track: SpotifyTrackDTO,
    artists: SpotifyArtistDTO[],
    listeningHistory: SpotifyListeningHistoryDTO,
    entry: UploadData,
    userId: string,
  ) => {
    await repo.transaction(async () => {
      const savedTrack = await repo.findOrCreateTrack(
        track,
        entry.platformName,
      );
      if (!savedTrack) {
        throw new Error(`Failed to find or create track: ${entry.trackName}`);
      }

      const savedArtists = await repo.findOrCreateArtist(
        artists,
        entry.platformName,
      );
      await repo.connectArtistsAndTrack(savedTrack, savedArtists);
      await repo.saveListeningHistory(listeningHistory, savedTrack.id, userId);
    });
  };

export const saveHistoryRecords = createSaveHistoryRecords();

export type SpotifyArtistsDeps = {
  getSpotifyArtistIds: typeof spotifyUtils.getSpotifyArtistIds;
  cache: { set: typeof redisCache.set };
  cacheTtlSec: number;
};

const defaultSpotifyArtistsDeps: SpotifyArtistsDeps = {
  getSpotifyArtistIds: spotifyUtils.getSpotifyArtistIds,
  cache: redisCache,
  cacheTtlSec: CACHE_TTL_SEC,
};

export const createFetchAndCacheSpotifyArtists =
  (deps: SpotifyArtistsDeps = defaultSpotifyArtistsDeps) =>
  async (
    entry: UploadData,
    connection: SpotifyConnection,
    cacheKey: string,
  ): Promise<UploadArtist[]> => {
    const artistsFromSpotify = await deps.getSpotifyArtistIds(
      entry.platformTrackId,
      connection,
    );

    await deps.cache.set(
      cacheKey,
      JSON.stringify(artistsFromSpotify),
      "EX",
      deps.cacheTtlSec,
    );

    return artistsFromSpotify.map((a) => ({
      platformId: a.platformId,
      name: a.name,
    }));
  };

export const fetchAndCacheSpotifyArtists = createFetchAndCacheSpotifyArtists();
