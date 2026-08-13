// Generate a temporary signed URL for a clip in the footage archive so it can
// be streamed (VLC: Media > Open Network Stream) without downloading it, or
// sent to someone who has no COS account.
//
//   node --env-file=.env.local scripts/footage/stream-link.mjs 2026-08-08/DJI_..._D.MP4
//   node --env-file=.env.local scripts/footage/stream-link.mjs            # lists clips
import { authorization, cos } from "./cos.mjs";

const HOST = "nxlimit-footage-1454208796.cos.accelerate.myqcloud.com";
const arg = process.argv[2];

if (!arg) {
  const res = await cos({ host: HOST, params: { prefix: "footage/", "max-keys": "1000" } });
  const xml = await res.text();
  const keys = [...xml.matchAll(/<Key>([^<]+\.MP4)<\/Key>/gi)].map((m) => m[1]);
  console.log(`${keys.length} clips in the archive. Pass one, e.g.:\n`);
  for (const k of keys.slice(0, 5)) console.log(`  node --env-file=.env.local scripts/footage/stream-link.mjs ${k.replace("footage/", "")}`);
  process.exit(0);
}

const key = arg.startsWith("footage/") ? arg : `footage/${arg}`;
const pathname = `/${key}`;
const auth = authorization({ method: "GET", pathname, params: {}, headers: {} });
console.log(`\nStreams for 1 hour — VLC > Media > Open Network Stream, paste:\n`);
console.log(`https://${HOST}${pathname}?${auth}\n`);
