# Khmer-TTS Dataset

Put local fine-tuning clips here.

Expected files:

```text
datasets/khmer-tts/audio/clip_001.wav
datasets/khmer-tts/audio/clip_002.wav
datasets/khmer-tts/train.jsonl
datasets/khmer-tts/val.jsonl
```

Manifest format:

```jsonl
{"audio":"datasets/khmer-tts/audio/clip_001.wav","text":"Exact transcript for clip 001."}
{"audio":"datasets/khmer-tts/audio/clip_002.wav","text":"Exact transcript for clip 002.","ref_audio":"datasets/khmer-tts/audio/clip_001.wav"}
```

Use 3-30 second clean WAV clips with exact transcripts.
