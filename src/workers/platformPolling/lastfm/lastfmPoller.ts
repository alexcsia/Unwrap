import { redisCache } from "@/lib/redis";
import type { LastfmConnection } from "@/models/connectedPlatforms/types";
import { CURSOR_TTL } from "../processPlatformPolling";
import prisma from "@/utils/prisma.util";
import { saveListeningHistory } from "@/models/listeningHistory.model";
import { musicBrainzQueue } from "@/lib/queue";
import type { Artist, Track } from "@prisma/client";
import type {
  lastfmPollerDeps,
  lastfmResponse,
  LastFmTrack,
  lastfmEnrichmentRes,
  IdentifierInput,
} from "./types";
import type { FindOrCreateArtistInput } from "@/models/artist";
import type { FindOrCreateTrackInput, SavedTrack } from "@/models/track/types";
import { toLastfmTrack } from "./utils";
import {
  createArtistIdentifiers,
  findArtistIdentifier,
} from "@/models/artistIdentifier.model";
import { findFirstArtist, createArtist } from "@/models/artist";
import {
  createPlatformArtist,
  findPlatformArtist,
} from "@/models/platformArtist.model";
import {
  findTrackIdentifiers,
  createTrackIdentifiers,
  needsEnrichment,
} from "@/models/trackIdentifier.model";
import {
  findUniquePlatformTrack,
  createPlatformTrack,
} from "@/models/platformTrack.model";
import {
  findFirstTrack,
  createTrack,
  updateTrackArtists,
} from "@/models/track";

const defaultPollerDeps: lastfmPollerDeps = {
  cache: {
    set: redisCache.set.bind(redisCache),
    get: redisCache.get.bind(redisCache),
    del: redisCache.del.bind(redisCache),
  },

  saveListeningHistory: saveListeningHistory,
  transaction: (fn) => prisma.$transaction(fn) as any,
};

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

export const getUserRecentTracks = async (
  username: string,
  cursor: string | null,
): Promise<lastfmResponse> => {
  const res = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${LASTFM_API_KEY}&from=${cursor}&format=json`,

    {
      headers: {
        "User-Agent": "UnwrapApp/1.0.0 (alexiutttt@gmail.com)",
        Accept: "application/json",
      },
    },
  );
  const data = await res.json();
  return data;
};

//abstract away into a new worker
export const getLastfmTrackDuration = async (
  track: LastFmTrack,
): Promise<lastfmEnrichmentRes> => {
  // cache the duration per track

  if (track.trackMbid) {
    const res =
      await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${LASTFM_API_KEY}
      &mbid=${track.trackMbid}&format=json`);

    const data = await res.json();

    if (data.track.duration === 0)
      console.warn("duration data is ", data.track.duration);
    console.log("duration data", data.track.duration);
    return data;
  } else {
    const res =
      await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${LASTFM_API_KEY}
      &artist=${track.artistName}&track=${track.trackName}&format=json`);

    const data = await res.json();

    if (data.track.duration === 0)
      console.warn("duration data is ", data.track.duration);
    console.log("duration data", data.track.duration);
    return data;
  }
};

export const createLastfmPoller = (
  deps: lastfmPollerDeps = defaultPollerDeps,
) => {
  return async function lastfmPoller(connection: LastfmConnection) {
    const lockKey = `lastfm-poll-lock:${connection.userId}`;

    try {
      const cursorKey = `lastfm-cursor:${connection.userId}`;
      const cursor = await deps.cache.get(cursorKey);

      const data = await getUserRecentTracks(
        connection.platformUsername,
        cursor ?? null,
      );

      const tracks = toLastfmTrack(data.recenttracks.track).filter(
        (t: LastFmTrack): t is LastFmTrack => t !== null,
      );
      for (let track of tracks) {
        // check if the mbid of each track is cached
        // if not cached, check if it exists in the database and retrieve the isrc linked to it (if it exists)
        if (track.durationMs === 0 || track.durationMs === null) {
          const enrichedDurationTrack = await getLastfmTrackDuration(track);
          track.durationMs =
            Number(enrichedDurationTrack.track.duration) ?? null;
          //save to db?
        }

        //if adding duration before saving, i cant use the mbid even if i have it in the db

        const saved = await upsertTrackWithHistory(track, connection.userId);

        //if i add duration after, thats an additional db query after saving for all tracks
        try {
          if (await needsEnrichment(saved.id)) {
            if (saved.mbid) {
              console.log("enqueuing for isrcs");
              await musicBrainzQueue.add(
                "fetch-isrcs",
                { track: saved },
                { jobId: `isrc-${saved.mbid ?? saved.id}` },
              );
            } else {
              console.log("enqueuing for fuzzy");

              await musicBrainzQueue.add(`fuzzy-search`, {
                track: saved,
              });
            }
          }
        } catch (err: any) {
          console.log(
            `error for ${track} adding ${saved} to enrichment queue`,
            err,
          );
          continue;
        }
      }

      const latestPlayedAt = tracks[0]?.playedAt;
      if (latestPlayedAt) {
        await deps.cache.set(cursorKey, latestPlayedAt, "EX", CURSOR_TTL);
      }
    } finally {
      await deps.cache.del(lockKey).catch(console.error);
    }
  };
};

export const lastfmPoller = createLastfmPoller();

export const upsertTrackWithHistory = async (
  track: LastFmTrack,
  userId: string,
): Promise<SavedTrack> => {
  const trackIdentifiers = track.trackMbid
    ? [{ type: "MBID" as const, value: track.trackMbid }]
    : [];

  const savedTrack = await findOrCreateTrackByIdentifiers({
    trackName: track.trackName,
    albumName: track.albumName,
    durationMs: track.durationMs ?? 0, // lastfm doesnt give duration
    platformName: "lastfm",
    platformTrackId: track.url, // replacement for platformtrack id, will always point to same track
    trackIdentifiers,
  });

  const artistIdentifiers = track.artistMbid
    ? [{ type: "MBID" as const, value: track.artistMbid }]
    : [];

  const savedArtists = await findOrCreateArtistByIdentifiers({
    artists: [
      {
        artistName: track.artistName,
        platformArtistId: track.artistMbid ?? `pending:${track.artistName}`,
        platformName: "last.fm",
        artistIdentifiers,
      },
    ],
  });

  await updateTrackArtists(savedTrack, savedArtists);

  await saveListeningHistory(
    {
      platformName: "lastfm",
      playedAt: new Date(Number(track.playedAt) * 1000),
      source: "lastfm",
      uploadedAt: new Date(),
    },
    savedTrack.id,
    userId,
  );

  return {
    id: savedTrack.id,
    mbid: track.trackMbid,
    trackName: savedTrack.trackName,
    duration: savedTrack.durationMs,
    artistsName: savedArtists.map((artist) => artist.name),
  };
};

export const findOrCreateTrackByIdentifiers = async (
  input: FindOrCreateTrackInput,
): Promise<Track> => {
  const existingPlatformTrack = await findUniquePlatformTrack(input);

  if (existingPlatformTrack) {
    await attachMissingIdentifiers(
      existingPlatformTrack.trackId,
      input.trackIdentifiers,
      input.platformName,
    );
    return existingPlatformTrack.track;
  }

  if (input.trackIdentifiers.length > 0) {
    const matched = await findFirstTrack(input);
    if (matched) {
      await createPlatformTrack(matched, input);

      await attachMissingIdentifiers(
        matched.id,
        input.trackIdentifiers,
        input.platformName,
      );
    }
  }
  try {
    const savedTrack = await createTrack(input);

    return savedTrack;
  } catch (error: any) {
    if (error.code === "P2002") {
      return await findOrCreateTrackByIdentifiers(input);
    }
    throw error;
  }
};

export const attachMissingIdentifiers = async (
  trackId: string,
  identifiers: IdentifierInput[],
  platformName: string,
): Promise<void> => {
  if (identifiers.length === 0) return;

  const trackIdentifiers = await findTrackIdentifiers(trackId, identifiers);

  const existingKeys = new Set(
    trackIdentifiers.map((e) => `${e.type}:${e.value}`),
  );

  const missing = identifiers.filter(
    (i) => !existingKeys.has(`${i.type}:${i.value}`),
  );

  if (missing.length === 0) return;

  await createTrackIdentifiers(missing, trackId, platformName);
};

export const findOrCreateArtistByIdentifiers = async (input: {
  artists: FindOrCreateArtistInput[];
}): Promise<Artist[]> => {
  const results: Artist[] = [];

  for (const a of input.artists) {
    const existingPlatformArtist = await findPlatformArtist(a);

    if (existingPlatformArtist) {
      await attachMissingArtistIdentifiers(
        existingPlatformArtist.artistId,
        a.artistIdentifiers,
        a.platformName,
      );
      results.push(existingPlatformArtist.artist);
      continue;
    }

    if (a.artistIdentifiers.length > 0) {
      const matched = await findFirstArtist(a);

      if (matched) {
        await createPlatformArtist(matched, a);
        await attachMissingArtistIdentifiers(
          matched.id,
          a.artistIdentifiers,
          a.platformName,
        );
        results.push(matched);
        continue;
      }
    }

    try {
      const created = await createArtist(a);
      results.push(created);
    } catch (error: any) {
      if (error.code === "P2002") {
        const [retried] = await findOrCreateArtistByIdentifiers({
          artists: [a],
        });
        results.push(retried!);
        continue;
      }
      throw error;
    }
  }

  return results;
};

//instead of one db lookup to get them and another to save new ones
//, see if i can add new ones to old ones and skip the ones repeating all in one db query
const attachMissingArtistIdentifiers = async (
  artistId: string,
  identifiers: IdentifierInput[],
  source: string,
): Promise<void> => {
  if (identifiers.length === 0) return;

  const existing = await findArtistIdentifier(artistId, identifiers);

  const have = new Set(existing.map((e) => `${e.type}:${e.value}`));
  const missing = identifiers.filter((i) => !have.has(`${i.type}:${i.value}`));

  if (missing.length === 0) return;

  await createArtistIdentifiers(missing, artistId, source);
};
