import { spotifyIngestion } from "@/workers/historyIngestion/spotifyIngestion";
import type { PlatformAdapter } from "../types";
import {
  disconnectSpotify,
  exchangeSpotifyCode,
  initiateOAuth,
  refreshAccessToken,
  revokeSpotifyToken,
} from "./auth";
import { spotifyGetHistoryHandler } from "./getHistory";
import { spotifyUploadHandler } from "./upload";
import { spotifyPoller } from "@/workers/platformPolling/spotifyPoller";

export const spotifyAdapter: PlatformAdapter = {
  platformName: "spotify",

  //auth
  exchangeCode: exchangeSpotifyCode,
  refreshToken: refreshAccessToken,
  initiateOAuth: initiateOAuth,
  revokeToken: revokeSpotifyToken,
  disconnect: disconnectSpotify,

  //workers
  ingestHistory: spotifyIngestion,
  poll: spotifyPoller,

  //history
  getHistory: spotifyGetHistoryHandler,
  uploadHistory: spotifyUploadHandler,
};
