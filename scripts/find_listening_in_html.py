import sys
import re

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

for term in ['listening.json', 'switchView(\'listening\'', 'id="listening"', 'id="listening-view"', 'data-view="listening"']:
    matches = [m.start() for m in re.finditer(re.escape(term), content)]
    print(f"Matches for {term}: {len(matches)}")
    for m in matches[:5]:
        line = content.count('\n', 0, m) + 1
        print(f"  Line {line}: {content[m:m+120].replace(chr(10), ' ')}")
