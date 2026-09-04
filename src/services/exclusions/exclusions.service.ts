import { ApiError } from "@/errors/ApiError";
import {
  addExclusion,
  deleteExclusion,
  getExclusionsByUserId,
} from "@/models/exclusion.model";
import prisma from "@/utils/prisma.util";

/**
 * Service: addExclusionService
 *
 * Creates a user exclusion for an artist or track.
 *
 * Flow:
 * - Validates targetId
 * - Fetches metadata based on type
 *   - Artist: from artist table
 *   - Track: from listening history
 * - Stores exclusion record in database
 *
 * Returns:
 * - exclusion id
 * - name
 * - excludedAt timestamp
 *
 * Errors:
 * - 400 if targetId is missing
 * - 404 if artist or track is not found
 */

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
      where: { id: targetId },
      include: {
        tracks: {
          where: {
            listeningHistory: {
              some: { userId },
            },
          },

          take: 1,
        },
      },
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
    const track = await prisma.track.findUnique({
      where: { id: targetId },
      include: {
        artists: {
          select: { name: true },
        },
        listeningHistory: {
          where: { userId },
          take: 1,
        },
      },
    });

    if (!track || track.listeningHistory.length === 0) {
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

/**
 * Service: removeExclusionService
 *
 * Deletes an existing exclusion for a user.
 *
 * Flow:
 * - Deletes exclusion by userId, type, and targetId
 *
 * Returns:
 * - success flag
 *
 * Errors:
 * - 404 if no matching exclusion exists
 */

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

/**
 * Service: getExclusionsService
 *
 * Retrieves all exclusions for a user.
 *
 * Flow:
 * - Fetches all exclusions from database
 * - Groups results by artist and track
 *
 * Returns:
 * - artists: excluded artist list
 * - tracks: excluded track list
 */

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
