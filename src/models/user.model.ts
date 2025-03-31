import prisma from '../utils/prisma.util'

interface UserProfile {
    displayName: string;
    emails?: { value: string }[];
}

export const saveUser = async (
    spotifyId: string,
    accessToken: string,
    refreshToken: string,
    profile: UserProfile
): Promise<any> => {
    prisma.user.upsert({
        where: { spotifyId },
        update: {
            accessToken,
            refreshToken,
        },
        create: {
            spotifyId,
            displayName: profile.displayName,
            email: profile.emails?.[0]?.value || "",
            accessToken,
            refreshToken,
        }
    });
};