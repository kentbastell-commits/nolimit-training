// Cross-process cache invalidation over Postgres LISTEN/NOTIFY.
//
// nolimit-training runs as two independent PM2 forks behind nginx, each with
// its own in-process cache (api/_cache.ts). A write invalidates only the fork
// that handled it — the sibling kept serving stale data for the whole TTL
// (named mistake #5, confirmed live 2026-08-03: updateClient 200'd, the next
// read returned the old value). Both forks already hold connections to the
// same Postgres, so it doubles as the invalidation bus: every invalidateCache
// publishes NOTIFY, every fork LISTENs and drops the prefix locally.
//
// Failure model: best-effort by design. If the bus is down we degrade to the
// old TTL-staleness behavior — never to a failed write or a crashed process.
import { Client } from "pg";
import { setCacheBroadcaster, invalidateCacheLocal } from "../../api/_cache.ts";
import { pool } from "./client.ts";

const CHANNEL = "cache_invalidation";
// Identifies this process so its own notifications are skipped (the local
// invalidation already ran synchronously inside invalidateCache).
const SENDER = `${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

let listener: Client | null = null;
let stopped = false;

async function connectListener(): Promise<void> {
  // LISTEN needs a dedicated long-lived connection — pool clients get
  // recycled and would silently drop the subscription.
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  client.on("error", () => {
    // Connection died (server restart, network blip) — reconnect with
    // backoff. Losing the bus temporarily only means TTL-staleness.
    listener = null;
    if (!stopped) setTimeout(() => void startListening(), 3000);
  });
  client.on("notification", (msg) => {
    if (msg.channel !== CHANNEL || !msg.payload) return;
    try {
      const { sender, prefix } = JSON.parse(msg.payload);
      if (sender === SENDER || typeof prefix !== "string" || !prefix) return;
      invalidateCacheLocal(prefix);
    } catch {
      /* malformed payload — ignore */
    }
  });
  await client.connect();
  await client.query(`LISTEN ${CHANNEL}`);
  listener = client;
}

async function startListening(): Promise<void> {
  if (stopped || listener) return;
  try {
    await connectListener();
  } catch {
    if (!stopped) setTimeout(() => void startListening(), 3000);
  }
}

export async function startCacheBus(): Promise<void> {
  stopped = false;
  await startListening();
  setCacheBroadcaster((prefix) => {
    // Fire-and-forget through the shared pool; a failed NOTIFY must never
    // fail the write that triggered it.
    void pool
      .query("select pg_notify($1, $2)", [
        CHANNEL,
        JSON.stringify({ sender: SENDER, prefix }),
      ])
      .catch(() => {});
  });
}

// Test/shutdown hook.
export async function stopCacheBus(): Promise<void> {
  stopped = true;
  setCacheBroadcaster(() => {});
  if (listener) {
    const client = listener;
    listener = null;
    await client.end().catch(() => {});
  }
}
