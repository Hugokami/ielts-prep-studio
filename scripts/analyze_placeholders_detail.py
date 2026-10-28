import json
import re
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Read all_pages_text.txt
for enc in ['utf-16', 'utf-8', 'latin-1']:
    try:
        with open('scripts/all_pages_text.txt', 'r', encoding=enc) as f:
            raw_text = f.read()
        break
    except Exception:
        continue

with open('data/listening.json', 'r', encoding='utf-8') as f:
    tests = json.load(f)

# Find all placeholder questions in tests
placeholders = []
for t_idx, test in enumerate(tests):
    t_id = test.get('id', f'test_{t_idx+1}')
    sections = test.get('sections', [])
    for s_idx, sec in enumerate(sections):
        questions = sec.get('questions', [])
        for q in questions:
            opts = q.get('options', [])
            prompt = q.get('prompt', '')
            has_ph = any('Option A' in str(opt) for opt in opts) or opts == ['Select', 'A', 'B', 'C', 'D', 'E', 'F'] or opts == ['Select', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] or prompt == f"Question {q.get('id')}" or 'Select the correct matching option' in prompt
            if has_ph:
                placeholders.append({
                    'test_idx': t_idx,
                    'test_id': t_id,
                    'sec_idx': s_idx,
                    'sec_num': sec.get('section', s_idx+1),
                    'q_id': q.get('id'),
                    'local_id': q.get('local_id'),
                    'type': q.get('type'),
                    'prompt': prompt,
                    'options': opts,
                    'answer': q.get('answer'),
                    'explanation': q.get('explanation')
                })

print(f"Total placeholder questions identified: {len(placeholders)}")
for p in placeholders:
    print(f"T{p['test_idx']+1} ({p['test_id']}) S{p['sec_num']} Q{p['q_id']} (ans={p['answer']}): prompt='{p['prompt'][:40]}' opts={p['options'][:3]}")
