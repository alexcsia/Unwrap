export const isValidListeningHistoryEntry = (entry: any): boolean => {
  return (
    typeof entry.ts === "string" &&
    typeof entry.master_metadata_track_name === "string" &&
    typeof entry.master_metadata_album_artist_name === "string" &&
    typeof entry.master_metadata_album_album_name === "string" &&
    typeof entry.ms_played === "number" &&
    typeof entry.spotify_track_uri === "string"
  );
};
