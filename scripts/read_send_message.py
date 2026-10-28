import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(22715, 22735):
    print(f"{i+1}: {lines[i]}", end='')

print("="*40)
for i in range(22845, 22865):
    print(f"{i+1}: {lines[i]}", end='')
