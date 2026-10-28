import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("--- AI Chat Init (22095-22130) ---")
for i in range(22094, min(22130, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')

print("\n--- AI Chat Clear (22410-22440) ---")
for i in range(22410, min(22440, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')

print("\n--- AI Chat Reply push (22845-22870) ---")
for i in range(22845, min(22870, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
