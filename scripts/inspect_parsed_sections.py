import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

for enc in ['utf-16', 'utf-8', 'latin-1']:
    try:
        with open('scripts/all_pages_text.txt', 'r', encoding=enc) as f:
            text = f.read()
        print(f"Decoded with {enc}, length: {len(text)}")
        break
    except Exception:
        continue

sections = text.split("==================== TEST ")
print(f"Total sections fetched: {len(sections)-1}")

for s in sections[1:]:
    header = s.split(" ====================")[0]
    content = s.split(" ====================")[1] if " ====================" in s else ""
    print(f"\n--- {header} ---")
    lines = [l.strip() for l in content.splitlines() if l.strip()]
    for l in lines[:25]:
        print(" ", l)
