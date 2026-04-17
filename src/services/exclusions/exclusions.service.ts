import { ApiError } from "@/errors/ApiError";
import {
  addExclusion,
  deleteExclusion,
  getExclusionsByUserId,
} from "@/models/exclusion.model";
import prisma from "@/utils/prisma.util";

export const addExclusionService = async (
  userId: string,
  data: { type: "artist" | "track"; targetId: string },
) => {
  const { type, targetId } = data;
  if (!targetId) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "targetId is required to create an exclusion.",
    );
  }
  let name = "";
  let artistName: string = "";
  let albumName: string | null = null;

  if (type === "artist") {
    const artist = await prisma.artist.findUnique({
      where: { platformId: targetId },
    });

    if (!artist) {
      throw new ApiError(
        404,
        "NOT_FOUND",
        "Artist not found in local database.",
      );
    }
    name = artist.name;
  } else if (type === "track") {
    const track = await prisma.listeningHistory.findFirst({
      where: { platformTrackId: targetId, userId },
      include: { artists: true },
    });

    if (!track) {
      throw new ApiError(404, "NOT_FOUND", "Track not found in your history.");
    }

    name = track.trackName;
    albumName = track.albumName;
    artistName = track.artists.map((a) => a.name).join(", ");
  }

  const exclusion = await addExclusion(userId, {
    type,
    targetId,
    name,
    artistName,
    albumName,
  });

  return {
    id: exclusion.id,
    name: exclusion.name,
    excludedAt: exclusion.excludedAt,
  };
};

export const removeExclusionService = async (
  userId: string,
  type: string,
  targetId: string,
) => {
  const result = await deleteExclusion(userId, type, targetId);

  if (result.count === 0) {
    throw new ApiError(404, "NOT_FOUND", "No exclusion found to delete");
  }

  return { success: true };
};

export const getExclusionsService = async (userId: string) => {
  const exclusions = await getExclusionsByUserId(userId);

  return {
    exclusions: {
      artists: exclusions
        .filter((e) => e.type === "artist")
        .map((e) => ({
          type: "artist",
          artistId: e.targetId,
          artistName: e.name,
          excludedAt: e.excludedAt,
        })),
      tracks: exclusions
        .filter((e) => e.type === "track")
        .map((e) => ({
          type: "track",
          trackId: e.targetId,
          trackName: e.name,
          artistName: e.artistName,
          albumName: e.albumName,
          excludedAt: e.excludedAt,
        })),
    },
  };
};
