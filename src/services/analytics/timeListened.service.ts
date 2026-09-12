import prisma from "@/utils/prisma.util";

/**
 * Service: timeListenedService
 *
 * Calculates aggregate listening statistics for a user within a specified timeframe.
 *
 * Flow:
 * - Parses filter criteria (year, month, specific date, or custom range) to determine time boundaries
 * - Normalizes start and end dates to ensure full-day coverage (LTE/GTE logic)
 * - Queries the database using Prisma's aggregate function
 * - Sums the total 'durationMs' and counts total record IDs matching the criteria
 * - Formats the result into a clean statistics object with ISO timestamps
 *
 * Returns:
 * - period: The calculated start and end ISO strings used for the query
 * - statistics: An object containing totalMs (total listening time) and totalTracks
 *
 * Errors:
 * - 500 (inherited) if database aggregation fails or date parsing encounters invalid formats
 */

export const timeListenedService = async (userId: string, filters: any) => {
  const { year, month, date, from, to } = filters;

  let startDate: Date;
  let endDate: Date;

  if (date) {
    startDate = new Date(date);
    endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
  } else if (from && to) {
    startDate = new Date(from);
    endDate = new Date(to);
    endDate.setDate(endDate.getDate() + 1);
  } else if (year) {
    startDate = new Date(year, month ? month - 1 : 0, 1);
    endDate = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
  } else {
    startDate = new Date(0);
    endDate = new Date();
  }

  const history = await prisma.listeningHistory.findMany({
    where: {
      userId,
      playedAt: {
        gte: startDate,
        lt: endDate,
      },
    },
    select: {
      track: {
        select: {
          durationMs: true,
        },
      },
    },
  });

  const totalMs = history.reduce(
    (total, item) => total + item.track.durationMs,
    0,
  );

  const totalTracks = history.length;
  return {
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    statistics: {
      totalMs,
      totalTracks,
    },
  };
};
