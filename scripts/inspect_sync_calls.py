import re
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

for fname in ['js/storage-sync.js', 'index.html']:
    with open(fname, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    print(f"\n=== {fname} ===")
    for i, l in enumerate(lines):
        if any(k in l.lower() for k in ['/api/sync', 'syncstate', 'syncuserdata', 'cloudsync', 'saveprogress', 'aichat']):
            print(f"L{i+1}: {l.strip()[:100]}")
