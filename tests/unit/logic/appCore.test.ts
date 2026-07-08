// Behavior tests for src/appCore.ts — the pure-logic heart of the app.
//
// appCore.ts patches window.fetch as a module side effect, so in the node
// environment we must provide a minimal window shim BEFORE importing it
// (static imports would hoist above the shim, hence the dynamic import).
import { describe, expect, it } from "vitest";

(globalThis as any).window = (globalThis as any).window ?? {
  fetch: async () => ({ ok: true, json: async () => ({}) }),
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
};

const {
  GROUP_LABEL_COLORS,
  addDays,
  addMonths,
  categoryPrescriptionDefaults,
  categorySlug,
  composeExerciseNotes,
  dateToInputValue,
  effectiveTrackingFields,
  getDisplayTaskStatus,
  getMondayStart,
  getMonthCalendarDates,
  getMonthDates,
  getStatusClass,
  getWorkoutColorClass,
  isCardioCategory,
  isConditioningCategory,
  isFreshCache,
  isPastCalendarDate,
  labelColor,
  languagePreferenceToCode,
  lookupTextMatches,
  makeExerciseLabel,
  mapWithConcurrency,
  normalizeDate,
  normalizeTaskStatus,
  parseExerciseCueSections,
  parseExerciseNotes,
  stripLocalizedExerciseMeta,
  toYoutubeEmbed,
  videoThumbnail,
} = await import("../../../src/appCore");

describe("parseExerciseNotes", () => {
  it("returns safe defaults for empty notes", () => {
    const meta = parseExerciseNotes("");
    expect(meta.trackingType).toBe("Weight");
    expect(meta.isUnilateral).toBe(false);
    expect(meta.isAccessory).toBe(false);
    expect(meta.setPrescriptions).toEqual([]);
    expect(meta.alternateExercises).toEqual([]);
    expect(meta.coachingNotes).toBe("");
  });

  it("parses meta lines and splits coaching notes from metadata", () => {
    const meta = parseExerciseNotes(
      [
        "Section: Warm-up",
        "Label: A1",
        "Superset: Alpha",
        "Circuit Mode: amrap",
        "Circuit Minutes: 12",
        "Tracking: Time under tension",
        "Fields: Weight, Reps , RPE",
        "Unilateral: Yes",
        "Accessory: true",
        "Accessory Parent: A1",
        "Accessory Color: Blue",
        "Keep your chest up.",
        "Drive through the heels.",
      ].join("\n")
    );

    expect(meta.sectionName).toBe("Warm-up");
    expect(meta.exerciseLabel).toBe("A1");
    expect(meta.groupType).toBe("Superset");
    expect(meta.groupName).toBe("Alpha");
    expect(meta.groupMode).toBe("AMRAP");
    expect(meta.groupMinutes).toBe("12");
    expect(meta.trackingType).toBe("Time");
    expect(meta.trackingFields).toEqual(["Weight", "Reps", "RPE"]);
    expect(meta.isUnilateral).toBe(true);
    expect(meta.isAccessory).toBe(true);
    expect(meta.accessoryParentLabel).toBe("A1");
    expect(meta.accessoryColor).toBe("Blue");
    // Only the prose survives as coaching notes — no meta lines.
    expect(meta.coachingNotes).toBe(
      "Keep your chest up.\nDrive through the heels."
    );
  });

  it("maps tracking values onto the three canonical types", () => {
    expect(parseExerciseNotes("Tracking: Distance").trackingType).toBe(
      "Distance"
    );
    expect(parseExerciseNotes("Tracking: anything else").trackingType).toBe(
      "Weight"
    );
    expect(parseExerciseNotes("Unilateral: no").isUnilateral).toBe(false);
  });

  it("parses set prescriptions JSON and normalizes each set", () => {
    const meta = parseExerciseNotes(
      'Set Prescriptions: [{"setNumber":1,"reps":"5","load":"100kg","rpe":"8"},{"reps":"3"}]'
    );
    expect(meta.setPrescriptions).toHaveLength(2);
    expect(meta.setPrescriptions[0]).toMatchObject({
      setNumber: 1,
      reps: "5",
      load: "100kg",
      rpe: "8",
      tempo: "",
      rest: "",
    });
    // Missing setNumber falls back to the array position (1-based).
    expect(meta.setPrescriptions[1].setNumber).toBe(2);
    expect(meta.setPrescriptions[1].reps).toBe("3");
  });

  it("keeps a malformed Set Prescriptions line as coaching notes instead of crashing", () => {
    const meta = parseExerciseNotes("Set Prescriptions: not-json");
    expect(meta.setPrescriptions).toEqual([]);
    expect(meta.coachingNotes).toBe("Set Prescriptions: not-json");
  });

  it("parses alternate exercises and drops empty entries", () => {
    const meta = parseExerciseNotes(
      'Alternate Exercises: [{"exerciseRecordId":"rec2","exerciseId":"EX-2","exerciseName":"Goblet Squat"},{"exerciseName":"","exerciseId":""}]'
    );
    expect(meta.alternateExercises).toEqual([
      {
        exerciseRecordId: "rec2",
        exerciseId: "EX-2",
        exerciseName: "Goblet Squat",
      },
    ]);
  });
});

describe("composeExerciseNotes", () => {
  it("rewrites the tracking/unilateral meta and keeps the coaching notes", () => {
    expect(
      composeExerciseNotes(
        "Tracking: Time\nUnilateral: Yes\nStay tall.",
        "Weight",
        false
      )
    ).toBe("Tracking: Weight\nUnilateral: No\nStay tall.");
  });

  it("omits the notes line entirely when there are no coaching notes", () => {
    expect(composeExerciseNotes("", "Distance", true)).toBe(
      "Tracking: Distance\nUnilateral: Yes"
    );
  });

  it("round-trips through parseExerciseNotes", () => {
    const composed = composeExerciseNotes(
      "Some cue about bracing.",
      "Time",
      true
    );
    const parsed = parseExerciseNotes(composed);
    expect(parsed.trackingType).toBe("Time");
    expect(parsed.isUnilateral).toBe(true);
    expect(parsed.coachingNotes).toBe("Some cue about bracing.");
    // Composing again is stable (idempotent round trip).
    expect(composeExerciseNotes(composed, "Time", true)).toBe(composed);
  });
});

describe("stripLocalizedExerciseMeta", () => {
  it("drops EN meta lines, CN 字段：值 lines and JSON fragments but keeps prose", () => {
    const stripped = stripLocalizedExerciseMeta(
      [
        "跟踪指标：重量",
        "单侧动作：否",
        "Tracking: Weight",
        "Set Prescriptions: [{}]",
        '[{"setNumber":1,"reps":"8"}]',
        '"reps": "8",',
        "保持核心收紧，慢慢下蹲。",
        "动作前请先热身，注意：膝盖对齐脚尖。",
      ].join("\n")
    );
    expect(stripped).toBe(
      "保持核心收紧，慢慢下蹲。\n动作前请先热身，注意：膝盖对齐脚尖。"
    );
  });

  it("keeps blank lines between surviving prose and trims the edges", () => {
    expect(
      stripLocalizedExerciseMeta("Tracking: Weight\n\nFirst cue.\n\nSecond cue.\n")
    ).toBe("First cue.\n\nSecond cue.");
  });

  it("returns an empty string when every line is metadata", () => {
    expect(stripLocalizedExerciseMeta("Tracking: Time\n组数：3")).toBe("");
  });
});

describe("parseExerciseCueSections", () => {
  it("splits heading: sections and cleans bullet markers", () => {
    const sections = parseExerciseCueSections(
      [
        "Technical Cues: Keep tight",
        "- Brace hard",
        "",
        "Setup:",
        "- Feet hip width",
        "• Grip the bar",
      ].join("\n")
    );
    expect(sections).toEqual([
      { title: "Technical Cues", lines: ["Keep tight", "Brace hard"] },
      { title: "Setup", lines: ["Feet hip width", "Grip the bar"] },
    ]);
  });

  it("collects headingless lines under a default Coaching Notes section", () => {
    expect(
      parseExerciseCueSections("- Just a cue\nAnother plain line")
    ).toEqual([
      { title: "Coaching Notes", lines: ["Just a cue", "Another plain line"] },
    ]);
  });

  it("filters out sections that ended up with no lines", () => {
    const sections = parseExerciseCueSections(
      "Empty Heading:\nReal Heading: has content"
    );
    expect(sections).toEqual([
      { title: "Real Heading", lines: ["has content"] },
    ]);
  });

  it("strips exercise metadata before sectioning and returns [] for meta-only notes", () => {
    expect(parseExerciseCueSections("")).toEqual([]);
    expect(parseExerciseCueSections("Tracking: Weight\nUnilateral: Yes")).toEqual(
      []
    );
    const sections = parseExerciseCueSections(
      "Tracking: Time\nExecution: move with control"
    );
    expect(sections).toEqual([
      { title: "Execution", lines: ["move with control"] },
    ]);
  });
});

describe("effectiveTrackingFields", () => {
  it("only applies to Weight tracking", () => {
    expect(effectiveTrackingFields("Time", ["Weight", "Reps"])).toEqual([]);
    expect(effectiveTrackingFields("Distance")).toEqual([]);
  });

  it("defaults to Weight + Reps when nothing valid is picked", () => {
    expect(effectiveTrackingFields("Weight")).toEqual(["Weight", "Reps"]);
    expect(effectiveTrackingFields("Weight", ["Bogus"])).toEqual([
      "Weight",
      "Reps",
    ]);
  });

  it("filters unknown fields and caps the pick at three", () => {
    expect(effectiveTrackingFields("Weight", ["RPE", "Bogus"])).toEqual(["RPE"]);
    expect(
      effectiveTrackingFields("Weight", ["Weight", "Reps", "RPE", "RIR"])
    ).toEqual(["Weight", "Reps", "RPE"]);
  });
});

describe("categorySlug", () => {
  it("slugifies categories into cat-* CSS hooks", () => {
    expect(categorySlug("Olympic/Power")).toBe("cat-olympic-power");
    expect(categorySlug("Skills / Drills")).toBe("cat-skills-drills");
    expect(categorySlug("Squat")).toBe("cat-squat");
  });

  it("returns an empty string when there is no usable category", () => {
    expect(categorySlug("")).toBe("");
    expect(categorySlug(undefined)).toBe("");
    expect(categorySlug("///")).toBe("");
  });
});

describe("videoThumbnail / toYoutubeEmbed", () => {
  it("derives a thumbnail from every YouTube URL form", () => {
    const expected = "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg";
    expect(
      videoThumbnail("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    ).toBe(expected);
    expect(videoThumbnail("https://youtu.be/dQw4w9WgXcQ")).toBe(expected);
    expect(videoThumbnail("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      expected
    );
    expect(videoThumbnail("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      expected
    );
  });

  it("returns empty string for junk so callers fall back to initials", () => {
    expect(videoThumbnail("")).toBe("");
    expect(videoThumbnail("not a url")).toBe("");
    expect(videoThumbnail("https://vimeo.com/12345678")).toBe("");
    // Video ids shorter than 6 chars are not treated as YouTube ids.
    expect(videoThumbnail("https://youtu.be/abc")).toBe("");
  });

  it("converts watch/short links to embeddable URLs", () => {
    expect(toYoutubeEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ"
    );
    expect(toYoutubeEmbed("https://youtu.be/dQw4w9WgXcQ?t=12")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ"
    );
    expect(toYoutubeEmbed("nope")).toBe("");
  });
});

describe("date helpers", () => {
  it("normalizeDate handles epoch millis, ISO datetimes and plain dates", () => {
    const epoch = String(new Date(2026, 0, 15).getTime());
    expect(normalizeDate(epoch)).toBe("2026-01-15");
    expect(normalizeDate("2026-07-07T12:34:56")).toBe("2026-07-07");
    expect(normalizeDate("2026-07-07 12:34")).toBe("2026-07-07");
    expect(normalizeDate("")).toBe("");
  });

  it("dateToInputValue pads to yyyy-mm-dd", () => {
    expect(dateToInputValue(new Date(2026, 6, 7))).toBe("2026-07-07");
    expect(dateToInputValue(new Date(2026, 0, 1))).toBe("2026-01-01");
  });

  it("addDays and addMonths roll over month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addMonths("2026-01-15", 1)).toBe("2026-02-15");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  });

  it("getMondayStart anchors any weekday (including Sunday) to Monday", () => {
    expect(getMondayStart("2026-07-07")).toBe("2026-07-06"); // Tuesday
    expect(getMondayStart("2026-07-12")).toBe("2026-07-06"); // Sunday
    expect(getMondayStart("2026-07-06")).toBe("2026-07-06"); // Monday itself
  });

  it("getMonthCalendarDates pads a Monday-start grid to full weeks", () => {
    expect(getMonthDates("2026-07-15")).toHaveLength(31);
    const cells = getMonthCalendarDates("2026-07-15");
    // July 2026 starts on a Wednesday: 2 leading blanks + 31 days + 2 trailing.
    expect(cells).toHaveLength(35);
    expect(cells.length % 7).toBe(0);
    expect(cells[0]).toBeNull();
    expect(cells[1]).toBeNull();
    expect(cells[2]).toBe("2026-07-01");
    expect(cells[32]).toBe("2026-07-31");
    expect(cells[34]).toBeNull();
  });
});

describe("task status helpers", () => {
  it("normalizeTaskStatus maps loose strings onto the three statuses", () => {
    expect(normalizeTaskStatus("Completed")).toBe("Completed");
    expect(normalizeTaskStatus("workout missed")).toBe("Missed");
    expect(normalizeTaskStatus("In Progress")).toBe("Scheduled");
    expect(normalizeTaskStatus(undefined)).toBe("Scheduled");
  });

  it("getDisplayTaskStatus turns overdue scheduled work into Missed", () => {
    expect(getDisplayTaskStatus("Scheduled", "2000-01-01")).toBe("Missed");
    expect(getDisplayTaskStatus("Scheduled", "2999-01-01")).toBe("Scheduled");
    // Completed work never regresses to Missed.
    expect(getDisplayTaskStatus("Completed", "2000-01-01")).toBe("Completed");
  });

  it("isPastCalendarDate is false for blank dates", () => {
    expect(isPastCalendarDate("2000-01-01")).toBe(true);
    expect(isPastCalendarDate("")).toBe(false);
    expect(isPastCalendarDate(undefined)).toBe(false);
  });

  it("getStatusClass follows the normalized status", () => {
    expect(getStatusClass("Completed")).toBe("completedWorkout");
    expect(getStatusClass("Missed")).toBe("missedWorkout");
    expect(getStatusClass("anything")).toBe("scheduledWorkout");
  });
});

describe("workout color coding", () => {
  it("classifies by task type with strength beating run keywords", () => {
    expect(getWorkoutColorClass("Run Test + Strength")).toBe("wcol-strength");
    expect(getWorkoutColorClass("Morning Run")).toBe("wcol-cardio");
    expect(getWorkoutColorClass("Yoga Flow")).toBe("wcol-mobility");
    expect(getWorkoutColorClass("Climbing Technique")).toBe("wcol-skill");
    // The default "Strength" sessionType is ignored as noise.
    expect(getWorkoutColorClass("Bike Intervals", "Strength")).toBe(
      "wcol-cardio"
    );
    // Push/Pull/unknown default to strength.
    expect(getWorkoutColorClass("Push Day")).toBe("wcol-strength");
  });
});

describe("category helpers", () => {
  it("detects cardio and conditioning categories separately", () => {
    expect(isCardioCategory("Cardio")).toBe(true);
    expect(isCardioCategory("Aerobic Base")).toBe(true);
    expect(isCardioCategory("Conditioning")).toBe(false);
    expect(isConditioningCategory("Conditioning")).toBe(true);
  });

  it("categoryPrescriptionDefaults seeds sensible per-category defaults", () => {
    expect(categoryPrescriptionDefaults("Plyometric")).toMatchObject({
      sets: "3",
      reps: "5",
      rest: "90 sec",
    });
    expect(categoryPrescriptionDefaults("Squat")).toMatchObject({
      sets: "3",
      reps: "8",
      tempo: "3-1-1",
    });
    expect(categoryPrescriptionDefaults("")).toBeNull();
    expect(categoryPrescriptionDefaults("Unknown Category")).toBeNull();
  });
});

describe("misc pure helpers", () => {
  it("makeExerciseLabel groups labels in blocks of four", () => {
    expect(makeExerciseLabel(0)).toBe("A1");
    expect(makeExerciseLabel(3)).toBe("A4");
    expect(makeExerciseLabel(4)).toBe("B1");
    expect(makeExerciseLabel(8)).toBe("C1");
  });

  it("languagePreferenceToCode maps Chinese variants to zh, else en", () => {
    expect(languagePreferenceToCode("中文")).toBe("zh");
    expect(languagePreferenceToCode("Chinese (Simplified)")).toBe("zh");
    expect(languagePreferenceToCode("English")).toBe("en");
    expect(languagePreferenceToCode(undefined)).toBe("en");
  });

  it("labelColor is deterministic and always a known chip color", () => {
    expect(labelColor("Forwards")).toEqual(labelColor("Forwards"));
    expect(GROUP_LABEL_COLORS).toContainEqual(labelColor("Forwards"));
    expect(GROUP_LABEL_COLORS).toContainEqual(labelColor(""));
  });

  it("lookupTextMatches normalizes punctuation and matches substrings both ways", () => {
    expect(lookupTextMatches("Back Squat", "back-squat")).toBe(true);
    expect(lookupTextMatches("Squat", "Back Squat")).toBe(true);
    expect(lookupTextMatches("Bench Press", "Deadlift")).toBe(false);
    expect(lookupTextMatches("", "anything")).toBe(false);
  });

  it("isFreshCache respects the five-minute window", () => {
    expect(isFreshCache(Date.now())).toBe(true);
    expect(isFreshCache(Date.now() - 6 * 60 * 1000)).toBe(false);
  });

  it("mapWithConcurrency preserves order and caps in-flight work", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const results = await mapWithConcurrency(
      [10, 20, 30, 40, 50],
      2,
      async (item) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return item * 2;
      }
    );
    expect(results).toEqual([20, 40, 60, 80, 100]);
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});
