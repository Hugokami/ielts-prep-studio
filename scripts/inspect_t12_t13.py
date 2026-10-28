import json
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('data/listening.json', 'r', encoding='utf-8') as f:
    tests = json.load(f)

for t_idx in [11, 12]:
    t = tests[t_idx]
    print(f"\n=== Test {t_idx+1}: {t.get('id')} - {t.get('title')} ===")
    for sec in t.get('sections', []):
        for q in sec.get('questions', []):
            if q.get('id') in [26, 27, 28, 29, 30, 17, 18, 19, 20]:
                print(f"Sec {sec['section']} Q{q['id']}: type={q.get('type')}, prompt='{q.get('prompt')}', options={q.get('options')}, answer={q.get('answer')}, explanation={q.get('explanation')}")
