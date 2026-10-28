import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('js/listening-hub.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("--- renderQuestions (405-435) ---")
for i in range(404, 435):
    print(f"{i+1}: {lines[i]}", end='')

print("\n--- saveListeningAnswer (505-520) ---")
for i in range(504, 520):
    print(f"{i+1}: {lines[i]}", end='')
