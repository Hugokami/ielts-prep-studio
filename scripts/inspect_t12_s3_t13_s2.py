import json
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('data/listening.json', 'r', encoding='utf-8') as f:
    tests = json.load(f)

t12_s3 = tests[11]['sections'][2]
print("=== Test 12 Sec 3 ===")
print("Title:", t12_s3.get('title'))
print("Instructions:", t12_s3.get('instructions'))
print("Context:", t12_s3.get('context'))
print("Transcript:", (t12_s3.get('transcript') or '')[:300])

t13_s2 = tests[12]['sections'][1]
print("\n=== Test 13 Sec 2 ===")
print("Title:", t13_s2.get('title'))
print("Instructions:", t13_s2.get('instructions'))
print("Context:", t13_s2.get('context'))
print("Transcript:", (t13_s2.get('transcript') or '')[:300])
