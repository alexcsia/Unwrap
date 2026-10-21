import type { lastfmEnrichmentDeps } from "./processor";
import type {
  LastFmTrack,
  lastfmEnrichmentRes,
} from "../platformPolling/lastfm/types";

export const getLastfmTrackDuration = async (
  track: LastFmTrack,
  deps: lastfmEnrichmentDeps,
): Promise<lastfmEnrichmentRes> => {
  // cache the duration per track

  if (track.trackMbid) {
    const res =
      await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${deps.LASTFM_API_KEY}
      &mbid=${track.trackMbid}&format=json`);

    const data = await res.json();

    if (data.track.duration === 0)
      console.warn("duration data is ", data.track.duration);
    console.log("duration data", data.track.duration);
    return data;
  } else {
    const res =
      await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${deps.LASTFM_API_KEY}
      &artist=${track.artistName}&track=${track.trackName}&format=json`);

    const data = await res.json();

    if (data.track.duration === 0)
      console.warn("duration data is ", data.track.duration);
    console.log("duration data", data.track.duration);
    return data;
  }
};
