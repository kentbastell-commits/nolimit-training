export function isAthletePreview(search: string) {
  const params = new URLSearchParams(search);
  return params.get("portal") === "client" && params.get("preview") === "coach";
}

export function blocksPreviewRequest(search: string, method: string) {
  return isAthletePreview(search) && !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}
