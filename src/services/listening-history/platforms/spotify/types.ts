import { Prisma } from "@prisma/client";

export interface SpotifyUser {
  id: string;
  userId: string;
  platformName: string;
  platformUserId: string;
  AccessToken: string;
  RefreshToken: string;
  expiresAt: Date;
  connectedAt: Date;
}

export interface HistoryEntry {}

export interface HistoryResponse {
  pagination: Pagination;
  history: HistoryEntry[];
}
export interface Pagination {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
  previousOffset: number | null;
}

export interface SpotifyTrackDTO {
  trackName: string;
  platformTrackId: string;
  albumName: string;
  durationMs: number;
  metadata: null;
  isrc?: string;
}

export interface SpotifyListeningHistoryDTO {
  trackId: string | null;
  playedAt: Date;
  source: string;
  uploadedAt: Date;
  platformName: string;
}

export interface SpotifyArtistDTO {
  name: string;
  imageUrl: string | undefined;
  genres: string[];
  platformId: string;
}
