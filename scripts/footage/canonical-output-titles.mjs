// Delivery titles for camera files whose recorded filename does not match the
// exercise shown. Keep the DJI clip id so every export still maps back to the
// untouched source file.

import { basename, extname } from "node:path";

export const CANONICAL_OUTPUT_TITLES = Object.freeze({
  "Cable Tricep Extension Lateral Bias__0154": "DB Rear Foot Elevated Split Squat__0154",
  "DB Rear Foot Elevated Split Squat__0196": "Cable Tricep Extension Lateral Bias__0196",
});

export function canonicalOutputTitle(sourceFilename) {
  const sourceTitle = basename(sourceFilename, extname(sourceFilename));
  return CANONICAL_OUTPUT_TITLES[sourceTitle] ?? sourceTitle;
}
