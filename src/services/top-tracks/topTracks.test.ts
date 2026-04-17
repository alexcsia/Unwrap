import { describe, test, expect, beforeEach, mock } from "bun:test";
import { getTopTracksService } from "./getTopTracks";
import prisma from "@/utils/prisma.util";

// Mock Prisma
mock.module("@/utils/prisma.util", () => ({
  default: {
    exclusion: { findMany: mock() },
    listeningHistory: {
      groupBy: mock(),
      findMany: mock(),
    },
    $queryRaw: mock(),
  },
}));

describe("Top Tracks Service", () => {
  const userId = "user-123";

  beforeEach(() => {
    mock.restore();
    (prisma.exclusion.findMany as any).mockClear();
    (prisma.listeningHistory.groupBy as any).mockClear();
    (prisma.listeningHistory.findMany as any).mockClear();
    (prisma.$queryRaw as any).mockClear();
  });

  test("should return formatted top tracks while filtering exclusions", async () => {
    // 1. Mock Exclusions
    (prisma.exclusion.findMany as any).mockResolvedValue([
      { type: "track", targetId: "blocked-track-id" },
      { type: "artist", targetId: "blocked-artist-id" },
    ]);

    // 2. Mock GroupBy (The core top tracks list)
    const mockGroupedTracks = [
      {
        platformTrackId: "track-1",
        trackName: "Cruel Summer",
        albumName: "Lover",
        source: "spotify",
        _count: { platformTrackId: 50 },
        _max: { durationMs: 180000, uploadedAt: new Date("2025-01-01") },
      },
    ];
    (prisma.listeningHistory.groupBy as any).mockResolvedValue(
      mockGroupedTracks,
    );

    // 3. Mock findMany (The artist name lookup)
    (prisma.listeningHistory.findMany as any).mockResolvedValue([
      {
        platformTrackId: "track-1",
        artists: [{ name: "Taylor Swift" }],
      },
    ]);

    // 4. Mock $queryRaw (The total count)
    (prisma.$queryRaw as any).mockResolvedValue([{ count: BigInt(1) }]);

    const filters = { limit: 10, offset: 0 };
    const result = await getTopTracksService(userId, filters);

    // Assertions
    expect(result.topTracks).toHaveLength(1);
    expect(result.topTracks[0]).toEqual({
      rank: 1,
      trackId: "track-1",
      trackName: "Cruel Summer",
      artistName: "Taylor Swift",
      albumName: "Lover",
      plays: 50,
      durationMs: 180000,
      source: "spotify",
      uploadedAt: "2025-01-01T00:00:00.000Z",
    });

    // Ensure exclusions were passed to the where clause
    const groupByCall = (prisma.listeningHistory.groupBy as any).mock
      .calls[0][0];
    expect(groupByCall.where.platformTrackId.notIn).toContain(
      "blocked-track-id",
    );
    expect(groupByCall.where.artists.none.platformId.in).toContain(
      "blocked-artist-id",
    );
  });

  test("should handle tracks with multiple artists correctly", async () => {
    (prisma.exclusion.findMany as any).mockResolvedValue([]);
    (prisma.listeningHistory.groupBy as any).mockResolvedValue([
      {
        platformTrackId: "collab-1",
        trackName: "Creepin'",
        _count: { platformTrackId: 10 },
        _max: { durationMs: 200000, uploadedAt: new Date() },
      },
    ]);

    // Mock collaboration artists
    (prisma.listeningHistory.findMany as any).mockResolvedValue([
      {
        platformTrackId: "collab-1",
        artists: [
          { name: "Metro Boomin" },
          { name: "The Weeknd" },
          { name: "21 Savage" },
        ],
      },
    ]);

    (prisma.$queryRaw as any).mockResolvedValue([{ count: BigInt(1) }]);

    const result = await getTopTracksService(userId, { limit: 10 });

    expect(result.topTracks[0]?.artistName).toBe(
      "Metro Boomin, The Weeknd, 21 Savage",
    );
  });

  test("should return empty results if no history exists", async () => {
    (prisma.exclusion.findMany as any).mockResolvedValue([]);
    (prisma.listeningHistory.groupBy as any).mockResolvedValue([]);
    (prisma.listeningHistory.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([{ count: BigInt(0) }]);

    const result = await getTopTracksService(userId, { limit: 10 });

    expect(result.topTracks).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });
});
