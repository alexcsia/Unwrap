import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import AdmZip from 'adm-zip';
import { fetchListeningHistory } from '../services/spotify.service';
import { saveListeningHistory } from '../models/history.model';


export const processZipFile = async (req: Request, res: Response): Promise<void> => {
    console.log("File in processZipFile:", req.file);
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
  
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "User is not authenticated" });
      return;
    }
  
    const user = req.user as { id: string; accessToken: string; refreshToken: string };
    if (!user || !user.id) {
      res.status(500).json({ error: "Invalid user session" });
      return;
    }
  
    const filePath = req.file?.path;
    
    const extractedPath = path.join(__dirname, "../../uploads/extracted");
  
    if (!filePath) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
  
    if (!filePath || !req.file?.mimetype?.includes("zip")) {
      if (filePath) fs.unlinkSync(filePath); // Cleanup invalid file
      res.status(400).json({ error: "Uploaded file is not a valid zip file" });
      return;
    }
  
    try {
      // Extract the zip file
      const zip = new AdmZip(filePath);
      zip.extractAllTo(extractedPath, true);
      const extractedPathSubDir = extractedPath+"/Spotify Extended Streaming History"
      // Read all JSON files in the extracted directory
      const files = fs.readdirSync(extractedPathSubDir).filter((file) => file.endsWith(".json"));
      console.log(files)
      for (const file of files) {
        const fileContent = fs.readFileSync(path.join(extractedPathSubDir, file), "utf-8");
        const listeningHistory = JSON.parse(fileContent);
  
        // Validate and process entries concurrently
        interface ListeningHistoryEntry {
          ts: string;
          master_metadata_track_name: string;
          master_metadata_album_artist_name: string;
          master_metadata_album_album_name: string;
          ms_played: number;
          spotify_track_uri: string;
          [key: string]: any; // To allow additional properties
        }
  
        await Promise.all(
          (listeningHistory as ListeningHistoryEntry[])
            .filter(isValidListeningHistoryEntry)
            .map((entry: ListeningHistoryEntry) =>
              saveListeningHistory(
                user.id,
                entry.spotify_track_uri,
                new Date(entry.ts),
                entry.master_metadata_track_name,
                entry.master_metadata_album_artist_name,
                entry.master_metadata_album_album_name,
                entry.ms_played,
                "manual_upload",
                entry
              )
            )
        );
      }
  
      res.status(200).json({ message: "Listening history uploaded successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error }) // "Failed to process listening history. Please ensure the uploaded file is valid." });
    } finally {
      // Cleanup
      if (filePath) {
        fs.unlinkSync(filePath);
      }
      fs.rmSync(extractedPath, { recursive: true, force: true });
    };
  };

export const getListeningHistory = async (user: any) => {
    try {
        const history = await fetchListeningHistory(user);
        await Promise.all(
            history.map((item: any) =>
                saveListeningHistory(
                    user.id,
                    item.trackId,
                    item.playedAt,
                    item.trackName,
                    item.artistName,
                    item.albumName,
                    item.durationMs,
                    'get_recently_played',
                    {}
                )
            )
        );
        return history
    } catch {

    }
}

const isValidListeningHistoryEntry = (entry: any): boolean => {
    return (
        typeof entry.ts === "string" &&
        typeof entry.master_metadata_track_name === "string" &&
        typeof entry.master_metadata_album_artist_name === "string" &&
        typeof entry.master_metadata_album_album_name === "string" &&
        typeof entry.ms_played === "number" &&
        typeof entry.spotify_track_uri === "string"
    );
};