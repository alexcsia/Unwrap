import { describe, test, expect, beforeEach, mock } from "bun:test";
import { getTopArtistsService } from "./getTopArtists";
import prisma from "@/utils/prisma.util";

// Mock the Prisma client
mock.module("@/utils/prisma.util", () => ({
  default: {
    $queryRaw: mock(),
  },
}));

describe("Top Artists Service", () => {
  const userId = "user-123";

  beforeEach(() => {
    (prisma.$queryRaw as any).mockClear();
  });

  test("should return formatted top artists and correct pagination", async () => {
    // 1. Mock DB returning raw data (PostgreSQL returns bigint for COUNT/SUM)
    const mockRawData = [
      {
        artistId: "artist-1",
        artistName: "Taylor Swift",
        imageUrl: "http://image.com/1",
        playCount: BigInt(150),
        durationMs: BigInt(45000000),
        source: "spotify",
        uploadedAt: new Date("2025-01-01"),
      },
      {
        artistId: "artist-2",
        artistName: "The Midnight",
        imageUrl: null,
        playCount: BigInt(100),
        durationMs: BigInt(30000000),
        source: "spotify",
        uploadedAt: new Date("2025-01-02"),
      },
    ];

    const mockTotalCount = [{ count: BigInt(2) }];

    // Mock implementation: first call for data, second for count
    (prisma.$queryRaw as any)
      .mockResolvedValueOnce(mockRawData)
      .mockResolvedValueOnce(mockTotalCount);

    const filters = { limit: 10, offset: 0, year: 2024 };
    const result = await getTopArtistsService(userId, filters);

    // 2. Assertions for Mapping Logic (BigInt -> Number, Date -> ISO)
    expect(result.topArtists[0]).toEqual({
      rank: 1,
      artistId: "artist-1",
      artistName: "Taylor Swift",
      playCount: 150,
      durationMs: 45000000,
      source: "spotify",
      uploadedAt: "2025-01-01T00:00:00.000Z",
    });

    // 3. Assertions for Pagination
    expect(result.pagination).toEqual({
      limit: 10,
      offset: 0,
      total: 2,
      hasMore: false,
      nextOffset: null,
      previousOffset: null,
    });

    // 4. Verify SQL calls
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  test("should handle empty results gracefully", async () => {
    (prisma.$queryRaw as any)
      .mockResolvedValueOnce([]) // No artists
      .mockResolvedValueOnce([{ count: BigInt(0) }]); // Total 0

    const result = await getTopArtistsService(userId, { limit: 5 });

    expect(result.topArtists).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.hasMore).toBe(false);
  });

  test("should calculate date ranges correctly for 'year' filter", async () => {
    (prisma.$queryRaw as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: BigInt(0) }]);

    await getTopArtistsService(userId, { year: 2023 });

    // Inspect the first call to $queryRaw
    const firstCallArgs = (prisma.$queryRaw as any).mock.calls[0][0];

    // We expect the SQL parameters to contain the start and end of the year
    const params = (prisma.$queryRaw as any).mock.calls[0].slice(1);

    // Check if startDate (first param after userId) is Jan 1st 2023
    const startDate = params[1];
    expect(startDate.getFullYear()).toBe(2023);
    expect(startDate.getMonth()).toBe(0);
    expect(startDate.getDate()).toBe(1);

    // Check if endDate is Jan 1st 2024
    const endDate = params[2];
    expect(endDate.getFullYear()).toBe(2024);
  });

  test("should calculate nextOffset correctly when more records exist", async () => {
    (prisma.$queryRaw as any)
      .mockResolvedValueOnce(new Array(5).fill({})) // Return 5 artists
      .mockResolvedValueOnce([{ count: BigInt(20) }]); // Total 20

    const result = await getTopArtistsService(userId, { limit: 5, offset: 0 });

    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.nextOffset).toBe(5);
  });
});
