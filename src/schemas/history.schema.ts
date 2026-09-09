import { z } from "zod";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const SUPPORTED_PLATFORMS = ["spotify", "apple_music"] as const;

export const uploadHistorySchema = z.object({
  file: z.object({
    size: z
      .number()
      .min(1, "File is empty")
      .max(MAX_FILE_SIZE, "File too large"),
    mimetype: z.string().refine((m) => m === "application/zip", {
      message: "File must be a ZIP archive",
    }),
    originalname: z.string().refine((n) => n.endsWith(".zip"), {
      message: "File name must end with .zip",
    }),
    path: z.string(),
  }),
});

export const getHistorySchema = z.object({
  platform: z.enum(SUPPORTED_PLATFORMS),
});
