import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

const processSpotifyEntriesMock = mock();

mock.module("@/platforms/spotify/spotifyParser", () => ({
  processSpotifyEntries: processSpotifyEntriesMock,
}));

const { spotifyUploadHandler } = await import("../upload");

const TEST_ROOT = path.join(process.cwd(), ".test-spotify-upload");
const ZIP_PATH = path.join(TEST_ROOT, "spotify-history.zip");
const EXTRACTED_PATH = path.join(TEST_ROOT, "extracted");

const USER_ID = "test-user-id";

function createSpotifyEntry(overrides: Partial<Record<string, any>> = {}) {
  return {
    ts: "2026-01-01T12:00:00Z",
    master_metadata_track_name: "Test Track",
    master_metadata_album_artist_name: "Test Artist",
    master_metadata_album_album_name: "Test Album",
    ms_played: 200000,
    spotify_track_uri: "spotify:track:track-123",
    ...overrides,
  };
}

function createSpotifyZip(files: Record<string, unknown[]>) {
  const zip = new AdmZip();

  for (const [filename, entries] of Object.entries(files)) {
    zip.addFile(
      `Spotify Extended Streaming History/${filename}`,
      Buffer.from(JSON.stringify(entries)),
    );
  }

  fs.mkdirSync(TEST_ROOT, { recursive: true });
  zip.writeZip(ZIP_PATH);
}

describe("spotifyUploadHandler", () => {
  beforeEach(() => {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    processSpotifyEntriesMock.mockReset();
  });

  afterEach(() => {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test("extracts ZIP, processes all JSON files, and cleans up", async () => {
    const file1 = [
      createSpotifyEntry({
        spotify_track_uri: "spotify:track:track-1",
      }),
      createSpotifyEntry({
        spotify_track_uri: "spotify:track:track-2",
      }),
    ];

    const file2 = [
      createSpotifyEntry({
        spotify_track_uri: "spotify:track:track-3",
      }),
    ];

    createSpotifyZip({
      "history-0.json": file1,
      "history-1.json": file2,
    });

    processSpotifyEntriesMock.mockResolvedValue(undefined);

    const result = await spotifyUploadHandler(
      ZIP_PATH,
      EXTRACTED_PATH,
      USER_ID,
    );

    expect(result).toEqual({
      success: true,
      message: "Sync started for 3 tracks across 2 files.",
    });

    expect(processSpotifyEntriesMock).toHaveBeenCalledTimes(2);

    expect(processSpotifyEntriesMock).toHaveBeenCalledWith(file1, USER_ID);

    expect(processSpotifyEntriesMock).toHaveBeenCalledWith(file2, USER_ID);

    expect(fs.existsSync(ZIP_PATH)).toBe(false);
    expect(fs.existsSync(EXTRACTED_PATH)).toBe(false);
  });

  test("throws 400 when Spotify history folder is missing", async () => {
    const zip = new AdmZip();

    zip.addFile(
      "Some Other Folder/history.json",
      Buffer.from(JSON.stringify([createSpotifyEntry()])),
    );

    fs.mkdirSync(TEST_ROOT, { recursive: true });
    zip.writeZip(ZIP_PATH);

    await expect(
      spotifyUploadHandler(ZIP_PATH, EXTRACTED_PATH, USER_ID),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_UPLOAD",
    });

    expect(fs.existsSync(ZIP_PATH)).toBe(false);
    expect(fs.existsSync(EXTRACTED_PATH)).toBe(false);
  });

  test("cleans up when processing fails", async () => {
    createSpotifyZip({
      "history.json": [createSpotifyEntry()],
    });

    processSpotifyEntriesMock.mockRejectedValue(new Error("Queue unavailable"));

    await expect(
      spotifyUploadHandler(ZIP_PATH, EXTRACTED_PATH, USER_ID),
    ).rejects.toThrow("Queue unavailable");

    expect(fs.existsSync(ZIP_PATH)).toBe(false);
    expect(fs.existsSync(EXTRACTED_PATH)).toBe(false);
  });
});
