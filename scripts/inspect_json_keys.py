import json
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('data/listening.json', 'r', encoding='utf-8') as f:
    tests = json.load(f)

print(f"Total tests: {len(tests)}")
for t_idx, t in enumerate(tests):
    keys_in_test = set()
    for sec in t.get('sections', []):
        for q in sec.get('questions', []):
            keys_in_test.update(q.keys())
    print(f"Test {t_idx+1} ({t.get('id')}): {keys_in_test}")

q1 = tests[0]['sections'][0]['questions'][0]
print("\nTest 1 Q1:", q1)
q6 = tests[0]['sections'][0]['questions'][5]
print("\nTest 1 Q6:", q6)
