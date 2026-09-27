import type { PlatformAdapter } from "./types";
import { ApiError } from "@/errors/ApiError";
import { spotifyAdapter } from "./spotify/spotifyAdapter";
import { lastfmAdapter } from "./lastfm/lastfmAdapter";

export const platformRegistry: Record<string, PlatformAdapter> = {
  spotify: spotifyAdapter,
  lastfm: lastfmAdapter,
};

export const getPlatformAdapter = (platform: string): PlatformAdapter => {
  const adapter = platformRegistry[platform];
  if (!adapter)
    throw new ApiError(
      400,
      "UNSUPPORTED_PLATFORM",
      `Unsupported platform: ${platform}`,
    );
  return adapter;
};
