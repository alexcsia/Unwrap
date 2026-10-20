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
