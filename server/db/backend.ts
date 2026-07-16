// Which data backend the API reads/writes. Defaults to Feishu so production is
// unchanged; flip to "postgres" (env DATA_BACKEND=postgres) at cutover.
export type DataBackend = "feishu" | "postgres";

export const DATA_BACKEND: DataBackend =
  String(process.env.DATA_BACKEND).toLowerCase() === "postgres" ? "postgres" : "feishu";
