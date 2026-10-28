import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

for enc in ['utf-16', 'utf-8', 'latin-1']:
    try:
        with open('scripts/dumped_official_questions.txt', 'r', encoding=enc) as f:
            text = f.read()
        break
    except Exception:
        continue

tests = text.split("==================== TEST ")
for t in tests[1:]:
    header = t.split(" ====================")[0]
    lines = [l.strip() for l in t.splitlines() if l.strip() and not l.startswith("====")]
    print(f"\n--- TEST {header} ({len(lines)} lines) ---")
    for l in lines[:30]:
        print(" ", l)
