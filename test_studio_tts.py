import requests
import time
import os

# Configuration
API_URL = "http://127.0.0.1:8810"
GENERATE_ENDPOINT = f"{API_URL}/api/generate"
KHMER_TEXT = "សួស្តី! នេះជាសំឡេងសាកល្បងពី Narration Studio។"
VOICE = "Maly-Female.mp3"
OUTPUT_FILE = "test_output.wav"

def test_tts():
    print(f"Connecting to {API_URL}...")
    
    # 1. Check health
    try:
        health = requests.get(f"{API_URL}/api/health", timeout=5)
        print(f"Service health: {health.status_code} - {health.json()}")
    except Exception as e:
        print(f"Error checking health: {e}")
        return

    # 2. Request generation
    payload = {
        "text": KHMER_TEXT,
        "voice": VOICE,
        "mode": "clone",
        "cfg_value": 2.0,
        "inference_timesteps": 10
    }
    
    print(f"Requesting speech for: '{KHMER_TEXT}'")
    print(f"Using voice: {VOICE}")
    
    start_time = time.time()
    response = requests.post(GENERATE_ENDPOINT, json=payload)
    
    if response.status_code != 200:
        print(f"Error generating speech: {response.status_code}")
        print(response.text)
        return
        
    data = response.json()
    download_url = f"{API_URL}{data['download_url']}"
    print(f"Generation successful in {time.time() - start_time:.2f}s")
    print(f"Download URL: {download_url}")
    
    # 3. Download the result
    print(f"Downloading audio to {OUTPUT_FILE}...")
    audio_response = requests.get(download_url)
    
    if audio_response.status_code == 200:
        with open(OUTPUT_FILE, "wb") as f:
            f.write(audio_response.content)
        print(f"Done! Audio saved to {os.path.abspath(OUTPUT_FILE)}")
    else:
        print(f"Error downloading audio: {audio_response.status_code}")

if __name__ == "__main__":
    test_tts()
