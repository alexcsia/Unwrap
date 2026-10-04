import { spotifyIngestion } from "@/workers/historyIngestion/spotifyIngestion";
import type { PlatformAdapter } from "../types";
import {
  disconnectSpotify,
  exchangeSpotifyCode,
  handleSpotifyCallback,
  initiateOAuth,
  refreshAccessToken,
  revokeSpotifyToken,
} from "./auth";
import { createSpotifyGetHistoryHandler } from "./getHistory";
import { createSpotifyUploadHandler } from "./upload";
import { spotifyPoller } from "@/workers/platformPolling/spotifyPoller";

export const spotifyAdapter: PlatformAdapter<"spotify"> = {
  platformName: "spotify",

  //auth
  exchangeCode: exchangeSpotifyCode,
  refreshToken: refreshAccessToken,
  initiateOAuth: initiateOAuth,
  revokeToken: revokeSpotifyToken,
  disconnect: disconnectSpotify,
  handleCallback: handleSpotifyCallback,

  //workers
  ingestHistory: spotifyIngestion,
  poll: spotifyPoller,

  //history
  getHistory: createSpotifyGetHistoryHandler(),
  uploadHistory: createSpotifyUploadHandler(),
};
