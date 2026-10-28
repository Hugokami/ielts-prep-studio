import json
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('data/listening.json', 'r', encoding='utf-8') as f:
    tests = json.load(f)

t1_sec1 = tests[0]['sections'][0]['questions']
for q in t1_sec1[5:]:
    print(q)
