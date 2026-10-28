import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('backend/worker.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(384, min(480, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
