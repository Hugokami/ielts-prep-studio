import re
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Look for localStorage keys across index.html
ls_keys = set(re.findall(r'localStorage\.(?:getItem|setItem|removeItem)\([\'\"]([^\'\"]+)[\'\"]', text))
print("LocalStorage keys in index.html:")
for k in sorted(ls_keys):
    print(" ", k)
