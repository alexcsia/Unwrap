import type { IdentifierInput } from "@/workers/platformPolling/lastfm/types";

export type FindOrCreateTrackInput = {
  trackName: string;
  albumName: string;
  durationMs: number;
  platformName: string;
  platformTrackId: string;
  trackIdentifiers: IdentifierInput[];
};

export type SavedTrack = {
  id: string;
  mbid: string | null;
  trackName: string;
  duration: number;
  artistsName: string[];
};

export type TopTrackRow = {
  trackId: string;
  trackName: string;
  albumName: string;
  playCount: bigint;
  durationMs: bigint;
  totalCount: bigint;
  artistNames: string;
};

export type FindTopTracksParams = {
  userId: string;
  start: Date;
  end: Date;
  excludedTrackIds: string[];
  excludedArtistIds: string[];
  limit: number;
  offset: number;
};
