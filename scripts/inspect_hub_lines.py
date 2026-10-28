import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('js/listening-hub.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'render' in l.lower() or 'question' in l.lower() or 'option' in l.lower():
        if 'function' in l or 'render' in l:
            print(f"L{i+1}: {l.strip()[:100]}")
