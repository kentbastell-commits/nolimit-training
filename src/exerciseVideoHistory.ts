import { videoDay, type WorkoutVideo } from "./videoSessionGrouping";

export const exerciseVideoKey = (name: string) => name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
export const exerciseVideoDate = (video: WorkoutVideo) => video.workoutDate || videoDay(video.submittedAt);

// The submission record contains the exercise's name, not a library ID. Only
// normalise case/spacing: assisted, unassisted and other variations stay separate.
export function exerciseVideoHistory(videos: readonly WorkoutVideo[], clientId: string) {
  const groups = new Map<string, { key: string; name: string; videos: WorkoutVideo[] }>();
  for (const video of videos) {
    if (video.clientId?.trim().toLowerCase() !== clientId.trim().toLowerCase() || !video.videoUrl?.trim()) continue;
    const name = video.exerciseName?.trim() || "", key = exerciseVideoKey(name);
    if (!groups.has(key)) groups.set(key, { key, name, videos: [] });
    groups.get(key)!.videos.push(video);
  }
  for (const group of groups.values()) group.videos.sort((a, b) => {
    const da = exerciseVideoDate(a), db = exerciseVideoDate(b);
    if (!da || !db) return da ? -1 : db ? 1 : a.recordId.localeCompare(b.recordId);
    return da.localeCompare(db) || (a.submittedAt || 0) - (b.submittedAt || 0) || a.recordId.localeCompare(b.recordId);
  });
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}
