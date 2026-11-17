import prisma from "@/utils/prisma.util";

export const searchEntityService = async (
  type: string,
  name: string,
  limit: number,
  cursor?: string | null,
  userId?: string,
) => {
  if (type === "track") {
    const tracks = await prisma.track.findMany({
      where: {
        trackName: { contains: name, mode: "insensitive" },
        listeningHistory: { some: { userId } },
      },
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: "asc" },
    });

    return tracks.map((t) => ({
      name: t.trackName,
      id: t.id,
      entityType: "track" as const,
    }));
  }

  if (type === "artist") {
    return await prisma.artist.findMany({
      where: {
        name: {
          contains: name,
          mode: "insensitive",
        },
        tracks: {
          some: {
            listeningHistory: {
              some: {
                userId: userId,
              },
            },
          },
        },
      },
      include: {
        tracks: true,
      },
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: "asc" },
    });
  }

  throw new Error("Invalid entity type");
};
