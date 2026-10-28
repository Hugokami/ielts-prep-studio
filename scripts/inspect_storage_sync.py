import re
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('js/storage-sync.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Look for sync functions, endpoint calls, export/import functions
fns = re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', code)
print("Functions in storage-sync.js:", fns)

# Look for /api/ calls
api_calls = re.findall(r'[\'\"`](/[^\'\"`]+)[\'\"`]', code)
print("API endpoints called:", set(api_calls))

# Look for localStorage keys used
keys = re.findall(r'localStorage\.(?:getItem|setItem)\([\'\"]([^\'\"]+)[\'\"]', code)
print("localStorage keys:", set(keys))
