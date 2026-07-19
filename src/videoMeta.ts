// Read the encoded frame rate of an MP4/MOV file straight from its container
// metadata (moov → trak → mdia: hdlr 'vide' + mdhd timescale + stbl/stts
// sample durations). This is what lets Jump Lab auto-configure for genuine
// high-fps slow-mo files. Best-effort: returns null on anything unexpected
// (webm, truncated files, exotic boxes) and the caller keeps its defaults.

const te = new TextDecoder("ascii");

type Box = { type: string; start: number; size: number; header: number };

function readBoxes(view: DataView, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = view.getUint32(offset);
    const type = te.decode(new Uint8Array(view.buffer, view.byteOffset + offset + 4, 4));
    let header = 8;
    if (size === 1) {
      if (offset + 16 > end) break;
      const hi = view.getUint32(offset + 8);
      const lo = view.getUint32(offset + 12);
      size = hi * 2 ** 32 + lo;
      header = 16;
    } else if (size === 0) {
      size = end - offset; // box extends to end
    }
    if (size < header || offset + size > end) break;
    boxes.push({ type, start: offset, size, header });
    offset += size;
  }
  return boxes;
}

function findBox(view: DataView, start: number, end: number, type: string): Box | null {
  return readBoxes(view, start, end).find((box) => box.type === type) || null;
}

/** Parse one trak: returns fps if it's a video track, else null. */
function trackFps(view: DataView, trak: Box): number | null {
  const trakEnd = trak.start + trak.size;
  const mdia = findBox(view, trak.start + trak.header, trakEnd, "mdia");
  if (!mdia) return null;
  const mdiaEnd = mdia.start + mdia.size;

  const hdlr = findBox(view, mdia.start + mdia.header, mdiaEnd, "hdlr");
  if (!hdlr) return null;
  // hdlr payload: version/flags(4) + pre_defined(4) + handler_type(4)
  const handler = te.decode(
    new Uint8Array(view.buffer, view.byteOffset + hdlr.start + hdlr.header + 8, 4)
  );
  if (handler !== "vide") return null;

  const mdhd = findBox(view, mdia.start + mdia.header, mdiaEnd, "mdhd");
  if (!mdhd) return null;
  const version = view.getUint8(mdhd.start + mdhd.header);
  const timescale =
    version === 1
      ? view.getUint32(mdhd.start + mdhd.header + 4 + 8 + 8)
      : view.getUint32(mdhd.start + mdhd.header + 4 + 4 + 4);
  if (!timescale) return null;

  const minf = findBox(view, mdia.start + mdia.header, mdiaEnd, "minf");
  if (!minf) return null;
  const stbl = findBox(view, minf.start + minf.header, minf.start + minf.size, "stbl");
  if (!stbl) return null;
  const stts = findBox(view, stbl.start + stbl.header, stbl.start + stbl.size, "stts");
  if (!stts) return null;

  const entryCount = view.getUint32(stts.start + stts.header + 4);
  let samples = 0;
  let duration = 0;
  for (let i = 0; i < entryCount; i++) {
    const base = stts.start + stts.header + 8 + i * 8;
    if (base + 8 > stts.start + stts.size) break;
    const count = view.getUint32(base);
    const delta = view.getUint32(base + 4);
    samples += count;
    duration += count * delta;
  }
  if (!samples || !duration) return null;
  const fps = timescale / (duration / samples);
  return Number.isFinite(fps) && fps > 5 && fps <= 1000 ? Math.round(fps) : null;
}

/** Parse a moov buffer for the (first) video track's encoded fps. */
export function fpsFromMoov(buffer: ArrayBuffer, moovStart = 0): number | null {
  const view = new DataView(buffer);
  const moov = findBox(view, moovStart, buffer.byteLength, "moov");
  if (!moov) return null;
  for (const trak of readBoxes(view, moov.start + moov.header, moov.start + moov.size)) {
    if (trak.type !== "trak") continue;
    const fps = trackFps(view, trak);
    if (fps) return fps;
  }
  return null;
}

/**
 * Detect the encoded frame rate of an MP4/MOV File. Walks top-level boxes
 * (moov may sit before or after mdat), reads only the moov bytes (capped at
 * 32MB), and returns null for non-ISO containers (webm etc).
 */
export async function detectVideoFps(file: File): Promise<number | null> {
  try {
    let offset = 0;
    for (let hops = 0; hops < 32 && offset + 16 <= file.size; hops++) {
      const head = new DataView(await file.slice(offset, offset + 16).arrayBuffer());
      let size = head.getUint32(0);
      const type = te.decode(new Uint8Array(head.buffer, 4, 4));
      if (size === 1) {
        size = head.getUint32(8) * 2 ** 32 + head.getUint32(12);
      } else if (size === 0) {
        size = file.size - offset;
      }
      if (size < 8) return null;
      if (type === "moov") {
        if (size > 32 * 1024 * 1024) return null;
        const buf = await file.slice(offset, offset + size).arrayBuffer();
        return fpsFromMoov(buf);
      }
      // First box of any ISO file must be a known type; bail early on webm.
      if (hops === 0 && !/^(ftyp|moov|mdat|free|skip|wide|pnot)$/.test(type)) {
        return null;
      }
      offset += size;
    }
    return null;
  } catch {
    return null;
  }
}
