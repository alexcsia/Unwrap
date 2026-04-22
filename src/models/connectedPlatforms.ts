import prisma from "@/utils/prisma.util";
import type { ConnectedPlatforms } from "@prisma/client";

interface UserProfile {
  id: string;
  displayName: string;
  emails?: { value: string }[];
}
export const getPlatformConnection = (
  userId: string,
  platform: string,
): Promise<ConnectedPlatforms | null> => {
  return prisma.connectedPlatforms.findUnique({
    where: {
      userId_platformName: { userId, platformName: platform },
    },
  });
};

export const connectSpotify = async (
  userId: string,
  spotifyId: string,
  accessToken: string,
  refreshToken: string,
  profile: UserProfile,
) => {
  await prisma.connectedPlatforms.upsert({
    where: {
      userId_platformName: {
        userId: userId,
        platformName: "spotify",
      },
    },
    update: {
      platformUserId: spotifyId,
      AccessToken: accessToken,
      RefreshToken: refreshToken,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    },
    create: {
      userId,
      platformName: "spotify",
      platformUserId: spotifyId,
      AccessToken: accessToken,
      RefreshToken: refreshToken,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    },
  });
};

export const addConnection = async (
  userId: string,
  accessToken: string,
  refreshToken: string,
  expires: number,
) => {
  await prisma.connectedPlatforms.update({
    where: {
      userId_platformName: {
        userId: userId,
        platformName: "spotify",
      },
    },
    data: {
      AccessToken: accessToken,
      RefreshToken: refreshToken,
      expiresAt: new Date(Date.now() + expires * 1000),
    },
  });
};
