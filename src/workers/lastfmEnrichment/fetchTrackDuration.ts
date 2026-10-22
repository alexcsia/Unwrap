import type { lastfmEnrichmentDeps } from "./processor";
import type { lastfmEnrichmentRes } from "../platformPolling/lastfm/types";
import { Prisma } from "@prisma/client";

export type TrackWithRelations = Prisma.TrackGetPayload<{
  include: {
    artists: true;
    identifiers: true;
  };
}>;

export const getLastfmTrackDuration = async (
  track: TrackWithRelations,
  deps: lastfmEnrichmentDeps,
): Promise<lastfmEnrichmentRes> => {
  // cache the duration per track

  const mbidIdentifier = track.identifiers.find(
    (i) => i.type === "MBID",
  )?.value;

  if (mbidIdentifier !== undefined) {
    const res =
      await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${deps.LASTFM_API_KEY}
      &mbid=${mbidIdentifier}&format=json`);

    const data = await res.json();

    return data;
  } else {
    const artistsName = track.artists[0]?.name;

    const res =
      await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${deps.LASTFM_API_KEY}
      &artist=${artistsName}&track=${track.trackName}&format=json`);

    const data = await res.json();

    if (data.track.duration === 0)
      console.warn("duration data is ", data.track.duration);
    console.log("duration data", data.track.duration);
    return data;
  }
};
