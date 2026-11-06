import { lastfmPoller } from "@/workers/platformPolling/lastfm/lastfmPoller";
import type { PlatformAdapter } from "../types";
import { handleLastfmCallback, initiateOAuth, disconnectLastfm } from "./auth";

export const lastfmAdapter: PlatformAdapter<"lastfm"> = {
  platformName: "lastfm",

  initiateOAuth: initiateOAuth,
  handleCallback: handleLastfmCallback,
  disconnect: disconnectLastfm,
  //workers
  poll: lastfmPoller,
};
