"""Transcribe explanation clips locally and mark only unambiguous filler words.

The output is a resumable JSON manifest consumed by local-render-16x9.mjs.
No media or transcript data leaves the machine other than the one-time model
download performed by faster-whisper.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from faster_whisper import WhisperModel


FILLERS = {
    "um", "umm", "ummm", "ummmm",
    "uh", "uhh", "uhhh", "uhhhh",
    "erm", "err", "er",
    "hmm", "hmmm", "hm", "mm", "mmm",
}


def normalized_word(value: str) -> str:
    return re.sub(r"[^a-z]", "", value.lower())


def filler_intervals(words: list[dict]) -> list[dict]:
    candidates: list[dict] = []
    for index, word in enumerate(words):
        token = normalized_word(word["word"])
        probability = float(word.get("probability") or 0)
        if token not in FILLERS or probability < 0.65:
            continue

        start = max(0.0, float(word["start"]) - 0.025)
        end = float(word["end"]) + 0.025
        if index > 0:
            start = max(start, float(words[index - 1]["end"]) + 0.008)
        if index + 1 < len(words):
            end = min(end, float(words[index + 1]["start"]) - 0.008)
        if end - start >= 0.05:
            candidates.append({
                "start": round(start, 3),
                "end": round(end, 3),
                "word": token,
                "probability": round(probability, 4),
            })

    merged: list[dict] = []
    for item in candidates:
        if merged and item["start"] - merged[-1]["end"] <= 0.04:
            merged[-1]["end"] = item["end"]
            merged[-1]["word"] = f'{merged[-1]["word"]}+{item["word"]}'
            merged[-1]["probability"] = min(merged[-1]["probability"], item["probability"])
        else:
            merged.append(item.copy())
    return merged


def load_existing(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    try:
        records = json.loads(path.read_text(encoding="utf-8"))
        return {record["file"]: record for record in records}
    except Exception:
        return {}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="small.en")
    args = parser.parse_args()

    source = Path(args.source)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    existing = load_existing(output)
    files = sorted(
        path for path in source.iterdir()
        if path.is_file() and "explanation" in path.name.lower() and path.suffix.lower() in {".mp4", ".mov", ".m4v"}
    )

    print(json.dumps({"event": "transcription_plan", "files": len(files), "model": args.model}), flush=True)
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    records: list[dict] = []

    for index, path in enumerate(files, start=1):
        if path.name in existing:
            records.append(existing[path.name])
            print(json.dumps({"event": "transcription_skipped", "completed": index, "total": len(files), "file": path.name}), flush=True)
            continue

        segments, info = model.transcribe(
            str(path),
            language="en",
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
            condition_on_previous_text=True,
        )
        words: list[dict] = []
        text_parts: list[str] = []
        for segment in segments:
            text_parts.append(segment.text.strip())
            for word in segment.words or []:
                words.append({
                    "start": round(float(word.start), 3),
                    "end": round(float(word.end), 3),
                    "word": word.word,
                    "probability": round(float(word.probability), 4),
                })

        fillers = filler_intervals(words)
        record = {
            "file": path.name,
            "duration": round(float(info.duration), 3),
            "language": info.language,
            "transcript": " ".join(part for part in text_parts if part),
            "fillers": fillers,
        }
        records.append(record)
        output.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({
            "event": "transcribed",
            "completed": index,
            "total": len(files),
            "file": path.name,
            "fillers": len(fillers),
            "removed_sec": round(sum(item["end"] - item["start"] for item in fillers), 3),
        }), flush=True)

    output.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "event": "transcription_done",
        "files": len(records),
        "fillers": sum(len(record["fillers"]) for record in records),
        "removed_sec": round(sum(item["end"] - item["start"] for record in records for item in record["fillers"]), 3),
    }), flush=True)


if __name__ == "__main__":
    main()
