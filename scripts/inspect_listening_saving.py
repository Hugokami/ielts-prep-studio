import re
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('js/listening-hub.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Look for localStorage or appState or save in listening-hub.js
matches = re.findall(r'localStorage\.[a-zA-Z]+\([\'\"][^\'\"]+[\'\"]', text)
print("localStorage calls in listening-hub.js:", set(matches))

# Look for score calculation or submit
for line_no, line in enumerate(text.splitlines(), 1):
    if any(k in line.lower() for k in ['gradescore', 'submitexam', 'savelisteninganswer', 'saveexam', 'useranswers']):
        if 'function' in line.lower() or 'localStorage' in line:
            print(f"L{line_no}: {line.strip()[:100]}")
