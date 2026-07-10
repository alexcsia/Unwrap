import { z } from "zod";

export const timeListenedSchema = z
  .object({
    year: z.coerce.number().int().optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    date: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .refine((data) => !(data.month && !data.year), {
    message: "Month filter requires a year",
  })
  .refine((data) => !((data.from && !data.to) || (data.to && !data.from)), {
    message: "Custom ranges require both 'from' and 'to'",
  });
