import prisma from "@/utils/prisma.util";

export const addExclusion = async (
  userId: string,
  data: {
    type: string;
    targetId: string;
    name: string;
    artistName: string;
    albumName: string | null;
  },
) => {
  const { type, targetId, name, artistName, albumName } = data;
  console.log("type in model:", type, targetId, name, albumName, artistName);
  const exclusion = await prisma.exclusion.upsert({
    where: {
      userId_type_targetId: { userId, type, targetId },
    },
    update: {},
    create: {
      userId: userId,
      type: type,
      targetId: targetId,
      name: name,
      artistName: artistName,
      albumName: albumName,
    },
  });

  return exclusion;
};

export const deleteExclusion = async (
  userId: string,
  type: string,
  targetId: string,
) => {
  return await prisma.exclusion.deleteMany({
    where: { userId, type, targetId },
  });
};

export const getExclusionsByUserId = async (userId: string) => {
  return await prisma.exclusion.findMany({
    where: { userId },
    orderBy: { excludedAt: "desc" },
  });
};
