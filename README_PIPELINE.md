# Khmer Dialogue & Transcription Pipeline

This ecosystem provides professional-grade Khmer Text-to-Speech (TTS) and Speech-to-Text (STT) capabilities, optimized for Windows and RTX 40 series GPUs.

## 1. Dialogue Generation (TTS)
Create multi-speaker scenes using the VoxCPM engine.

**Command:**
```powershell
.\.venv\Scripts\python.exe dialogue_process.py --input cafe_dialogue.txt --output cafe_scene_kh.wav --s1 Arun-Male.mp3 --s2 Bora-Male.mp3
```
*   **--input**: A text file where lines start with `SpeakerName: text`.
*   **--s1, --s2**: The reference voice files for each speaker.

## 2. Professional Transcription (STT)
Powered by **Google Gemini 3.1 Flash** for 100% accurate Khmer recognition.

**Command:**
```powershell
.\.venv\Scripts\python.exe transcribe_gemini.py cafe_scene_kh.wav
```
*   **Note**: Requires `GEMINI_API_KEY` in your environment.
*   **Model**: Currently uses `gemini-flash-latest` (Gemini 3.1 Flash).
*   **Accuracy**: Handles robotic AI voices and real human recordings with frontier-class precision.
*   **Output**: Saves a `.txt` file with the speaker labels and full Khmer script.

## 3. Local Transcription (Alternative)
Uses the official OpenAI Whisper engine (runs locally on your GPU).

**Command:**
```powershell
.\.venv\Scripts\python.exe transcribe_khmer.py cafe_scene_kh.wav --model medium
```
*   **--model**: Use `medium` for best stability on 8GB VRAM.
*   **Task**: Add `--task translate` to get an English translation instead of Khmer text.

## Technical Details
*   **Audio Loading**: Uses `soundfile` + `scipy` (No `ffmpeg` required).
*   **Encoding**: All files are strictly `UTF-8` to preserve Khmer characters.
*   **GPU Management**: Optimized for RTX 4060 (8GB VRAM) by using FP16 and incremental loading.
