import { saveListeningHistory } from "@/models/history.model";
import { isValidListeningHistoryEntry } from "./validators";

export const processSpotifyEntries = async (entries: any[], userId: string) => {
  for (const entry of entries.filter(isValidListeningHistoryEntry)) {
    await saveListeningHistory(
      userId,
      entry.spotify_track_uri,
      new Date(entry.ts),
      entry.master_metadata_track_name,
      entry.master_metadata_album_artist_name,
      entry.master_metadata_album_album_name,
      entry.ms_played,
      "manual_upload",
      entry,
    );
  }
};
