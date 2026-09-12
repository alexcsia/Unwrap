import type { UserConnectedPlatforms } from "@/services/listeningHistory/types";

export interface HistoryIngestionJobData {
  userId: string;
  entry: UploadData;
  platform: string;
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
  isrc?: string;
  metadata: any;
  playedAt: Date;
  uploadedAt: Date;
  artists: UploadArtist[];
}

export interface UploadArtist {
  platformId: string;
  name: string;
}

export interface pollerData {
  userConnectedPlatforms: UserConnectedPlatforms;
  platform: string;
}
