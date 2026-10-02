export interface BaseConnection {
  id: string;
  userId: string;
  connectedAt: Date;
}

export interface SpotifyConnection extends BaseConnection {
  platformName: "spotify";
  platformUserId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface LastfmConnection extends BaseConnection {
  platformName: "lastfm";
  platformUsername: string;
  sessionKey: string;
}

export interface PlatformConnectionMap {
  spotify: SpotifyConnection;
  lastfm: LastfmConnection;
}

export type Platform = keyof PlatformConnectionMap;
