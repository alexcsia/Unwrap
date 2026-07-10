import { z } from "zod";

export const createExclusionSchema = z.object({
  type: z.enum(["artist", "track"]),
  targetId: z.string().min(1),
});

export const deleteExclusionSchema = z.object({
  type: z.enum(["artist", "track"]),
  targetId: z.string().min(1),
});
