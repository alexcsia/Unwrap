import type { PlatformAdapter } from "./types";
import type { Platform } from "@/models/connectedPlatforms/types";
import { ApiError } from "@/errors/ApiError";
import { spotifyAdapter } from "./spotify/spotifyAdapter";
import { lastfmAdapter } from "./lastfm/lastfmAdapter";

export const platformRegistry: { [P in Platform]: PlatformAdapter<P> } = {
  spotify: spotifyAdapter,
  lastfm: lastfmAdapter,
};

export const getPlatformAdapter = <P extends Platform>(
  platform: P,
): PlatformAdapter<P> => {
  const adapter = platformRegistry[platform];
  if (!adapter)
    throw new ApiError(
      400,
      "UNSUPPORTED_PLATFORM",
      `Unsupported platform: ${platform}`,
    );
  return adapter;
};
