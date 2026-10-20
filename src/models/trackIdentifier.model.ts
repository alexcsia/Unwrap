import type { IdentifierInput } from "@/workers/platformPolling/lastfm/types";
import prisma from "@/utils/prisma.util";
import type { TrackIdentifier } from "@prisma/client";
export const createTrackIdentifiers = async (
  missing: IdentifierInput[],
  trackId: string,
  platformName: string,
) => {
  await prisma.trackIdentifier.createMany({
    data: missing.map((i) => ({
      trackId,
      type: i.type,
      value: i.value,
      source: platformName,
    })),
    skipDuplicates: true,
  });
};

export const findTrackIdentifiers = async (
  trackId: string,
  identifiers: IdentifierInput[],
): Promise<Pick<TrackIdentifier, "type" | "value">[]> => {
  const trackIdentifiers = await prisma.trackIdentifier.findMany({
    where: {
      trackId,
      OR: identifiers,
    },
    select: { type: true, value: true },
  });

  return trackIdentifiers;
};

export const needsEnrichment = async (trackId: string): Promise<boolean> => {
  const hasISRC = await prisma.trackIdentifier.findFirst({
    where: { trackId: trackId, type: "ISRC" },
    select: { id: true },
  });

  return hasISRC === null;
};
