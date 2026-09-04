export interface HistorySyncJobData {
  userId: string;
  entry: UploadData;
}

export interface DeleteUserJobData {
  userId: string;
}
export interface UploadData {
  userId: string;
  platformTrackId: string;
  platformName: string;
  trackName: string;
  albumName: string;
  durationMs: number;
  source: string;
  metadata: null;
  playedAt: Date;
  uploadedAt: Date;
  isrc: string | undefined;
  artists: UploadArtist[];
}

export interface UploadArtist {
  platformId: string;
  name: string;
}

export interface SpotifyPollerData {
  userId: string;
}
