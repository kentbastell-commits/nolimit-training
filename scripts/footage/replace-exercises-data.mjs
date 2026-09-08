// Existing exercises getting their (currently missing) short video attached
// from the new compressed 16:9 batch. Verified against the live library —
// each is either an exact name match or a deliberate, checked judgment call
// (noted inline), not a naive fuzzy match.
export const REPLACE_EXERCISES = [
  { videoFile: "Assault Bike__0101_16x9_CLEAN.mp4", exerciseId: "EX-ASS-6878" },
  { videoFile: "BB Bench Press__0136_16x9_CLEAN.mp4", exerciseId: "EX-0042" }, // Barbell Bench Press
  { videoFile: "BB Reverse Lunge__0148_16x9_CLEAN.mp4", exerciseId: "EX-VAR-BARB-5424" },
  { videoFile: "BB Split Squat__0147_16x9_CLEAN.mp4", exerciseId: "EX-HYX-BARB-9866" },
  { videoFile: "Barbell RDL__0135_16x9_CLEAN.mp4", exerciseId: "EX-0023" }, // Barbell Romanian Deadlift
  { videoFile: "Broad Jump__0181_16x9_CLEAN.mp4", exerciseId: "EX-0123" },
  { videoFile: "Burpee Broad Jump__0110_16x9_CLEAN.mp4", exerciseId: "EX-BUR-8820" },
  { videoFile: "Cable Cross Tricep Extension__0195_16x9_CLEAN.mp4", exerciseId: "EX-CAB-6023" }, // Cable Crossover Triceps Extension
  { videoFile: "Chinups__0179_16x9_CLEAN.mp4", exerciseId: "EX-0087" }, // Chin-Up
  { videoFile: "DB Forward Lunge__0152_16x9_CLEAN.mp4", exerciseId: "EX-VAR-DUMB-6160" },
  { videoFile: "DB Reverse Lunge__0151_16x9_CLEAN.mp4", exerciseId: "EX-VAR-DUMB-8625" },
  { videoFile: "DB Split Jump__0188_16x9_CLEAN.mp4", exerciseId: "EX-DUM-3738" },
  { videoFile: "DB Split Squat__0150_16x9_CLEAN.mp4", exerciseId: "EX-VAR-DUMB-7081" },
  { videoFile: "Farmer Carry__0111_16x9_CLEAN.mp4", exerciseId: "EX-0141" },
  { videoFile: "KB Swing__0171_16x9_CLEAN.mp4", exerciseId: "EX-0029" },
  { videoFile: "Pullups__0178_16x9_CLEAN.mp4", exerciseId: "EX-0086" }, // Pull-Up
  { videoFile: "Row Erg__0102_16x9_CLEAN.mp4", exerciseId: "EX-ROW-5634" }, // Row Ergometer
  { videoFile: "Sandbag Lunges__0104_16x9_CLEAN.mp4", exerciseId: "EX-SAN-5919" }, // Sandbag Lunge
  // Scap Pullups Rear View + Side View collapsed into one exercise per Kent's
  // instruction (camera angle, not a real variant) — using the rear-view clip.
  { videoFile: "Scap Pullups Rear View__0128_16x9_CLEAN.mp4", exerciseId: "EX-0297" }, // Scapular Pull-Up
  { videoFile: "High Incline DB Bench Press__0142_16x9_CLEAN.mp4", skip: true }, // handled as new exercise, NOT this mapping — see new-exercises-data
  { videoFile: "Incline DB Bench Press__0141_16x9_CLEAN.mp4", exerciseId: "EX-0044" }, // Standard Incline Dumbbell Press
  { videoFile: "Seated Calf Machine Raises__0124_16x9_CLEAN.mp4", exerciseId: "EX-SEA-6754" }, // Seated Calf Raise
  { videoFile: "Seated DB Shoulder Press__0143_16x9_CLEAN.mp4", exerciseId: "EX-0057" }, // Dumbbell Shoulder Press
  { videoFile: "Stability Ball Stir the Pot__0208_16x9_CLEAN.mp4", exerciseId: "EX-0111" }, // Stir-the-Pot
  { videoFile: "Ski Erg__0099_16x9_CLEAN.mp4", exerciseId: "EX-SKI-5755" }, // Ski Ergometer
  { videoFile: "Sled Pull__0109_16x9_CLEAN.mp4", exerciseId: "EX-HYX-SLED-7333" },
  { videoFile: "Sled Push__0107_16x9_CLEAN.mp4", exerciseId: "EX-0149" },
  { videoFile: "Trap Bar Deadlift__0167_16x9_CLEAN.mp4", exerciseId: "EX-0022" },
  { videoFile: "Wall Ball__0100_16x9_CLEAN.mp4", exerciseId: "EX-WAL-6505" },
].filter((e) => !e.skip);
