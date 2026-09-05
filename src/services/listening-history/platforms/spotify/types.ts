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

export interface HistoryEntry {
  track: {
    trackName: string;
    albumName: string;
    durationMs: number;
    trackId: string;
  };
  artists: {
    artistsNames: string[];
    id: string[];
    imageUrl: (string | null)[];
    genres: string[];
  };
  listeningEvent: {
    trackId: string;
    playedAt: Date;
    source: string;
    uploadedAt: Date;
  };
}

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
  // trackId: string | null;
  playedAt: Date;
  source: string;
  uploadedAt: Date;
  platformName: string;
}

export interface SpotifyArtistDTO {
  name: string;
  imageUrl: string;
  genres: string[];
  platformId: string;
}
