import { getPlatformConnection } from "@/models/connectedPlatforms";
import { fetchListeningHistory } from "@/services/listening-history/platforms/spotify/utils";
import { saveListeningHistory } from "@/models/history.model";
import { ApiError } from "@/errors/ApiError";

export interface HistoryEntry {
  id: string;
  trackId: string;
  trackName: string;
  artistName: string;
  albumName: string;
  playedAt: string;
  durationMs: number;
  source: string;
}

export interface HistoryResponse {
  pagination: Pagination;
  history: HistoryEntry[];
}
export interface Pagination {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
  previousOffset: number | null;
}

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

  const history = await fetchListeningHistory(userSpotify);
  const results = [];

  for (const item of history) {
    console.log(item);
    const savedEntry = await saveListeningHistory(item);
    if (savedEntry) results.push(savedEntry);
  }

  console.log(`Saved ${results.length} new entries to the database.`);

  const formattedHistory = results.map((entry) => ({
    id: entry.id,
    trackId: entry.platformTrackId,
    trackName: entry.trackName,
    artistName: entry.artists.map((a: any) => a.name).join(", "),
    albumName: entry.albumName,
    playedAt: entry.playedAt.toISOString(),
    durationMs: entry.durationMs,
    source: entry.source,
    artists: entry.artists.map((a: any) => ({
      platformId: a.platformId,
      name: a.name,
    })),
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
