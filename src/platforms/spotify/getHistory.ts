import { getPlatformConnection } from "@/models/connectedPlatforms/connectedPlatforms.model";
import * as spotifyUtils from "@/platforms/spotify/utils";
import {
  findOrCreateTrack,
  connectArtistsAndTrack,
} from "@/models/track.model";
import { saveListeningHistory } from "@/models/listeningHistory.model";
import { findOrCreateArtist } from "@/models/artist.model";
import type { Artist, Track, ListeningHistory } from "@prisma/client";
import type {
  SpotifyArtistDTO,
  SpotifyListeningHistoryDTO,
  SpotifyTrackDTO,
  HistoryResponse,
} from "./types";
import type { SpotifyHistoryItem } from "@/platforms/spotify/utils";

export const createSpotifyGetHistoryHandler = (
  utils: {
    fetchRecentTracks: typeof spotifyUtils.fetchRecentTracks;
    getSpotifyArtistIds: typeof spotifyUtils.getSpotifyArtistIds;
  } = spotifyUtils,
) => {
  return async (
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<HistoryResponse> => {
    const userSpotify = await getPlatformConnection(userId, "spotify");
    const history = await utils.fetchRecentTracks(userSpotify);

    const results: SavedEntry[] = [];

    for (const item of history) {
      const entry = await persistHistoryItem(
        item,
        item.platformName,
        userSpotify.userId,
      );

      if (
        entry.savedArtistEntry &&
        entry.savedTrackEntry &&
        entry.savedLHEntry
      ) {
        results.push(entry);
      }
    }

    console.log(`Saved ${results.length} new entries to the database.`);

    return {
      pagination: buildPagination(limit, offset, results.length),
      history: results.map(formatHistoryEntry),
    };
  };
};

type SavedEntry = {
  savedTrackEntry: Track;
  savedArtistEntry: Artist[];
  savedLHEntry: ListeningHistory;
};

const toTrackDTO = (item: SpotifyHistoryItem): SpotifyTrackDTO => ({
  platformTrackId: item.platformTrackId,
  trackName: item.trackName,
  albumName: item.albumName,
  durationMs: item.durationMs,
  metadata: item.metadata,
  isrc: item.isrc,
});

const toListeningHistoryDTO = (
  item: SpotifyHistoryItem,
): SpotifyListeningHistoryDTO => ({
  playedAt: item.playedAt,
  platformName: item.platformName,
  source: item.source,
  uploadedAt: item.uploadedAt,
});

const toArtistDTOs = (item: SpotifyHistoryItem): SpotifyArtistDTO[] =>
  item.artists.map((artist) => ({
    name: artist.name,
    genres: [],
    imageUrl: "",
    platformId: artist.platformId,
  }));

const formatHistoryEntry = (entry: SavedEntry) => ({
  track: {
    trackName: entry.savedTrackEntry.trackName,
    albumName: entry.savedTrackEntry.albumName,
    durationMs: entry.savedTrackEntry.durationMs,
    trackId: entry.savedTrackEntry.id,
  },
  artists: {
    artistsNames: entry.savedArtistEntry.map((a) => a.name),
    id: entry.savedArtistEntry.map((a) => a.id),
    imageUrl: entry.savedArtistEntry.map((a) => a.imageUrl),
    genres: entry.savedArtistEntry.flatMap((a) => a.genres),
  },
  listeningEvent: {
    trackId: entry.savedLHEntry.id,
    playedAt: entry.savedLHEntry.playedAt,
    source: entry.savedLHEntry.source,
    uploadedAt: entry.savedLHEntry.uploadedAt,
  },
});

const buildPagination = (
  limit: number,
  offset: number,
  total: number,
): HistoryResponse["pagination"] => ({
  limit,
  offset,
  total,
  hasMore: false,
  nextOffset: null,
  previousOffset: null,
});

const persistHistoryItem = async (
  item: SpotifyHistoryItem,
  platformName: string,
  userId: string,
): Promise<SavedEntry> => {
  const savedArtistEntry = await findOrCreateArtist(
    toArtistDTOs(item),
    platformName,
  );

  const savedTrackEntry = await findOrCreateTrack(
    toTrackDTO(item),
    platformName,
  );

  await connectArtistsAndTrack(savedTrackEntry!, savedArtistEntry);

  const savedLHEntry = await saveListeningHistory(
    toListeningHistoryDTO(item),
    savedTrackEntry!.id,
    userId,
  );

  return { savedTrackEntry, savedArtistEntry, savedLHEntry };
};
