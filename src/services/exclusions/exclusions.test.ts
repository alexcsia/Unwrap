import { beforeEach, describe, expect, mock, test } from "bun:test";
import { ApiError } from "@/errors/ApiError";
import {
  createExclusionsService,
  type ExclusionRepo,
} from "./exclusions.service";

function makeRepo(): ExclusionRepo {
  return {
    addExclusion: mock(),
    deleteExclusion: mock(),
    getExclusionsByUserId: mock(),
    findArtistWithUserTracks: mock(),
    findTrackWithUserArtists: mock(),
  };
}

const userId = "user-123";

let repo: ExclusionRepo;

let addExclusionService: ReturnType<
  typeof createExclusionsService
>["addExclusionService"];
let removeExclusionService: ReturnType<
  typeof createExclusionsService
>["removeExclusionService"];
let getExclusionsService: ReturnType<
  typeof createExclusionsService
>["getExclusionsService"];

beforeEach(() => {
  repo = makeRepo();
  ({ addExclusionService, removeExclusionService, getExclusionsService } =
    createExclusionsService(repo));
});
describe("addExclusionService", () => {
  test("adds an artist exclusion after a successful lookup", async () => {
    (repo.findArtistWithUserTracks as any).mockResolvedValue({
      id: "artist-456",
      name: "Taylor Swift",
      tracks: [{ id: "track1" }],
    });
    (repo.addExclusion as any).mockResolvedValue({
      id: "excl-1",
      name: "Taylor Swift",
      excludedAt: new Date(),
    });

    const result = await addExclusionService(userId, {
      type: "artist",
      targetId: "artist-456",
    });

    expect(repo.findArtistWithUserTracks).toHaveBeenCalledWith(
      "artist-456",
      userId,
    );
    expect(repo.addExclusion).toHaveBeenCalledWith(userId, {
      type: "artist",
      targetId: "artist-456",
      name: "Taylor Swift",
      artistName: "",
      albumName: null,
    });
    expect(result.name).toBe("Taylor Swift");
  });

  test("adds a track exclusion after a successful history lookup", async () => {
    (repo.findTrackWithUserArtists as any).mockResolvedValue({
      trackName: "Cruel Summer",
      albumName: "Lover",
      artists: [{ name: "Taylor Swift" }],
      listeningHistory: [{ id: "lh1" }],
    });
    (repo.addExclusion as any).mockResolvedValue({
      id: "excl-2",
      name: "Cruel Summer",
      excludedAt: new Date(),
    });

    await addExclusionService(userId, { type: "track", targetId: "track-789" });

    expect(repo.findTrackWithUserArtists).toHaveBeenCalledWith(
      "track-789",
      userId,
    );
    expect(repo.addExclusion).toHaveBeenCalledWith(userId, {
      type: "track",
      targetId: "track-789",
      name: "Cruel Summer",
      artistName: "Taylor Swift",
      albumName: "Lover",
    });
  });

  test("throws 404 when the artist is not found", async () => {
    (repo.findArtistWithUserTracks as any).mockResolvedValue(null);

    await expect(
      addExclusionService(userId, { type: "artist", targetId: "missing" }),
    ).rejects.toThrow(/Artist not found/);
  });

  test("throws 404 when the track has no listening history", async () => {
    (repo.findTrackWithUserArtists as any).mockResolvedValue({
      trackName: "x",
      albumName: "y",
      artists: [],
      listeningHistory: [],
    });

    await expect(
      addExclusionService(userId, { type: "track", targetId: "t" }),
    ).rejects.toThrow(/Track not found/);
  });

  test("throws 400 when targetId is missing", async () => {
    await expect(
      addExclusionService(userId, { type: "artist", targetId: "" }),
    ).rejects.toThrow(/targetId is required/);
  });
});

describe("removeExclusionService", () => {
  test("returns success when a row was deleted", async () => {
    (repo.deleteExclusion as any).mockResolvedValue({ count: 1 });

    const result = await removeExclusionService(userId, "artist", "target-1");
    expect(result).toEqual({ success: true });
    expect(repo.deleteExclusion).toHaveBeenCalledWith(
      userId,
      "artist",
      "target-1",
    );
  });

  test("throws 404 when nothing was deleted", async () => {
    (repo.deleteExclusion as any).mockResolvedValue({ count: 0 });

    await expect(
      removeExclusionService(userId, "artist", "target-1"),
    ).rejects.toThrow(ApiError);
  });
});

describe("getExclusionsService", () => {
  test("groups and formats exclusions", async () => {
    const now = new Date();
    (repo.getExclusionsByUserId as any).mockResolvedValue([
      { type: "artist", targetId: "a1", name: "Artist Name", excludedAt: now },
      {
        type: "track",
        targetId: "t1",
        name: "Track Name",
        artistName: "Artist Name",
        albumName: "Album Name",
        excludedAt: now,
      },
    ]);

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
