import { z } from "../openapi/zod";

export const exclusionSchema = z.object({
  type: z.enum(["artist", "track"]),
  targetId: z.uuid(),
});
