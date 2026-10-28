import json
import re
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('data/listening.json', 'r', encoding='utf-8') as f:
    tests = json.load(f)

# Helper function to sanitize and format option text
def format_mcq_options(raw_options):
    formatted = []
    for idx, opt in enumerate(raw_options):
        letter = chr(65 + idx)
        # remove any existing leading A), A., etc.
        clean = re.sub(r'^[A-Z][\)\.]\s*', '', str(opt)).strip()
        formatted.append(f"{letter}) {clean}")
    return formatted

# =========================================================================
# TEST 1 (cambridge_listening_05)
# =========================================================================
# Sec 1 Q6-8 (Multi-select: Which THREE things should the caller bring to the meeting? A-F)
t1_s1_opts_6_8 = [
    "A) Driving license",
    "B) Passport",
    "C) Tax bill",
    "D) Employment contract",
    "E) Reference from a friend or colleague",
    "F) Reference from an employer"
]
t1_s1_q = tests[0]['sections'][0]['questions']
# Q6
t1_s1_q[5]['prompt'] = "Which THREE things should the caller bring to the meeting? (Item 1 of 3 — Choose from A–F)"
t1_s1_q[5]['options'] = t1_s1_opts_6_8
t1_s1_q[5]['answer'] = "B"
t1_s1_q[5]['acceptable'] = ["B", "D", "E"]
t1_s1_q[5]['explanation'] = "Official IELTS Answer Key: B (Passport), D (Employment contract), E (Reference from a friend/colleague)."

# Q7
t1_s1_q[6]['prompt'] = "Which THREE things should the caller bring to the meeting? (Item 2 of 3 — Choose from A–F)"
t1_s1_q[6]['options'] = t1_s1_opts_6_8
t1_s1_q[6]['answer'] = "D"
t1_s1_q[6]['acceptable'] = ["B", "D", "E"]
t1_s1_q[6]['explanation'] = "Official IELTS Answer Key: B (Passport), D (Employment contract), E (Reference from a friend/colleague)."

# Q8
t1_s1_q[7]['prompt'] = "Which THREE things should the caller bring to the meeting? (Item 3 of 3 — Choose from A–F)"
t1_s1_q[7]['options'] = t1_s1_opts_6_8
t1_s1_q[7]['answer'] = "E"
t1_s1_q[7]['acceptable'] = ["B", "D", "E"]
t1_s1_q[7]['explanation'] = "Official IELTS Answer Key: B (Passport), D (Employment contract), E (Reference from a friend/colleague)."

# Q9 & Q10
t1_s1_q[8]['prompt'] = "What time do the caller and apartment manager decide to meet?"
t1_s1_q[8]['options'] = ["A) 5:30 PM", "B) 6:00 PM", "C) 6:30 PM"]
t1_s1_q[8]['answer'] = "C"

t1_s1_q[9]['prompt'] = "Where do they decide to meet?"
t1_s1_q[9]['options'] = ["A) Near the manager's apartment", "B) At the caller's future apartment", "C) At the office"]
t1_s1_q[9]['answer'] = "B"

# Sec 3 (Course modules & lecture questions)
t1_s3_q = tests[0]['sections'][2]['questions']
t1_s3_q[0]['prompt'] = "The total course duration is ______."
t1_s3_q[1]['prompt'] = "During the final project students will work in teams of ______."
t1_s3_q[2]['prompt'] = "The professor told that the key thing in marketing strategy is to ______."

t1_s3_opts_24_28 = [
    "A) Marketing",
    "B) Design of custom logos",
    "C) Product management",
    "D) Branding",
    "E) E-commerce",
    "F) Advertising",
    "G) Analytics",
    "H) Customer attraction",
    "I) Business strategies"
]
# Q24-28
t1_s3_ans = ["A", "D", "E", "F", "H"]
for idx, qnum in enumerate([24, 25, 26, 27, 28]):
    q = t1_s3_q[idx + 3]
    q['id'] = qnum
    q['local_id'] = idx + 4
    q['type'] = 'mcq'
    q['prompt'] = f"What FIVE modules does the course include? (Module {idx+1} of 5 — Choose from A–I)"
    q['options'] = t1_s3_opts_24_28
    q['answer'] = t1_s3_ans[idx]
    q['acceptable'] = t1_s3_ans
    q['explanation'] = f"Official IELTS Answer Key: {t1_s3_ans[idx]} (Modules: Marketing, Branding, E-commerce, Advertising, Customer attraction)."

t1_s3_q[8]['prompt'] = "The next lecture is in the big classroom on the ______."
t1_s3_q[8]['type'] = 'fill'
t1_s3_q[8]['options'] = []
t1_s3_q[8]['answer'] = "ground floor"

t1_s3_q[9]['prompt'] = "Students need to take their last week ______."
t1_s3_q[9]['type'] = 'fill'
t1_s3_q[9]['options'] = []
t1_s3_q[9]['answer'] = "assignment"

# Sec 4 (Great Wall MCQ Prompts)
t1_s4_q = tests[0]['sections'][3]['questions']
t1_s4_prompts = [
    ("The Great Wall was initially built to ______.", ["A) prevent invaders from entering China", "B) function as a psychological barrier", "C) show country’s enduring strength"]),
    ("The earliest unified parts of the wall were joined ______.", ["A) in third century B.C.", "B) in 220 B.C.", "C) in 390 A.D."]),
    ("In historical Chinese literature, the wall was referred to as ______.", ["A) the Great Wall", "B) the Big Wall", "C) the Long Wall"]),
    ("Most surviving stone and brick sections were constructed during the ______.", ["A) Qin dynasty", "B) Northern Wei dynasty", "C) Ming dynasty"]),
    ("Modern historical consensus considers the primary purpose of the wall ______.", ["A) to be an impenetrable fortification", "B) to protect caravans traveling along trade routes", "C) to contribute to the defense and border control of the country"])
]
for idx, (p_text, p_opts) in enumerate(t1_s4_prompts):
    t1_s4_q[idx]['prompt'] = p_text
    t1_s4_q[idx]['options'] = p_opts

print("✓ Test 1 questions updated.")
