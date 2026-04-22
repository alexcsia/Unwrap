import { z } from "zod";

export const listeningHistorySchema = z.object({
  userId: z.string(),
  platformTrackId: z.string(),
  platformName: z.string(),
  trackName: z.string(),
  albumName: z.string(),
  durationMs: z.number().int(),
  playedAt: z.coerce.date(),
  source: z.string(),
  metadata: z.json(),
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

export const listeningHistoryArraySchema = z.array(listeningHistorySchema);
export type ListeningHistoryDTO = z.infer<typeof listeningHistorySchema>;
