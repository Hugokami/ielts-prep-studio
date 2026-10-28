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

# Split by "==================== TEST "
chunks = raw_text.split("==================== TEST ")
for c in chunks:
    if not c.strip(): continue
    first_line = c.splitlines()[0].strip()
    sec_name = first_line.replace("====================", "").strip()
    print(f"\n################ SECTION {sec_name} ################")
    for line in c.splitlines()[1:]:
        l = line.strip()
        if l and not l.startswith("ielts-up.com"):
            print(l)
