import type { IdentifierInput } from "@/workers/platformPolling/lastfm/types";
import prisma from "@/utils/prisma.util";
import type { TrackIdentifier } from "@prisma/client";
import { checkCachedMbid } from "@/workers/shared/utils";

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

export const needsIdentifierEnrichment = async (
  trackId: string,
): Promise<boolean> => {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { identifiers: { select: { type: true, value: true } } },
  });

  if (!track) return false;

  const mbid = track.identifiers.find((i) => i.type === "MBID")?.value;
  if (!mbid) return true;

  const cached = await checkCachedMbid(mbid);

  return cached;
};
