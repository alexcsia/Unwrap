import { z } from "../openapi/zod";

export const exclusionParamsSchema = z.object({
  type: z.enum(["artist", "track"]),
  targetId: z.string().min(1),
});
