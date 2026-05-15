import os
import sys
import google.generativeai as genai
import time

# Ensure the terminal handles Khmer characters correctly on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def transcribe_with_gemini(audio_path):
    print(f"--- Khmer Transcription (Powered by Gemini 3.1 Flash) ---", flush=True)
    print(f"File: {os.path.basename(audio_path)}", flush=True)

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set.", flush=True)
        return

    genai.configure(api_key=api_key)
    
    print("Uploading audio file...", flush=True)
    # Upload the file to Gemini
    audio_file = genai.upload_file(path=audio_path)
    print(f"File uploaded as: {audio_file.name}", flush=True)

    # Wait for the file to be processed
    while audio_file.state.name == "PROCESSING":
        print(".", end="", flush=True)
        time.sleep(2)
        audio_file = genai.get_file(audio_file.name)

    if audio_file.state.name == "FAILED":
        print(f"\nError: Audio processing failed.")
        return

    print("\nAnalyzing and transcribing...", flush=True)
    
    model = genai.GenerativeModel(model_name="gemini-flash-latest")
    prompt = "Transcribe this Khmer audio. Provide the full text in Khmer script. If there are multiple speakers, label them as Speaker 1, Speaker 2, etc."

    try:
        response = model.generate_content([audio_file, prompt])
        
        print("-" * 30, flush=True)
        print(response.text, flush=True)
        print("-" * 30, flush=True)
        
        # Save results
        output_txt = os.path.splitext(audio_path)[0] + "_gemini.txt"
        with open(output_txt, "w", encoding="utf-8") as f:
            f.write(response.text)
        print(f"Transcript saved to: {output_txt}", flush=True)
        
    except Exception as e:
        print(f"Gemini API Error: {e}", flush=True)
    finally:
        # Cleanup: Delete the file from Gemini
        genai.delete_file(audio_file.name)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transcribe_gemini.py <audio_path>")
        sys.exit(1)
        
    audio_file = sys.argv[1]
    if not os.path.exists(audio_file):
        print(f"Error: File '{audio_file}' not found.")
        sys.exit(1)
        
    transcribe_with_gemini(audio_file)
