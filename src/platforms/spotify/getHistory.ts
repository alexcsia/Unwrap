import { getPlatformConnection } from "@/models/connectedPlatforms.model";
import { fetchRecentTracks } from "@/platforms/spotify/utils";
import {
  findOrCreateTrack,
  connectArtistsAndTrack,
} from "@/models/track.model";
import { ApiError } from "@/errors/ApiError";
import type {
  SpotifyArtistDTO,
  SpotifyListeningHistoryDTO,
  SpotifyTrackDTO,
} from "./types";
import type { HistoryResponse } from "./types";
import { saveListeningHistory } from "@/models/listeningHistory.model";
import { findOrCreateArtist } from "@/models/artist.model";

/**
 * Service: spotifyGetHistoryHandler
 *
 * Retrieves and persists recent Spotify listening history for a user.
 *
 * Flow:
 * - Retrieves existing Spotify platform connection/credentials
 * - Fetches "Recently Played" tracks from Spotify API
 * - Iterates through tracks and attempts to save them to the DB
 * - Filters for successfully saved/newly created entries
 * - Formats DB entries into a paginated history response
 *
 * Returns:
 * - pagination: Metadata regarding limits, offsets, and totals
 * - history: Array of formatted HistoryEntry objects including track and artist data
 *
 * Errors:
 * - 404 if no active Spotify connection/token is found for the user
 * - 502 (inherited) if Spotify API communication fails
 */

export const spotifyGetHistoryHandler = async (
  userId: string,
  limit = 50,
  offset = 0,
): Promise<HistoryResponse> => {
  const userSpotify = await getPlatformConnection(userId, "spotify");

  if (!userSpotify) {
    throw new ApiError(403, "FORBIDDEN", "No Spotify connection found.");
  }

  const history = await fetchRecentTracks(userSpotify);
  const results = [];

  for (const item of history) {
    const track: SpotifyTrackDTO = {
      platformTrackId: item.platformTrackId,
      trackName: item.trackName,
      albumName: item.albumName,
      durationMs: item.durationMs,
      metadata: item.metadata,
      isrc: item.isrc,
    };

    const ListeningHistory: SpotifyListeningHistoryDTO = {
      playedAt: item.playedAt,
      platformName: item.platformName,
      source: item.source,
      uploadedAt: item.uploadedAt,
    };

    const artists: SpotifyArtistDTO[] = item.artists.map((trackArtist) => {
      return {
        name: trackArtist.name,
        genres: [],
        imageUrl: "",
        platformId: trackArtist.platformId,
      };
    });

    const savedArtistEntry = await findOrCreateArtist(
      artists,
      item.platformName,
    );

    const savedTrackEntry = await findOrCreateTrack(track, item.platformName);

    await connectArtistsAndTrack(savedTrackEntry!, savedArtistEntry);

    const savedLHEntry = await saveListeningHistory(
      ListeningHistory,
      savedTrackEntry!.id,
      userSpotify.userId,
    );
    if (savedArtistEntry && savedTrackEntry && savedLHEntry)
      results.push({ savedTrackEntry, savedArtistEntry, savedLHEntry });
  }

  console.log(`Saved ${results.length} new entries to the database.`);

  const formattedHistory = results.map((entry) => ({
    track: {
      trackName: entry.savedTrackEntry.trackName,
      albumName: entry.savedTrackEntry.albumName,
      durationMs: entry.savedTrackEntry.durationMs,
      trackId: entry.savedTrackEntry.id,
    },
    artists: {
      artistsNames: entry.savedArtistEntry.map((artist) => artist.name),
      id: entry.savedArtistEntry.map((artist) => artist.id),
      imageUrl: entry.savedArtistEntry.map((artist) => artist.imageUrl),
      genres: entry.savedArtistEntry.flatMap((artist) => artist.genres),
    },
    listeningEvent: {
      trackId: entry.savedLHEntry.id,
      playedAt: entry.savedLHEntry.playedAt,
      source: entry.savedLHEntry.source,
      uploadedAt: entry.savedLHEntry.uploadedAt,
    },
  }));

  return {
    pagination: {
      limit,
      offset,
      total: formattedHistory.length,
      hasMore: false,
      nextOffset: null,
      previousOffset: null,
    },
    history: formattedHistory,
  };
};
