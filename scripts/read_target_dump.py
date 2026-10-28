import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

for enc in ['utf-16', 'utf-8', 'latin-1']:
    try:
        with open('scripts/target_sections_dump.txt', 'r', encoding=enc) as f:
            text = f.read()
        break
    except Exception:
        continue

sections = text.split("==================== SECTION ")
for s in sections[1:]:
    header = s.split(" ====================")[0]
    content = s.split(" ====================")[1] if " ====================" in s else ""
    print(f"\n***** {header} *****")
    for line in content.splitlines()[:35]:
        if line.strip():
            print(" ", line.strip())
