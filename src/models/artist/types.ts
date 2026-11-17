import type { IdentifierInput } from "@/workers/platformPolling/lastfm/types";

export type FindOrCreateArtistInput = {
  artistName: string;
  platformName: string;
  platformArtistId: string;
  artistIdentifiers: IdentifierInput[];
};

export type TopArtistRow = {
  artistId: string;
  artistName: string;
  imageUrl: string | null;
  playCount: bigint;
  totalDurationMs: bigint;
  totalCount: bigint;
};

export type FindTopArtistsParams = {
  userId: string;
  start: Date;
  end: Date;
  limit: number;
  offset: number;
};

export type ArtistInput = {
  name: string;
  platformId: string;
  genres?: string[];
  imageUrl?: string;
};
