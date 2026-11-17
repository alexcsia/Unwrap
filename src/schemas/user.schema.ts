import { z } from "../openapi/zod";

export const createUserSchema = z.object({
  email: z.email().max(254).toLowerCase().trim(),
  displayName: z
    .string()
    .min(3)
    .max(30)
    .regex(
      /^[a-zA-Z0-9]+$/,
      "Display name can only contain letters and numbers",
    ),
  password: z.string().min(8).max(72),
});
