import prisma from "@/utils/prisma.util";

interface UserProfile {
  id: string;
  displayName: string;
  emails?: { value: string }[];
}

//move connectSpotify to separate connectSpotify model
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

export const findUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: { email: email },
  });
};
