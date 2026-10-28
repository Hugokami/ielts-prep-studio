import json
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('data/listening.json', 'r', encoding='utf-8') as f:
    tests = json.load(f)

for t_idx, test in enumerate(tests):
    t_id = test.get('id', f'test_{t_idx+1}')
    t_title = test.get('title', '')
    sections = test.get('sections', [])
    for s_idx, sec in enumerate(sections):
        questions = sec.get('questions', [])
        for q_idx, q in enumerate(questions):
            q_num = q.get('number', q.get('id', f'{s_idx+1}_{q_idx+1}'))
            options = q.get('options', [])
            text = q.get('text', q.get('question', ''))
            has_placeholder = any('Option A' in str(opt) or 'Option B' in str(opt) or opt == 'A' or opt == 'B' for opt in options) or 'Option A' in str(text) or 'Question ' == str(text).strip() or text == f'Question {q_num}'
            if has_placeholder:
                print(f"Test {t_idx+1} ({t_id}) | Section {s_idx+1} | Q{q_num}: text='{text}', options={options}, answer='{q.get('answer', q.get('correct'))}'")
