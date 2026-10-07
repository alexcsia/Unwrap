import { z } from "zod";

export const recentTracksInput = z.object({
  userId: z.string(),
  platformTrackId: z.string(),
  platformName: z.string(),
  trackName: z.string(),
  albumName: z.string(),
  durationMs: z.number().int(),
  playedAt: z.coerce.date(),
  source: z.string(),
  metadata: z.null(),
  isrc: z.string(),
  uploadedAt: z.coerce.date().default(() => new Date()),

  artists: z
    .array(
      z.object({
        platformId: z.string(),
        name: z.string(),
      }),
    )
    .min(1),
});
const listeningHistorySchema = z.object({
  userId: z.string(),
  platformTrackId: z.string(),
  platformName: z.string(),
  trackName: z.string(),
  albumName: z.string(),
  durationMs: z.number(),
  playedAt: z.coerce.date(),
  source: z.string(),
  uploadedAt: z.coerce.date().default(() => new Date()),
  metadata: z.record(z.string(), z.any()),
  artists: z.array(
    z.object({
      platformId: z.string(),
      name: z.string(),
    }),
  ),
});

export const listeningHistoryArraySchema = z.array(listeningHistorySchema);
