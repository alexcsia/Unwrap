import * as topTracksModel from "@/models/track.model";
import * as exclusionModel from "@/models/exclusion.model";
import analyticsHelpers from "./shared";
import type { TopTrackRow } from "@/models/track.model";

export type TopTracksFilters = analyticsHelpers.DateFilters & {
  limit?: number;
  offset?: number;
};

export type TopTracksRepo = {
  findTopTracks: typeof topTracksModel.findTopTracks;
  findExclusionKeysByUserId: typeof exclusionModel.findExclusionKeysByUserId;
};

const DEFAULT_LIMIT = 10;
const DEFAULT_OFFSET = 0;

const buildPagination = (limit: number, offset: number, total: number) => ({
  limit,
  offset,
  total,
  hasMore: offset + limit < total,
  nextOffset: offset + limit < total ? offset + limit : null,
  previousOffset: offset - limit >= 0 ? offset - limit : null,
});

const toTopTrack = (row: TopTrackRow, rank: number) => ({
  rank,
  trackId: row.trackId,
  trackName: row.trackName,
  artistNames: row.artistNames,
  albumName: row.albumName,
  plays: Number(row.playCount),
  durationMs: Number(row.durationMs),
});

/**
 * Service: getTopTracksService
 *
 * Aggregates a user's most-played tracks within a timeframe, excluding
 * user-defined excluded tracks and artists.
 *
 * Flow:
 * - Resolves filter dates into a half-open interval
 * - Loads the user's exclusions (track IDs, artist IDs)
 * - Runs a raw aggregate query ranking tracks by play count
 * - Maps rows to ranked entries and attaches pagination metadata
 *
 * Returns:
 * - pagination: limit / offset / total / hasMore / next / previous
 * - topTracks: ranked entries with play count, duration, artist names
 *
 * Errors:
 * - 500 (inherited) if the exclusion lookup or aggregate query fails
 */

export const createGetTopTracksService =
  (repo: TopTracksRepo = { ...topTracksModel, ...exclusionModel }) =>
  async (userId: string, filters: TopTracksFilters) => {
    const { limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET } = filters;
    const { startDate, endDate } = analyticsHelpers.resolveDateRange(filters);

    const exclusions = await repo.findExclusionKeysByUserId(userId);
    const excludedTrackIds = exclusions
      .filter((e) => e.type === "track")
      .map((e) => e.targetId);
    const excludedArtistIds = exclusions
      .filter((e) => e.type === "artist")
      .map((e) => e.targetId);

    const rows = await repo.findTopTracks({
      userId,
      start: startDate,
      end: endDate,
      excludedTrackIds,
      excludedArtistIds,
      limit,
      offset,
    });

    const total = Number(rows[0]?.totalCount ?? 0);

    return {
      pagination: buildPagination(limit, offset, total),
      topTracks: rows.map((row, index) => toTopTrack(row, offset + index + 1)),
    };
  };

export const getTopTracksService = createGetTopTracksService();
