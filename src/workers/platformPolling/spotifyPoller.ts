import { fetchRecentTracks } from "@/platforms/spotify/utils";
import { redisCache } from "@/lib/redis";
import { findOrCreateArtist } from "@/models/artist/artist.model";
import { connectArtistsAndTrack } from "@/models/track/track.model";
import { saveListeningHistory } from "@/models/listeningHistory.model";
import prisma from "@/utils/prisma.util";
import type { SpotifyConnection } from "@/models/connectedPlatforms/types";
import { IdentifierType } from "@prisma/client";
import { Prisma } from "@prisma/client";

export type SpotifyPollerDeps = {
  fetchRecentTracks: typeof fetchRecentTracks;
  cache: {
    set: typeof redisCache.set;
    get: typeof redisCache.get;
    del: typeof redisCache.del;
  };
  // findOrCreateTrack: typeof findOrCreateTrack;
  findOrCreateArtist: typeof findOrCreateArtist;
  connectArtistsAndTrack: typeof connectArtistsAndTrack;
  saveListeningHistory: typeof saveListeningHistory;
  transaction: <T>(fn: () => Promise<T>) => Promise<T>;
};

const defaultPollerDeps: SpotifyPollerDeps = {
  fetchRecentTracks: fetchRecentTracks,
  cache: {
    set: redisCache.set.bind(redisCache),
    get: redisCache.get.bind(redisCache),
    del: redisCache.del.bind(redisCache),
  },
  // findOrCreateTrack: findOrCreateTrack,
  findOrCreateArtist: findOrCreateArtist,
  connectArtistsAndTrack: connectArtistsAndTrack,
  saveListeningHistory: saveListeningHistory,
  transaction: (fn) => prisma.$transaction(fn) as any,
};

export const createSpotifyPoller = (deps = defaultPollerDeps) =>
  async function spotifyPoller(connection: SpotifyConnection) {
    try {
      const cursorKey = `spotify-cursor:${connection.userId}`;
      const cursor = await deps.cache.get(cursorKey);
      const tracks = await deps.fetchRecentTracks(
        connection,
        cursor ?? undefined,
      );

      if (tracks.length === 0) {
        console.log(`No new tracks for ${connection.userId}`);
        return;
      }

      const uniqueTracks = [
        ...new Map(tracks.map((t) => [t.platformTrackId, t])).values(),
      ];
      console.log("tracks found:", tracks.length);
      console.log("tracks unique:", uniqueTracks.length);

      const isrcTrackMap = [
        ...new Map(tracks.map((t) => [t.platformTrackId, t.isrc])).values(),
      ];

      const uniqueArtists = uniqueTracks.flatMap((t) => t.artists);

      const uniqueArtistsPlatformIds = uniqueArtists.map((a) => a.platformId);
      console.log("map of isrcs:", isrcTrackMap);

      const knownPlatformTracks = await prisma.platformTrack.findMany({
        where: {
          platformTrackId: {
            in: uniqueTracks.map((t) => t.platformTrackId),
          },
          platformName: "spotify",
        },
        select: { id: true, trackId: true, platformTrackId: true },
      });

      const knownPlatformArtists = await prisma.platformArtist.findMany({
        where: {
          platformArtistId: { in: uniqueArtistsPlatformIds },
          platformName: "spotify",
        },
        select: {
          id: true,
          artistId: true,
          platformArtistId: true,
        },
      });

      const trackIdentifiers = uniqueTracks.map((t) => t.isrc);

      const knownTrackISRCs = await prisma.trackIdentifier.findMany({
        where: {
          type: "ISRC",
          value: { in: trackIdentifiers },
        },
        select: {
          trackId: true,
          value: true,
        },
      });

      const artistsSaved = await batchSaveSpotifyArtists(
        uniqueArtists,
        knownPlatformArtists,
      );

      await batchSaveSpotifyTracks(
        tracks,
        knownPlatformTracks,
        knownTrackISRCs,
        artistsSaved,
        connection.userId,
      );
    } catch (err: any) {
      console.log(err);
    }
  };

export const spotifyPoller = createSpotifyPoller();

export const batchSaveSpotifyArtists = async (
  uniqueArtists: {
    platformId: string;
    name: string;
  }[],
  knownPlatformArtists: {
    id: string;
    artistId: string;
    platformArtistId: string;
  }[],
) => {
  const platformIdMap = new Map(
    knownPlatformArtists.map((a) => [a.platformArtistId, a.artistId]),
  );

  const artistsToSave = [],
    platformArtistToSave = [],
    artistsReturnObject = [];

  for (const artist of uniqueArtists) {
    const existsByPlatformId = platformIdMap.get(artist.platformId);
    if (existsByPlatformId) {
      continue;
    }

    const id = crypto.randomUUID();

    artistsToSave.push({
      id: id,
      name: artist.name,
    });
    artistsReturnObject.push({
      id: id,
      name: artist.name,
      platformId: artist.platformId,
    });
    platformArtistToSave.push({
      artistId: id,
      platformName: "lastfm",
      platformArtistId: artist.platformId,
    });
  }

  await prisma.$transaction([
    prisma.artist.createMany({ data: artistsToSave, skipDuplicates: true }),
    prisma.platformArtist.createMany({
      data: platformArtistToSave,
      skipDuplicates: true,
    }),
  ]);

  return artistsReturnObject;
};

export const batchSaveSpotifyTracks = async (
  tracks: {
    userId: string;
    platformTrackId: string;
    platformName: string;
    trackName: string;
    albumName: string;
    durationMs: number;
    playedAt: Date;
    source: string;
    metadata: null;
    isrc: string;
    uploadedAt: Date;
    artists: {
      platformId: string;
      name: string;
    }[];
  }[],
  knownPlatformTracks: {
    platformTrackId: string;
    id: string;
    trackId: string;
  }[],
  knownTrackISRCs: {
    trackId: string;
    value: string;
  }[],
  artistsSaved: {
    id: `${string}-${string}-${string}-${string}-${string}`;
    name: string;
    platformId: string;
  }[],
  userId: string,
) => {
  const tracksToSave = [],
    listeningHistoryToSave = [],
    platformTracksToSave = [],
    identififerToSave = [];
  const trackArtistLinksToSave = [];

  const existingIds = new Map<string, string>();
  const platformIdMap = new Map(
    knownPlatformTracks.map((t) => [t.platformTrackId, t.trackId]),
  );
  const knownIdentifierMap = new Map(
    knownTrackISRCs.map((t) => [t.value, t.trackId]),
  );

  for (const track of tracks) {
    const existingByIdentifier = knownIdentifierMap.get(track.isrc);

    const existingByPlatformId = platformIdMap.get(track.platformTrackId);
    if (existingByPlatformId) {
      if (!existingByIdentifier)
        identififerToSave.push({
          trackId: existingByPlatformId,
          type: "ISRC" as IdentifierType,
          value: track.isrc,
          source: "spotify",
        });

      listeningHistoryToSave.push({
        userId,
        platformName: "spotify",
        trackId: existingByPlatformId,
        playedAt: track.playedAt,
        source: "spotify poller",
        uploadedAt: new Date(),
      });
      continue;
    }

    if (existingByIdentifier) {
      platformTracksToSave.push({
        trackId: existingByIdentifier,
        platformName: "spotify",
        platformTrackId: track.platformTrackId,
      });

      listeningHistoryToSave.push({
        userId,
        platformName: "spotify",
        trackId: existingByIdentifier,
        playedAt: track.playedAt,
        source: "spotify poller",
        uploadedAt: new Date(),
      });
      existingIds.set(track.platformTrackId, existingByIdentifier);

      continue;
    }

    let trackId = existingIds.get(track.platformTrackId);
    if (!trackId) {
      const knownArtistIds = [];
      const artistsSavedMap = new Map(
        artistsSaved.map((a) => [a.platformId, a.id]),
      );
      const trackArtists = track.artists.map((a) => a.platformId);
      for (const artist of trackArtists) {
        const artistId = artistsSavedMap.get(artist);
        if (artistId) knownArtistIds.push(artistId);
      }

      if (knownArtistIds.length < 1) {
        console.warn(
          `[batchSaveTracks] Artist not found for track: ${track.trackName} `,
        );
        continue;
      }

      trackId = crypto.randomUUID();
      existingIds.set(track.platformTrackId, trackId);

      tracksToSave.push({
        id: trackId,
        trackName: track.trackName,
        albumName: track.albumName,
        durationMs: track.durationMs,
      });
      platformTracksToSave.push({
        trackId,
        platformName: "spotify",
        platformTrackId: track.platformTrackId,
      });
      for (const artistId of knownArtistIds)
        trackArtistLinksToSave.push({ trackId, artistId });

      if (track.isrc) {
        identififerToSave.push({
          trackId,
          type: "ISRC" as IdentifierType,
          value: track.isrc,
          source: "spotify",
        });
      }
    }

    listeningHistoryToSave.push({
      userId,
      platformName: "spotify",
      trackId: trackId,
      playedAt: track.playedAt,
      source: "spotify poller",
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

  await prisma.$transaction(transactionOps);
};
