import { redisCache } from "@/lib/redis";
import { saveListeningHistory } from "@/models/listeningHistory.model";

export interface RawLastFmTrack {
  name: string;
  mbid: string;
  url: string;
  artist: {
    "#text": string;
    mbid?: string;
  };
  album: {
    "#text": string;
    mbid?: string;
  };
  date?: {
    uts: string;
    "#text": string;
  };
}

export interface LastFmTrack {
  trackName: string;
  trackMbid: string | null;
  url: string;
  artistName: string;
  artistMbid: string | null;
  albumName: string;
  albumMbid: string | null;
  playedAt: string;
  source: "lastfm";
  durationMs: null | number;
}

export type lastfmPollerDeps = {
  cache: {
    set: typeof redisCache.set;
    get: typeof redisCache.get;
    del: typeof redisCache.del;
  };

  saveListeningHistory: typeof saveListeningHistory;
  transaction: <T>(fn: () => Promise<T>) => Promise<T>;
};

export type lastfmEnrichmentRes = {
  track: {
    name: string;
    mbid: string;
    url: string;
    duration: string;
  };
  artist: {
    name: string;
    mbid: string;
    url: string;
  };
};

export type IdentifierInput = { type: "ISRC" | "MBID"; value: string };
