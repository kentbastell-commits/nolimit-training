// Error carrying config semantics from the data layer to the thin handlers:
// a missing env var / table id is the operator's problem, and handlers report
// it verbatim ({ error: message }) instead of a generic "Server error".
export class ConfigError extends Error {}
