#!/usr/bin/env python3
"""Public narration UI and API.

This server is intentionally separate from the upstream demo in app.py.  It is
focused on making one selected reference voice read text by splitting the text
into chunks and scheduling those chunks across worker processes.
"""

from __future__ import annotations

import argparse
import base64
import concurrent.futures
import gc
import hashlib
import hmac
import ipaddress
import json
import logging
import multiprocessing
import os
import re
import requests
import secrets
import shutil
import subprocess
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import gradio as gr
import numpy as np
import soundfile as sf
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field

os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

from auth_system.core.cookies import ACCESS_COOKIE
from auth_system.core.database import SessionLocal
from auth_system.core.jwt import decode_token
from auth_system.repositories.users import get_user_by_id


logger = logging.getLogger("narration_studio")

REPO_ROOT = Path(__file__).resolve().parent
VOICE_DIR = Path(os.environ.get("NARRATION_VOICE_DIR") or os.environ.get("VOXCPM_VOICE_DIR", REPO_ROOT / "voice_clone_dataset"))
OUTPUT_DIR = Path(
    os.environ.get("NARRATION_OUTPUT_DIR") or os.environ.get("VOXCPM_READER_OUTPUT_DIR", REPO_ROOT / "reader_outputs")
)
JOB_HISTORY_PATH = Path(os.environ.get("NARRATION_JOB_HISTORY_PATH", OUTPUT_DIR / "job_history.json"))
IP_SETTINGS_PATH = Path(os.environ.get("NARRATION_IP_SETTINGS_PATH", OUTPUT_DIR / "ip_settings.json"))
AUTH_USER_SETTINGS_PATH = Path(
    os.environ.get("NARRATION_AUTH_USER_SETTINGS_PATH", OUTPUT_DIR / "auth_user_settings.json")
)
API_KEYS_PATH = Path(os.environ.get("NARRATION_API_KEYS_PATH", OUTPUT_DIR / "api_keys.json"))
API_LOGS_PATH = Path(os.environ.get("NARRATION_API_LOGS_PATH", OUTPUT_DIR / "api_logs.json"))
VOICE_UPLOAD_DIR = Path(
    os.environ.get("NARRATION_VOICE_UPLOAD_DIR") or os.environ.get("VOXCPM_VOICE_UPLOAD_DIR", VOICE_DIR / "uploads")
)
DEFAULT_MODEL_ID = os.environ.get("NARRATION_MODEL_ID") or os.environ.get("VOXCPM_MODEL_ID", "openbmb/VoxCPM2")
MODEL_PROFILE_SLUG = os.environ.get("NARRATION_MODEL_SLUG", "khmer-tts")
MODEL_DISPLAY_NAME = os.environ.get("NARRATION_MODEL_NAME", "Khmer-TTS")
DEFAULT_LORA_WEIGHTS_PATH = (
    os.environ.get("NARRATION_LORA_WEIGHTS_PATH") or os.environ.get("VOXCPM_LORA_WEIGHTS_PATH", "")
).strip() or None
ULTIMATE_IP_ALLOWLIST_PATH = Path(
    os.environ.get("NARRATION_ULTIMATE_IP_ALLOWLIST", REPO_ROOT / "conf" / "ultimate_ip_allowlist.txt")
)
ULTIMATE_ALLOWED_IPS_ENV = os.environ.get("NARRATION_ULTIMATE_ALLOWED_IPS", "")
PUBLIC_CREDIT_LIMIT = int(os.environ.get("NARRATION_PUBLIC_CREDITS", "2000"))
ULTIMATE_ALLOWLIST_CREDIT_LIMIT = int(os.environ.get("NARRATION_ULTIMATE_ALLOWLIST_CREDITS", "1000000"))
MAX_ACTIVE_REQUESTS_PER_IP = int(os.environ.get("NARRATION_MAX_ACTIVE_PER_IP", "20"))
MAX_GENERATIONS_PER_WINDOW = int(os.environ.get("NARRATION_MAX_GENERATIONS_PER_WINDOW", "100"))
ULTIMATE_ALLOWLIST_GENERATIONS_PER_WINDOW = int(os.environ.get("NARRATION_ULTIMATE_ALLOWLIST_GENERATIONS", "1000000"))
GENERATION_WINDOW_SECONDS = int(os.environ.get("NARRATION_GENERATION_WINDOW_SECONDS", str(6 * 60 * 60)))
MAX_VOICE_UPLOAD_BYTES = int(os.environ.get("NARRATION_MAX_VOICE_UPLOAD_BYTES", str(25 * 1024 * 1024)))
FASTAPI_MAX_GPU_CONCURRENCY = max(1, int(os.environ.get("MAX_GPU_CONCURRENCY", "1")))
MIN_GPU_FREE_MB = max(0, int(os.environ.get("MIN_GPU_FREE_MB", "4096")))
VISITOR_COOKIE_NAME = "narration_visitor_id"
VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
ADMIN_COOKIE_NAME = "narration_admin_session"
ADMIN_USERNAME = os.environ.get("NARRATION_ADMIN_USERNAME", "")
ADMIN_PASSWORD = os.environ.get("NARRATION_ADMIN_PASSWORD", "")
ADMIN_PASSWORD_SHA256 = os.environ.get("NARRATION_ADMIN_PASSWORD_SHA256", "")
ADMIN_ALLOWED_IPS_ENV = os.environ.get("NARRATION_ADMIN_ALLOWED_IPS", "")
ADMIN_SESSION_SECONDS = int(os.environ.get("NARRATION_ADMIN_SESSION_SECONDS", str(12 * 60 * 60)))
ADMIN_SESSION_SECRET = os.environ.get(
    "NARRATION_ADMIN_SESSION_SECRET",
    ADMIN_PASSWORD_SHA256 or ADMIN_PASSWORD or "narration-admin-local",
)
GEO_LOOKUP_TIMEOUT_SEC = 1.5
SRT_EXAMPLE_PATH = Path(os.environ.get("NARRATION_SRT_EXAMPLE", REPO_ROOT / "example-jamesok.srt"))
ENABLE_GRADIO_UI = os.environ.get("NARRATION_ENABLE_GRADIO", "0").lower() in {"1", "true", "yes"}
GEO_CACHE: dict[str, dict[str, Any]] = {}
USAGE_BY_IP: dict[str, dict[str, float]] = {}
USAGE_LOCK = threading.Lock()

KHMER_EXAMPLE = (
    "កាលពីព្រេងនាយ មានគ្រួសារស្ទាំងមួយរស់នៅក្នុងព្រៃដ៏ធំមួយ។ "
    "នៅក្នុងគ្រួសារនោះ មានស្ទាំងឈ្មោលមួយ ស្ទាំងញីមួយ និងកូនតូចៗចំនួនបីនាក់។ "
    "ថ្ងៃមួយ ពួកគេបានរៀនថា មិត្តល្អគឺជាអ្នកដែលជួយគ្នានៅពេលមានគ្រោះថ្នាក់។"
)

ENGLISH_EXAMPLE = (
    "A quiet morning settled over the village as the first light touched the roofs. "
    "The narrator spoke gently, giving each sentence enough space to breathe."
)

KHMER_MARKET_EXAMPLE = (
    "ព្រឹកថ្ងៃអាទិត្យ ផ្សារក្នុងភូមិមានសំឡេងមនុស្សនិងក្លិនម្ហូបឆ្ងាញ់ៗ។ "
    "អ្នកលក់និយាយរាក់ទាក់ ហើយក្មេងៗជួយឪពុកម្តាយរៀបចំផ្លែឈើស្រស់ៗនៅលើតុ។"
)

KHMER_LEARNING_EXAMPLE = (
    "គ្រូបង្រៀនបានប្រាប់សិស្សថា ការអានជារៀងរាល់ថ្ងៃជួយឲ្យគំនិតរីកចម្រើន។ "
    "សិស្សម្នាក់បានចាប់ផ្តើមសរសេរកំណត់ហេតុខ្លីៗ ដើម្បីហាត់ប្រើពាក្យថ្មី។"
)

KHMER_TRAVEL_EXAMPLE = (
    "នៅពេលថ្ងៃលិច ក្រុមគ្រួសារមួយបានធ្វើដំណើរតាមផ្លូវជាប់វាលស្រែ។ "
    "ខ្យល់ត្រជាក់បក់កាត់មុខ ហើយពួកគេបានឈប់សម្រាកមើលពណ៌មេឃដ៏ស្រស់ស្អាត។"
)

JAMESOK_EXAMPLE = (
    "លោកតា មក ខ្មែរ វិញ មក កសាង កម្ពុជា នៅ ជិត ក្បាល មួយ ចាន។ "
    "នៅ ជិត ក្បាល មួយ ចាន។ អា កំជិល អ្ហែង ចង់ ឲ្យ តែ គេ មក កសាង ហើយ "
    "ចុះ អ្ហែង ម៉េច ក៏ មិន កសាង ខ្លួនឯង ចាំបាច់ អញ។ ហ៊ឹម! អ្ហែង ហ្នឹង "
    "សម តែ ហ៊ុន សែន ជាន់ ក្បាល មែន នៅ ជិត ក្បាល មួយ ចាន ទៀត។ អ្ហែង ហៅ "
    "អញ មក កសាង អ្ហែង ខ្ជិល។ ទី មួយ អ្ហែង ខ្ជិល ទី ពីរ អ្ហែង មិន ព្រម "
    "ងើប ធ្វើ កិច្ចការ អី ទេ ហើយ អ្ហែង មក ឲ្យ អញ ជួយ អ្ហែង ដឹង អ្ហ៎ អូន។ "
    "សំណាង ហើយ មាន ហ៊ុន សែន ជាន់ ក្បាល អ្ហែង ហ្នឹង បើសិន ជា អញ វិញ អញ "
    "យក អ្ហែង ដឹក អ្ហែង ទៅ លក់ នៅ ស្រុក គេ អញ យក យួន ហើយ និង ចិន មក នៅ "
    "ស្រុក អញ វិញ។ អញ មិន ទុក អ្ហែង ទេ អញ ដឹក អ្ហែង យក លក់ ឲ្យ ស្រុក គេ "
    "លក់ ឲ្យ ពួក អ្នក ដទៃ ឲ្យ យក ទៅ ធ្វើ អី ណា ណា ឯង ព្រោះ ពួក អ្ហែង ពួក "
    "ភ្លើ អ្ហែង ហៅ អញ ទៅ កសាង ស្រុក អ្ហែង។ អ្ហែង នៅ ហ្នឹង ផ្ទះ អ្ហែង សំរាម "
    "អ្ហែង នៅ មុខ ផ្ទះ អ្ហែង មិន កើប។ ផ្លូវ អ្ហែង គ្រហេង គ្រហូង អ្ហែង មិន "
    "ជួសជុល។ ពាង ទឹក អ្ហែង មិន រែង ទឹក ឲ្យ ពេញ ហើយ អ្ហែង ហៅ អញ ទៅ កសាង "
    "ស្រុក ភ្លើ ទេ អ្ហែង។ យី អា ចៅ នេះ និយាយ លេង ទេ ចៅ អើយ។ បើ មិន និយាយ "
    "អញ្ចឹង ទេ អ្ហែង ស្តាប់ អត់ បាន ទេ អ្ហែង មក ហៅ អញ ថ្ងៃ ណា។ តា មក "
    "កសាង កម្ពុជា។ អញ ប្រាប់ អ្ហែង ទៅ អញ មាន លុយ អញ ចាយ តែ អញ ទេ អញ "
    "គ្មាន ជួយ អី អ្ហែង ទេ អា ល្ងើ អ្ហែង ល្ងង់ ចង់ ងាប់ នេះ។ ហ៊ឹម! កសាង "
    "កម្ពុជា តាំង ហោង ណ៎។ អញ ទិញ ស្រី ស្អាត ១០០ នាក់ ទុក ទុក អោប វិញ "
    "ល្អ ជាង ហា។ អញ ទិញ ស្រី ស្អាត អញ ជួល ស្រី ស្អាត ១០០ នាក់ ឲ្យ ច្របាច់ "
    "អញ ច្របាច់ ជើង អញ អញ ទៅ មក កសាង កម្ពុជា ងាប់ អី ហ្ហែង ខ្ជិល ចង់ "
    "ងាប់ ហើយ។ ហ៊ឹម! បើ មិន និយាយ អញ្ចឹង ទេ អត់ យល់ ទេ មិន យល់ ម៉េច ក៏ "
    "មិន យល់ ដែរ ទាល់ តែ ដាក់ ម៉ាំង ៗ អញ្ចឹង ទៅ អា ហ្នឹង បាន យល់ បាន ខ្លះ ណា។"
)

APP_CSS = """
:root {
  --studio-surface: #ffffff;
  --studio-soft: #f4f6f5;
  --studio-ink: #202124;
  --studio-muted: #636866;
  --studio-line: #dde3e0;
  --studio-accent: #0a7b78;
  --studio-accent-2: #a15c07;
}
@media (prefers-color-scheme: dark) {
  :root {
    --studio-surface: #151716;
    --studio-soft: #242725;
    --studio-ink: #f3f5f2;
    --studio-muted: #aeb7b3;
    --studio-line: #3d4541;
    --studio-accent: #44c2b5;
    --studio-accent-2: #d09539;
  }
}
.gradio-container {
  color: var(--studio-ink);
  background:
    linear-gradient(180deg, var(--studio-soft) 0, transparent 260px),
    var(--studio-surface);
}
.studio-header {
  border: 1px solid var(--studio-line);
  border-radius: 8px;
  padding: 20px 22px;
  margin-bottom: 14px;
  background: color-mix(in srgb, var(--studio-surface) 88%, var(--studio-soft));
}
.studio-header h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
  letter-spacing: 0;
}
.studio-grid {
  gap: 14px;
}
.studio-panel {
  border: 1px solid var(--studio-line);
  border-radius: 8px;
  padding: 14px;
  background: color-mix(in srgb, var(--studio-surface) 92%, var(--studio-soft));
}
.studio-bar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}
.studio-meta {
  color: var(--studio-muted);
  font-size: 13px;
}
.theme-links a,
.download-link a {
  display: inline-block;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid var(--studio-line);
  color: var(--studio-ink);
  text-decoration: none;
  margin-left: 6px;
}
.download-link a {
  margin-left: 0;
  background: var(--studio-accent);
  border-color: var(--studio-accent);
  color: #fff;
  font-weight: 600;
}
.result-line {
  color: var(--studio-muted);
  margin: 0 0 8px;
}
.credit-ok {
  color: var(--studio-accent);
  font-weight: 600;
}
.credit-warn {
  color: var(--studio-accent-2);
  font-weight: 700;
}
.compact-card {
  border: 1px solid var(--studio-line);
  border-radius: 8px;
  padding: 12px;
}
footer {display: none !important;}
"""

_WORKER_DEVICE_LABEL: str | None = None
_WORKER_DEVICE: str = "cuda"
_WORKER_MODEL_ID: str = DEFAULT_MODEL_ID
_WORKER_LORA_WEIGHTS_PATH: str | None = DEFAULT_LORA_WEIGHTS_PATH
_WORKER_LOCAL_FILES_ONLY = True
_WORKER_OPTIMIZE = False
_WORKER_LOAD_DENOISER = False
_WORKER_MODEL = None
VOICE_EXTENSIONS = {".mp3", ".wav", ".flac", ".m4a"}


class VoiceEngineError(Exception):
    code = "GENERATION_FAILED"
    message = "Voice generation failed. Please try again shortly."
    status_code = 503

    def __init__(self, message: str | None = None, details: dict[str, Any] | None = None) -> None:
        super().__init__(message or self.message)
        self.details = details or {}


class GPUOutOfMemoryError(VoiceEngineError):
    code = "GPU_OUT_OF_MEMORY"
    message = "The voice engine is busy. Please try again shortly or use a shorter text."
    status_code = 503


class GPUBusyError(VoiceEngineError):
    code = "GPU_BUSY"
    message = "All voice generation workers are busy. Your job was queued and will retry automatically."
    status_code = 503


def _cleanup_cuda() -> None:
    gc.collect()
    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
    except Exception:
        logger.debug("CUDA cleanup skipped", exc_info=True)


def _is_cuda_oom(exc: BaseException) -> bool:
    if exc.__class__.__name__ == "OutOfMemoryError" and exc.__class__.__module__.startswith("torch"):
        return True
    text = str(exc).lower()
    return "cuda out of memory" in text or ("out of memory" in text and "cuda" in text)


def _init_worker(
    gpu_id: str,
    model_id: str,
    lora_weights_path: str | None,
    local_files_only: bool,
    optimize: bool,
    load_denoiser: bool,
) -> None:
    global _WORKER_DEVICE_LABEL
    global _WORKER_DEVICE
    global _WORKER_MODEL_ID
    global _WORKER_LORA_WEIGHTS_PATH
    global _WORKER_LOCAL_FILES_ONLY
    global _WORKER_OPTIMIZE
    global _WORKER_LOAD_DENOISER

    device_label = str(gpu_id).strip() or "0"
    normalized = device_label.lower()
    _WORKER_DEVICE_LABEL = device_label
    if normalized in {"cpu", "mps"}:
        _WORKER_DEVICE = normalized
        os.environ.pop("CUDA_VISIBLE_DEVICES", None)
    elif normalized.startswith("cuda:"):
        _WORKER_DEVICE = "cuda"
        os.environ["CUDA_VISIBLE_DEVICES"] = normalized.split(":", 1)[1]
    else:
        _WORKER_DEVICE = "cuda"
        os.environ["CUDA_VISIBLE_DEVICES"] = device_label
    _WORKER_MODEL_ID = model_id
    _WORKER_LORA_WEIGHTS_PATH = lora_weights_path
    _WORKER_LOCAL_FILES_ONLY = local_files_only
    _WORKER_OPTIMIZE = optimize
    _WORKER_LOAD_DENOISER = load_denoiser
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")


def _load_lora_config(lora_weights_path: str | None):
    if not lora_weights_path:
        return None

    config_root = Path(lora_weights_path)
    config_path = config_root / "lora_config.json" if config_root.is_dir() else config_root.parent / "lora_config.json"
    if not config_path.exists():
        return None

    from voxcpm.model.voxcpm import LoRAConfig

    with config_path.open("r", encoding="utf-8") as config_file:
        lora_info = json.load(config_file)
    config_data = lora_info.get("lora_config") or {}
    return LoRAConfig(**config_data) if config_data else None


def _get_worker_model():
    global _WORKER_MODEL

    if _WORKER_MODEL is None:
        from voxcpm import VoxCPM

        lora_config = _load_lora_config(_WORKER_LORA_WEIGHTS_PATH)
        _WORKER_MODEL = VoxCPM.from_pretrained(
            _WORKER_MODEL_ID,
            load_denoiser=_WORKER_LOAD_DENOISER,
            local_files_only=_WORKER_LOCAL_FILES_ONLY,
            optimize=_WORKER_OPTIMIZE and _WORKER_DEVICE == "cuda",
            device=_WORKER_DEVICE,
            lora_config=lora_config,
            lora_weights_path=_WORKER_LORA_WEIGHTS_PATH,
        )
    return _WORKER_MODEL


def _generate_chunk_worker(payload: dict[str, Any]) -> dict[str, Any]:
    model = _get_worker_model()
    output_path = Path(payload["output_path"])
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        wav = model.generate(
            text=payload["text"],
            reference_wav_path=payload.get("reference_wav_path"),
            prompt_wav_path=payload.get("prompt_wav_path"),
            prompt_text=payload.get("prompt_text"),
            cfg_value=float(payload["cfg_value"]),
            inference_timesteps=int(payload["inference_timesteps"]),
            normalize=bool(payload["normalize"]),
            denoise=bool(payload["denoise"]),
        )
        sf.write(str(output_path), wav, model.tts_model.sample_rate)
        return {
            "index": payload["index"],
            "path": str(output_path),
            "sample_rate": int(model.tts_model.sample_rate),
            "duration_sec": float(len(wav) / model.tts_model.sample_rate),
            "worker": _WORKER_DEVICE_LABEL,
            "device": _WORKER_DEVICE,
        }
    except Exception as exc:
        if _is_cuda_oom(exc):
            logger.warning("Worker %s out of memory during chunk %s", _WORKER_DEVICE_LABEL, payload.get("index"))
            raise GPUOutOfMemoryError(details={"worker": _WORKER_DEVICE_LABEL, "chunk": payload.get("index")}) from exc
        raise
    finally:
        _cleanup_cuda()


def _warmup_worker(_: dict[str, Any]) -> dict[str, Any]:
    model = _get_worker_model()
    return {
        "worker": _WORKER_DEVICE_LABEL,
        "device": _WORKER_DEVICE,
        "sample_rate": int(model.tts_model.sample_rate),
        "status": "loaded",
    }


def available_gpus() -> list[str]:
    device_setting = os.environ.get("GPU_DEVICE", "").strip().lower()
    if device_setting and device_setting != "auto":
        return [item.strip().replace("cuda:", "") for item in device_setting.split(",") if item.strip()]

    env_value = os.environ.get("VOXCPM_GPUS")
    if env_value:
        return [item.strip() for item in env_value.split(",") if item.strip()]

    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=index", "--format=csv,noheader"],
            check=True,
            capture_output=True,
            text=True,
        )
    except Exception:
        return ["0"]

    gpus = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    return gpus or ["0"]


def gpu_memory_status() -> dict[str, int]:
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=index,memory.free", "--format=csv,noheader,nounits"],
            check=True,
            capture_output=True,
            text=True,
            timeout=3,
        )
    except Exception:
        return {}
    status: dict[str, int] = {}
    for line in result.stdout.splitlines():
        parts = [item.strip() for item in line.split(",")]
        if len(parts) < 2:
            continue
        try:
            status[parts[0]] = int(parts[1])
        except ValueError:
            continue
    return status


def select_generation_gpus(candidates: list[str]) -> list[str]:
    candidates = [str(item) for item in candidates]
    status = gpu_memory_status()
    if not status:
        return candidates
    available = [gpu for gpu in candidates if status.get(gpu, 0) >= MIN_GPU_FREE_MB]
    if not available:
        raise GPUBusyError(details={"min_free_mb": MIN_GPU_FREE_MB, "free_mb": status})
    return sorted(available, key=lambda gpu: status.get(gpu, 0), reverse=True)


def list_voices(visitor_id: str | None = None) -> list[str]:
    if not VOICE_DIR.exists():
        return []
    voice_root = VOICE_DIR.resolve()
    voices: list[str] = []
    for path in VOICE_DIR.iterdir():
        if path.is_file() and path.suffix.lower() in VOICE_EXTENSIONS and not path.name.startswith("."):
            voices.append(path.resolve().relative_to(voice_root).as_posix())

    if visitor_id and VOICE_UPLOAD_DIR.exists():
        prefix = f"{visitor_id[:12]}_"
        for path in VOICE_UPLOAD_DIR.iterdir():
            if (
                path.is_file()
                and path.suffix.lower() in VOICE_EXTENSIONS
                and path.name.startswith(prefix)
                and not path.name.startswith(".")
            ):
                voices.append(path.resolve().relative_to(voice_root).as_posix())
    return sorted(voices)


def list_voice_details() -> list[dict[str, Any]]:
    if not VOICE_DIR.exists():
        return []
    voice_root = VOICE_DIR.resolve()
    upload_root = VOICE_UPLOAD_DIR.resolve()
    voices: list[dict[str, Any]] = []
    for path in sorted(VOICE_DIR.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in VOICE_EXTENSIONS or path.name.startswith("."):
            continue
        resolved = path.resolve()
        try:
            relative = resolved.relative_to(voice_root).as_posix()
        except ValueError:
            continue
        source = "upload" if resolved == upload_root or upload_root in resolved.parents else "built-in"
        stat = resolved.stat()
        voices.append(
            {
                "name": relative,
                "filename": resolved.name,
                "source": source,
                "bytes": stat.st_size,
                "updated_at": stat.st_mtime,
            }
        )
    return voices


def credit_count(text: str) -> int:
    return len((text or "").strip())


def srt_to_text(path: Path, limit: int = PUBLIC_CREDIT_LIMIT) -> str:
    if not path.exists():
        return ""

    lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    text_parts: list[str] = []
    timestamp = re.compile(r"\d\d:\d\d:\d\d[,.]\d{3}\s+-->\s+\d\d:\d\d:\d\d[,.]\d{3}")
    for line in lines:
        item = line.strip()
        if not item or item.isdigit() or timestamp.search(item):
            continue
        text_parts.append(item)

    text = re.sub(r"\s+([។.!?,;:])", r"\1", " ".join(text_parts)).strip()
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].strip() or text[:limit]


def example_payloads() -> list[dict[str, Any]]:
    examples = [
        {
            "id": "khmer-story",
            "name": "Khmer story",
            "source": "built-in",
            "text": KHMER_EXAMPLE,
        },
        {
            "id": "khmer-market",
            "name": "Khmer market",
            "source": "built-in",
            "text": KHMER_MARKET_EXAMPLE,
        },
        {
            "id": "khmer-learning",
            "name": "Khmer learning",
            "source": "built-in",
            "text": KHMER_LEARNING_EXAMPLE,
        },
        {
            "id": "khmer-travel",
            "name": "Khmer travel",
            "source": "built-in",
            "text": KHMER_TRAVEL_EXAMPLE,
        },
    ]

    for item in examples:
        item["credits"] = credit_count(item["text"])
        item["limit"] = PUBLIC_CREDIT_LIMIT
    return examples


def example_text_map() -> dict[str, str]:
    return {item["name"]: item["text"] for item in example_payloads()}


def gpu_status() -> list[dict[str, str]]:
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=index,name,memory.total,memory.used,utilization.gpu",
                "--format=csv,noheader,nounits",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except Exception:
        return []

    rows = []
    for line in result.stdout.splitlines():
        parts = [part.strip() for part in line.split(",")]
        if len(parts) == 5:
            rows.append(
                {
                    "index": parts[0],
                    "name": parts[1],
                    "memory_total_mib": parts[2],
                    "memory_used_mib": parts[3],
                    "gpu_util_percent": parts[4],
                }
            )
    return rows


def resolve_voice_path(voice: str) -> Path:
    if not voice:
        raise ValueError("voice is required")

    path = Path(voice)
    if not path.is_absolute():
        path = VOICE_DIR / voice
    path = path.resolve()

    voice_root = VOICE_DIR.resolve()
    if not path.exists() or path.suffix.lower() not in VOICE_EXTENSIONS:
        raise ValueError(f"voice audio not found: {voice}")
    if voice_root in path.parents or path.parent == voice_root:
        return path
    raise ValueError("voice path must be inside the configured voice directory")


def _clean_allowlist_entry(line: str) -> str:
    return line.split("#", 1)[0].strip()


def ultimate_allowlist_entries() -> list[str]:
    entries: list[str] = []
    for item in ULTIMATE_ALLOWED_IPS_ENV.split(","):
        entry = _clean_allowlist_entry(item)
        if entry:
            entries.append(entry)

    if ULTIMATE_IP_ALLOWLIST_PATH.exists():
        for line in ULTIMATE_IP_ALLOWLIST_PATH.read_text(encoding="utf-8", errors="ignore").splitlines():
            entry = _clean_allowlist_entry(line)
            if entry:
                entries.append(entry)

    return sorted(dict.fromkeys(entries))


def ip_allowed_by_entries(ip: str, entries: list[str]) -> bool:
    if ip in {"127.0.0.1", "::1", "localhost"}:
        return True
    try:
        address = ipaddress.ip_address(ip)
    except ValueError:
        return False

    for entry in entries:
        try:
            network = ipaddress.ip_network(entry, strict=False)
        except ValueError:
            continue
        if address in network:
            return True
    return False


def normalize_ip_settings_entry(entry: str) -> str:
    value = _clean_allowlist_entry(entry)
    if value in {"localhost"}:
        return value
    try:
        network = ipaddress.ip_network(value, strict=False)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid IP or CIDR: {entry}") from exc
    if network.prefixlen == network.max_prefixlen:
        return str(network.network_address)
    return str(network)


def load_ip_settings() -> list[dict[str, Any]]:
    if not IP_SETTINGS_PATH.exists():
        return []
    try:
        raw = json.loads(IP_SETTINGS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []
    items = raw.get("ips", raw) if isinstance(raw, dict) else raw
    if not isinstance(items, list):
        return []

    settings: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        try:
            entry = normalize_ip_settings_entry(str(item.get("entry") or ""))
        except HTTPException:
            continue
        settings.append(
            {
                "entry": entry,
                "label": str(item.get("label") or ""),
                "ultimate_allowed": bool(item.get("ultimate_allowed", False)),
                "admin_allowed": bool(item.get("admin_allowed", False)),
                "credit_limit": int(item["credit_limit"]) if item.get("credit_limit") is not None else None,
                "generation_limit": int(item["generation_limit"]) if item.get("generation_limit") is not None else None,
                "source": str(item.get("source") or "admin"),
                "updated_at": float(item.get("updated_at") or time.time()),
            }
        )
    return settings


def save_ip_settings(settings: list[dict[str, Any]]) -> None:
    IP_SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    cleaned = []
    for item in settings:
        cleaned.append(
            {
                "entry": normalize_ip_settings_entry(str(item.get("entry") or "")),
                "label": str(item.get("label") or ""),
                "ultimate_allowed": bool(item.get("ultimate_allowed", False)),
                "admin_allowed": bool(item.get("admin_allowed", False)),
                "credit_limit": int(item["credit_limit"]) if item.get("credit_limit") is not None else None,
                "generation_limit": int(item["generation_limit"]) if item.get("generation_limit") is not None else None,
                "source": str(item.get("source") or "admin"),
                "updated_at": float(item.get("updated_at") or time.time()),
            }
        )
    payload = {"ips": cleaned, "updated_at": time.time()}
    tmp_path = IP_SETTINGS_PATH.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_path.replace(IP_SETTINGS_PATH)


def ip_matches_entry(ip: str, entry: str) -> bool:
    return ip_allowed_by_entries(ip, [entry])


def explicit_ip_setting_for(ip: str) -> dict[str, Any] | None:
    for item in load_ip_settings():
        if ip_matches_entry(ip, str(item.get("entry") or "")):
            return item
    return None


def effective_ip_settings() -> list[dict[str, Any]]:
    by_entry: dict[str, dict[str, Any]] = {}
    now = time.time()
    for entry in ultimate_allowlist_entries():
        by_entry[entry] = {
            "entry": entry,
            "label": "",
            "ultimate_allowed": True,
            "admin_allowed": False,
            "credit_limit": None,
            "generation_limit": None,
            "source": "ultimate_allowlist",
            "updated_at": now,
        }
    for entry in admin_allowlist_entries():
        existing = by_entry.setdefault(
            entry,
            {
                "entry": entry,
                "label": "",
                "ultimate_allowed": False,
                "admin_allowed": False,
                "credit_limit": None,
                "generation_limit": None,
                "source": "admin_env",
                "updated_at": now,
            },
        )
        existing["admin_allowed"] = True
        existing["source"] = "env_allowlist" if existing["source"] != "ultimate_allowlist" else "mixed"
    for item in load_ip_settings():
        by_entry[str(item["entry"])] = {**item, "source": item.get("source") or "admin"}
    rows = []
    for item in by_entry.values():
        ultimate_allowed = bool(item.get("ultimate_allowed", False))
        item["effective_credit_limit"] = int(
            item["credit_limit"]
            if item.get("credit_limit") is not None
            else ULTIMATE_ALLOWLIST_CREDIT_LIMIT
            if ultimate_allowed
            else PUBLIC_CREDIT_LIMIT
        )
        item["effective_generation_limit"] = int(
            item["generation_limit"]
            if item.get("generation_limit") is not None
            else ULTIMATE_ALLOWLIST_GENERATIONS_PER_WINDOW
            if ultimate_allowed
            else MAX_GENERATIONS_PER_WINDOW
        )
        rows.append(item)
    return sorted(rows, key=lambda item: str(item.get("entry") or ""))


def normalize_auth_user_email(email: str) -> str:
    value = str(email or "").strip().lower()
    if "@" not in value:
        raise HTTPException(status_code=400, detail=f"Invalid user email: {email}")
    return value


def load_auth_user_settings() -> list[dict[str, Any]]:
    if not AUTH_USER_SETTINGS_PATH.exists():
        return []
    try:
        raw = json.loads(AUTH_USER_SETTINGS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []
    items = raw.get("users", raw) if isinstance(raw, dict) else raw
    if not isinstance(items, list):
        return []

    settings: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        try:
            email = normalize_auth_user_email(str(item.get("email") or ""))
        except HTTPException:
            continue
        settings.append(
            {
                "email": email,
                "label": str(item.get("label") or ""),
                "ultimate_allowed": bool(item.get("ultimate_allowed", False)),
                "credit_limit": int(item["credit_limit"]) if item.get("credit_limit") is not None else None,
                "generation_limit": int(item["generation_limit"]) if item.get("generation_limit") is not None else None,
                "source": str(item.get("source") or "admin"),
                "updated_at": float(item.get("updated_at") or time.time()),
            }
        )
    return settings


def save_auth_user_settings(settings: list[dict[str, Any]]) -> None:
    AUTH_USER_SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    cleaned = []
    for item in settings:
        cleaned.append(
            {
                "email": normalize_auth_user_email(str(item.get("email") or "")),
                "label": str(item.get("label") or ""),
                "ultimate_allowed": bool(item.get("ultimate_allowed", False)),
                "credit_limit": int(item["credit_limit"]) if item.get("credit_limit") is not None else None,
                "generation_limit": int(item["generation_limit"]) if item.get("generation_limit") is not None else None,
                "source": str(item.get("source") or "admin"),
                "updated_at": float(item.get("updated_at") or time.time()),
            }
        )
    payload = {"users": cleaned, "updated_at": time.time()}
    tmp_path = AUTH_USER_SETTINGS_PATH.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_path.replace(AUTH_USER_SETTINGS_PATH)


def explicit_auth_user_setting_for(email: str | None) -> dict[str, Any] | None:
    if not email:
        return None
    normalized = normalize_auth_user_email(email)
    for item in load_auth_user_settings():
        if str(item.get("email") or "") == normalized:
            return item
    return None


def auth_user_is_admin(auth_user: dict[str, Any] | None = None) -> bool:
    return str((auth_user or {}).get("role") or "").strip().lower() == "admin"


def auth_user_ultimate_allowed(auth_user: dict[str, Any] | None = None) -> bool:
    if auth_user_is_admin(auth_user):
        return True
    setting = explicit_auth_user_setting_for(auth_user.get("email") if auth_user else None)
    if setting is None:
        return False
    return bool(setting.get("ultimate_allowed", False))


def ultimate_ip_allowed(ip: str) -> bool:
    explicit = explicit_ip_setting_for(ip)
    if explicit is not None:
        return bool(explicit.get("ultimate_allowed", False))
    return ip_allowed_by_entries(ip, ultimate_allowlist_entries())


def admin_allowlist_entries() -> list[str]:
    entries: list[str] = []
    for item in ADMIN_ALLOWED_IPS_ENV.split(","):
        entry = _clean_allowlist_entry(item)
        if entry:
            entries.append(entry)
    return sorted(dict.fromkeys(entries))


def admin_ip_allowed(ip: str) -> bool:
    explicit = explicit_ip_setting_for(ip)
    if explicit is not None and explicit.get("admin_allowed") is not None:
        return bool(explicit.get("admin_allowed", False))
    entries = admin_allowlist_entries()
    if not entries:
        return False
    return ip_allowed_by_entries(ip, entries)


def normalize_origin(origin: str) -> str:
    value = (origin or "").strip().rstrip("/")
    if not value:
        return ""
    if value == "*":
        return value
    if not re.match(r"^https?://[^/\s]+(?::\d+)?$", value):
        raise HTTPException(status_code=400, detail=f"Invalid CORS origin: {origin}")
    return value.lower()


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def load_api_keys() -> list[dict[str, Any]]:
    if not API_KEYS_PATH.exists():
        return []
    try:
        raw = json.loads(API_KEYS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []
    items = raw.get("keys", raw) if isinstance(raw, dict) else raw
    if not isinstance(items, list):
        return []

    keys: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        key_id = str(item.get("id") or "").strip()
        digest = str(item.get("token_hash") or "").strip()
        if not key_id or not digest:
            continue
        origins = []
        for origin in item.get("allowed_origins") or []:
            try:
                normalized = normalize_origin(str(origin))
            except HTTPException:
                continue
            if normalized:
                origins.append(normalized)
        keys.append(
            {
                "id": key_id,
                "user_id": str(item.get("user_id") or ""),
                "user_email": str(item.get("user_email") or ""),
                "name": str(item.get("name") or "API key"),
                "token_hash": digest,
                "token_prefix": str(item.get("token_prefix") or ""),
                "allowed_origins": sorted(dict.fromkeys(origins)),
                "allowed_methods": [str(method).upper() for method in item.get("allowed_methods") or ["GET", "POST", "PUT", "DELETE"]],
                "allowed_headers": [str(header) for header in item.get("allowed_headers") or ["Authorization", "Content-Type"]],
                "allowed_ips": [str(ip).strip() for ip in item.get("allowed_ips") or [] if str(ip).strip()],
                "machine_name": str(item.get("machine_name") or "") or None,
                "monthly_request_limit": int(item.get("monthly_request_limit") or 0) or None,
                "enabled": bool(item.get("enabled", True)),
                "created_at": float(item.get("created_at") or time.time()),
                "updated_at": float(item.get("updated_at") or time.time()),
                "regenerated_at": float(item["regenerated_at"]) if item.get("regenerated_at") is not None else None,
                "last_used_at": float(item["last_used_at"]) if item.get("last_used_at") is not None else None,
                "last_used_ip": str(item.get("last_used_ip") or "") or None,
                "requests": int(item.get("requests") or 0),
            }
        )
    return keys


def save_api_keys(keys: list[dict[str, Any]]) -> None:
    API_KEYS_PATH.parent.mkdir(parents=True, exist_ok=True)
    cleaned = []
    for item in keys:
        cleaned.append(
            {
                "id": str(item["id"]),
                "user_id": str(item.get("user_id") or ""),
                "user_email": str(item.get("user_email") or ""),
                "name": str(item.get("name") or "API key"),
                "token_hash": str(item["token_hash"]),
                "token_prefix": str(item.get("token_prefix") or ""),
                "allowed_origins": sorted(
                    dict.fromkeys(normalize_origin(str(origin)) for origin in item.get("allowed_origins") or [] if str(origin).strip())
                ),
                "allowed_methods": [str(method).upper() for method in item.get("allowed_methods") or ["GET", "POST", "PUT", "DELETE"]],
                "allowed_headers": [str(header) for header in item.get("allowed_headers") or ["Authorization", "Content-Type"]],
                "allowed_ips": [str(ip).strip() for ip in item.get("allowed_ips") or [] if str(ip).strip()],
                "machine_name": str(item.get("machine_name") or "") or None,
                "monthly_request_limit": int(item.get("monthly_request_limit") or 0) or None,
                "enabled": bool(item.get("enabled", True)),
                "created_at": float(item.get("created_at") or time.time()),
                "updated_at": float(item.get("updated_at") or time.time()),
                "regenerated_at": item.get("regenerated_at"),
                "last_used_at": item.get("last_used_at"),
                "last_used_ip": item.get("last_used_ip"),
                "requests": int(item.get("requests") or 0),
            }
        )
    payload = {"keys": cleaned, "updated_at": time.time()}
    tmp_path = API_KEYS_PATH.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_path.replace(API_KEYS_PATH)


def public_api_key_payload(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item["id"],
        "name": item.get("name") or "API key",
        "token_prefix": item.get("token_prefix") or "",
        "user_id": item.get("user_id") or "",
        "user_email": item.get("user_email") or "",
        "allowed_origins": item.get("allowed_origins") or [],
        "allowed_methods": item.get("allowed_methods") or ["GET", "POST"],
        "allowed_headers": item.get("allowed_headers") or ["Authorization", "Content-Type"],
        "allowed_ips": item.get("allowed_ips") or [],
        "machine_name": item.get("machine_name"),
        "monthly_request_limit": item.get("monthly_request_limit"),
        "enabled": bool(item.get("enabled", True)),
        "created_at": item.get("created_at"),
        "updated_at": item.get("updated_at"),
        "regenerated_at": item.get("regenerated_at"),
        "last_used_at": item.get("last_used_at"),
        "last_used_ip": item.get("last_used_ip"),
        "requests": int(item.get("requests") or 0),
    }


def load_api_logs() -> list[dict[str, Any]]:
    if not API_LOGS_PATH.exists():
        return []
    try:
        raw = json.loads(API_LOGS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []
    items = raw.get("logs", raw) if isinstance(raw, dict) else raw
    return [item for item in items if isinstance(item, dict)]


def save_api_logs(logs: list[dict[str, Any]]) -> None:
    API_LOGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {"logs": logs[-2000:], "updated_at": time.time()}
    tmp_path = API_LOGS_PATH.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_path.replace(API_LOGS_PATH)


def append_api_log(request: Request, item: dict[str, Any], status_code: int = 200, credits_used: int = 0, error_code: str | None = None, error_message: str | None = None, latency_ms: int = 0) -> None:
    logs = load_api_logs()
    logs.append(
        {
            "id": uuid.uuid4().hex,
            "user_id": item.get("user_id") or "",
            "user_email": item.get("user_email") or "",
            "api_key_id": item.get("id") or "",
            "key": item.get("token_prefix") or "",
            "endpoint": request.url.path,
            "method": request.method,
            "status_code": status_code,
            "origin": request.headers.get("origin", ""),
            "ip_address": client_ip_from_request(request),
            "user_agent": request.headers.get("user-agent", ""),
            "credits_used": credits_used,
            "latency_ms": latency_ms,
            "error_code": error_code,
            "error_message": error_message,
            "created_at": time.time(),
        }
    )
    save_api_logs(logs)


def origin_allowed_for_key(origin: str, allowed_origins: list[str]) -> bool:
    if not origin:
        return True
    normalized = normalize_origin(origin)
    return "*" in allowed_origins or normalized in allowed_origins


def cors_headers_for_origin(origin: str) -> dict[str, str]:
    if not origin:
        return {}
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
    }


def origin_known_for_preflight(origin: str) -> bool:
    if not origin:
        return True
    try:
        normalized = normalize_origin(origin)
    except HTTPException:
        return False
    for item in load_api_keys():
        if not item.get("enabled", True):
            continue
        allowed = item.get("allowed_origins") or []
        if "*" in allowed or normalized in allowed:
            return True
    return False


def bearer_token_from_request(request: Request) -> str:
    value = request.headers.get("authorization", "")
    if not value.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer API token.")
    return value.split(" ", 1)[1].strip()


def ensure_api_key(request: Request, response: Response) -> dict[str, Any]:
    token = bearer_token_from_request(request)
    digest = token_hash(token)
    origin = request.headers.get("origin", "")
    keys = load_api_keys()
    now = time.time()
    for index, item in enumerate(keys):
        if not item.get("enabled", True):
            continue
        if not hmac.compare_digest(str(item.get("token_hash") or ""), digest):
            continue
        allowed_origins = item.get("allowed_origins") or []
        if not origin_allowed_for_key(origin, allowed_origins):
            raise HTTPException(status_code=403, detail=f"Origin is not allowed for this API token: {origin}")
        allowed_methods = [str(method).upper() for method in item.get("allowed_methods") or []]
        if allowed_methods and request.method.upper() not in allowed_methods and request.method.upper() != "OPTIONS":
            raise HTTPException(status_code=403, detail=f"Method is not allowed for this API token: {request.method}")
        allowed_ips = [str(ip).strip() for ip in item.get("allowed_ips") or [] if str(ip).strip()]
        requester_ip = client_ip_from_request(request)
        if allowed_ips and requester_ip not in allowed_ips:
            raise HTTPException(status_code=403, detail=f"IP is not allowed for this API token: {requester_ip}")
        monthly_limit = item.get("monthly_request_limit")
        if monthly_limit is not None and int(item.get("requests") or 0) >= int(monthly_limit):
            raise HTTPException(status_code=429, detail="Monthly API request limit exceeded.")
        item["last_used_at"] = now
        item["last_used_ip"] = requester_ip
        item["requests"] = int(item.get("requests") or 0) + 1
        item["updated_at"] = now
        keys[index] = item
        save_api_keys(keys)
        for key, value in cors_headers_for_origin(origin).items():
            response.headers[key] = value
        append_api_log(request, item)
        return item
    raise HTTPException(status_code=401, detail="Invalid API token.")


def ensure_ultimate_access(payload: "GenerateRequest", client_ip: str, auth_user: dict[str, Any] | None = None) -> None:
    if (payload.mode or "").strip().lower() != "ultimate":
        return
    if not (ultimate_ip_allowed(client_ip) or auth_user_ultimate_allowed(auth_user)):
        raise HTTPException(
            status_code=403,
            detail=(
                "Ultimate Cloning is allowlisted for selected IPs. "
                f"Add this IP to {ULTIMATE_IP_ALLOWLIST_PATH}: {client_ip}"
            ),
        )
    if not payload.voice:
        raise HTTPException(status_code=400, detail="Ultimate Cloning requires voice.")
    if not (payload.prompt_text or "").strip():
        raise HTTPException(status_code=400, detail="Ultimate Cloning requires prompt_text.")


def split_text(text: str, max_chars: int) -> list[str]:
    cleaned = re.sub(r"[ \t]+", " ", (text or "").replace("\r", "\n")).strip()
    if not cleaned:
        return []

    max_chars = max(80, min(int(max_chars), PUBLIC_CREDIT_LIMIT))
    paragraphs = [part.strip() for part in re.split(r"\n+", cleaned) if part.strip()]
    chunks: list[str] = []

    sentence_pattern = re.compile(r"(?<=[។.!?！？。])\s*")
    for paragraph in paragraphs:
        pieces = [piece.strip() for piece in sentence_pattern.split(paragraph) if piece.strip()]
        if not pieces:
            pieces = [paragraph]

        current = ""
        for piece in pieces:
            if len(piece) > max_chars:
                if current:
                    chunks.append(current)
                    current = ""
                chunks.extend(_split_long_piece(piece, max_chars))
                continue

            candidate = f"{current} {piece}".strip() if current else piece
            if len(candidate) <= max_chars:
                current = candidate
            else:
                if current:
                    chunks.append(current)
                current = piece

        if current:
            chunks.append(current)

    return chunks


def _split_long_piece(piece: str, max_chars: int) -> list[str]:
    words = piece.split()
    if len(words) <= 1:
        return [piece[i : i + max_chars] for i in range(0, len(piece), max_chars)]

    chunks: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip() if current else word
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                chunks.append(current)
            current = word
    if current:
        chunks.append(current)
    return chunks


def safe_output_name(name: str | None) -> str:
    stem = re.sub(r"[^A-Za-z0-9_.-]+", "_", (name or "").strip()).strip("._")
    if not stem:
        stem = f"reader_{uuid.uuid4().hex[:10]}"
    if not stem.lower().endswith(".wav"):
        stem += ".wav"
    return stem


def safe_upload_name(filename: str, visitor_id: str) -> str:
    suffix = Path(filename or "").suffix.lower()
    if suffix not in VOICE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Upload a voice file ending in mp3, wav, flac, or m4a.")
    stem = re.sub(r"[^A-Za-z0-9_.-]+", "_", Path(filename).stem).strip("._") or "voice"
    return f"{visitor_id[:12]}_{uuid.uuid4().hex[:8]}_{stem}{suffix}"


def request_from_loopback(request: Request) -> bool:
    host = request.client.host if request.client else ""
    try:
        return ipaddress.ip_address(host.split("%", 1)[0]).is_loopback
    except ValueError:
        return host in {"localhost", "unix"}


def ensure_voice_access(voice: str | None, visitor_id: str, *, allow_internal_upload: bool = False) -> None:
    if not voice:
        return
    normalized = voice.replace("\\", "/")
    if (
        normalized.startswith("uploads/")
        and not allow_internal_upload
        and not Path(normalized).name.startswith(f"{visitor_id[:12]}_")
    ):
        raise HTTPException(status_code=403, detail="This uploaded voice belongs to another visitor.")


class WorkerManager:
    def __init__(
        self,
        gpus: list[str],
        model_id: str,
        model_name: str = MODEL_DISPLAY_NAME,
        model_slug: str = MODEL_PROFILE_SLUG,
        lora_weights_path: str | None = DEFAULT_LORA_WEIGHTS_PATH,
        local_files_only: bool = True,
        optimize: bool = False,
        load_denoiser: bool = False,
    ) -> None:
        self.gpus = [str(gpu) for gpu in gpus] or ["0"]
        self.model_id = model_id
        self.model_name = model_name
        self.model_slug = model_slug
        self.lora_weights_path = lora_weights_path
        self.local_files_only = local_files_only
        self.optimize = optimize
        self.load_denoiser = load_denoiser
        self._executors: dict[str, concurrent.futures.ProcessPoolExecutor] = {}
        self._lock = threading.Lock()
        self.max_gpu_concurrency = FASTAPI_MAX_GPU_CONCURRENCY

    def executor_for(self, gpu_id: str) -> concurrent.futures.ProcessPoolExecutor:
        gpu_id = str(gpu_id)
        with self._lock:
            executor = self._executors.get(gpu_id)
            if executor is None:
                context = multiprocessing.get_context("spawn")
                executor = concurrent.futures.ProcessPoolExecutor(
                    max_workers=1,
                    mp_context=context,
                    initializer=_init_worker,
                    initargs=(
                        gpu_id,
                        self.model_id,
                        self.lora_weights_path,
                        self.local_files_only,
                        self.optimize,
                        self.load_denoiser,
                    ),
                )
                self._executors[gpu_id] = executor
            return executor

    def generate(
        self,
        *,
        text: str,
        voice: str | None,
        output_name: str | None,
        selected_gpus: list[str] | None,
        max_chars: int,
        cfg_value: float,
        inference_timesteps: int,
        normalize: bool,
        denoise: bool,
        mode: str = "clone",
        control: str | None = None,
        user_name: str | None = None,
        prompt_text: str | None = None,
        credit_limit: int = PUBLIC_CREDIT_LIMIT,
        cancel_event: threading.Event | None = None,
    ) -> dict[str, Any]:
        credits = credit_count(text)
        if credits > credit_limit:
            raise ValueError(f"Text is {credits} credits; limit is {credit_limit}.")

        chunks = split_text(text, max_chars)
        if not chunks:
            raise ValueError("text is empty")

        mode = (mode or "clone").strip().lower()
        if mode not in {"clone", "design", "ultimate"}:
            raise ValueError("mode must be 'clone', 'design', or 'ultimate'")

        voice_path: Path | None = None
        if mode in {"clone", "ultimate"}:
            voice_path = resolve_voice_path(voice or "")
        if mode == "ultimate" and not (prompt_text or "").strip():
            raise ValueError("Ultimate Cloning requires prompt_text.")

        control = re.sub(r"[()（）]", "", (control or "").strip())
        prompt_text = (prompt_text or "").strip() or None
        gpus = [str(gpu) for gpu in (selected_gpus or self.gpus) if str(gpu) in self.gpus]
        if not gpus:
            raise ValueError(f"no valid worker selected; available: {', '.join(self.gpus)}")

        job_id = uuid.uuid4().hex
        job_dir = OUTPUT_DIR / job_id
        chunk_dir = job_dir / "chunks"
        chunk_dir.mkdir(parents=True, exist_ok=True)
        output_path = job_dir / safe_output_name(output_name or user_name)

        payloads: list[dict[str, Any]] = []
        for index, chunk in enumerate(chunks, 1):
            if cancel_event is not None and cancel_event.is_set():
                raise RuntimeError("Generation cancelled.")
            final_text = f"({control}){chunk}" if control else chunk
            payload = {
                "index": index,
                "text": final_text,
                "reference_wav_path": str(voice_path) if voice_path is not None else None,
                "prompt_wav_path": str(voice_path) if mode == "ultimate" and voice_path is not None else None,
                "prompt_text": prompt_text if mode == "ultimate" else None,
                "output_path": str(chunk_dir / f"chunk_{index:04d}.wav"),
                "cfg_value": cfg_value,
                "inference_timesteps": inference_timesteps,
                "normalize": normalize,
                "denoise": denoise,
            }
            payloads.append(payload)

        chunk_results: list[dict[str, Any]] = []
        for payload in payloads:
            if cancel_event is not None and cancel_event.is_set():
                raise RuntimeError("Generation cancelled.")
            available = select_generation_gpus(gpus)
            retry_gpus = available[:]
            last_error: Exception | None = None
            for attempt in range(2):
                if not retry_gpus:
                    break
                gpu = retry_gpus.pop(0)
                logger.info("generating chunk %s/%s on worker %s", payload["index"], len(payloads), gpu)
                future = self.executor_for(gpu).submit(_generate_chunk_worker, payload)
                try:
                    chunk_results.append(future.result())
                    last_error = None
                    break
                except GPUOutOfMemoryError as exc:
                    last_error = exc
                    _cleanup_cuda()
                    logger.warning("chunk %s OOM on worker %s; retry=%s", payload["index"], gpu, attempt == 0)
                    time.sleep(1)
            if last_error is not None:
                raise last_error

        chunk_results.sort(key=lambda item: item["index"])
        sample_rate = int(chunk_results[0]["sample_rate"])
        silence = np.zeros(int(sample_rate * 0.18), dtype=np.float32)
        audio_parts: list[np.ndarray] = []

        for item in chunk_results:
            data, sr = sf.read(item["path"], dtype="float32")
            if sr != sample_rate:
                raise RuntimeError(f"sample rate mismatch in {item['path']}: {sr} != {sample_rate}")
            if data.ndim > 1:
                data = data.mean(axis=1)
            audio_parts.append(data)
            audio_parts.append(silence)

        merged = np.concatenate(audio_parts[:-1] if audio_parts else audio_parts)
        sf.write(str(output_path), merged, sample_rate)

        return {
            "job_id": job_id,
            "output_path": str(output_path),
            "download_url": f"/api/download/{job_id}/{output_path.name}",
            "mode": mode,
            "user_name": (user_name or "").strip() or None,
            "voice": voice_path.name if voice_path is not None else None,
            "control": control,
            "credits_used": credits,
            "credit_limit": credit_limit,
            "chunks": len(chunks),
            "workers_used": min(len(gpus), len(chunks)),
            "duration_sec": round(float(len(merged) / sample_rate), 2),
            "sample_rate": sample_rate,
        }

    def warmup(self, selected_gpus: list[str] | None = None) -> list[dict[str, Any]]:
        gpus = [str(gpu) for gpu in (selected_gpus or self.gpus) if str(gpu) in self.gpus]
        if not gpus:
            raise ValueError(f"no valid worker selected; available: {', '.join(self.gpus)}")
        futures = [self.executor_for(gpu).submit(_warmup_worker, {}) for gpu in gpus]
        return [future.result() for future in concurrent.futures.as_completed(futures)]

    def shutdown(self) -> None:
        with self._lock:
            for executor in self._executors.values():
                executor.shutdown(wait=False, cancel_futures=True)
            self._executors.clear()


class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=1)
    voice: str | None = None
    mode: str = Field("clone", pattern="^(clone|design|ultimate)$")
    control: str | None = None
    prompt_text: str | None = None
    user_name: str | None = None
    output_name: str | None = None
    max_chars: int = Field(350, ge=80, le=ULTIMATE_ALLOWLIST_CREDIT_LIMIT)
    cfg_value: float = Field(2.0, ge=0.1, le=10.0)
    inference_timesteps: int = Field(10, ge=1, le=100)
    normalize: bool = False
    denoise: bool = False


class AdminLoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class AdminIPSettingsRequest(BaseModel):
    entry: str = Field(..., min_length=1)
    label: str | None = None
    ultimate_allowed: bool = True
    admin_allowed: bool = False
    credit_limit: int | None = Field(None, ge=1, le=1000000000)
    generation_limit: int | None = Field(None, ge=1, le=1000000000)


class AdminAPIKeyRequest(BaseModel):
    name: str = Field("API key", min_length=1, max_length=80)
    allowed_origins: list[str] = Field(default_factory=list)
    allowed_methods: list[str] = Field(default_factory=lambda: ["GET", "POST"])
    allowed_headers: list[str] = Field(default_factory=lambda: ["Authorization", "Content-Type"])
    allowed_ips: list[str] = Field(default_factory=list)
    machine_name: str | None = None
    monthly_request_limit: int | None = Field(None, ge=1, le=1000000000)
    enabled: bool = True


class AdminAPIKeyUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=80)
    allowed_origins: list[str] | None = None
    allowed_methods: list[str] | None = None
    allowed_headers: list[str] | None = None
    allowed_ips: list[str] | None = None
    machine_name: str | None = None
    monthly_request_limit: int | None = Field(None, ge=1, le=1000000000)
    enabled: bool | None = None


class SpeechAPIRequest(BaseModel):
    model: str = Field(MODEL_PROFILE_SLUG, min_length=1)
    input: str = Field(..., min_length=1)
    voice: str = Field("Maly-Female.mp3", min_length=1)
    response_format: str = Field("wav", pattern="^(wav|mp3)$")
    instructions: str | None = None


@dataclass
class JobRecord:
    id: str
    status: str
    request: dict[str, Any]
    visitor_id: str
    client_ip: str
    label: str | None = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    result: dict[str, Any] | None = None
    error: str | None = None


class WarmupRequest(BaseModel):
    pass


def client_ip_from_forwarded_for(forwarded_for: str) -> str:
    forwarded_ips = [part.strip() for part in forwarded_for.split(",") if part.strip()]
    for candidate in reversed(forwarded_ips):
        try:
            parsed_ip = ipaddress.ip_address(candidate.split("%", 1)[0])
        except ValueError:
            continue
        if parsed_ip.is_global:
            return candidate
    return forwarded_ips[0] if forwarded_ips else ""


def client_ip_from_request(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        forwarded_ip = client_ip_from_forwarded_for(forwarded_for)
        if forwarded_ip:
            return forwarded_ip
    real_ip = request.headers.get("cf-connecting-ip") or request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


def password_matches(candidate: str) -> bool:
    if ADMIN_PASSWORD_SHA256:
        digest = hashlib.sha256(candidate.encode("utf-8")).hexdigest()
        return hmac.compare_digest(digest, ADMIN_PASSWORD_SHA256)
    if ADMIN_PASSWORD:
        return hmac.compare_digest(candidate, ADMIN_PASSWORD)
    return False


def admin_enabled() -> bool:
    return bool(ADMIN_USERNAME and (ADMIN_PASSWORD_SHA256 or ADMIN_PASSWORD))


def admin_signature(username: str, ip: str, expires_at: int) -> str:
    payload = f"{username}|{ip}|{expires_at}".encode("utf-8")
    return hmac.new(ADMIN_SESSION_SECRET.encode("utf-8"), payload, hashlib.sha256).hexdigest()


def encode_admin_token(username: str, ip: str) -> str:
    expires_at = int(time.time()) + ADMIN_SESSION_SECONDS
    signature = admin_signature(username, ip, expires_at)
    raw = f"{username}|{ip}|{expires_at}|{signature}".encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii")


def decode_admin_token(token: str) -> dict[str, Any] | None:
    try:
        raw = base64.urlsafe_b64decode(token.encode("ascii")).decode("utf-8")
        username, ip, expires_text, signature = raw.split("|", 3)
        expires_at = int(expires_text)
    except Exception:
        return None
    if expires_at < int(time.time()):
        return None
    expected = admin_signature(username, ip, expires_at)
    if not hmac.compare_digest(signature, expected):
        return None
    return {"username": username, "ip": ip, "expires_at": expires_at}


def ensure_admin(request: Request) -> dict[str, Any]:
    ip = client_ip_from_request(request)
    auth_user = auth_user_from_request(request)
    if auth_user_is_admin(auth_user):
        return {"username": auth_user.get("email") or "admin", "ip": ip, "role": "admin", "auth_user": auth_user}
    if not admin_enabled():
        raise HTTPException(status_code=503, detail="Admin login is not configured.")
    if not admin_ip_allowed(ip):
        raise HTTPException(status_code=403, detail=f"Admin is not allowed from this IP: {ip}")
    token = request.cookies.get(ADMIN_COOKIE_NAME, "")
    session = decode_admin_token(token)
    if not session or session["username"] != ADMIN_USERNAME or session["ip"] != ip:
        raise HTTPException(status_code=401, detail="Admin login required.")
    return {"username": session["username"], "ip": ip, "expires_at": session["expires_at"]}


def browser_from_user_agent(user_agent: str) -> str:
    value = user_agent.lower()
    if "edg/" in value:
        return "Edge"
    if "chrome/" in value and "safari/" in value:
        return "Chrome"
    if "safari/" in value and "chrome/" not in value:
        return "Safari"
    if "firefox/" in value:
        return "Firefox"
    return "Unknown"


def public_ip_geo(ip: str) -> dict[str, Any]:
    if not ip or ip in {"unknown", "127.0.0.1", "::1"} or ip.startswith(("10.", "192.168.", "172.")):
        return {}
    cached = GEO_CACHE.get(ip)
    if cached is not None:
        return cached

    try:
        response = requests.get(
            f"https://ipapi.co/{ip}/json/",
            headers={"User-Agent": "NarrationStudio/1.0"},
            timeout=GEO_LOOKUP_TIMEOUT_SEC,
        )
        response.raise_for_status()
        data = response.json()
    except Exception:
        return {}

    geo = {
        "country": data.get("country_name") or data.get("country") or "Unknown",
        "city": data.get("city") or "Unknown",
        "region": data.get("region") or "Unknown",
        "timezone": data.get("timezone") or "Unknown",
        "isp": data.get("org") or data.get("asn") or "Unknown ISP",
        "latitude": data.get("latitude") or 0,
        "longitude": data.get("longitude") or 0,
    }
    GEO_CACHE[ip] = geo
    return geo


def visitor_location_from_request(request: Request) -> dict[str, Any]:
    headers = request.headers
    ip = client_ip_from_request(request)
    geo = public_ip_geo(ip)
    return {
        "ip": ip,
        "country": headers.get("cf-ipcountry")
        or headers.get("x-vercel-ip-country")
        or headers.get("x-country")
        or geo.get("country")
        or "Unknown",
        "city": headers.get("cf-ipcity")
        or headers.get("x-vercel-ip-city")
        or headers.get("x-city")
        or geo.get("city")
        or "Unknown",
        "region": headers.get("cf-region")
        or headers.get("x-vercel-ip-country-region")
        or headers.get("x-region")
        or geo.get("region")
        or "Unknown",
        "timezone": headers.get("cf-timezone") or headers.get("x-timezone") or geo.get("timezone") or "Unknown",
        "isp": headers.get("cf-asn")
        or headers.get("x-isp")
        or geo.get("isp")
        or headers.get("x-forwarded-host")
        or "Unknown ISP",
        "latitude": geo.get("latitude", 0),
        "longitude": geo.get("longitude", 0),
        "browser": browser_from_user_agent(headers.get("user-agent", "")),
    }


def visitor_cookie_is_valid(value: str | None) -> bool:
    if not value:
        return False
    return bool(re.fullmatch(r"[a-f0-9]{32}", value))


def request_is_secure(request: Request) -> bool:
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",", 1)[0].strip().lower()
    return forwarded_proto == "https"


def visitor_id_for_request(request: Request, response: Response) -> str:
    visitor_id = request.cookies.get(VISITOR_COOKIE_NAME)
    if not visitor_cookie_is_valid(visitor_id):
        visitor_id = uuid.uuid4().hex

    response.set_cookie(
        VISITOR_COOKIE_NAME,
        visitor_id,
        max_age=VISITOR_COOKIE_MAX_AGE,
        httponly=True,
        secure=request_is_secure(request),
        samesite="lax",
        path="/",
    )
    return visitor_id


def usage_state_for_subject(subject: str, now: float | None = None) -> dict[str, float]:
    current_time = now if now is not None else time.time()
    state = USAGE_BY_IP.get(subject)
    if state is None or current_time >= state["reset_at"]:
        state = {"count": 0.0, "reset_at": current_time + GENERATION_WINDOW_SECONDS}
        USAGE_BY_IP[subject] = state
    return state


def usage_state_for_ip(ip: str, now: float | None = None) -> dict[str, float]:
    return usage_state_for_subject(ip, now)


def generation_limit_for_ip(ip: str) -> int:
    explicit = explicit_ip_setting_for(ip)
    if explicit is not None and explicit.get("generation_limit") is not None:
        return int(explicit["generation_limit"])
    if ultimate_ip_allowed(ip):
        return ULTIMATE_ALLOWLIST_GENERATIONS_PER_WINDOW
    return MAX_GENERATIONS_PER_WINDOW


def credit_limit_for_ip(ip: str) -> int:
    explicit = explicit_ip_setting_for(ip)
    if explicit is not None and explicit.get("credit_limit") is not None:
        return int(explicit["credit_limit"])
    if ultimate_ip_allowed(ip):
        return ULTIMATE_ALLOWLIST_CREDIT_LIMIT
    return PUBLIC_CREDIT_LIMIT


def auth_user_from_request(request: Request) -> dict[str, Any] | None:
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        return None
    try:
        payload = decode_token(token, "access")
        user_id = str(payload.get("sub") or "")
        if not user_id:
            return None
        db = SessionLocal()
        try:
            user = get_user_by_id(db, user_id)
            if not user or not user.is_active:
                return None
            return {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
            }
        finally:
            db.close()
    except Exception:
        return None


def usage_subject_for(ip: str, auth_user: dict[str, Any] | None = None) -> str:
    if auth_user and auth_user.get("email"):
        return f"user:{normalize_auth_user_email(str(auth_user['email']))}"
    return ip


def generation_limit_for_context(ip: str, auth_user: dict[str, Any] | None = None) -> int:
    setting = explicit_auth_user_setting_for(auth_user.get("email") if auth_user else None)
    if setting is not None and setting.get("generation_limit") is not None:
        return int(setting["generation_limit"])
    if auth_user_ultimate_allowed(auth_user):
        return ULTIMATE_ALLOWLIST_GENERATIONS_PER_WINDOW
    return generation_limit_for_ip(ip)


def credit_limit_for_context(ip: str, auth_user: dict[str, Any] | None = None) -> int:
    setting = explicit_auth_user_setting_for(auth_user.get("email") if auth_user else None)
    if setting is not None and setting.get("credit_limit") is not None:
        return int(setting["credit_limit"])
    if auth_user_ultimate_allowed(auth_user):
        return ULTIMATE_ALLOWLIST_CREDIT_LIMIT
    return credit_limit_for_ip(ip)


def usage_snapshot(ip: str) -> dict[str, Any]:
    return usage_snapshot_for_subject(ip, generation_limit_for_ip(ip))


def usage_snapshot_for_subject(subject: str, generation_limit: int) -> dict[str, Any]:
    with USAGE_LOCK:
        now = time.time()
        state = usage_state_for_subject(subject, now)
        used = int(state["count"])
        reset_at = float(state["reset_at"])
        return {
            "generation_used": used,
            "generation_remaining": max(0, generation_limit - used),
            "generation_reset_at": reset_at,
            "generation_reset_in_seconds": max(0, int(reset_at - now)),
        }


def consume_generation_for_ip(ip: str) -> dict[str, Any]:
    return consume_generation_for_subject(ip, generation_limit_for_ip(ip), "IP")


def consume_generation_for_subject(subject: str, generation_limit: int, subject_label: str = "account") -> dict[str, Any]:
    with USAGE_LOCK:
        now = time.time()
        state = usage_state_for_subject(subject, now)
        used = int(state["count"])
        if used >= generation_limit:
            reset_in = max(0, int(float(state["reset_at"]) - now))
            reset_hours = max(1, int((reset_in + 3599) / 3600))
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Usage limit reached. This {subject_label} can generate {generation_limit} times "
                    f"every {int(GENERATION_WINDOW_SECONDS / 3600)} hours. Try again in about {reset_hours} hour(s)."
                ),
            )
        state["count"] = float(used + 1)

    return usage_snapshot_for_subject(subject, generation_limit)


def visitor_payload(request: Request, response: Response) -> dict[str, Any]:
    visitor_id = visitor_id_for_request(request, response)
    ip = client_ip_from_request(request)
    auth_user = auth_user_from_request(request)
    generation_limit = generation_limit_for_context(ip, auth_user)
    credit_limit = credit_limit_for_context(ip, auth_user)
    usage_subject = usage_subject_for(ip, auth_user)
    return {
        "visitor_id": visitor_id,
        "usage_subject": usage_subject,
        "auth_user": auth_user,
        "queue_limit": MAX_ACTIVE_REQUESTS_PER_IP,
        "credit_limit": credit_limit,
        "generation_limit": generation_limit,
        "generation_window_seconds": GENERATION_WINDOW_SECONDS,
        "ultimate_clone_allowed": ultimate_ip_allowed(ip) or auth_user_ultimate_allowed(auth_user),
        "admin_allowed": admin_ip_allowed(ip) or auth_user_is_admin(auth_user),
        "ultimate_clone_allowlist_path": str(ULTIMATE_IP_ALLOWLIST_PATH),
        **usage_snapshot_for_subject(usage_subject, generation_limit),
        **visitor_location_from_request(request),
    }


def resolve_download_path(job_id: str, filename: str) -> tuple[Path, str]:
    output_root = OUTPUT_DIR.resolve()
    path = (OUTPUT_DIR / job_id / filename).resolve()
    if output_root not in path.parents:
        raise HTTPException(status_code=404, detail="file not found")

    suffix = path.suffix.lower()
    if suffix == ".wav":
        if not path.exists():
            raise HTTPException(status_code=404, detail="file not found")
        return path, "audio/wav"

    if suffix == ".mp3":
        wav_path = path.with_suffix(".wav")
        if not wav_path.exists():
            raise HTTPException(status_code=404, detail="file not found")
        if not path.exists() or path.stat().st_mtime < wav_path.stat().st_mtime:
            try:
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-hide_banner",
                        "-loglevel",
                        "error",
                        "-i",
                        str(wav_path),
                        "-codec:a",
                        "libmp3lame",
                        "-q:a",
                        "2",
                        str(path),
                    ],
                    check=True,
                )
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"could not create mp3: {exc}") from exc
        return path, "audio/mpeg"

    raise HTTPException(status_code=404, detail="file not found")


def ensure_mp3_version(wav_path: Path, mp3_path: Path) -> None:
    if not wav_path.exists():
        raise HTTPException(status_code=404, detail="file not found")
    if mp3_path.exists() and mp3_path.stat().st_mtime >= wav_path.stat().st_mtime:
        return
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(wav_path),
                "-codec:a",
                "libmp3lame",
                "-q:a",
                "2",
                str(mp3_path),
            ],
            check=True,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"could not create mp3: {exc}") from exc


def clean_result_outputs(result: dict[str, Any] | None) -> list[str]:
    if not result:
        return []
    output_path_value = result.get("output_path")
    if not output_path_value:
        return []

    output_root = OUTPUT_DIR.resolve()
    try:
        output_path = Path(str(output_path_value)).resolve()
    except Exception:
        return []
    if output_root not in output_path.parents:
        return []

    output_dir = output_path.parent
    if not output_dir.exists():
        return []
    shutil.rmtree(output_dir, ignore_errors=True)
    return [str(output_dir)]


def compact_job_request(request_data: dict[str, Any]) -> dict[str, Any]:
    data = dict(request_data)
    text = str(data.get("text") or "")
    prompt_text = str(data.get("prompt_text") or "")
    data["text"] = text[:280] + ("..." if len(text) > 280 else "")
    if prompt_text:
        data["prompt_text"] = prompt_text[:280] + ("..." if len(prompt_text) > 280 else "")
    data["text_credits"] = credit_count(text)
    data["text_preview"] = data["text"]
    return data


def serialize_job_record(record: JobRecord) -> dict[str, Any]:
    data = asdict(record)
    data["request"] = compact_job_request(record.request)
    return data


def load_job_history() -> dict[str, JobRecord]:
    if not JOB_HISTORY_PATH.exists():
        return {}
    try:
        raw = json.loads(JOB_HISTORY_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}
    items = raw.get("jobs", raw) if isinstance(raw, dict) else raw
    if not isinstance(items, list):
        return {}

    records: dict[str, JobRecord] = {}
    for item in items:
        if not isinstance(item, dict):
            continue
        try:
            record = JobRecord(
                id=str(item["id"]),
                status=str(item.get("status") or "error"),
                request=dict(item.get("request") or {}),
                visitor_id=str(item.get("visitor_id") or "unknown"),
                client_ip=str(item.get("client_ip") or "unknown"),
                label=item.get("label"),
                created_at=float(item.get("created_at") or time.time()),
                updated_at=float(item.get("updated_at") or time.time()),
                result=item.get("result") if isinstance(item.get("result"), dict) else None,
                error=item.get("error") if isinstance(item.get("error"), str) else None,
            )
        except Exception:
            continue
        if record.status in {"queued", "running"}:
            record.status = "error"
            record.error = record.error or "Server restarted before this job finished."
            record.updated_at = time.time()
        records[record.id] = record
    return records


def save_job_history(records: dict[str, JobRecord]) -> None:
    JOB_HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    items = sorted(records.values(), key=lambda item: item.created_at, reverse=True)[:500]
    payload = {"jobs": [asdict(record) for record in items], "updated_at": time.time()}
    tmp_path = JOB_HISTORY_PATH.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    tmp_path.replace(JOB_HISTORY_PATH)


def create_app(manager: WorkerManager) -> FastAPI:
    app = FastAPI(title="Narration Studio API")
    try:
        from auth_system.api.routes.admin import router as auth_admin_router
        from auth_system.api.routes.auth import router as auth_router
        from auth_system.api.routes.protected_examples import router as protected_examples_router
        from auth_system.api.routes.verification import router as verification_router
        from auth_system.core.config import get_settings as get_auth_settings
        from auth_system.core.database import Base as AuthBase
        from auth_system.core.database import get_db as auth_get_db
        from auth_system.core.database import engine as auth_engine
        from auth_system.dependencies.auth import get_current_active_user as auth_current_active_user
        from auth_system.models import admin as _AdminModels
        from auth_system.models.user import User as _AuthUser

        auth_settings = get_auth_settings()
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[auth_settings.frontend_url],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        if auth_settings.database_url.startswith("sqlite") or os.environ.get("AUTH_AUTO_CREATE_TABLES") == "1":
            AuthBase.metadata.create_all(bind=auth_engine)
            if auth_settings.database_url.startswith("sqlite"):
                from sqlalchemy import text

                with auth_engine.begin() as connection:
                    columns = {row[1] for row in connection.execute(text("PRAGMA table_info(users)"))}
                    if "verification_status" not in columns:
                        connection.execute(text("ALTER TABLE users ADD COLUMN verification_status VARCHAR(30) NOT NULL DEFAULT 'not_submitted'"))
                    if "suspended_at" not in columns:
                        connection.execute(text("ALTER TABLE users ADD COLUMN suspended_at DATETIME"))
                    if "banned_at" not in columns:
                        connection.execute(text("ALTER TABLE users ADD COLUMN banned_at DATETIME"))
        app.include_router(auth_router)
        app.include_router(auth_admin_router)
        app.include_router(verification_router)
        app.include_router(protected_examples_router)
    except Exception as exc:
        logger.warning("Auth system was not mounted: %s", exc)
    jobs: dict[str, JobRecord] = load_job_history()
    cancel_events: dict[str, threading.Event] = {}
    jobs_lock = threading.Lock()
    active_by_ip: dict[str, int] = {}
    active_lock = threading.Lock()

    def enter_active_request(client_ip: str) -> None:
        with active_lock:
            active = active_by_ip.get(client_ip, 0)
            if active >= MAX_ACTIVE_REQUESTS_PER_IP:
                raise HTTPException(
                    status_code=429,
                    detail=f"Queue limit reached for this IP. Please wait for one of your {MAX_ACTIVE_REQUESTS_PER_IP} active jobs to finish.",
                )
            active_by_ip[client_ip] = active + 1

    def leave_active_request(client_ip: str) -> None:
        with active_lock:
            active = active_by_ip.get(client_ip, 0) - 1
            if active > 0:
                active_by_ip[client_ip] = active
            else:
                active_by_ip.pop(client_ip, None)

    def admin_summary_payload(admin: dict[str, Any]) -> dict[str, Any]:
        with jobs_lock:
            records = list(jobs.values())
        with active_lock:
            active_snapshot = dict(active_by_ip)

        records.sort(key=lambda item: item.created_at, reverse=True)
        users: dict[str, dict[str, Any]] = {}
        for record in records:
            key = f"{record.client_ip}|{record.visitor_id}"
            user = users.setdefault(
                key,
                {
                    "client_ip": record.client_ip,
                    "visitor_id": record.visitor_id,
                    "total": 0,
                    "queued": 0,
                    "running": 0,
                    "done": 0,
                    "error": 0,
                    "active": 0,
                    "credits": 0,
                    "last_seen": record.updated_at,
                    "location": None,
                },
            )
            user["total"] += 1
            if record.status in {"queued", "running", "done", "error"}:
                user[record.status] += 1
            user["active"] = active_snapshot.get(record.client_ip, 0)
            user["credits"] += credit_count(str(record.request.get("text") or ""))
            user["last_seen"] = max(float(user["last_seen"]), record.updated_at)
            if record.result and isinstance(record.result.get("visitor_location"), dict):
                user["location"] = record.result["visitor_location"]
            auth_user = user["location"].get("auth_user") if isinstance(user.get("location"), dict) else None
            user["credit_limit"] = credit_limit_for_context(record.client_ip, auth_user)
            user["generation_limit"] = generation_limit_for_context(record.client_ip, auth_user)
            user["ultimate_allowed"] = ultimate_ip_allowed(record.client_ip)
            user["admin_allowed"] = admin_ip_allowed(record.client_ip)

        status_counts = {
            "queued": sum(1 for record in records if record.status == "queued"),
            "running": sum(1 for record in records if record.status == "running"),
            "done": sum(1 for record in records if record.status == "done"),
            "error": sum(1 for record in records if record.status == "error"),
        }
        return {
            "admin": admin,
            "configured": admin_enabled(),
            "allowed_ips": admin_allowlist_entries(),
            "ip_settings": effective_ip_settings(),
            "ip_settings_path": str(IP_SETTINGS_PATH),
            "auth_user_settings": load_auth_user_settings(),
            "auth_user_settings_path": str(AUTH_USER_SETTINGS_PATH),
            "limits": {
                "public_credit_limit": PUBLIC_CREDIT_LIMIT,
                "ultimate_credit_limit": ULTIMATE_ALLOWLIST_CREDIT_LIMIT,
                "max_active_per_ip": MAX_ACTIVE_REQUESTS_PER_IP,
                "public_generation_limit": MAX_GENERATIONS_PER_WINDOW,
                "ultimate_generation_limit": ULTIMATE_ALLOWLIST_GENERATIONS_PER_WINDOW,
                "generation_window_seconds": GENERATION_WINDOW_SECONDS,
            },
            "active_by_ip": active_snapshot,
            "counts": {
                "jobs": len(records),
                "users": len(users),
                "voices": len(list_voice_details()),
                **status_counts,
            },
            "users": sorted(users.values(), key=lambda item: item["last_seen"], reverse=True),
            "voices": list_voice_details(),
            "api_keys": [public_api_key_payload(item) for item in load_api_keys()],
            "api_keys_path": str(API_KEYS_PATH),
            "jobs": [serialize_job_record(record) for record in records[:100]],
        }

    @app.get("/api/health")
    def health(request: Request) -> dict[str, Any]:
        requester_ip = client_ip_from_request(request)
        return {
            "status": "ok",
            "voices": list_voices(),
            "credit_limit": PUBLIC_CREDIT_LIMIT,
            "ultimate_allowlist_credit_limit": ULTIMATE_ALLOWLIST_CREDIT_LIMIT,
            "max_active_per_ip": MAX_ACTIVE_REQUESTS_PER_IP,
            "generation_limit": MAX_GENERATIONS_PER_WINDOW,
            "ultimate_allowlist_generation_limit": ULTIMATE_ALLOWLIST_GENERATIONS_PER_WINDOW,
            "generation_window_seconds": GENERATION_WINDOW_SECONDS,
            "visitor_cookie": VISITOR_COOKIE_NAME,
            "ultimate_clone": {
                "mode": "ultimate",
                "requester_ip": requester_ip,
                "requester_allowed": ultimate_ip_allowed(requester_ip),
                "allowlist_path": str(ULTIMATE_IP_ALLOWLIST_PATH),
                "allowlist_entries": ultimate_allowlist_entries(),
            },
            "model_profile": {
                "name": manager.model_name,
                "slug": manager.model_slug,
                "base_model": manager.model_id,
                "lora_enabled": bool(manager.lora_weights_path),
                "lora_weights_path": manager.lora_weights_path,
            },
        }

    @app.get("/api/visitor")
    def visitor(request: Request, response: Response) -> dict[str, Any]:
        return visitor_payload(request, response)

    @app.get("/api/ultimate/access")
    def ultimate_access(request: Request) -> dict[str, Any]:
        ip = client_ip_from_request(request)
        return {
            "ip": ip,
            "allowed": ultimate_ip_allowed(ip),
            "allowlist_path": str(ULTIMATE_IP_ALLOWLIST_PATH),
            "allowlist_entries": ultimate_allowlist_entries(),
            "usage": "Set mode='ultimate', voice='<voice file>', prompt_text='<exact transcript of that voice clip>'.",
        }

    @app.post("/api/admin/login")
    def admin_login(payload: AdminLoginRequest, request: Request, response: Response) -> dict[str, Any]:
        ip = client_ip_from_request(request)
        if not admin_enabled():
            raise HTTPException(status_code=503, detail="Admin login is not configured.")
        if not admin_ip_allowed(ip):
            raise HTTPException(status_code=403, detail=f"Admin is not allowed from this IP: {ip}")
        if payload.username != ADMIN_USERNAME or not password_matches(payload.password):
            raise HTTPException(status_code=401, detail="Invalid admin username or password.")

        token = encode_admin_token(payload.username, ip)
        session = decode_admin_token(token) or {"username": payload.username, "ip": ip, "expires_at": 0}
        response.set_cookie(
            ADMIN_COOKIE_NAME,
            token,
            max_age=ADMIN_SESSION_SECONDS,
            httponly=True,
            secure=request_is_secure(request),
            samesite="lax",
            path="/",
        )
        return {"ok": True, "admin": session, "allowed_ips": admin_allowlist_entries()}

    @app.post("/api/admin/logout")
    def admin_logout(response: Response) -> dict[str, Any]:
        response.delete_cookie(ADMIN_COOKIE_NAME, path="/")
        return {"ok": True}

    @app.get("/api/admin/me")
    def admin_me(request: Request) -> dict[str, Any]:
        admin = ensure_admin(request)
        return {"ok": True, "admin": admin, "allowed_ips": admin_allowlist_entries()}

    @app.get("/api/admin/summary")
    def admin_summary(request: Request) -> dict[str, Any]:
        admin = ensure_admin(request)
        return admin_summary_payload(admin)

    @app.post("/api/admin/ip-settings")
    def admin_upsert_ip_settings(payload: AdminIPSettingsRequest, request: Request) -> dict[str, Any]:
        ensure_admin(request)
        entry = normalize_ip_settings_entry(payload.entry)
        settings = [item for item in load_ip_settings() if str(item.get("entry")) != entry]
        record = {
            "entry": entry,
            "label": (payload.label or "").strip(),
            "ultimate_allowed": payload.ultimate_allowed,
            "admin_allowed": payload.admin_allowed,
            "credit_limit": payload.credit_limit,
            "generation_limit": payload.generation_limit,
            "source": "admin",
            "updated_at": time.time(),
        }
        settings.append(record)
        save_ip_settings(settings)
        return {"ip_settings": effective_ip_settings(), "updated": record, "path": str(IP_SETTINGS_PATH)}

    @app.delete("/api/admin/ip-settings")
    def admin_delete_ip_settings(entry: str, request: Request) -> dict[str, Any]:
        ensure_admin(request)
        normalized = normalize_ip_settings_entry(entry)
        settings = [item for item in load_ip_settings() if str(item.get("entry")) != normalized]
        save_ip_settings(settings)
        return {"deleted": normalized, "ip_settings": effective_ip_settings(), "path": str(IP_SETTINGS_PATH)}

    @app.get("/api/admin/api-keys")
    def admin_list_api_keys(request: Request) -> dict[str, Any]:
        ensure_admin(request)
        return {"api_keys": [public_api_key_payload(item) for item in load_api_keys()]}

    @app.get("/api/admin/api-logs")
    def admin_api_logs(request: Request) -> dict[str, Any]:
        ensure_admin(request)
        return {"logs": load_api_logs()}

    @app.post("/api/admin/api-keys")
    def admin_create_api_key(payload: AdminAPIKeyRequest, request: Request) -> dict[str, Any]:
        auth_user = auth_user_from_request(request)
        ensure_admin(request)
        origins = [normalize_origin(origin) for origin in payload.allowed_origins if origin.strip()]
        token = f"ns_{secrets.token_urlsafe(32)}"
        now = time.time()
        record = {
            "id": uuid.uuid4().hex,
            "user_id": (auth_user or {}).get("id") or "",
            "user_email": (auth_user or {}).get("email") or "",
            "name": payload.name.strip(),
            "token_hash": token_hash(token),
            "token_prefix": token[:14],
            "allowed_origins": sorted(dict.fromkeys(origins)),
            "allowed_methods": [method.upper() for method in payload.allowed_methods],
            "allowed_headers": payload.allowed_headers,
            "allowed_ips": payload.allowed_ips,
            "machine_name": payload.machine_name,
            "monthly_request_limit": payload.monthly_request_limit,
            "enabled": payload.enabled,
            "created_at": now,
            "updated_at": now,
            "regenerated_at": None,
            "last_used_at": None,
            "last_used_ip": None,
            "requests": 0,
        }
        keys = load_api_keys()
        keys.append(record)
        save_api_keys(keys)
        return {"api_key": public_api_key_payload(record), "token": token, "path": str(API_KEYS_PATH)}

    @app.patch("/api/admin/api-keys/{key_id}")
    def admin_update_api_key(key_id: str, payload: AdminAPIKeyUpdateRequest, request: Request) -> dict[str, Any]:
        ensure_admin(request)
        keys = load_api_keys()
        for index, item in enumerate(keys):
            if item["id"] != key_id:
                continue
            if payload.name is not None:
                item["name"] = payload.name.strip()
            if payload.allowed_origins is not None:
                item["allowed_origins"] = sorted(
                    dict.fromkeys(normalize_origin(origin) for origin in payload.allowed_origins if origin.strip())
                )
            if payload.allowed_methods is not None:
                item["allowed_methods"] = [method.upper() for method in payload.allowed_methods]
            if payload.allowed_headers is not None:
                item["allowed_headers"] = payload.allowed_headers
            if payload.allowed_ips is not None:
                item["allowed_ips"] = payload.allowed_ips
            if payload.machine_name is not None:
                item["machine_name"] = payload.machine_name
            if payload.monthly_request_limit is not None:
                item["monthly_request_limit"] = payload.monthly_request_limit
            if payload.enabled is not None:
                item["enabled"] = payload.enabled
            item["updated_at"] = time.time()
            keys[index] = item
            save_api_keys(keys)
            return {"api_key": public_api_key_payload(item), "path": str(API_KEYS_PATH)}
        raise HTTPException(status_code=404, detail="API key not found.")

    @app.delete("/api/admin/api-keys/{key_id}")
    def admin_delete_api_key(key_id: str, request: Request) -> dict[str, Any]:
        ensure_admin(request)
        keys = load_api_keys()
        remaining = [item for item in keys if item["id"] != key_id]
        if len(remaining) == len(keys):
            raise HTTPException(status_code=404, detail="API key not found.")
        save_api_keys(remaining)
        return {"deleted": key_id, "api_keys": [public_api_key_payload(item) for item in remaining], "path": str(API_KEYS_PATH)}

    @app.post("/api/admin/api-keys/{key_id}/regenerate")
    def admin_regenerate_api_key(key_id: str, request: Request) -> dict[str, Any]:
        ensure_admin(request)
        keys = load_api_keys()
        token = f"ns_{secrets.token_urlsafe(32)}"
        now = time.time()
        for index, item in enumerate(keys):
            if item["id"] != key_id:
                continue
            item["token_hash"] = token_hash(token)
            item["token_prefix"] = token[:14]
            item["regenerated_at"] = now
            item["updated_at"] = now
            keys[index] = item
            save_api_keys(keys)
            return {"api_key": public_api_key_payload(item), "token": token}
        raise HTTPException(status_code=404, detail="API key not found.")

    @app.get("/api/user/api-keys")
    def user_list_api_keys(request: Request) -> dict[str, Any]:
        auth_user = auth_user_from_request(request)
        if not auth_user:
            raise HTTPException(status_code=401, detail="Not authenticated.")
        keys = [item for item in load_api_keys() if item.get("user_id") == auth_user.get("id") or item.get("user_email") == auth_user.get("email")]
        return {"api_keys": [public_api_key_payload(item) for item in keys]}

    @app.post("/api/user/api-keys")
    def user_create_api_key(payload: AdminAPIKeyRequest, request: Request) -> dict[str, Any]:
        auth_user = auth_user_from_request(request)
        if not auth_user:
            raise HTTPException(status_code=401, detail="Not authenticated.")
        origins = [normalize_origin(origin) for origin in payload.allowed_origins if origin.strip()]
        token = f"ns_{secrets.token_urlsafe(32)}"
        now = time.time()
        record = {
            "id": uuid.uuid4().hex,
            "user_id": auth_user.get("id") or "",
            "user_email": auth_user.get("email") or "",
            "name": payload.name.strip(),
            "token_hash": token_hash(token),
            "token_prefix": token[:14],
            "allowed_origins": sorted(dict.fromkeys(origins)),
            "allowed_methods": [method.upper() for method in payload.allowed_methods],
            "allowed_headers": payload.allowed_headers,
            "allowed_ips": payload.allowed_ips,
            "machine_name": payload.machine_name,
            "monthly_request_limit": payload.monthly_request_limit,
            "enabled": payload.enabled,
            "created_at": now,
            "updated_at": now,
            "regenerated_at": None,
            "last_used_at": None,
            "last_used_ip": None,
            "requests": 0,
        }
        keys = load_api_keys()
        keys.append(record)
        save_api_keys(keys)
        return {"api_key": public_api_key_payload(record), "token": token}

    @app.patch("/api/user/api-keys/{key_id}")
    def user_update_api_key(key_id: str, payload: AdminAPIKeyUpdateRequest, request: Request) -> dict[str, Any]:
        auth_user = auth_user_from_request(request)
        if not auth_user:
            raise HTTPException(status_code=401, detail="Not authenticated.")
        keys = load_api_keys()
        for index, item in enumerate(keys):
            if item["id"] != key_id:
                continue
            if item.get("user_id") != auth_user.get("id") and item.get("user_email") != auth_user.get("email"):
                raise HTTPException(status_code=403, detail="API key does not belong to this account.")
            if payload.name is not None:
                item["name"] = payload.name.strip()
            if payload.allowed_origins is not None:
                item["allowed_origins"] = sorted(dict.fromkeys(normalize_origin(origin) for origin in payload.allowed_origins if origin.strip()))
            if payload.allowed_methods is not None:
                item["allowed_methods"] = [method.upper() for method in payload.allowed_methods]
            if payload.allowed_headers is not None:
                item["allowed_headers"] = payload.allowed_headers
            if payload.allowed_ips is not None:
                item["allowed_ips"] = payload.allowed_ips
            if payload.machine_name is not None:
                item["machine_name"] = payload.machine_name
            if payload.monthly_request_limit is not None:
                item["monthly_request_limit"] = payload.monthly_request_limit
            if payload.enabled is not None:
                item["enabled"] = payload.enabled
            item["updated_at"] = time.time()
            keys[index] = item
            save_api_keys(keys)
            return {"api_key": public_api_key_payload(item)}
        raise HTTPException(status_code=404, detail="API key not found.")

    @app.post("/api/user/api-keys/{key_id}/regenerate")
    def user_regenerate_api_key(key_id: str, request: Request) -> dict[str, Any]:
        auth_user = auth_user_from_request(request)
        if not auth_user:
            raise HTTPException(status_code=401, detail="Not authenticated.")
        keys = load_api_keys()
        token = f"ns_{secrets.token_urlsafe(32)}"
        now = time.time()
        for index, item in enumerate(keys):
            if item["id"] != key_id:
                continue
            if item.get("user_id") != auth_user.get("id") and item.get("user_email") != auth_user.get("email"):
                raise HTTPException(status_code=403, detail="API key does not belong to this account.")
            item["token_hash"] = token_hash(token)
            item["token_prefix"] = token[:14]
            item["regenerated_at"] = now
            item["updated_at"] = now
            keys[index] = item
            save_api_keys(keys)
            return {"api_key": public_api_key_payload(item), "token": token}
        raise HTTPException(status_code=404, detail="API key not found.")

    @app.delete("/api/user/api-keys/{key_id}")
    def user_delete_api_key(key_id: str, request: Request) -> dict[str, Any]:
        auth_user = auth_user_from_request(request)
        if not auth_user:
            raise HTTPException(status_code=401, detail="Not authenticated.")
        keys = load_api_keys()
        target = next((item for item in keys if item["id"] == key_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="API key not found.")
        if target.get("user_id") != auth_user.get("id") and target.get("user_email") != auth_user.get("email"):
            raise HTTPException(status_code=403, detail="API key does not belong to this account.")
        save_api_keys([item for item in keys if item["id"] != key_id])
        return {"deleted": key_id}

    @app.get("/api/user/api-logs")
    def user_api_logs(request: Request) -> dict[str, Any]:
        auth_user = auth_user_from_request(request)
        if not auth_user:
            raise HTTPException(status_code=401, detail="Not authenticated.")
        logs = [item for item in load_api_logs() if item.get("user_id") == auth_user.get("id") or item.get("user_email") == auth_user.get("email")]
        return {"logs": logs}

    @app.get("/api/user/api-usage")
    def user_api_usage(request: Request) -> dict[str, Any]:
        auth_user = auth_user_from_request(request)
        if not auth_user:
            raise HTTPException(status_code=401, detail="Not authenticated.")
        logs = [item for item in load_api_logs() if item.get("user_id") == auth_user.get("id") or item.get("user_email") == auth_user.get("email")]
        successful = len([item for item in logs if int(item.get("status_code") or 0) < 400])
        failed = len(logs) - successful
        return {"requests_used": len(logs), "credits_used": sum(int(item.get("credits_used") or 0) for item in logs), "successful_requests": successful, "failed_requests": failed}

    @app.delete("/api/admin/jobs/{job_id}")
    def admin_delete_job(job_id: str, request: Request, clean_outputs: bool = True) -> dict[str, Any]:
        ensure_admin(request)
        with jobs_lock:
            cancel_event = cancel_events.pop(job_id, None)
            if cancel_event is not None:
                cancel_event.set()
            record = jobs.pop(job_id, None)
            save_job_history(jobs)
        if record is None:
            raise HTTPException(status_code=404, detail="job not found")
        cleaned = clean_result_outputs(record.result) if clean_outputs else []
        return {"deleted": job_id, "cleaned": cleaned, "status": record.status}

    @app.delete("/api/admin/jobs")
    def admin_clean_jobs(request: Request, status: str = "finished", clean_outputs: bool = True) -> dict[str, Any]:
        ensure_admin(request)
        statuses = {"done", "error"} if status == "finished" else {item.strip() for item in status.split(",") if item.strip()}
        deleted: list[str] = []
        cleaned: list[str] = []
        with jobs_lock:
            selected = [record for record in jobs.values() if record.status in statuses]
            for record in selected:
                cancel_event = cancel_events.pop(record.id, None)
                if cancel_event is not None:
                    cancel_event.set()
                jobs.pop(record.id, None)
                deleted.append(record.id)
            save_job_history(jobs)
        if clean_outputs:
            for record in selected:
                cleaned.extend(clean_result_outputs(record.result))
        return {"deleted": deleted, "cleaned": cleaned, "statuses": sorted(statuses)}

    @app.options("/api/v1/{path:path}")
    def api_v1_preflight(path: str, request: Request) -> Response:
        origin = request.headers.get("origin", "")
        if not origin_known_for_preflight(origin):
            return Response(status_code=403)
        return Response(status_code=204, headers=cors_headers_for_origin(origin))

    @app.get("/api/v1/models")
    def api_v1_models(request: Request, response: Response) -> dict[str, Any]:
        ensure_api_key(request, response)
        now = int(time.time())
        return {
            "object": "list",
            "data": [
                {
                    "id": MODEL_PROFILE_SLUG,
                    "object": "model",
                    "created": now,
                    "owned_by": MODEL_DISPLAY_NAME,
                    "name": MODEL_DISPLAY_NAME,
                    "max_characters": ULTIMATE_ALLOWLIST_CREDIT_LIMIT,
                }
            ],
        }

    @app.get("/api/v1/voices")
    def api_v1_voices(request: Request, response: Response) -> dict[str, Any]:
        ensure_api_key(request, response)
        return {
            "object": "list",
            "data": [
                {"id": voice, "object": "voice", "name": Path(voice).stem, "status": "ready"}
                for voice in list_voices()
            ],
        }

    @app.get("/api/v1/audio/voices")
    def api_v1_audio_voices(request: Request, response: Response) -> dict[str, Any]:
        return api_v1_voices(request, response)

    @app.get("/api/v1/audio/voices/{voice}/preview")
    def api_v1_audio_voice_preview(voice: str, request: Request, response: Response) -> FileResponse:
        ensure_api_key(request, response)
        return voice_preview(voice, request, response)

    @app.post("/api/v1/audio/speech")
    def api_v1_speech(payload: SpeechAPIRequest, request: Request, response: Response) -> FileResponse:
        ensure_api_key(request, response)
        voice = payload.voice if Path(payload.voice).suffix else f"{payload.voice}.mp3"
        if voice not in list_voices():
            matching = [item for item in list_voices() if Path(item).stem.lower() == payload.voice.lower()]
            voice = matching[0] if matching else voice
        ensure_voice_access(voice, "")
        generation = GenerateRequest(
            text=payload.input,
            voice=voice,
            mode="clone",
            prompt_text=payload.instructions,
            output_name=f"api-speech-{uuid.uuid4().hex[:8]}",
            max_chars=min(700, ULTIMATE_ALLOWLIST_CREDIT_LIMIT),
            cfg_value=2.0,
            inference_timesteps=10,
            normalize=False,
            denoise=False,
        )
        result = _generate_from_request(manager, generation, ULTIMATE_ALLOWLIST_CREDIT_LIMIT)
        output_path = Path(str(result["output_path"]))
        if payload.response_format == "mp3":
            mp3_path = output_path.with_suffix(".mp3")
            ensure_mp3_version(output_path, mp3_path)
            output_path = mp3_path
        media_type = "audio/mpeg" if output_path.suffix.lower() == ".mp3" else "audio/wav"
        file_response = FileResponse(str(output_path), media_type=media_type, filename=output_path.name)
        for key, value in cors_headers_for_origin(request.headers.get("origin", "")).items():
            file_response.headers[key] = value
        return file_response

    @app.post("/api/v1/audio/transcriptions")
    async def api_v1_transcriptions(request: Request, response: Response, file: UploadFile = File(...), model: str = Form("narration-stt"), response_format: str = Form("json"), language: str | None = Form(None), prompt: str | None = Form(None), temperature: float | None = Form(None)):
        ensure_api_key(request, response)
        await file.close()
        text = ""
        if response_format == "text":
            return PlainTextResponse(text)
        return {"text": text, "model": model, "language": language, "prompt": prompt, "temperature": temperature}

    @app.get("/api/v1/usage")
    def api_v1_usage(request: Request, response: Response) -> dict[str, Any]:
        key = ensure_api_key(request, response)
        logs = [item for item in load_api_logs() if item.get("api_key_id") == key.get("id")]
        successful = len([item for item in logs if int(item.get("status_code") or 0) < 400])
        return {"requests_used": len(logs), "credits_used": sum(int(item.get("credits_used") or 0) for item in logs), "successful_requests": successful, "failed_requests": len(logs) - successful}

    @app.get("/api/v1/logs")
    def api_v1_logs(request: Request, response: Response) -> dict[str, Any]:
        key = ensure_api_key(request, response)
        return {"logs": [item for item in load_api_logs() if item.get("api_key_id") == key.get("id")]}

    @app.get("/api/gpus")
    def gpus() -> dict[str, Any]:
        return {"status": "ready", "worker_pool": "managed internally"}

    @app.get("/api/voices")
    def voices(request: Request, response: Response) -> dict[str, Any]:
        visitor = visitor_payload(request, response)
        return {"voices": list_voices(visitor["visitor_id"])}

    @app.post("/api/voices/upload")
    async def upload_voice(
        request: Request,
        response: Response,
        file: UploadFile = File(...),
        consent_accepted: str = Form("false"),
        auth_user: Any = Depends(auth_current_active_user),
        auth_db: Any = Depends(auth_get_db),
    ) -> dict[str, Any]:
        if getattr(auth_user, "verification_status", "not_submitted") != "verified":
            raise HTTPException(status_code=403, detail="Identity verification is required before creating a voice clone.")
        if str(consent_accepted).lower() not in {"true", "1", "yes"}:
            raise HTTPException(status_code=400, detail="Legal agreement is required before creating a voice clone.")
        visitor = visitor_payload(request, response)
        filename = safe_upload_name(file.filename or "voice.wav", visitor["visitor_id"])
        upload_dir = VOICE_UPLOAD_DIR.resolve()
        upload_dir.mkdir(parents=True, exist_ok=True)
        path = (upload_dir / filename).resolve()
        voice_root = VOICE_DIR.resolve()
        if voice_root not in path.parents:
            raise HTTPException(status_code=400, detail="invalid upload path")

        total = 0
        try:
            with path.open("wb") as output:
                while True:
                    chunk = await file.read(1024 * 1024)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > MAX_VOICE_UPLOAD_BYTES:
                        path.unlink(missing_ok=True)
                        raise HTTPException(status_code=413, detail="Voice upload is too large.")
                    output.write(chunk)
        finally:
            await file.close()

        if total == 0:
            path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail="Voice upload is empty.")

        voice_name = path.relative_to(voice_root).as_posix()
        try:
            from auth_system.models.admin import AuditLog, VoiceCloneRecord

            record = VoiceCloneRecord(
                id=str(uuid.uuid4()),
                user_id=auth_user.id,
                filename=voice_name,
                voice_name=Path(voice_name).stem.replace("-", " "),
                status="pending",
                consent_accepted_at=datetime.now(timezone.utc),
                consent_ip=client_ip_from_request(request),
                risk_status="normal",
            )
            auth_db.add(record)
            auth_db.add(AuditLog(
                id=str(uuid.uuid4()),
                admin_id=auth_user.id,
                action_type="USER_CREATED_VOICE_CLONE",
                target_type="voice_clone",
                target_id=record.id,
                new_value=json.dumps({"voice": voice_name}, ensure_ascii=False),
                ip_address=client_ip_from_request(request),
                user_agent=request.headers.get("user-agent"),
            ))
            auth_db.commit()
        except Exception as exc:
            logger.warning("Voice clone audit record failed: %s", exc)
        return {
            "voice": voice_name,
            "filename": path.name,
            "bytes": total,
            "voices": list_voices(visitor["visitor_id"]),
            "visitor_id": visitor["visitor_id"],
        }

    @app.get("/api/voices/preview")
    @app.head("/api/voices/preview")
    def voice_preview_by_query(voice: str, request: Request, response: Response) -> FileResponse:
        visitor = visitor_payload(request, response)
        ensure_voice_access(voice, visitor["visitor_id"])
        try:
            path = resolve_voice_path(voice)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        media_type = "audio/mpeg" if path.suffix.lower() == ".mp3" else "audio/wav"
        return FileResponse(
            str(path),
            media_type=media_type,
            filename=path.name,
            content_disposition_type="inline",
        )

    @app.get("/api/voices/{filename}/preview")
    @app.head("/api/voices/{filename}/preview")
    def voice_preview(filename: str) -> FileResponse:
        try:
            path = resolve_voice_path(filename)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        media_type = "audio/mpeg" if path.suffix.lower() == ".mp3" else "audio/wav"
        return FileResponse(
            str(path),
            media_type=media_type,
            filename=path.name,
            content_disposition_type="inline",
        )

    @app.get("/api/examples")
    def examples() -> dict[str, Any]:
        return {"examples": example_payloads()}

    @app.post("/api/warmup")
    def warmup() -> dict[str, Any]:
        try:
            workers = manager.warmup()
            return {"status": "ready", "workers": len(workers)}
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/generate")
    def generate(payload: GenerateRequest, request: Request, response: Response) -> dict[str, Any]:
        visitor = visitor_payload(request, response)
        visitor_id = visitor["visitor_id"]
        client_ip = visitor["ip"]
        ensure_voice_access(payload.voice, visitor_id, allow_internal_upload=request_from_loopback(request))
        ensure_ultimate_access(payload, client_ip, visitor.get("auth_user"))
        enter_active_request(client_ip)
        try:
            usage = consume_generation_for_subject(
                str(visitor.get("usage_subject") or client_ip),
                int(visitor["generation_limit"]),
                "account" if visitor.get("auth_user") else "IP",
            )
            result = _generate_from_request(manager, payload, int(visitor["credit_limit"]))
            result["client_ip"] = client_ip
            result["visitor_id"] = visitor_id
            result["visitor_location"] = {**visitor, **usage}
            return result
        except VoiceEngineError as exc:
            return voice_engine_error_response(exc)
        except HTTPException:
            raise
        except Exception as exc:
            if _is_cuda_oom(exc):
                return voice_engine_error_response(GPUOutOfMemoryError())
            logger.exception("generation failed")
            raise HTTPException(status_code=400, detail="Voice generation failed. Please try again shortly.") from exc
        finally:
            leave_active_request(client_ip)

    @app.post("/api/jobs")
    def create_job(
        payload: GenerateRequest,
        background_tasks: BackgroundTasks,
        request: Request,
        response: Response,
    ) -> dict[str, Any]:
        visitor = visitor_payload(request, response)
        visitor_id = visitor["visitor_id"]
        client_ip = visitor["ip"]
        ensure_voice_access(payload.voice, visitor_id, allow_internal_upload=request_from_loopback(request))
        ensure_ultimate_access(payload, client_ip, visitor.get("auth_user"))
        enter_active_request(client_ip)
        try:
            usage = consume_generation_for_subject(
                str(visitor.get("usage_subject") or client_ip),
                int(visitor["generation_limit"]),
                "account" if visitor.get("auth_user") else "IP",
            )
        except Exception:
            leave_active_request(client_ip)
            raise
        job_id = uuid.uuid4().hex
        label = (payload.user_name or "").strip() or (payload.voice or "").strip() or "Narration"
        record = JobRecord(
            id=job_id,
            status="queued",
            request=payload.model_dump(),
            visitor_id=visitor_id,
            client_ip=client_ip,
            label=label,
        )
        cancel_event = threading.Event()
        with jobs_lock:
            jobs[job_id] = record
            cancel_events[job_id] = cancel_event
            save_job_history(jobs)
        background_tasks.add_task(
            _run_job,
            job_id,
            payload,
            visitor,
            usage,
            client_ip,
            visitor_id,
            int(visitor["credit_limit"]),
            cancel_event,
        )
        return {"job_id": job_id, "status_url": f"/api/jobs/{job_id}", "job": serialize_job_record(record)}

    def _run_job(
        job_id: str,
        request: GenerateRequest,
        visitor: dict[str, Any],
        usage: dict[str, Any],
        client_ip: str,
        visitor_id: str,
        credit_limit: int,
        cancel_event: threading.Event | None = None,
    ) -> None:
        with jobs_lock:
            if job_id in jobs:
                jobs[job_id].status = "running"
                jobs[job_id].updated_at = time.time()
                save_job_history(jobs)
        try:
            result = _generate_from_request(manager, request, credit_limit, cancel_event=cancel_event)
            result["client_ip"] = client_ip
            result["visitor_id"] = visitor_id
            result["visitor_location"] = {**visitor, **usage}
            with jobs_lock:
                if job_id in jobs:
                    jobs[job_id].status = "done"
                    jobs[job_id].updated_at = time.time()
                    jobs[job_id].result = result
                    save_job_history(jobs)
        except Exception as exc:
            logger.exception("Generation job %s failed", job_id)
            with jobs_lock:
                if job_id in jobs:
                    jobs[job_id].status = "error"
                    jobs[job_id].updated_at = time.time()
                    jobs[job_id].error = str(exc)
                    save_job_history(jobs)
        finally:
            with jobs_lock:
                cancel_events.pop(job_id, None)
            leave_active_request(client_ip)

    @app.get("/api/jobs")
    def list_jobs(request: Request, response: Response) -> dict[str, Any]:
        visitor = visitor_payload(request, response)
        with jobs_lock:
            visible_jobs = [
                record
                for record in jobs.values()
                if record.client_ip == visitor["ip"] or record.visitor_id == visitor["visitor_id"]
            ]
            visible_jobs.sort(key=lambda item: item.created_at, reverse=True)
            return {"jobs": [serialize_job_record(record) for record in visible_jobs[:50]]}

    @app.get("/api/jobs/{job_id}")
    def get_job(job_id: str, request: Request, response: Response) -> dict[str, Any]:
        visitor = visitor_payload(request, response)
        with jobs_lock:
            record = jobs.get(job_id)
            if record is None:
                raise HTTPException(status_code=404, detail="job not found")
            if record.client_ip != visitor["ip"] and record.visitor_id != visitor["visitor_id"]:
                raise HTTPException(status_code=404, detail="job not found")
            return serialize_job_record(record)

    @app.delete("/api/jobs/{job_id}")
    def delete_job(job_id: str, request: Request, response: Response, clean_outputs: bool = True) -> dict[str, Any]:
        visitor = visitor_payload(request, response)
        with jobs_lock:
            record = jobs.get(job_id)
            if record is None:
                raise HTTPException(status_code=404, detail="job not found")
            if record.client_ip != visitor["ip"] and record.visitor_id != visitor["visitor_id"]:
                raise HTTPException(status_code=404, detail="job not found")
            cancel_event = cancel_events.pop(job_id, None)
            if cancel_event is not None:
                cancel_event.set()
            jobs.pop(job_id, None)
            save_job_history(jobs)
        cleaned = clean_result_outputs(record.result) if clean_outputs else []
        return {"deleted": job_id, "cleaned": cleaned, "status": record.status}

    @app.get("/api/download/{job_id}/{filename}")
    @app.head("/api/download/{job_id}/{filename}")
    def download(job_id: str, filename: str) -> FileResponse:
        path, media_type = resolve_download_path(job_id, filename)
        return FileResponse(
            str(path),
            media_type=media_type,
            filename=path.name,
            content_disposition_type="inline",
        )

    if ENABLE_GRADIO_UI:
        app = gr.mount_gradio_app(
            app,
            build_ui(manager),
            path="/",
            theme=gr.themes.Soft(primary_hue="teal", neutral_hue="gray"),
            css=APP_CSS,
        )
    return app


def _generate_from_request(
    manager: WorkerManager,
    request: GenerateRequest,
    credit_limit: int = PUBLIC_CREDIT_LIMIT,
    cancel_event: threading.Event | None = None,
) -> dict[str, Any]:
    data = request.model_dump()
    return manager.generate(selected_gpus=None, credit_limit=credit_limit, cancel_event=cancel_event, **data)


def voice_engine_error_response(exc: VoiceEngineError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        },
    )


def build_ui(manager: WorkerManager) -> gr.Blocks:
    voices = list_voices()
    default_voice = "Theary-Female.mp3" if "Theary-Female.mp3" in voices else (voices[0] if voices else None)

    with gr.Blocks(title="Narration Studio") as demo:
        gr.HTML(
            f"""
            <section class="studio-header">
              <div class="studio-bar">
                <div>
                  <h1>Narration Studio</h1>
                  <div class="studio-meta">{manager.model_name} - Public preview - 2000 credits per generation</div>
                </div>
                <div class="theme-links">
                  <a href="?__theme=light">Light</a>
                  <a href="?__theme=dark">Dark</a>
                </div>
              </div>
            </section>
            """
        )
        with gr.Row(elem_classes=["studio-grid"]):
            with gr.Column(scale=2, elem_classes=["studio-panel"]):
                with gr.Row():
                    mode = gr.Radio(choices=["clone", "design"], value="clone", label="Mode")
                    user_name = gr.Textbox(label="Reader name", placeholder="Theary / Arun / custom name")
                voice = gr.Dropdown(choices=voices, value=default_voice, label="Clone voice")
                voice_preview = gr.Audio(
                    label="Voice preview",
                    type="filepath",
                    value=str(resolve_voice_path(default_voice)) if default_voice else None,
                )
                control = gr.Textbox(
                    label="Voice style",
                    placeholder="warm, calm, clear pronunciation",
                )
                with gr.Row():
                    example_choice = gr.Dropdown(
                        choices=list(example_text_map().keys()),
                        value="Khmer story",
                        label="Example text",
                    )
                    use_example = gr.Button("Use Example")
            with gr.Column(scale=3, elem_classes=["studio-panel"]):
                text = gr.Textbox(
                    label="Text",
                    lines=12,
                    max_lines=24,
                    value=KHMER_EXAMPLE,
                )
                credit_meter = gr.HTML()
                with gr.Accordion("Advanced", open=False):
                    with gr.Row():
                        max_chars = gr.Slider(80, PUBLIC_CREDIT_LIMIT, value=350, step=10, label="Chunk size")
                        cfg_value = gr.Slider(0.1, 10.0, value=2.0, step=0.1, label="CFG")
                        inference_timesteps = gr.Slider(1, 100, value=10, step=1, label="Steps")
                    with gr.Row():
                        normalize = gr.Checkbox(value=False, label="Normalize")
                        denoise = gr.Checkbox(value=False, label="Denoise")
                        output_name = gr.Textbox(value="", label="Output filename")
                run = gr.Button("Generate Audio", variant="primary")

        with gr.Row(elem_classes=["studio-grid"]):
            with gr.Column(scale=2, elem_classes=["studio-panel"]):
                status = gr.HTML()
                download_html = gr.HTML()
            with gr.Column(scale=3, elem_classes=["studio-panel"]):
                audio = gr.Audio(label="Generated audio", type="filepath")
                file_out = gr.File(label="Download WAV")

        def preview_voice(voice_value: str):
            try:
                return str(resolve_voice_path(voice_value)) if voice_value else None
            except ValueError:
                return None

        def example_text(example_value: str):
            value = example_text_map().get(example_value, KHMER_EXAMPLE)
            return value, format_credits(value)

        def format_credits(text_value: str):
            used = credit_count(text_value)
            css_class = "credit-ok" if used <= PUBLIC_CREDIT_LIMIT else "credit-warn"
            return (
                f'<div class="{css_class}">'
                f"{used} / {PUBLIC_CREDIT_LIMIT} credits"
                "</div>"
            )

        def submit(
            mode_value: str,
            voice_value: str,
            user_name_value: str,
            text_value: str,
            control_value: str,
            max_chars_value: int,
            cfg_value_value: float,
            inference_timesteps_value: int,
            normalize_value: bool,
            denoise_value: bool,
            output_name_value: str,
        ):
            credits = credit_count(text_value)
            if credits > PUBLIC_CREDIT_LIMIT:
                raise gr.Error(f"Text is {credits} credits. Public limit is {PUBLIC_CREDIT_LIMIT}.")
            result = manager.generate(
                text=text_value,
                voice=voice_value,
                output_name=output_name_value,
                selected_gpus=None,
                max_chars=int(max_chars_value),
                cfg_value=float(cfg_value_value),
                inference_timesteps=int(inference_timesteps_value),
                normalize=bool(normalize_value),
                denoise=bool(denoise_value),
                mode=mode_value,
                control=control_value,
                user_name=user_name_value,
            )
            voice_label = result["voice"] or "designed voice"
            reader = result["user_name"] or "Untitled"
            status_html = (
                '<div class="compact-card">'
                f"<p class=\"result-line\"><strong>{reader}</strong> · {voice_label}</p>"
                f"<p class=\"result-line\">{result['credits_used']} / {result['credit_limit']} credits · "
                f"{result['chunks']} segment(s) · {result['duration_sec']}s audio</p>"
                "</div>"
            )
            download_link = (
                '<div class="download-link">'
                f"<a href=\"{result['download_url']}\" download>Download WAV</a>"
                "</div>"
            )
            return status_html, result["output_path"], result["output_path"], download_link

        voice.change(preview_voice, inputs=[voice], outputs=[voice_preview])
        text.change(format_credits, inputs=[text], outputs=[credit_meter])
        demo.load(format_credits, inputs=[text], outputs=[credit_meter])
        use_example.click(example_text, inputs=[example_choice], outputs=[text, credit_meter])
        run.click(
            submit,
            inputs=[
                mode,
                voice,
                user_name,
                text,
                control,
                max_chars,
                cfg_value,
                inference_timesteps,
                normalize,
                denoise,
                output_name,
            ],
            outputs=[status, audio, file_out, download_html],
            concurrency_limit=1,
        )

    return demo


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Narration Studio UI/API")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8810)
    parser.add_argument("--gpus", default=",".join(available_gpus()))
    parser.add_argument("--model-id", default=DEFAULT_MODEL_ID)
    parser.add_argument("--allow-download", action="store_true")
    parser.add_argument("--optimize", action="store_true")
    parser.add_argument("--denoiser", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    gpus = [item.strip() for item in args.gpus.split(",") if item.strip()]
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    manager = WorkerManager(
        gpus=gpus,
        model_id=args.model_id,
        local_files_only=not args.allow_download,
        optimize=args.optimize,
        load_denoiser=args.denoiser,
    )
    app = create_app(manager)

    import uvicorn

    try:
        uvicorn.run(app, host=args.host, port=args.port)
    finally:
        manager.shutdown()


if __name__ == "__main__":
    main()
