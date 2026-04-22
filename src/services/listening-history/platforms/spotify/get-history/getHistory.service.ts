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

export const spotifyGetHistoryHandler = async (
  userId: string,
  limit = 50,
  offset = 0,
): Promise<HistoryResponse> => {
  const userSpotify = await getPlatformConnection(userId, "spotify");

  if (!userSpotify) {
    throw new ApiError(404, "NOT_FOUND", "No Spotify connection found.");
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
