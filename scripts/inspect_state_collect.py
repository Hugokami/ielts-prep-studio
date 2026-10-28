import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('js/storage-sync.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'collectV6State' in l or 'restoreV6State' in l or 'srs_cards' in l or 'savedProgress' in l:
        print(f"L{i+1}: {l.strip()[:100]}")
