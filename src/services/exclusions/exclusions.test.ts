import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { ApiError } from "@/errors/ApiError";
import {
  addExclusionService,
  removeExclusionService,
  getExclusionsService,
} from "./exclusions.service";
import * as exclusionModel from "@/models/exclusion.model";
import prisma from "@/utils/prisma.util";

mock.module("@/models/exclusion.model", () => ({
  addExclusion: mock(),
  deleteExclusion: mock(),
  getExclusionsByUserId: mock(),
}));

const mockedArtistFindUnique = mock();
const mockedTrackFindUnique = mock();

const originalArtistFindUnique = prisma.artist.findUnique;
const originalTrackFindUnique = prisma.track.findUnique;

describe("Exclusion Service", () => {
  const userId = "user-123";

  beforeEach(() => {
    (exclusionModel.addExclusion as any).mockClear();
    (exclusionModel.deleteExclusion as any).mockClear();
    (exclusionModel.getExclusionsByUserId as any).mockClear();

    mockedArtistFindUnique.mockReset();
    mockedTrackFindUnique.mockReset();

    mockedArtistFindUnique.mockResolvedValue(null);
    mockedTrackFindUnique.mockResolvedValue(null);

    prisma.artist.findUnique =
      mockedArtistFindUnique as typeof prisma.artist.findUnique;

    prisma.track.findUnique =
      mockedTrackFindUnique as typeof prisma.track.findUnique;
  });

  afterEach(() => {
    prisma.artist.findUnique = originalArtistFindUnique;
    prisma.track.findUnique = originalTrackFindUnique;
  });

  describe("addExclusionService", () => {
    test("should add an artist exclusion after successful DB lookup", async () => {
      const targetId = "artist-456";
      const mockArtist = {
        id: targetId,
        name: "Taylor Swift",
        tracks: [{ id: "track1" }],
      };
      const mockExclusion = {
        id: "excl-1",
        name: "Taylor Swift",
        excludedAt: new Date(),
      };

      mockedArtistFindUnique.mockResolvedValue(mockArtist);
      (exclusionModel.addExclusion as any).mockResolvedValue(mockExclusion);

      const result = await addExclusionService(userId, {
        type: "artist",
        targetId,
      });

      expect(prisma.artist.findUnique).toHaveBeenCalledWith({
        where: { id: targetId },
        include: {
          tracks: {
            where: {
              listeningHistory: {
                some: { userId },
              },
            },
            take: 1,
          },
        },
      });

      expect(exclusionModel.addExclusion).toHaveBeenCalledWith(userId, {
        type: "artist",
        targetId,
        name: "Taylor Swift",
        artistName: "",
        albumName: null,
      });

      expect(result.name).toBe("Taylor Swift");
    });

    test("should add a track exclusion after successful history lookup", async () => {
      const targetId = "track-789";
      const mockTrack = {
        trackName: "Cruel Summer",
        albumName: "Lover",
        artists: [{ name: "Taylor Swift" }],
        listeningHistory: [{ id: "lh1" }],
      };
      const mockExclusion = {
        id: "excl-2",
        name: "Cruel Summer",
        excludedAt: new Date(),
      };

      mockedTrackFindUnique.mockResolvedValue(mockTrack);
      (exclusionModel.addExclusion as any).mockResolvedValue(mockExclusion);

      await addExclusionService(userId, { type: "track", targetId });

      expect(prisma.track.findUnique).toHaveBeenCalled();
      expect(exclusionModel.addExclusion).toHaveBeenCalledWith(userId, {
        type: "track",
        targetId,
        name: "Cruel Summer",
        artistName: "Taylor Swift",
        albumName: "Lover",
      });
    });

    test("should throw 404 if artist is not found in database", async () => {
      mockedArtistFindUnique.mockResolvedValue(null);

      await expect(
        addExclusionService(userId, { type: "artist", targetId: "missing" }),
      ).rejects.toThrow(
        new ApiError(404, "NOT_FOUND", "Artist not found in local database."),
      );
    });

    test("should throw 400 if targetId is missing", async () => {
      await expect(
        addExclusionService(userId, { type: "artist", targetId: "" }),
      ).rejects.toThrow(/targetId is required/);
    });
  });

  describe("removeExclusionService", () => {
    test("should delete and return success", async () => {
      (exclusionModel.deleteExclusion as any).mockResolvedValue({ count: 1 });

      const result = await removeExclusionService(userId, "artist", "target-1");
      expect(result).toEqual({ success: true });
    });

    test("should throw 404 if nothing deleted", async () => {
      (exclusionModel.deleteExclusion as any).mockResolvedValue({ count: 0 });

      await expect(
        removeExclusionService(userId, "artist", "target-1"),
      ).rejects.toThrow(ApiError);
    });
  });

  describe("getExclusionsService", () => {
    test("should correctly group and format exclusions", async () => {
      const now = new Date();
      const mockExclusions = [
        {
          type: "artist",
          targetId: "a1",
          name: "Artist Name",
          excludedAt: now,
        },
        {
          type: "track",
          targetId: "t1",
          name: "Track Name",
          artistName: "Artist Name",
          albumName: "Album Name",
          excludedAt: now,
        },
      ];

      (exclusionModel.getExclusionsByUserId as any).mockResolvedValue(
        mockExclusions,
      );

      const result = await getExclusionsService(userId);

      expect(result.exclusions.artists[0]).toMatchObject({
        artistId: "a1",
        artistName: "Artist Name",
      });

      expect(result.exclusions.tracks[0]).toMatchObject({
        trackId: "t1",
        trackName: "Track Name",
      });
    });
  });
});
