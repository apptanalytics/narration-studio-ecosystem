import subprocess
import argparse
import os
import sys
from pathlib import Path

def run_batch():
    parser = argparse.ArgumentParser(description="Quick Batch Khmer TTS Generator")
    parser.add_argument("--input", "-i", required=True, help="Input text file (one line per sentence)")
    parser.add_argument("--output-dir", "-o", default="./batch_output", help="Directory to save WAV files")
    parser.add_argument("--voice", "-v", default="voice_clone_dataset/Maly-Female.mp3", help="Reference voice file")
    args = parser.parse_args()

    # Ensure output directory exists
    output_path = Path(args.output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Verify input file
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file {args.input} not found.")
        sys.exit(1)

    print(f"--- Starting Batch Process ---")
    print(f"Input: {args.input}")
    print(f"Output: {args.output_dir}")
    print(f"Voice: {args.voice}")
    print(f"Device: CUDA:0 (Forcing GPU)")
    print(f"-------------------------------")

    # Command to run the underlying voxcpm cli
    cmd = [
        sys.executable, "-m", "voxcpm.cli", "batch",
        "--input", str(input_path),
        "--output-dir", str(output_path),
        "--reference-audio", args.voice,
        "--device", "cuda:0",
        "--normalize",
        "--no-optimize"
    ]

    try:
        # Set environment variable to ensure CUDA is visible
        env = os.environ.copy()
        env["CUDA_VISIBLE_DEVICES"] = "0"
        
        subprocess.run(cmd, check=True, env=env)
        print(f"\nSuccess! All audio files saved to: {os.path.abspath(args.output_dir)}")
    except subprocess.CalledProcessError as e:
        print(f"\nError during batch processing: {e}")
    except KeyboardInterrupt:
        print(f"\nProcess stopped by user.")

if __name__ == "__main__":
    run_batch()
