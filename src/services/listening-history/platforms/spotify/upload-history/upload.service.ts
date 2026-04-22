import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import { processSpotifyEntries } from "./spotifyParser";
import { ApiError } from "@/errors/ApiError";

const SPOTIFY_HISTORY_FOLDER = "Spotify Extended Streaming History";

interface ISpotifyListeningEntry {
  ts: string;
  master_metadata_track_name: string;
  master_metadata_album_artist_name: string;
  master_metadata_album_album_name: string;
  ms_played: number;
  spotify_track_uri: string;
  [key: string]: any;
}

export const spotifyUploadHandler = async (
  filePath: string,
  extractedPath: string,
  userId: string,
) => {
  try {
    extractZip(filePath, extractedPath);

    const historyDir = path.join(extractedPath, SPOTIFY_HISTORY_FOLDER);

    if (!fs.existsSync(historyDir)) {
      throw new ApiError(
        400,
        "INVALID_UPLOAD",
        "Spotify history folder not found",
      );
    }

    const jsonFiles = getJsonFiles(historyDir);
    let totalEntriesProcessed = 0;

    for (const file of jsonFiles) {
      const entries = readListeningEntries(historyDir, file);
      await processSpotifyEntries(entries, userId);
      totalEntriesProcessed += entries.length;
    }
    return {
      success: true,
      message: `Sync started for ${totalEntriesProcessed} tracks across ${jsonFiles.length} files.`,
    };
  } finally {
    cleanup(filePath, extractedPath);
  }
};

function extractZip(filePath: string, extractedPath: string) {
  const zip = new AdmZip(filePath);
  zip.extractAllTo(extractedPath, true);
}

function getJsonFiles(directory: string): string[] {
  return fs.readdirSync(directory).filter((file) => file.endsWith(".json"));
}

function readListeningEntries(
  directory: string,
  file: string,
): ISpotifyListeningEntry[] {
  const fileContent = fs.readFileSync(path.join(directory, file), "utf-8");
  return JSON.parse(fileContent);
}

function cleanup(filePath: string, extractedPath: string) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  if (extractedPath && fs.existsSync(extractedPath)) {
    fs.rmSync(extractedPath, { recursive: true, force: true });
  }
}
