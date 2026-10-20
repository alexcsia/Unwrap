import { musicBrainzQueue } from "@/lib/queue";
import type { MusicBrainzEnrichmentDeps, TrackToEnrich } from "./processor";
import { mbFetch } from "./processor";

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
  track: TrackToEnrich,
  deps: MusicBrainzEnrichmentDeps,
) => {
  console.log("fuzzy search", track);
  const searchData = await trackNameFuzzySearch(track, deps);
  const best = pickBestMatch(searchData?.recordings, track);

  if (!best) {
    await deps.markSearchFailed(track.id);
    return;
  }

  const enriched: TrackToEnrich = {
    ...track,
    mbid: best.mbid,
  };

  await musicBrainzQueue.add(
    "fetch-isrcs",
    { track: enriched },
    { jobId: `isrc-${track.mbid ?? track.id}` },
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
