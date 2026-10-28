import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

print("=== js/listening-hub.js ===")
with open('js/listening-hub.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
print(f"Total lines: {len(lines)}")
for i in range(min(50, len(lines))):
    print(lines[i], end='')

print("\n=== js/storage-sync.js ===")
with open('js/storage-sync.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
print(f"Total lines: {len(lines)}")
for i in range(min(50, len(lines))):
    print(lines[i], end='')
