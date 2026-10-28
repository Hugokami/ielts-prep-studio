import json
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('data/listening.json', 'r', encoding='utf-8') as f:
    tests = json.load(f)

for t in tests[:3]:
    for sec in t.get('sections', []):
        for q in sec.get('questions', []):
            if q.get('type') == 'mcq' and not any('Option A' in o for o in q.get('options', [])):
                print(f"Test {t.get('id')} Q{q.get('id')}: prompt='{q.get('prompt')}' options={q.get('options')[:3]}")
                break
