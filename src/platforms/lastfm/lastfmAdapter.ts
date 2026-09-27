import type { PlatformAdapter } from "../types";
import { handleLastfmCallback, initiateOAuth } from "./auth";

export const lastfmAdapter: PlatformAdapter = {
  platformName: "lastfm",

  initiateOAuth: initiateOAuth,
  handleCallback: handleLastfmCallback,
  //workers
};
