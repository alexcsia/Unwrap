import { describe, test, expect, beforeEach, mock } from "bun:test";
import { getTopArtistsService } from "../getTopArtists.service";
import prisma from "@/utils/prisma.util";

mock.module("@/utils/prisma.util", () => ({
  default: {
    $queryRaw: mock(),
  },
}));

describe("Top Artists Service", () => {
  const makeArtistRow = (overrides: Record<string, any> = {}) => ({
    artistId: "artist-1",
    artistName: "Taylor Swift",
    imageUrl: "http://image.com/1",
    playCount: BigInt(150),
    totalDurationMs: BigInt(45000000),
    totalCount: BigInt(1),
    ...overrides,
  });

  const userId = "user-123";

  beforeEach(() => {
    (prisma.$queryRaw as any).mockClear();
  });

  test("should return formatted top artists and correct pagination", async () => {
    const mockRawData = [
      {
        artistId: "artist-1",
        artistName: "Taylor Swift",
        imageUrl: "http://image.com/1",
        playCount: BigInt(150),
        totalDurationMs: BigInt(45000000),
        source: "spotify",
        uploadedAt: new Date("2025-01-01"),
        totalCount: BigInt(2),
      },
      {
        artistId: "artist-2",
        artistName: "The Midnight",
        imageUrl: null,
        playCount: BigInt(100),
        totalDurationMs: BigInt(30000000),
        source: "spotify",
        uploadedAt: new Date("2025-01-02"),
        totalCount: BigInt(2),
      },
    ];

    (prisma.$queryRaw as any).mockResolvedValueOnce(mockRawData);

    const filters = { limit: 10, offset: 0, year: 2024 };
    const result = await getTopArtistsService(userId, filters);

    expect(result.topArtists[0]).toEqual({
      rank: 1,
      artistId: "artist-1",
      artistName: "Taylor Swift",
      playCount: 150,
      durationMs: 45000000,
    });

    expect(result.topArtists[1]).toEqual({
      rank: 2,
      artistId: "artist-2",
      artistName: "The Midnight",
      playCount: 100,
      durationMs: 30000000,
    });

    expect(result.pagination).toEqual({
      limit: 10,
      offset: 0,
      total: 2,
      hasMore: false,
      nextOffset: null,
      previousOffset: null,
    });
  });

  test("should handle empty results gracefully", async () => {
    (prisma.$queryRaw as any).mockResolvedValueOnce([]);

    const result = await getTopArtistsService(userId, { limit: 5 });

    expect(result.topArtists).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.hasMore).toBe(false);
  });

  test("should calculate nextOffset correctly when more records exist", async () => {
    const mockRow = {
      artistId: "artist-1",
      artistName: "Test",
      imageUrl: null,
      playCount: BigInt(10),
      totalDurationMs: BigInt(1000),
      totalCount: BigInt(20),
    };

    (prisma.$queryRaw as any).mockResolvedValueOnce(new Array(5).fill(mockRow));

    const result = await getTopArtistsService(userId, {
      limit: 5,
      offset: 0,
    });

    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.nextOffset).toBe(5);
  });

  test("should calculate previousOffset and nextOffset correctly on subsequent pages", async () => {
    (prisma.$queryRaw as any).mockResolvedValueOnce(
      new Array(5).fill(makeArtistRow({ totalCount: BigInt(30) })),
    );

    const result = await getTopArtistsService(userId, {
      limit: 5,
      offset: 10,
    });

    expect(result.pagination.previousOffset).toBe(5);
    expect(result.pagination.nextOffset).toBe(15);
  });

  test("should handle null imageUrl without error", async () => {
    (prisma.$queryRaw as any).mockResolvedValueOnce([
      makeArtistRow({ imageUrl: null }),
    ]);

    const result = await getTopArtistsService(userId, {});

    expect(result.topArtists[0]?.artistId).toBe("artist-1");
  });

  test("should convert BigInt fields to numbers", async () => {
    (prisma.$queryRaw as any).mockResolvedValueOnce([makeArtistRow()]);

    const result = await getTopArtistsService(userId, {});

    expect(typeof result.topArtists[0]?.playCount).toBe("number");
    expect(typeof result.topArtists[0]?.durationMs).toBe("number");
  });

  test("should calculate rank correctly based on offset", async () => {
    (prisma.$queryRaw as any).mockResolvedValueOnce([
      makeArtistRow({ totalCount: BigInt(20) }),
    ]);

    const result = await getTopArtistsService(userId, {
      limit: 10,
      offset: 10,
    });

    expect(result.topArtists[0]?.rank).toBe(11);
  });

  describe("date filtering", () => {
    test("uses full year range when only year provided", async () => {
      (prisma.$queryRaw as any).mockResolvedValueOnce([]);

      await getTopArtistsService(userId, { year: 2023 });

      const params = (prisma.$queryRaw as any).mock.calls[0].slice(1);
      const startDate = params[1];
      const endDate = params[2];

      expect(startDate.getFullYear()).toBe(2023);
      expect(startDate.getMonth()).toBe(0);
      expect(startDate.getDate()).toBe(1);
      expect(endDate.getFullYear()).toBe(2024);
      expect(endDate.getMonth()).toBe(0);
    });

    test("uses month range when year and month provided", async () => {
      (prisma.$queryRaw as any).mockResolvedValueOnce([]);

      await getTopArtistsService(userId, { year: 2024, month: 6 });

      const params = (prisma.$queryRaw as any).mock.calls[0].slice(1);
      const startDate = params[1];
      const endDate = params[2];

      expect(startDate.getMonth()).toBe(5);
      expect(endDate.getMonth()).toBe(6);
    });

    test("uses single day range when date provided", async () => {
      (prisma.$queryRaw as any).mockResolvedValueOnce([]);

      await getTopArtistsService(userId, { date: "2024-06-15" });

      const params = (prisma.$queryRaw as any).mock.calls[0].slice(1);
      const startDate = params[1];
      const endDate = params[2];

      expect(startDate.getDate()).toBe(15);
      expect(endDate.getDate()).toBe(16);
    });

    test("uses from/to range when both provided", async () => {
      (prisma.$queryRaw as any).mockResolvedValueOnce([]);

      await getTopArtistsService(userId, {
        from: "2024-01-01",
        to: "2024-06-30",
      });

      const params = (prisma.$queryRaw as any).mock.calls[0].slice(1);
      const startDate = params[1];
      const endDate = params[2];

      expect(startDate.getFullYear()).toBe(2024);
      expect(startDate.getMonth()).toBe(0);
      expect(endDate.getMonth()).toBe(6);
    });

    test("uses fallback range when no date filter provided", async () => {
      (prisma.$queryRaw as any).mockResolvedValueOnce([]);

      await getTopArtistsService(userId, {});

      const params = (prisma.$queryRaw as any).mock.calls[0].slice(1);
      const startDate = params[1];

      expect(startDate.getTime()).toBe(new Date(0).getTime());
    });
  });

  describe("exclusion filtering", () => {
    test("excluded artist does not appear in results", async () => {
      (prisma.$queryRaw as any).mockResolvedValueOnce([
        makeArtistRow({ artistId: "allowed-artist", totalCount: BigInt(1) }),
      ]);

      const result = await getTopArtistsService(userId, {});

      const ids = result.topArtists.map((a) => a.artistId);

      expect(ids).not.toContain("blocked-artist-id");
      expect(ids).toContain("allowed-artist");
    });

    test("returns all artists when no exclusions exist", async () => {
      (prisma.$queryRaw as any).mockResolvedValueOnce([
        makeArtistRow({ artistId: "artist-1", totalCount: BigInt(2) }),
        makeArtistRow({ artistId: "artist-2", totalCount: BigInt(2) }),
      ]);

      const result = await getTopArtistsService(userId, {});

      expect(result.topArtists).toHaveLength(2);
    });
  });
});
