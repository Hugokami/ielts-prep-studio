import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('js/listening-hub.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("--- exam switching (465-495) ---")
for i in range(464, 495):
    print(f"{i+1}: {lines[i]}", end='')
