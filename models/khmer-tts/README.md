# Khmer-TTS Model Profile

This folder stores local model profile metadata for Khmer narration.

Expected local model path:

```text
models/khmer-tts/base_model
```

The `base_model` directory is ignored by Git because model weights are large.

## Run With Downloaded Model

```bash
python reader_app.py --host 127.0.0.1 --port 8820 --gpus cpu --model-id <model-id> --allow-download
```

## Run With Local Model

```bash
python reader_app.py --host 127.0.0.1 --port 8820 --gpus cpu --model-id models/khmer-tts/base_model
```

Use `--gpus 0` instead of `--gpus cpu` when running on an NVIDIA GPU.

## LoRA Checkpoints

Recommended local LoRA path:

```text
checkpoints/khmer-tts-lora/latest
```

When LoRA exists:

```bash
NARRATION_LORA_WEIGHTS_PATH=checkpoints/khmer-tts-lora/latest \
python reader_app.py --host 127.0.0.1 --port 8820 --gpus 0 --model-id models/khmer-tts/base_model
```
