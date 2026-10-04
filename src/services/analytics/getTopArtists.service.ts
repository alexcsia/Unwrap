import * as topArtistsModel from "@/models/artist.model";
import type { TopArtistRow } from "@/models/artist.model";
import analyticsHelpers from "./shared";

export type TopArtistsFilters = analyticsHelpers.DateFilters & {
  limit?: number;
  offset?: number;
};

export type TopArtistsRepo = {
  findTopArtists: typeof topArtistsModel.findTopArtists;
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

const toTopArtist = (row: TopArtistRow, rank: number) => ({
  rank,
  artistId: row.artistId,
  artistName: row.artistName,
  playCount: Number(row.playCount),
  durationMs: Number(row.totalDurationMs ?? 0),
});

/**
 * Service: getTopArtistsService
 *
 * Ranks a user's most-played artists within a timeframe, excluding
 * artist exclusions.
 *
 * Flow:
 * - Resolves filter dates into a half-open interval
 * - Runs a raw aggregate query ranking artists by play count
 * - Maps rows to ranked entries and attaches pagination metadata
 *
 * Returns:
 * - pagination: limit / offset / total / hasMore / next / previous
 * - topArtists: ranked entries with play count and total duration
 *
 * Errors:
 * - 500 (inherited) if the aggregate query fails
 */
export const createGetTopArtistsService =
  (repo: TopArtistsRepo = topArtistsModel) =>
  async (userId: string, filters: TopArtistsFilters) => {
    const { limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET } = filters;
    const { startDate, endDate } = analyticsHelpers.resolveDateRange(filters);

    const rows = await repo.findTopArtists({
      userId,
      start: startDate,
      end: endDate,
      limit,
      offset,
    });

    const total = Number(rows[0]?.totalCount ?? 0);

    return {
      pagination: buildPagination(limit, offset, total),
      topArtists: rows.map((row, index) =>
        toTopArtist(row, offset + index + 1),
      ),
    };
  };

export const getTopArtistsService = createGetTopArtistsService();
