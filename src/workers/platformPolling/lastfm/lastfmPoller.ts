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

      // console.log("artists:", artists);
      // console.log("url of artists:", uniqueArtitsUrls);

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

      // console.log("FROM THE DB", knownPlatformArtists);

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
    // artist:[    t.url,
    //     t.artistMbid,
    //     t.artistName, ]
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
      console.log(
        "saving listening history",
        new Date(Number(track.playedAt) * 1000),
        track.trackName,
      );

      listeningHistoryToSave.push({
        userId,
        platformName: "lastfm",
        trackId: existingByUrl.trackId,
        playedAt: new Date(Number(track.playedAt) * 1000),
        source: "lastfm",
        uploadedAt: new Date(),
      });

      if (track.durationMs === 0 || track.durationMs === null) {
        durationJobs.push(existingByUrl.trackId);
      }
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

        console.log(
          "saving listening history",
          new Date(Number(track.playedAt) * 1000),
          track.trackName,
        );
        listeningHistoryToSave.push({
          userId,
          platformName: "lastfm",
          trackId: existingByMbid,
          playedAt: new Date(Number(track.playedAt) * 1000),
          source: "lastfm",
          uploadedAt: new Date(),
        });
        isrcJobs.push(existingByMbid);
        if (track.durationMs === 0 || track.durationMs === null) {
          durationJobs.push(existingByMbid);
        }
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
        if (track.durationMs === 0 || track.durationMs === null) {
          durationJobs.push(trackId);
        }
      } else {
        fuzzyJobs.push(trackId);
        if (track.durationMs === 0 || track.durationMs === null) {
          durationJobs.push(trackId);
        }
      }
    }
    console.log(
      "saving listening history",
      new Date(Number(track.playedAt) * 1000),
      track.trackName,
    );

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
      skipDuplicates: true,
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

  const results = await prisma.$transaction(transactionOps);

  const listeningHistoryResult = results[3] as { count: number };
  const skipped = listeningHistoryToSave.length - listeningHistoryResult.count;

  if (skipped > 0) {
    console.info(
      `[lastfm] user=${userId} history: inserted=${listeningHistoryResult.count} skipped=${skipped} (already saved)`,
    );
  }

  const failed = fuzzyJobs.length
    ? await redisCache.mget(fuzzyJobs.map((id) => `enrichment:failed:${id}`))
    : [];

  const fuzzyToQueue = fuzzyJobs.filter((_, i) => !failed[i]);

  console.error("music brainz jobs:", fuzzyToQueue.length);
  console.log("duration jobs", durationJobs.length);
  await Promise.all([
    lastfmQueue.addBulk(
      durationJobs.map((trackId) => ({
        name: "fetch-duration",
        data: { trackId },
        opts: { jobId: `duration-${trackId}` },
      })),
    ),
  ]);
};
