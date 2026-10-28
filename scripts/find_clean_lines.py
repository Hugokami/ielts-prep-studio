import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

for enc in ['utf-16', 'utf-8', 'latin-1']:
    try:
        with open('scripts/clean_sections.txt', 'r', encoding=enc) as f:
            lines = f.readlines()
        print(f"Read clean_sections.txt with {enc}: {len(lines)} lines")
        for i, l in enumerate(lines):
            if 'SECTION 8.3' in l or 'SECTION 9.2' in l or 'SECTION 10.3' in l or 'SECTION 11.3' in l or 'SECTION 12.2' in l:
                print(f"L{i+1}: {l.strip()}")
                for j in range(i, min(len(lines), i+30)):
                    print("  ", lines[j].strip())
                print("="*40)
        break
    except Exception as e:
        continue
