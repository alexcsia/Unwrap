import { z } from "zod";

export const createUserSchema = z.object({
  email: z.email().max(254),
  displayName: z.string().min(3).max(30),
  password: z.string().min(8).max(72),
});
