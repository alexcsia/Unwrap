import type { RawLastFmTrack, LastFmTrack } from "./types";

export const toLastfmTrack = (rawTracks: RawLastFmTrack[]): LastFmTrack[] =>
  rawTracks
    .filter((t) => t.date?.uts !== undefined)
    .map((t) => ({
      trackName: t.name,
      trackMbid: t.mbid?.trim() ? t.mbid : null,
      url: t.url,
      artistName: t.artist["#text"],
      artistMbid: t.artist.mbid?.trim() ? t.artist.mbid : null,
      albumName: t.album["#text"],
      albumMbid: t.album.mbid?.trim() ? t.album.mbid : null,
      playedAt: t.date!.uts,
      source: "lastfm",
      durationMs: null,
    }));
