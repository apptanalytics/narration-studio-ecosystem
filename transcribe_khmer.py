import os
import sys
import argparse
import whisper
import time
import soundfile as sf
import numpy as np

# Ensure the terminal handles Khmer characters correctly on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def transcribe(audio_path, model_size="large-v3", task="transcribe"):
    print(f"--- Khmer Transcription Process (Official OpenAI Engine) ---", flush=True)
    print(f"File: {os.path.basename(audio_path)}", flush=True)
    print(f"Task: {task}", flush=True)
    print(f"Loading Model: {model_size}...", flush=True)
    
    start_load = time.time()
    # Load official Whisper model
    model = whisper.load_model(model_size)
    print(f"Model loaded in {time.time() - start_load:.1f}s.", flush=True)

    print(f"\nProcessing... (please wait)", flush=True)
    start_transcribe = time.time()
    
    # Load audio manually using soundfile
    print(f"Reading audio file...", flush=True)
    audio_data, samplerate = sf.read(audio_path)
    
    # Whisper expects 16kHz mono audio
    if samplerate != 16000:
        print(f"Resampling from {samplerate}Hz to 16000Hz (Fast Mode)...", flush=True)
        from scipy.signal import resample_poly
        # Use resample_poly for high speed
        gcd = np.gcd(samplerate, 16000)
        audio_data = resample_poly(audio_data, 16000 // gcd, samplerate // gcd)
    
    print(f"Preparing audio buffer...", flush=True)
    # Convert to float32 and ensure mono
    if len(audio_data.shape) > 1:
        audio_data = audio_data.mean(axis=1)
    audio_data = audio_data.astype(np.float32)

    print(f"Transcribing/Translating...", flush=True)

    # Run transcription using official API
    result = model.transcribe(
        audio_data, 
        language="km",
        task=task,
        initial_prompt="សួស្តី បងស្រី សុខសប្បាយជាទេ? ខ្ញុំសុខសប្បាយធម្មតាទេ។",
        verbose=True,
        fp16=True 
    )

    print("-" * 30, flush=True)

    full_text = []
    for segment in result["segments"]:
        timestamp = f"[{segment['start']:.2f}s -> {segment['end']:.2f}s]"
        print(f"{timestamp} {segment['text']}", flush=True)
        full_text.append(segment["text"])

    end_time = time.time()
    print("-" * 30, flush=True)
    print(f"Done! Process took {end_time - start_transcribe:.1f}s.", flush=True)
    
    # Save results to a text file
    output_txt = os.path.splitext(audio_path)[0] + f"_{task}.txt"
    with open(output_txt, "w", encoding="utf-8") as f:
        f.write(" ".join(full_text))
    print(f"Result saved to: {output_txt}", flush=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Khmer Audio Transcriber (Official)")
    parser.add_argument("audio", type=str, help="Path to audio file")
    parser.add_argument("--model", type=str, default="medium", help="Model size")
    parser.add_argument("--task", type=str, default="transcribe", help="transcribe or translate")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.audio):
        print(f"Error: File '{args.audio}' not found.", flush=True)
        sys.exit(1)
        
    transcribe(args.audio, args.model, args.task)
