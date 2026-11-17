import type { Platform } from "@/models/connectedPlatforms";

declare global {
  namespace Express {
    interface Request {
      filePaths?: {
        filePath: string;
        extractedPath: string;
      };
      platform: Platform;
      user?: User;
    }
    interface User {
      id: string;
    }
  }
}
