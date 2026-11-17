import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().max(254).toLowerCase().trim(),
  password: z.string().min(8).max(72),
});
