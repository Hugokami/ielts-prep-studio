import json
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('data/listening.json', 'r', encoding='utf-8') as f:
    tests = json.load(f)

for i, t in enumerate(tests):
    audios = [s.get('audio_url') for s in t.get('sections', [])]
    print(f"Test {i+1}: {t.get('id')} - {t.get('title')} | Audios: {audios}")
