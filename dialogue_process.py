import os
import sys
import re
import argparse
import numpy as np
import soundfile as sf
import time
from pathlib import Path

# Ensure the terminal handles Khmer characters correctly on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
try:
    from voxcpm.core import VoxCPM
except ImportError:
    # Fallback to local src if not installed
    sys.path.append(os.path.join(os.getcwd(), "src"))
    from voxcpm.core import VoxCPM

def parse_dialogue(text):
    """Parses text into a list of (speaker, content) tuples."""
    lines = []
    pattern = r"^(Speaker\s+\d+|[A-Za-z0-9]+):\s*(?:\[.*?\])?\s*(.*)$"
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        match = re.match(pattern, line, re.IGNORECASE)
        if match:
            speaker = match.group(1).strip()
            content = match.group(2).strip()
            lines.append((speaker, content))
        else:
            if lines:
                prev_speaker, prev_content = lines[-1]
                lines[-1] = (prev_speaker, prev_content + " " + line)
            else:
                lines.append(("Unknown", line))
    return lines

def run_dialogue(input_file, output_file, speaker_mapping):
    print(f"--- Starting Multi-Speaker Dialogue Process ---", flush=True)
    print(f"Assigning Voices:", flush=True)
    for s, v_file in speaker_mapping.items():
        print(f"  - {s} -> {v_file}", flush=True)
    
    print(f"\nLoading AI Model (Offline Mode)...", flush=True)
    start_time = time.time()
    
    # Initialize VoxCPM - Use direct path to avoid any Hub logic
    local_model_path = r"D:\huggingface_cache\hub\models--openbmb--VoxCPM2\snapshots\bffb3df5a29440629464e5e839f4d214c8714c3d"
    v = VoxCPM.from_pretrained(
        local_model_path,
        device="cuda:0",
        optimize=False, 
        load_denoiser=False,
        local_files_only=True
    )
    
    print(f"Model loaded in {time.time() - start_time:.1f}s.", flush=True)

    with open(input_file, "r", encoding="utf-8") as f:
        content = f.read()

    dialogue_lines = parse_dialogue(content)
    print(f"Found {len(dialogue_lines)} lines of dialogue.\n", flush=True)

    combined_audio = []
    sample_rate = 48000 

    for i, (speaker, text) in enumerate(dialogue_lines):
        voice_file = speaker_mapping.get(speaker) or speaker_mapping.get("Default")
        if not voice_file:
            print(f"Warning: No voice assigned to {speaker}, skipping.", flush=True)
            continue

        voice_path = os.path.join("voice_clone_dataset", voice_file)
        print(f"[{i+1}/{len(dialogue_lines)}] Generating {speaker}: {text[:60]}...", flush=True)
        
        try:
            audio_gen = v.generate(
                text=text,
                reference_wav_path=voice_path,
                normalize=True
            )
            combined_audio.append(audio_gen)
            
            # Add a 0.6s natural pause
            silence = np.zeros(int(sample_rate * 0.6))
            combined_audio.append(silence)
        except Exception as e:
            print(f"Error generating line {i+1}: {e}", flush=True)

    if combined_audio:
        final_audio = np.concatenate(combined_audio)
        sf.write(output_file, final_audio, sample_rate)
        print(f"\n--- SUCCESS! ---", flush=True)
        print(f"Full dialogue saved to: {os.path.abspath(output_file)}", flush=True)
    else:
        print("No audio was generated.", flush=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=str, required=True)
    parser.add_argument("--output", type=str, default="dialogue_output.wav")
    parser.add_argument("--s1", type=str, default="Arun-Male.mp3")
    parser.add_argument("--s2", type=str, default="Neary-Female.mp3")
    args = parser.parse_args()
    
    mapping = {
        "Speaker 1": args.s1,
        "Speaker 2": args.s2,
        "Sok": args.s1,
        "Borey": args.s2,
        "Default": args.s1
    }
    
    run_dialogue(args.input, args.output, mapping)
