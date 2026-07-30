// PM2 process config for the Shanghai production server. Cluster mode so a
// crash in one worker restarts just that worker instead of taking the whole
// site down, and so traffic spreads across more than one CPU core.
//
// Runs via `node --import tsx` rather than the `tsx` CLI (or `npm start`,
// the previous invocation) — PM2's cluster mode forks Node directly and
// shares the listening port across workers; it can't do that through an npm
// wrapper process. `--import tsx` registers tsx's loader on a plain `node`
// invocation, so the server still runs server/index.ts unbuilt, same as
// before.
//
// .cjs (not .js) because package.json has "type": "module" — PM2's
// module.exports config format needs CommonJS regardless.
//
// PG_POOL_MAX here only sets it for THIS app. The pg-twin app
// (nolimit-training-pg) is untouched and keeps its own default (10) since it
// doesn't read this file — see CLAUDE.md's shared-.env warning for why prod
// config changes must never leak into the twin.
module.exports = {
  apps: [
    {
      name: "nolimit-training",
      cwd: "/opt/nolimit-training",
      script: "server/index.ts",
      interpreter: "node",
      interpreter_args: "--import tsx",
      instances: 2,
      exec_mode: "cluster",
      env: {
        PG_POOL_MAX: "20",
      },
    },
  ],
};
