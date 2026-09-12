import { describe, test, expect, beforeEach, mock } from "bun:test";
import { getTopTracksService } from "../getTopTracks.service";
import prisma from "@/utils/prisma.util";

mock.module("@/utils/prisma.util", () => ({
  default: {
    exclusion: { findMany: mock() },
    track: {
      groupBy: mock(),
      findMany: mock(),
    },
    $queryRaw: mock(),
  },
}));

describe("Top Tracks Service", () => {
  const makeTrackRow = (overrides: Record<string, any> = {}) => ({
    trackId: "track-1",
    trackName: "Cruel Summer",
    albumName: "Lover",
    playCount: BigInt(50),
    durationMs: BigInt(180000),
    totalCount: BigInt(1),
    artistNames: "Taylor Swift",
    ...overrides,
  });

  const userId = "user-123";

  beforeEach(() => {
    (prisma.exclusion.findMany as any).mockClear();
    (prisma.track.groupBy as any).mockClear();
    (prisma.track.findMany as any).mockClear();
    (prisma.$queryRaw as any).mockClear();
  });

  test("should return formatted top tracks while filtering exclusions", async () => {
    (prisma.exclusion.findMany as any).mockResolvedValue([
      { type: "track", targetId: "blocked-track-id" },
      { type: "artist", targetId: "blocked-artist-id" },
    ]);

    (prisma.$queryRaw as any).mockResolvedValueOnce([
      {
        trackId: "track-1",
        trackName: "Cruel Summer",
        albumName: "Lover",
        playCount: BigInt(50),
        durationMs: BigInt(180000),
        totalCount: BigInt(1),
        artistNames: "Taylor Swift",
      },
    ]);

    const result = await getTopTracksService(userId, { limit: 10, offset: 0 });

    expect(result.topTracks).toHaveLength(1);
    expect(result.topTracks[0]).toEqual({
      rank: 1,
      trackId: "track-1",
      trackName: "Cruel Summer",
      artistNames: "Taylor Swift",
      albumName: "Lover",
      plays: 50,
      durationMs: 180000,
    });
  });

  test("should handle tracks with multiple artists correctly", async () => {
    (prisma.exclusion.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValueOnce([
      {
        trackId: "collab-1",
        trackName: "Creepin'",
        albumName: "Heroes & Villains",
        playCount: BigInt(10),
        durationMs: BigInt(200000),
        totalCount: BigInt(1),
        artistNames: "Metro Boomin, The Weeknd, 21 Savage",
      },
    ]);

    const result = await getTopTracksService(userId, { limit: 10 });

    expect(result.topTracks[0]?.artistNames).toBe(
      "Metro Boomin, The Weeknd, 21 Savage",
    );
  });

  test("should return empty results if no history exists", async () => {
    (prisma.exclusion.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValueOnce([]);

    const result = await getTopTracksService(userId, { limit: 10 });

    expect(result.topTracks).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });

  describe("date filtering", () => {
    test("uses single date range when date filter provided", async () => {
      (prisma.exclusion.findMany as any).mockResolvedValue([]);
      (prisma.$queryRaw as any).mockResolvedValueOnce([]);

      await getTopTracksService(userId, { date: "2024-06-15" });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    test("uses from/to range when both provided", async () => {
      (prisma.exclusion.findMany as any).mockResolvedValue([]);
      (prisma.$queryRaw as any).mockResolvedValueOnce([]);

      await getTopTracksService(userId, {
        from: "2024-01-01",
        to: "2024-06-30",
      });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    test("uses full year range when only year provided", async () => {
      (prisma.exclusion.findMany as any).mockResolvedValue([]);
      (prisma.$queryRaw as any).mockResolvedValueOnce([]);

      await getTopTracksService(userId, { year: 2024 });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    test("uses year+month range when both provided", async () => {
      (prisma.exclusion.findMany as any).mockResolvedValue([]);
      (prisma.$queryRaw as any).mockResolvedValueOnce([]);

      await getTopTracksService(userId, { year: 2024, month: 6 });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    test("uses fallback range when no date filters provided", async () => {
      (prisma.exclusion.findMany as any).mockResolvedValue([]);
      (prisma.$queryRaw as any).mockResolvedValueOnce([]);

      await getTopTracksService(userId, {});

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe("exclusion filtering", () => {
    test("excluded track does not appear in results", async () => {
      (prisma.exclusion.findMany as any).mockResolvedValue([
        { type: "track", targetId: "blocked-track-id" },
      ]);

      (prisma.$queryRaw as any).mockResolvedValueOnce([
        makeTrackRow({ trackId: "allowed-track", totalCount: BigInt(1) }),
      ]);

      const result = await getTopTracksService(userId, {
        limit: 10,
        offset: 0,
      });

      const ids = result.topTracks.map((t) => t.trackId);

      expect(ids).not.toContain("blocked-track-id");
      expect(ids).toContain("allowed-track");
    });

    test("returns all tracks when no exclusions exist", async () => {
      (prisma.exclusion.findMany as any).mockResolvedValue([]);
      (prisma.$queryRaw as any).mockResolvedValueOnce([
        makeTrackRow({ trackId: "track-1", totalCount: BigInt(2) }),
        makeTrackRow({ trackId: "track-2", totalCount: BigInt(2) }),
      ]);

      const result = await getTopTracksService(userId, {
        limit: 10,
        offset: 0,
      });

      expect(result.topTracks).toHaveLength(2);
    });

    test("fetches exclusions for the correct userId", async () => {
      (prisma.exclusion.findMany as any).mockResolvedValue([]);
      (prisma.$queryRaw as any).mockResolvedValueOnce([]);

      await getTopTracksService(userId, {});

      expect(prisma.exclusion.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: { type: true, targetId: true },
      });
    });
  });

  describe("rank calculation", () => {
    test("rank starts at 1 on first page", async () => {
      (prisma.exclusion.findMany as any).mockResolvedValue([]);
      (prisma.$queryRaw as any).mockResolvedValueOnce([
        makeTrackRow({ totalCount: BigInt(1) }),
      ]);

      const result = await getTopTracksService(userId, {
        limit: 10,
        offset: 0,
      });

      expect(result.topTracks[0]?.rank).toBe(1);
    });

    test("rank accounts for offset on subsequent pages", async () => {
      (prisma.exclusion.findMany as any).mockResolvedValue([]);
      (prisma.$queryRaw as any).mockResolvedValueOnce([
        makeTrackRow({ totalCount: BigInt(20) }),
      ]);

      const result = await getTopTracksService(userId, {
        limit: 10,
        offset: 10,
      });

      expect(result.topTracks[0]?.rank).toBe(11);
    });
  });

  describe("pagination", () => {
    test("hasMore is true when totalCount exceeds limit", async () => {
      (prisma.exclusion.findMany as any).mockResolvedValue([]);
      (prisma.$queryRaw as any).mockResolvedValueOnce(
        new Array(10).fill(makeTrackRow({ totalCount: BigInt(25) })),
      );

      const result = await getTopTracksService(userId, {
        limit: 10,
        offset: 0,
      });

      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.nextOffset).toBe(10);
      expect(result.pagination.previousOffset).toBeNull();
    });

    test("hasMore is false when all records fit in one page", async () => {
      (prisma.exclusion.findMany as any).mockResolvedValue([]);
      (prisma.$queryRaw as any).mockResolvedValueOnce([
        makeTrackRow({ totalCount: BigInt(3) }),
        makeTrackRow({ trackId: "track-2", totalCount: BigInt(3) }),
        makeTrackRow({ trackId: "track-3", totalCount: BigInt(3) }),
      ]);

      const result = await getTopTracksService(userId, {
        limit: 10,
        offset: 0,
      });

      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.nextOffset).toBeNull();
    });

    test("previousOffset is correct on second page", async () => {
      (prisma.exclusion.findMany as any).mockResolvedValue([]);
      (prisma.$queryRaw as any).mockResolvedValueOnce(
        new Array(10).fill(makeTrackRow({ totalCount: BigInt(30) })),
      );

      const result = await getTopTracksService(userId, {
        limit: 10,
        offset: 10,
      });

      expect(result.pagination.previousOffset).toBe(0);
      expect(result.pagination.nextOffset).toBe(20);
    });
  });
});
