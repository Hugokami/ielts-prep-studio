import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'switchView' in l and 'function' in l:
        print(f"L{i+1}: {l.strip()[:100]}")
        for j in range(i, min(len(lines), i + 60)):
            if 'aichat' in lines[j]:
                print(f"  L{j+1}: {lines[j].strip()[:100]}")
