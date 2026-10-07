export interface UserConnectedPlatforms {
  id: string;
  userId: string; // FK to internal user id
  platformName: string;
  platformUserId: string;
  AccessToken: string;
  RefreshToken: string;
  expiresAt: Date;
  connectedAt: Date;
}
