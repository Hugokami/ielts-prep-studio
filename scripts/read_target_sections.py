import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

for enc in ['utf-16', 'utf-8', 'latin-1']:
    try:
        with open('scripts/clean_sections.txt', 'r', encoding=enc) as f:
            text = f.read()
        break
    except Exception:
        continue

for target in ['8.3', '9.2', '10.3', '11.3', '12.2', '13.2', '13.3', '13.4', '14.2', '14.3', '14.4']:
    idx = text.find(f">>> SECTION {target}")
    if idx != -1:
        print(f"\n==================== SECTION {target} ====================")
        print(text[idx:idx+2500])
