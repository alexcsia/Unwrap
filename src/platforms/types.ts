import type { ConnectedPlatforms } from "@prisma/client";
import type { HistoryResponse } from "./spotify/types";
import type { Response } from "express";
import type { UploadData } from "@/workers/types";
import type { IngestionResult } from "@/workers/historyIngestion/types";
import type { UserConnectedPlatforms } from "@/services/listeningHistory/types";

export interface PlatformAdapter {
  platformName: string;

  // auth
  exchangeCode: (userId: string, code: string) => Promise<TokenExchangeResult>;
  refreshToken: (user: ConnectedPlatforms) => Promise<string>;
  initiateOAuth: (res: Response) => void;
  revokeToken: (accessToken: string) => Promise<void>;
  disconnect: (userId: string) => Promise<void>;

  // history
  uploadHistory: (
    filePath: string,
    extractedPath: string,
    userId: string,
  ) => Promise<{ success: boolean; message: string }>;
  getHistory: (userId: string) => Promise<HistoryResponse>;
  ingestHistory: (
    userId: string,
    entry: UploadData,
  ) => Promise<IngestionResult>;
  poll: (userConnectedPlatform: UserConnectedPlatforms) => void;
}

export interface TokenExchangeResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export const allowedPlatforms = ["spotify", "tidal", "apple_music"];
export type Platform = (typeof allowedPlatforms)[number];
