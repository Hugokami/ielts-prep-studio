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

print("Total length:", len(text))
for sec in text.split("################ SECTION "):
    if not sec.strip(): continue
    lines = sec.splitlines()
    sec_name = lines[0].replace("################", "").strip()
    print(f"\n>>> SECTION {sec_name} ({len(lines)} lines)")
    for l in lines[1:40]:
        print(" ", l)
