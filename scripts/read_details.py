import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

for enc in ['utf-16', 'utf-8', 'latin-1']:
    try:
        with open('scripts/section_details.txt', 'r', encoding=enc) as f:
            text = f.read()
        break
    except Exception:
        continue

for s in text.split("==================== FULL TEXT FOR ")[1:]:
    header = s.split(" ====================")[0]
    body = s.split(" ====================")[1] if " ====================" in s else ""
    print(f"\n***** SECTION {header} *****")
    # print lines
    lines = [l.strip() for l in body.splitlines() if l.strip()]
    for l in lines:
        if any(w in l for w in ['Choose', 'Questions', 'Which', 'A ', 'B ', 'C ', 'D ', 'E ', 'F ', 'G ', 'H ', 'I ', 'A.', 'B.', 'C.', 'D.', 'E.', 'F.', '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '0.', 'Jackson', 'Roberts', 'Morris', 'Cooper', 'Forster']):
            print("  ", l)
