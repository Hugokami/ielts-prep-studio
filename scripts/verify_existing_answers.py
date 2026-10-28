import json
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('data/listening.json', 'r', encoding='utf-8') as f:
    tests = json.load(f)

for t_idx, t in enumerate(tests):
    t_id = t.get('id')
    for s_idx, sec in enumerate(t.get('sections', [])):
        sec_num = sec.get('section', s_idx + 1)
        for q in sec.get('questions', []):
            opts = q.get('options', [])
            prompt = q.get('prompt', '')
            has_ph = any('Option A' in str(opt) for opt in opts) or opts == ['Select', 'A', 'B', 'C', 'D', 'E', 'F'] or opts == ['Select', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] or prompt == f"Question {q.get('id')}" or 'Select the correct matching option' in prompt
            if has_ph and q.get('type') == 'mcq':
                print(f"Test {t_idx+1} ({t_id}) Sec {sec_num} Q{q.get('id')}: answer='{q.get('answer')}', acceptable={q.get('acceptable')}, prompt='{prompt[:35]}'")
