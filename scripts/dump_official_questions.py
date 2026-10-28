import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

for enc in ['utf-16', 'utf-8', 'latin-1']:
    try:
        with open('scripts/all_pages_text.txt', 'r', encoding=enc) as f:
            raw_text = f.read()
        break
    except Exception:
        continue

sections = raw_text.split("==================== TEST ")
for s in sections[1:]:
    header = s.split(" ====================")[0]
    content = s.split(" ====================")[1] if " ====================" in s else ""
    print(f"\n==================== TEST {header} ====================")
    # print lines that have numbers or options or questions
    for line in content.splitlines():
        l = line.strip()
        if l and ('Question' in l or 'A ' in l or 'B ' in l or 'A.' in l or 'B.' in l or 'Choose' in l or any(f"{i}." in l for i in range(1, 41))):
            print("  ", l)
