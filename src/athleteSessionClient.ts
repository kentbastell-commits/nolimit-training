// Preview credentials are tab-local and disappear on reload/close. Normal
// athlete sessions use HttpOnly cookies and never enter browser storage.
let previewToken = "";
export function setAthletePreviewToken(value: string) { previewToken = value; }
export function athletePreviewToken() { return previewToken; }
export const ATHLETE_SESSION_EXPIRED = "nl-athlete-session-expired";
