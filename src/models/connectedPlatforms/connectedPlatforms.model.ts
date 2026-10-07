interface UserProfile {
  id: string;
  displayName: string;
  emails?: { value: string }[];
}
import prisma from "@/utils/prisma.util";
import { ApiError } from "@/errors/ApiError";
import type {
  Platform,
  PlatformConnectionMap,
} from "@/models/connectedPlatforms/types";
import { connectionMappers } from "./mappers";

export async function getPlatformConnection<P extends Platform>(
  userId: string,
  platform: P,
): Promise<PlatformConnectionMap[P]> {
  const connection = await prisma.connectedPlatforms.findUnique({
    where: {
      userId_platformName: {
        userId,
        platformName: platform,
      },
    },
  });

  if (!connection) {
    throw new ApiError(403, "FORBIDDEN", `No ${platform} connection found.`);
  }

  const mapper = connectionMappers[platform];
  return mapper(connection);
}

export const connectSpotify = async (
  userId: string,
  spotifyId: string,
  accessToken: string,
  refreshToken: string,
  profile: UserProfile,
) => {
  return await prisma.connectedPlatforms.upsert({
    where: {
      userId_platformName: {
        userId: userId,
        platformName: "spotify",
      },
    },
    update: {
      platformUserId: spotifyId,
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    },
    create: {
      userId,
      platformName: "spotify",
      platformUserId: spotifyId,
      accessToken: accessToken,
      refreshToken: refreshToken,
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
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresAt: new Date(Date.now() + expires * 1000),
    },
  });
};
