import json
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('data/listening.json', 'r', encoding='utf-8') as f:
    tests = json.load(f)

for s in tests[0]['sections']:
    print(f"Sec {s['section']}: {s['title']}, audio: {s.get('audio_url')}, prompt/instructions: {s.get('instructions')}")
