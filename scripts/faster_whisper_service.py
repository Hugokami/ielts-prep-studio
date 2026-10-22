"""
Faster-Whisper Dynamic Transcription Service for IELTS Prep Studio
Supports both on-demand HTTP API server and standalone CLI execution.
Uses faster-whisper (CTranslate2) with PyAV audio decoding and disk caching.
"""

import sys, os, json, hashlib, urllib.request, argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Create cache directory
CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'whisper_cache')
os.makedirs(CACHE_DIR, exist_ok=True)

_MODEL = None

def get_whisper_model():
    global _MODEL
    if _MODEL is None:
        print("[Faster-Whisper] Loading tiny.en model (int8 CPU)...")
        from faster_whisper import WhisperModel
        _MODEL = WhisperModel('tiny.en', device='cpu', compute_type='int8')
        print("[Faster-Whisper] Model loaded successfully.")
    return _MODEL

def decode_audio_from_bytes(audio_bytes, sampling_rate=16000):
    import io, av, numpy as np
    container = av.open(io.BytesIO(audio_bytes), mode='r')
    stream = next(s for s in container.streams if s.type == 'audio')
    resampler = av.AudioResampler(format='s16', layout='mono', rate=sampling_rate)
    frames = []
    for frame in container.decode(stream):
        for resampled_frame in resampler.resample(frame):
            frames.append(resampled_frame.to_ndarray())
    container.close()
    if not frames:
        return np.zeros(0, dtype=np.float32)
    audio = np.concatenate(frames, axis=1)
    return audio.flatten().astype(np.float32) / 32768.0

def transcribe_audio_url(audio_url, max_seconds=None):
    # Check cache first
    url_hash = hashlib.sha256(audio_url.encode('utf-8')).hexdigest()[:24]
    cache_file = os.path.join(CACHE_DIR, f"{url_hash}.json")
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cached_data = json.load(f)
                return { "success": True, "cached": True, "segments": cached_data }
        except Exception:
            pass

    print(f"[Faster-Whisper] Downloading audio from {audio_url}...")
    headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0" }
    req = urllib.request.Request(audio_url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        audio_bytes = resp.read()

    print(f"[Faster-Whisper] Downloaded {len(audio_bytes)} bytes. Decoding frames...")
    arr = decode_audio_from_bytes(audio_bytes)
    total_sec = len(arr) / 16000.0
    print(f"[Faster-Whisper] Decoded {total_sec:.1f}s audio. Transcribing...")

    if max_seconds and total_sec > max_seconds:
        arr = arr[:int(max_seconds * 16000)]

    model = get_whisper_model()
    segments_gen, _ = model.transcribe(arr, beam_size=1, vad_filter=True)

    results = []
    for s in segments_gen:
        m = int(s.start // 60)
        sec = int(s.start % 60)
        results.append({
            "start": round(s.start, 2),
            "end": round(s.end, 2),
            "time": f"{m:02d}:{sec:02d}",
            "text": s.text.strip()
        })

    # Save to disk cache
    try:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("[Faster-Whisper] Cache save notice:", e)

    print(f"[Faster-Whisper] Transcription complete: {len(results)} segments.")
    return { "success": True, "cached": False, "segments": results, "duration": round(total_sec, 2) }

class WhisperRequestHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for local web app
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({ "status": "ok", "service": "faster-whisper", "cacheDir": CACHE_DIR }).encode('utf-8'))
            return

        if parsed.path == '/transcribe':
            params = parse_qs(parsed.query)
            audio_url = params.get('url', [None])[0]
            if not audio_url:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({ "success": False, "error": "Missing 'url' parameter" }).encode('utf-8'))
                return

            try:
                result = transcribe_audio_url(audio_url)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({ "success": False, "error": str(e) }).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

def run_server(port=8089):
    server = HTTPServer(('127.0.0.1', port), WhisperRequestHandler)
    print("=====================================================")
    print(f"[Faster-Whisper] Service running on http://127.0.0.1:{port}")
    print(f"  Health: http://127.0.0.1:{port}/health")
    print(f"  Transcribe: http://127.0.0.1:{port}/transcribe?url=<audio_url>")
    print("=====================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        server.server_close()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Faster-Whisper Dynamic Podcast Transcriber")
    parser.add_argument('--serve', action='store_true', help="Run HTTP API service")
    parser.add_argument('--port', type=int, default=8089, help="Server port (default 8089)")
    parser.add_argument('--url', type=str, help="Podcast audio URL to transcribe")
    parser.add_argument('--out', type=str, help="Output JSON file path")
    args = parser.parse_args()

    if args.serve:
        run_server(args.port)
    elif args.url:
        res = transcribe_audio_url(args.url)
        if args.out:
            with open(args.out, 'w', encoding='utf-8') as f:
                json.dump(res, f, ensure_ascii=False, indent=2)
            print(f"Saved to {args.out}")
        else:
            print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        parser.print_help()
