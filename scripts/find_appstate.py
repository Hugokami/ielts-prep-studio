import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'occ_ielts_studio_v5' in l or 'appState' in l:
        if any(w in l for w in ['const appState', 'let appState', 'window.appState =', 'JSON.parse', 'localStorage.setItem', 'localStorage.getItem']):
            print(f"L{i+1}: {l.strip()[:100]}")
