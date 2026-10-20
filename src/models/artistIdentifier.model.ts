import prisma from "@/utils/prisma.util";
import type { IdentifierInput } from "@/workers/platformPolling/lastfm/types";

export const createArtistIdentifiers = async (
  missing: IdentifierInput[],
  artistId: string,
  source: string,
) => {
  await prisma.artistIdentifier.createMany({
    data: missing.map((i) => ({
      artistId,
      type: i.type,
      value: i.value,
      source,
    })),
    skipDuplicates: true,
  });
};

export const findArtistIdentifier = async (
  artistId: string,
  identifiers: IdentifierInput[],
) => {
  const existing = await prisma.artistIdentifier.findMany({
    where: { artistId, OR: identifiers },
    select: { type: true, value: true },
  });
  return existing;
};
