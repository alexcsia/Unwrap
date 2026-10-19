import { lastfmPoller } from "@/workers/platformPolling/lastfmPoller";
import type { PlatformAdapter } from "../types";
import { handleLastfmCallback, initiateOAuth } from "./auth";

export const lastfmAdapter: PlatformAdapter<"lastfm"> = {
  platformName: "lastfm",

  initiateOAuth: initiateOAuth,
  handleCallback: handleLastfmCallback,
  //workers
  poll: lastfmPoller,
};
