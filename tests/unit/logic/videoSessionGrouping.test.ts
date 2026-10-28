import { describe, expect, it } from "vitest";
import { groupWorkoutVideos, resolveVideoSession, videoDay } from "../../../src/videoSessionGrouping";
import { buildCoachingItems } from "../../../src/coachingReview";
const at = Date.parse("2026-10-28T10:00:00+08:00");
const video = (recordId: string, extra = {}) => ({ recordId, clientId: "CL-1", workoutName: "Home Workout 1", submittedAt: at, ...extra });
describe("workout video organisation", () => {
  it("keeps repeated sessions and different clients separate, while late uploads join the correct session", () => {
    const groups = groupWorkoutVideos([
      video("V1", { assignedWorkoutId: "AW-1", workoutDate: "2026-10-20" }),
      video("V2", { assignedWorkoutId: "AW-1", workoutDate: "2026-10-20", submittedAt: at + 86400000 }),
      video("V3", { assignedWorkoutId: "AW-2", workoutDate: "2026-10-27" }),
      video("V4", { clientId: "CL-2", assignedWorkoutId: "AW-2", workoutDate: "2026-10-27" }),
    ]);
    expect(groups).toHaveLength(3);
    expect(groups.find(g => g.date === "2026-10-20")?.videos.map(v => v.recordId)).toEqual(["V1", "V2"]);
  });
  it("labels unmatched historical uploads by upload day in China, rather than inventing a session date", () => {
    expect(videoDay(Date.parse("2026-10-27T16:30:00Z"))).toBe("2026-10-28");
    expect(groupWorkoutVideos([video("V1"), video("V2", { submittedAt: at - 86400000 })]).map(g => g.dateBasis)).toEqual(["upload", "upload"]);
  });
  it("matches an older bilingual title only when client, date and title identify one assignment", () => {
    const assignment = { clientId: "CL-1", assignedWorkoutId: "AW-1", sessionName: "Home Workout 1", sessionNameCn: "居家训练1", scheduledDate: at };
    expect(resolveVideoSession(video("V1", { workoutName: "居家训练1" }), [assignment])).toMatchObject({ assignedWorkoutId: "AW-1", workoutDate: "2026-10-28", workoutName: "Home Workout 1" });
    expect(resolveVideoSession(video("V1"), [assignment, { ...assignment, assignedWorkoutId: "AW-2" }]).assignedWorkoutId).toBeUndefined();
    expect(resolveVideoSession(video("V1", { clientId: "CL-2" }), [assignment]).assignedWorkoutId).toBeUndefined();
    expect(resolveVideoSession(video("V1", { submittedAt: at + 86400000 }), [assignment]).assignedWorkoutId).toBeUndefined();
  });
  it("keeps one stable coach queue item until all videos in the session are reviewed", () => {
    const clients = [{ clientCode: "CL-1", name: "Athlete" }];
    const videos = [video("V1", { assignedWorkoutId: "AW-1", status: "Reviewed" }), video("V2", { assignedWorkoutId: "AW-1", status: "New" })];
    const items = buildCoachingItems({ clients, videos }).filter(i => i.kind === "video");
    expect(items).toHaveLength(1); expect(items[0]).toMatchObject({ key: "video:V1", sourceDone: false, source: { sessionVideoIds: ["V1", "V2"] } });
    expect(buildCoachingItems({ clients, videos: videos.map(v => ({ ...v, status: "Reviewed" })) }).find(i => i.kind === "video")?.sourceDone).toBe(true);
  });
});
