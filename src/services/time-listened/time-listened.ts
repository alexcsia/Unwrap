import prisma from "@/utils/prisma.util";

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

  const aggregation = await prisma.listeningHistory.aggregate({
    where: {
      userId,
      playedAt: {
        gte: startDate,
        lt: endDate,
      },
    },
    _sum: {
      durationMs: true,
    },
    _count: {
      id: true,
    },
  });

  const totalMs = aggregation._sum.durationMs || 0;

  return {
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    statistics: {
      totalMs,
      totalTracks: aggregation._count.id,
    },
  };
};
