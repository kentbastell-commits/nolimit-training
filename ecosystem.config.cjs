// PM2 process config for the Shanghai production server. Two independent
// fork-mode processes on different ports, with nginx load-balancing between
// them (see /etc/nginx/conf.d/nolimit-training.conf's "nolimit_backend"
// upstream) — a crash in one is invisible to users (nginx's default
// proxy_next_upstream retries the other backend transparently) instead of
// taking the whole site down, and load spreads across 2 CPU cores.
//
// NOT PM2 cluster mode (tried 2026-07-30, reverted same day): PM2's cluster
// mode crash-loops this app instantly with no logged error — a real
// incompatibility between PM2's cluster orchestration and running
// server/index.ts live via `node --import tsx` rather than a plain
// CommonJS/pre-built script. Two ordinary fork-mode processes behind nginx
// sidesteps it entirely and was verified to work.
//
// Runs via `node --import tsx` (not the `tsx` CLI, not `npm start`) —
// `--import tsx` registers tsx's loader on a plain `node` invocation, so the
// server still runs server/index.ts unbuilt, same as before.
//
// .cjs (not .js) because package.json has "type": "module" — PM2's
// module.exports config format needs CommonJS regardless.
//
// PG_POOL_MAX here only sets it for these two apps. The pg-twin app
// (nolimit-training-pg) is untouched and keeps its own default (10) since it
// doesn't read this file — see CLAUDE.md's shared-.env warning for why prod
// config changes must never leak into the twin.
const shared = {
  cwd: "/opt/nolimit-training",
  script: "server/index.ts",
  interpreter: "node",
  interpreter_args: "--import tsx",
  exec_mode: "fork",
};

module.exports = {
  apps: [
    // WXPAY_ENABLED lives HERE, not in the shared .env, so real WeChat Pay
    // is on for the two production apps only — the pg twin (which shares
    // /opt/nolimit-training/.env) stays payment-dead by construction.
    {
      ...shared,
      name: "nolimit-training",
      env: { PORT: "3001", PG_POOL_MAX: "20", WXPAY_ENABLED: "1" },
    },
    {
      ...shared,
      name: "nolimit-training-2",
      env: { PORT: "3002", PG_POOL_MAX: "20", WXPAY_ENABLED: "1" },
    },
  ],
};
