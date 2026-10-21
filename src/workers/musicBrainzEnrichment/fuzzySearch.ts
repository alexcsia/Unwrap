import { musicBrainzQueue } from "@/lib/queue";
import type { MusicBrainzEnrichmentDeps, TrackToEnrich } from "./processor";
import { mbFetch } from "./processor";
import { findTrack } from "@/models/track";

export type RecordingCandidate = {
  id: string;
  score: number;
  length?: number | null;
};

export type BestMatch = {
  mbid: string;
  score: number;
};

const MIN_FUZZY_SCORE = 90;
const DURATION_TOLERANCE_MS = 5_000;

export const fuzzySearchHandler = async (
  trackId: string,
  deps: MusicBrainzEnrichmentDeps,
) => {
  const track = await findTrack(trackId);
  if (!track) return;

  const existingMbid =
    track.identifiers.find((i) => i.type === "MBID")?.value ?? null;
  if (existingMbid) {
    await musicBrainzQueue.add(
      "fetch-isrcs",
      { trackId: track.id, mbid: existingMbid },
      { jobId: `isrc-${existingMbid}` },
    );
    return;
  }

  const trackToEnrich: TrackToEnrich = {
    id: track.id,
    mbid: null,
    trackName: track.trackName,
    duration: track.durationMs,
    artistsName: track.artists.map((a) => a.name),
  };

  const searchData = await trackNameFuzzySearch(trackToEnrich, deps);
  const best = pickBestMatch(searchData?.recordings, trackToEnrich);

  if (!best) {
    await deps.markSearchFailed(track.id);
    return;
  }

  await musicBrainzQueue.add(
    "fetch-isrcs",
    { trackId: track.id, mbid: best.mbid },
    { jobId: `isrc-${best.mbid}` },
  );
};

export const trackNameFuzzySearch = async (
  track: TrackToEnrich,
  deps: MusicBrainzEnrichmentDeps,
) => {
  const query = `recording:"${track.trackName}" AND artist:"${track.artistsName}"`;
  return await mbFetch(
    `${deps.MUSICBRAINZ_BASE}/recording/?query=${encodeURIComponent(query)}&fmt=json`,
    deps,
  );
};

export const pickBestMatch = (
  recordings: RecordingCandidate[] | undefined,
  track: TrackToEnrich,
): BestMatch | null => {
  console.log("found matches", recordings);
  if (!recordings?.length) return null;

  const validCandidates = recordings
    .filter(meetsScoreThreshold)
    .filter((recording) => meetsDurationTolerance(recording, track.duration))
    .sort((a, b) => b.score - a.score);

  const best = validCandidates[0];
  if (!best) return null;

  return {
    mbid: best.id,
    score: best.score,
  };
};

const meetsDurationTolerance = (
  recording: RecordingCandidate,
  targetDurationMs?: number | null,
): boolean => {
  if (!targetDurationMs || !recording.length) return true;
  return Math.abs(recording.length - targetDurationMs) <= DURATION_TOLERANCE_MS;
};

const meetsScoreThreshold = (recording: RecordingCandidate): boolean =>
  typeof recording.score === "number" && recording.score >= MIN_FUZZY_SCORE;
