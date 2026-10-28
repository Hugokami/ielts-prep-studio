import re
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('backend/worker.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines in backend/worker.js: {len(lines)}")

for i, l in enumerate(lines):
    if '/api/sync' in l or 'handleSync' in l or 'sync_state' in l or 'PRAGMA' in l or 'CREATE TABLE' in l:
        print(f"L{i+1}: {l.strip()[:100]}")
