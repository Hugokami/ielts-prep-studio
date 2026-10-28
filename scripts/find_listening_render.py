import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if any(k in l for k in ['renderListeningTest', 'renderListening', 'renderListeningSection', 'listeningQuestions', 'loadListeningTest']):
        print(f"Line {i+1}: {l.strip()[:100]}")
        for j in range(max(0, i-1), min(len(lines), i + 40)):
            print(f"  {lines[j]}", end='')
        print('\n' + '='*40)
