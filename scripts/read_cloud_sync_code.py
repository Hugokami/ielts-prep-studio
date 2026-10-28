import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

print("=== index.html triggerCloudSync ===")
with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(12440, min(12490, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')

print("\n=== js/storage-sync.js around line 507 ===")
with open('js/storage-sync.js', 'r', encoding='utf-8') as f:
    lines2 = f.readlines()

for i in range(490, min(550, len(lines2))):
    print(f"{i+1}: {lines2[i]}", end='')
