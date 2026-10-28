import json
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('data/listening.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Data type: {type(data)}")
if isinstance(data, list):
    print(f"Total tests: {len(data)}")
    for i, test in enumerate(data):
        print(f"Test {i+1}: {test.get('title', test.get('id', 'No title'))}, sections/questions count: {len(test.get('sections', test.get('questions', [])))}")
elif isinstance(data, dict):
    print(f"Keys: {list(data.keys())}")
    for k in data:
        v = data[k]
        print(f"Key {k}: {type(v)}, len: {len(v) if isinstance(v, (list, dict)) else 'N/A'}")
