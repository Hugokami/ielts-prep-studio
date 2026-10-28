import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

repo = r'c:\Users\lyan1\Documents\antigravity\ielts-prep-studio'
with open(os.path.join(repo, 'index.html'), encoding='utf-8') as f:
    content = f.read()

for fn in ['initLiveExamReading', 'initLiveExamWriting', 'initLiveExamLexicons']:
    idx = content.find(f'function {fn}')
    print(f"=== {fn} at {idx} ===")
    if idx != -1:
        print(content[idx:idx+250])
