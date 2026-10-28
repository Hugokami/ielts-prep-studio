import re
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Look for listening functions or data references
matches = re.findall(r'function\s+([a-zA-Z0-9_]*listen[a-zA-Z0-9_]*)\s*\(', content, re.IGNORECASE)
print("Listening functions:", set(matches))

# Look for listening.json references
for line_no, line in enumerate(content.splitlines(), 1):
    if 'listening' in line.lower() and ('fetch(' in line or 'json' in line or 'render' in line or 'start' in line):
        print(f"L{line_no}: {line.strip()[:120]}")
