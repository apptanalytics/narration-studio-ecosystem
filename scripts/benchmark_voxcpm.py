#!/usr/bin/env python3
"""Small local benchmark for VoxCPM base, LoRA, and full fine-tuned checkpoints.

This is for offline testing, not the public narration server. It generates the
same test lines through one model setup and writes WAV files plus CSV/JSONL
metadata with timing and blank manual-score columns.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import time
from pathlib import Path
from typing import Any

import soundfile as sf

from voxcpm.core import VoxCPM
from voxcpm.model.voxcpm import LoRAConfig


DEFAULT_TESTS = [
    {
        "id": "khmer_story_short",
        "text": "កាលពីព្រេងនាយ មានគ្រួសារស្ទាំងមួយរស់នៅក្នុងព្រៃដ៏ធំមួយ។",
    },
    {
        "id": "khmer_clear_sentence",
        "text": "មិត្តល្អគឺជាអ្នកដែលជួយគ្នានៅពេលមានគ្រោះថ្នាក់។",
    },
    {
        "id": "khmer_dialog_style",
        "text": "សួស្តីបង។ ថ្ងៃនេះយើងនឹងរៀនអានរឿងខ្មែរដោយសំឡេងច្បាស់ៗ។",
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser("Benchmark VoxCPM inference quality and speed")
    parser.add_argument("--engine", choices=["base", "lora", "full"], default="base")
    parser.add_argument("--model-id", default="openbmb/VoxCPM2")
    parser.add_argument("--lora-ckpt", default="", help="LoRA checkpoint directory for --engine lora")
    parser.add_argument("--full-ckpt", default="", help="Full checkpoint directory for --engine full")
    parser.add_argument("--text-file", default="", help="JSONL file with {id,text,control?}; defaults to Khmer tests")
    parser.add_argument("--reference-audio", default="", help="Reference audio for controllable cloning")
    parser.add_argument("--prompt-audio", default="", help="Prompt audio for ultimate cloning")
    parser.add_argument("--prompt-text", default="", help="Exact transcript for --prompt-audio")
    parser.add_argument("--control", default="warm, calm, clear pronunciation")
    parser.add_argument("--output-dir", default="benchmarks/voxcpm_test")
    parser.add_argument("--cfg-value", type=float, default=2.0)
    parser.add_argument("--inference-timesteps", type=int, default=10)
    parser.add_argument("--max-len", type=int, default=600)
    parser.add_argument("--normalize", action="store_true")
    parser.add_argument("--denoise", action="store_true")
    parser.add_argument("--optimize", action="store_true")
    parser.add_argument("--allow-download", action="store_true", help="Allow Hugging Face download if model is not cached")
    return parser.parse_args()


def read_tests(path: str) -> list[dict[str, str]]:
    if not path:
        return DEFAULT_TESTS

    tests: list[dict[str, str]] = []
    with Path(path).open("r", encoding="utf-8") as input_file:
        for index, line in enumerate(input_file, 1):
            line = line.strip()
            if not line:
                continue
            item = json.loads(line)
            text = str(item.get("text", "")).strip()
            if not text:
                raise ValueError(f"missing text in {path}:{index}")
            tests.append(
                {
                    "id": str(item.get("id") or f"case_{index:03d}"),
                    "text": text,
                    "control": str(item.get("control") or ""),
                }
            )
    return tests


def load_lora_config(ckpt_dir: Path) -> tuple[str | None, LoRAConfig | None]:
    config_path = ckpt_dir / "lora_config.json"
    if not config_path.exists():
        raise FileNotFoundError(f"missing {config_path}")
    with config_path.open("r", encoding="utf-8") as config_file:
        info = json.load(config_file)
    config_data = info.get("lora_config") or {}
    return info.get("base_model"), LoRAConfig(**config_data) if config_data else None


def load_model(args: argparse.Namespace) -> Any:
    kwargs: dict[str, Any] = {
        "load_denoiser": False,
        "optimize": args.optimize,
        "local_files_only": not args.allow_download,
    }

    if args.engine == "full":
        if not args.full_ckpt:
            raise ValueError("--full-ckpt is required with --engine full")
        model_id = args.full_ckpt
    elif args.engine == "lora":
        if not args.lora_ckpt:
            raise ValueError("--lora-ckpt is required with --engine lora")
        lora_ckpt = Path(args.lora_ckpt)
        base_model, lora_config = load_lora_config(lora_ckpt)
        model_id = args.model_id if args.model_id else base_model
        if not model_id:
            raise ValueError("base model missing; pass --model-id")
        kwargs["lora_config"] = lora_config
        kwargs["lora_weights_path"] = str(lora_ckpt)
    else:
        model_id = args.model_id

    print(f"Loading {args.engine} model: {model_id}", file=sys.stderr)
    return VoxCPM.from_pretrained(hf_model_id=model_id, **kwargs)


def synthesize_case(model: Any, args: argparse.Namespace, case: dict[str, str], output_path: Path) -> dict[str, Any]:
    control = (case.get("control") or args.control or "").strip()
    text = case["text"].strip()
    final_text = f"({control}){text}" if control else text

    generate_kwargs: dict[str, Any] = {
        "text": final_text,
        "cfg_value": args.cfg_value,
        "inference_timesteps": args.inference_timesteps,
        "max_len": args.max_len,
        "normalize": args.normalize,
        "denoise": args.denoise,
    }
    if args.reference_audio:
        generate_kwargs["reference_wav_path"] = args.reference_audio
    if args.prompt_audio:
        generate_kwargs["prompt_wav_path"] = args.prompt_audio
        generate_kwargs["prompt_text"] = args.prompt_text or None

    start = time.perf_counter()
    audio = model.generate(**generate_kwargs)
    wall_sec = time.perf_counter() - start
    sample_rate = int(model.tts_model.sample_rate)
    audio_duration_sec = len(audio) / sample_rate
    sf.write(str(output_path), audio, sample_rate)

    return {
        "id": case["id"],
        "engine": args.engine,
        "output": str(output_path),
        "text_chars": len(text),
        "sample_rate": sample_rate,
        "audio_duration_sec": round(audio_duration_sec, 3),
        "wall_sec": round(wall_sec, 3),
        "rtf": round(wall_sec / audio_duration_sec, 4) if audio_duration_sec else None,
        "cfg_value": args.cfg_value,
        "inference_timesteps": args.inference_timesteps,
        "reference_audio": args.reference_audio,
        "prompt_audio": args.prompt_audio,
        "manual_pronunciation_1_5": "",
        "manual_speaker_match_1_5": "",
        "manual_naturalness_1_5": "",
        "notes": "",
        "error": "",
    }


def main() -> None:
    args = parse_args()
    tests = read_tests(args.text_file)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    model = load_model(args)
    rows: list[dict[str, Any]] = []

    for case in tests:
        safe_id = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in case["id"])
        output_path = output_dir / f"{args.engine}_{safe_id}.wav"
        try:
            row = synthesize_case(model, args, case, output_path)
            print(f"{case['id']}: {row['wall_sec']}s, RTF={row['rtf']}, {output_path}", file=sys.stderr)
        except Exception as exc:
            row = {
                "id": case["id"],
                "engine": args.engine,
                "output": str(output_path),
                "text_chars": len(case["text"]),
                "sample_rate": "",
                "audio_duration_sec": "",
                "wall_sec": "",
                "rtf": "",
                "cfg_value": args.cfg_value,
                "inference_timesteps": args.inference_timesteps,
                "reference_audio": args.reference_audio,
                "prompt_audio": args.prompt_audio,
                "manual_pronunciation_1_5": "",
                "manual_speaker_match_1_5": "",
                "manual_naturalness_1_5": "",
                "notes": "",
                "error": str(exc),
            }
            print(f"{case['id']}: ERROR {exc}", file=sys.stderr)
        rows.append(row)

    csv_path = output_dir / "results.csv"
    jsonl_path = output_dir / "results.jsonl"
    fieldnames = list(rows[0].keys()) if rows else []
    with csv_path.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    with jsonl_path.open("w", encoding="utf-8") as jsonl_file:
        for row in rows:
            jsonl_file.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"Saved benchmark CSV: {csv_path}", file=sys.stderr)
    print(f"Saved benchmark JSONL: {jsonl_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
