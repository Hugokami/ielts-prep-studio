import json
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('data/listening.json', 'r', encoding='utf-8') as f:
    tests = json.load(f)

t1 = tests[0]
print("=== Test 1 Details ===")
print("ID:", t1.get('id'))
print("Title:", t1.get('title'))
print("Audio:", t1.get('audioUrl'))
for s_idx, sec in enumerate(t1.get('sections', [])):
    print(f"\nSection {s_idx+1}: {sec.get('title')}")
    print("Instructions:", sec.get('instructions'))
    print("Context/Prompt:", sec.get('context', sec.get('prompt', ''))[:200])
    for q in sec.get('questions', []):
        print(f"  Q{q.get('number')}: type={q.get('type')}, text='{q.get('text')}', options={q.get('options')}, answer='{q.get('answer')}'")
