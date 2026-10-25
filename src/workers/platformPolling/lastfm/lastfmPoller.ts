import { redisCache } from "@/lib/redis";
import type { LastfmConnection } from "@/models/connectedPlatforms/types";
import { CURSOR_TTL } from "../processPlatformPolling";
import prisma from "@/utils/prisma.util";
import { saveListeningHistory } from "@/models/listeningHistory.model";
import { lastfmQueue } from "@/lib/queue";
import type { IdentifierType } from "@prisma/client";
import type { lastfmPollerDeps, LastFmTrack } from "./types";
import { toLastfmTrack } from "./utils";
import { getUserRecentTracks } from "@/platforms/lastfm/getUserRecent";
import { Prisma } from "@prisma/client";

const defaultPollerDeps: lastfmPollerDeps = {
  cache: {
    set: redisCache.set.bind(redisCache),
    get: redisCache.get.bind(redisCache),
    del: redisCache.del.bind(redisCache),
  },

  saveListeningHistory: saveListeningHistory,
  transaction: (fn) => prisma.$transaction(fn) as any,
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

      console.error("tracks polled:", tracks.length);

      const uniqueTracks = [...new Map(tracks.map((t) => [t.url, t])).values()];
      console.error("unique tracks polled:", uniqueTracks.length);

      const artists = uniqueTracks.map((t) => [
        t.url,
        t.artistMbid,
        t.artistName,
      ]);
      const uniqueArtitsUrls = artists
        .map((a) => a[0]?.split("/_/")[0])
        .filter((url): url is string => !!url);

      console.log("artists:", artists);
      console.log("url of artists:", uniqueArtitsUrls);

      const knownPlatformTracks = await prisma.platformTrack.findMany({
        where: {
          platformName: "lastfm",
          platformTrackId: { in: uniqueTracks.map((t) => t.url) },
        },
        select: {
          platformTrackId: true,
          trackId: true,
          track: { select: { durationMs: true, artists: true } },
        },
      });

      const knownPlatformArtists = await prisma.platformArtist.findMany({
        where: {
          platformName: "lastfm",
          platformArtistId: { in: uniqueArtitsUrls.flat() },
        },
        select: {
          platformArtistId: true,
          artistId: true,
          artist: true,
        },
      });

      console.log("FROM THE DB", knownPlatformArtists);

      const knownUrlMap = new Map(
        knownPlatformTracks.map((t) => [
          t.platformTrackId, // urls
          {
            trackId: t.trackId,
            durationMs: t.track.durationMs,
            artists: t.track.artists,
          },
        ]),
      );

      const knownArtistUrlMap = new Map(
        knownPlatformArtists.map((a) => [
          a.platformArtistId,
          { artistId: a.artistId, artist: a.artist },
        ]),
      );

      const mbids = uniqueTracks
        .map((t) => t.trackMbid)
        .filter((m): m is string => !!m);

      const knownMbids = await prisma.trackIdentifier.findMany({
        where: {
          type: "MBID",
          value: { in: mbids },
        },
        select: {
          trackId: true,
          value: true,
        },
      });

      const knownMbidMap = new Map(knownMbids.map((m) => [m.value, m.trackId]));

      const knownArtistsMbids = await prisma.artistIdentifier.findMany({
        where: {
          type: "MBID",
          value: { in: uniqueArtitsUrls },
        },
        select: {
          artistId: true,
          value: true,
        },
      });

      const knownArtistMbidMap = new Map(
        knownArtistsMbids.map((m) => [m.value, m.artistId]),
      );

      const knownArtistMap = new Map(
        knownPlatformArtists.map((a) => [a.artist.name, a.artistId]),
      );

      const artistsToSave = await batchSaveArtists(
        artists,
        knownArtistUrlMap,
        knownArtistMbidMap,
        knownArtistMap,
        connection.userId,
      );

      await batchSaveTracks(
        tracks,
        knownUrlMap,
        knownMbidMap,
        artistsToSave,
        knownArtistMap,
        connection.userId,
      );

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

export const batchSaveArtists = async (
  artists: (string | null)[][],
  knownArtistUrlMap: Map<
    string,
    {
      artistId: string;
      artist: {
        id: string;
        name: string;
        imageUrl: string | null;
        genres: string[];
      };
    }
  >,
  knownArtistMbidMap: Map<string, string>,
  knownArtistMap: Map<string, string>,
  userId: string,
) => {
  const artistsToSave = [],
    platformArtistToSave = [],
    identififerToSave = [];

  for (const artist of artists) {
    const existingByUrl = knownArtistUrlMap.get(artist[0]!);
    if (existingByUrl) continue;

    if (artist[1]) {
      const existingByMbid = knownArtistMbidMap.get(artist[1]);
      if (existingByMbid) {
        platformArtistToSave.push({
          artistId: existingByMbid,
          platformName: "lastfm",
          platformArtistId: artist[0]!,
        });
        continue;
      }
    }

    // no platformTrack, no mbid

    const id = crypto.randomUUID();

    artistsToSave.push({
      id: id,
      name: artist[2]!,
    });
    platformArtistToSave.push({
      artistId: id,
      platformName: "lastfm",
      platformArtistId: artist[0]!,
    });

    if (artist[1])
      identififerToSave.push({
        artistId: id,
        type: "MBID" as IdentifierType,
        value: artist[1],
        source: "lastfm",
      });
  }

  await prisma.$transaction([
    prisma.artist.createMany({ data: artistsToSave, skipDuplicates: true }),
    prisma.platformArtist.createMany({
      data: platformArtistToSave,
      skipDuplicates: true,
    }),
    prisma.artistIdentifier.createMany({
      data: identififerToSave,
      skipDuplicates: true,
    }),
  ]);

  return artistsToSave;
};

export const batchSaveTracks = async (
  tracks: LastFmTrack[],
  knownUrlMap: Map<
    string,
    {
      trackId: string;
      durationMs: number;
      artists: {
        id: string;
        name: string;
        imageUrl: string | null;
        genres: string[];
      }[];
    }
  >,
  knownMbidMap: Map<string, string>,
  artistsToSave: { id: string; name: string }[],
  knownArtistMap: Map<string, string>,
  userId: string,
) => {
  const tracksToSave = [],
    platformTracksToSave = [],
    identififerToSave = [],
    trackArtistLinksToSave = [],
    listeningHistoryToSave = [];
  const fuzzyJobs: string[] = [],
    durationJobs: string[] = [],
    isrcJobs = [];

  const artistIdByName = new Map(artistsToSave.map((a) => [a.name, a.id]));

  const idByUrl = new Map<string, string>();

  for (const track of tracks) {
    const existingByUrl = knownUrlMap.get(track.url);

    if (existingByUrl) {
      if (track.trackMbid && !knownMbidMap.has(track.trackMbid)) {
        identififerToSave.push({
          trackId: existingByUrl.trackId,
          type: "MBID" as IdentifierType,
          value: track.trackMbid,
          source: "lastfm",
        });
        isrcJobs.push(existingByUrl.trackId, track.trackMbid);
      }

      listeningHistoryToSave.push({
        userId,
        platformName: "lastfm",
        trackId: existingByUrl.trackId,
        playedAt: new Date(Number(track.playedAt) * 1000),
        source: "lastfm",
        uploadedAt: new Date(),
      });
      continue;
    }

    if (track.trackMbid) {
      const existingByMbid = knownMbidMap.get(track.trackMbid);
      if (existingByMbid) {
        platformTracksToSave.push({
          trackId: existingByMbid,
          platformName: "lastfm",
          platformTrackId: track.url,
        });
        idByUrl.set(track.url, existingByMbid);

        listeningHistoryToSave.push({
          userId,
          platformName: "lastfm",
          trackId: existingByMbid,
          playedAt: new Date(Number(track.playedAt) * 1000),
          source: "lastfm",
          uploadedAt: new Date(),
        });
        isrcJobs.push(existingByMbid);
        continue;
      }
    }

    let trackId = idByUrl.get(track.url);

    if (!trackId) {
      const artistId =
        artistIdByName.get(track.artistName) ??
        knownArtistMap.get(track.artistName);

      if (!artistId) {
        console.warn(
          `[batchSaveTracks] Artist not found for track: ${track.trackName} by ${track.artistName}`,
        );
        continue;
      }

      trackId = crypto.randomUUID();
      idByUrl.set(track.url, trackId);

      tracksToSave.push({
        id: trackId,
        trackName: track.trackName,
        albumName: track.albumName,
        durationMs: 0,
      });
      platformTracksToSave.push({
        trackId,
        platformName: "lastfm",
        platformTrackId: track.url,
      });
      trackArtistLinksToSave.push({ trackId, artistId });

      if (track.trackMbid) {
        identififerToSave.push({
          trackId,
          type: "MBID" as IdentifierType,
          value: track.trackMbid,
          source: "lastfm",
        });
        isrcJobs.push(trackId, track.trackMbid);
      } else {
        fuzzyJobs.push(trackId);
      }
    }

    listeningHistoryToSave.push({
      userId,
      platformName: "lastfm",
      trackId,
      playedAt: new Date(Number(track.playedAt) * 1000),
      source: "lastfm",
      uploadedAt: new Date(),
    });
  }

  const transactionOps: Prisma.PrismaPromise<any>[] = [
    prisma.track.createMany({ data: tracksToSave, skipDuplicates: true }),
    prisma.platformTrack.createMany({
      data: platformTracksToSave,
      skipDuplicates: true,
    }),
    prisma.trackIdentifier.createMany({
      data: identififerToSave,
      skipDuplicates: true,
    }),
    prisma.listeningHistory.createMany({
      data: listeningHistoryToSave,
    }),
  ];

  if (trackArtistLinksToSave.length > 0) {
    transactionOps.push(
      prisma.$executeRaw`
      INSERT INTO "_TrackArtists" ("A", "B")
      VALUES ${Prisma.join(
        trackArtistLinksToSave.map(
          (l) => Prisma.sql`(${l.artistId}, ${l.trackId})`,
        ),
      )}
      ON CONFLICT DO NOTHING
    `,
    );
  }

  await prisma.$transaction(transactionOps);

  const failed = fuzzyJobs.length
    ? await redisCache.mget(fuzzyJobs.map((id) => `enrichment:failed:${id}`))
    : [];

  const fuzzyToQueue = fuzzyJobs.filter((_, i) => !failed[i]);

  console.error("music brainz jobs:", fuzzyToQueue.length);

  await Promise.all([
    lastfmQueue.addBulk(
      durationJobs.map((trackId) => ({
        name: "fetch-duration",
        data: { trackId },
        opts: { jobId: `duration-${trackId}` },
      })),
    ),

    // musicBrainzQueue.addBulk(
    //   isrcJobs.map((job) => ({
    //     name: "fetch-isrc",
    //     data: { trackId: job.id, mbid: job.mbid },
    //     opts: { jobId: `` },
    //   })),
    // ),
    //   musicBrainzQueue.addBulk(
    //     fuzzyToQueue.map((trackId) => ({
    //       name: "fuzzy-search",
    //       data: { trackId },
    //       opts: { jobId: `fuzzy-${trackId}` },
    //     })),
    //   ),
  ]);
};

// export const upsertTrackWithHistory = async (
//   track: LastFmTrack,
//   userId: string,
// ): Promise<SavedTrack> => {
//   const trackIdentifiers = track.trackMbid
//     ? [{ type: "MBID" as const, value: track.trackMbid }]
//     : [];

//   const savedTrack = await findOrCreateTrackByIdentifiers({
//     trackName: track.trackName,
//     albumName: track.albumName,
//     durationMs: track.durationMs ?? 0, // lastfm doesnt give duration
//     platformName: "lastfm",
//     platformTrackId: track.url, // replacement for platformtrack id, will always point to same track
//     trackIdentifiers,
//   });

//   const artistIdentifiers = track.artistMbid
//     ? [{ type: "MBID" as const, value: track.artistMbid }]
//     : [];

//   const savedArtists = await findOrCreateArtistByIdentifiers({
//     artists: [
//       {
//         artistName: track.artistName,
//         platformArtistId: track.artistMbid ?? `pending:${track.artistName}`,
//         platformName: "last.fm",
//         artistIdentifiers,
//       },
//     ],
//   });

//   await updateTrackArtists(savedTrack, savedArtists);

//   await saveListeningHistory(
//     {
//       platformName: "lastfm",
//       playedAt: new Date(Number(track.playedAt) * 1000),
//       source: "lastfm",
//       uploadedAt: new Date(),
//     },
//     savedTrack.id,
//     userId,
//   );

//   return {
//     id: savedTrack.id,
//     mbid: track.trackMbid,
//     trackName: savedTrack.trackName,
//     duration: savedTrack.durationMs,
//     artistsName: savedArtists.map((artist) => artist.name),
//   };
// };

// export const findOrCreateTrackByIdentifiers = async (
//   input: FindOrCreateTrackInput,
// ): Promise<Track> => {
//   const existingPlatformTrack = await findUniquePlatformTrack(input);

//   if (existingPlatformTrack) {
//     await attachMissingIdentifiers(
//       existingPlatformTrack.trackId,
//       input.trackIdentifiers,
//       input.platformName,
//     );
//     return existingPlatformTrack.track;
//   }

//   if (input.trackIdentifiers.length > 0) {
//     const matched = await findFirstTrack(input);
//     if (matched) {
//       await createPlatformTrack(matched, input);

//       await attachMissingIdentifiers(
//         matched.id,
//         input.trackIdentifiers,
//         input.platformName,
//       );
//     }
//   }
//   try {
//     const savedTrack = await createTrack(input);

//     return savedTrack;
//   } catch (error: any) {
//     if (error.code === "P2002") {
//       return await findOrCreateTrackByIdentifiers(input);
//     }
//     throw error;
//   }
// };

// export const attachMissingIdentifiers = async (
//   trackId: string,
//   identifiers: IdentifierInput[],
//   platformName: string,
// ): Promise<void> => {
//   if (identifiers.length === 0) return;

//   const trackIdentifiers = await findTrackIdentifiers(trackId, identifiers);

//   const existingKeys = new Set(
//     trackIdentifiers.map((e) => `${e.type}:${e.value}`),
//   );

//   const missing = identifiers.filter(
//     (i) => !existingKeys.has(`${i.type}:${i.value}`),
//   );

//   if (missing.length === 0) return;

//   await createTrackIdentifiers(missing, trackId, platformName);
// };

// export const findOrCreateArtistByIdentifiers = async (input: {
//   artists: FindOrCreateArtistInput[];
// }): Promise<Artist[]> => {
//   const results: Artist[] = [];

//   for (const a of input.artists) {
//     const existingPlatformArtist = await findPlatformArtist(a);

//     if (existingPlatformArtist) {
//       await attachMissingArtistIdentifiers(
//         existingPlatformArtist.artistId,
//         a.artistIdentifiers,
//         a.platformName,
//       );
//       results.push(existingPlatformArtist.artist);
//       continue;
//     }

//     if (a.artistIdentifiers.length > 0) {
//       const matched = await findFirstArtist(a);

//       if (matched) {
//         await createPlatformArtist(matched, a);
//         await attachMissingArtistIdentifiers(
//           matched.id,
//           a.artistIdentifiers,
//           a.platformName,
//         );
//         results.push(matched);
//         continue;
//       }
//     }

//     try {
//       const created = await createArtist(a);
//       results.push(created);
//     } catch (error: any) {
//       if (error.code === "P2002") {
//         const [retried] = await findOrCreateArtistByIdentifiers({
//           artists: [a],
//         });
//         results.push(retried!);
//         continue;
//       }
//       throw error;
//     }
//   }

//   return results;
// };

// //instead of one db lookup to get them and another to save new ones
// //, see if i can add new ones to old ones and skip the ones repeating all in one db query
// const attachMissingArtistIdentifiers = async (
//   artistId: string,
//   identifiers: IdentifierInput[],
//   source: string,
// ): Promise<void> => {
//   if (identifiers.length === 0) return;

//   const existing = await findArtistIdentifier(artistId, identifiers);

//   const have = new Set(existing.map((e) => `${e.type}:${e.value}`));
//   const missing = identifiers.filter((i) => !have.has(`${i.type}:${i.value}`));

//   if (missing.length === 0) return;

//   await createArtistIdentifiers(missing, artistId, source);
// };
