import * as listeningHistoryModel from "@/models/listeningHistory.model";
import { getListeningHistoryForPeriod } from "@/models/listeningHistory.model";
import analyticsHelpers from "./shared";

export type TimeListenedFilters = {
  year?: number;
  month?: number;
  date?: string;
  from?: string;
  to?: string;
};

export type TimeListenedRepo = {
  getListeningHistoryForPeriod: typeof getListeningHistoryForPeriod;
};

/**
 * Service: timeListenedService
 *
 * Calculates aggregate listening statistics for a user within a timeframe.
 *
 * Flow:
 * - Parses filter criteria (year, month, specific date, or custom range) into boundaries
 * - Queries the model for matching listening-history rows
 * - Sums durationMs and counts rows
 * - Returns the period + statistics
 *
 * Errors:
 * - 500 (inherited) if the model call fails or dates are invalid
 */
export const createTimeListenedService =
  (repo: TimeListenedRepo = listeningHistoryModel) =>
  async (userId: string, filters: TimeListenedFilters) => {
    const { startDate, endDate } = analyticsHelpers.resolveDateRange(filters);

    const history = await repo.getListeningHistoryForPeriod(
      userId,
      startDate,
      endDate,
    );

    const totalMs = history.reduce(
      (total, item) => total + item.track.durationMs,
      0,
    );

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      statistics: {
        totalMs,
        totalTracks: history.length,
      },
    };
  };

export const timeListenedService = createTimeListenedService();
