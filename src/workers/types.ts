import type { Platform } from "@/models/connectedPlatforms/types";

export interface HistoryIngestionJobData {
  userId: string;
  entry: UploadData;
  platform: Platform;
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
  userId: string;
  platform: Platform;
}
