export interface SpotifyUser {
  id: string;
  userId: string;
  platformName: string;
  platformUserId: string;
  AccessToken: string;
  RefreshToken: string;
  expiresAt: Date;
  connectedAt: Date;
}
