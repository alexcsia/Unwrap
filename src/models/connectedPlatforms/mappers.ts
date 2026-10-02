import type { ConnectedPlatforms } from "@prisma/client";
import { ApiError } from "@/errors/ApiError";
import type { Platform, PlatformConnectionMap } from "./types";

type ConnectionMapper<P extends Platform> = (
  raw: ConnectedPlatforms,
) => PlatformConnectionMap[P];

type MapperRegistry = {
  [P in Platform]: ConnectionMapper<P>;
};

export const connectionMappers: MapperRegistry = {
  spotify: (raw) => {
    if (
      !raw.platformUserId ||
      !raw.accessToken ||
      !raw.refreshToken ||
      !raw.expiresAt
    ) {
      throw new ApiError(403, "FORBIDDEN", "Spotify connection is incomplete.");
    }
    return {
      id: raw.id,
      userId: raw.userId,
      platformName: "spotify",
      platformUserId: raw.platformUserId,
      accessToken: raw.accessToken,
      refreshToken: raw.refreshToken,
      expiresAt: raw.expiresAt,
      connectedAt: raw.connectedAt,
    };
  },

  lastfm: (raw) => {
    if (!raw.platformUsername || !raw.sessionKey) {
      throw new ApiError(403, "FORBIDDEN", "Last.fm connection is incomplete.");
    }
    return {
      id: raw.id,
      userId: raw.userId,
      platformName: "lastfm",
      platformUsername: raw.platformUsername,
      sessionKey: raw.sessionKey,
      connectedAt: raw.connectedAt,
    };
  },
};
