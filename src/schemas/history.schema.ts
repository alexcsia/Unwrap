import { platform } from "os";
import { z } from "zod";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50mb
const SUPPORTED_PLATFORMS = ["spotify", "apple_music"] as const;

export const uploadHistorySchema = z.object({
  platform: z.enum(SUPPORTED_PLATFORMS),
  file: z
    .instanceof(File)
    .refine((f) => f.size > 0, "File cannot be empty")
    .refine((f) => f.size <= MAX_FILE_SIZE, "File must be under 50mb")
    .refine(
      (f) => f.type === "application/zip" || f.name.endsWith(".zip"),
      "File must be a ZIP archive",
    ),
});

export const getHistorySchema = z.object({
  platform: z.enum(SUPPORTED_PLATFORMS),
});
