import json
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

LISTENING_PATHS = [
    'data/listening.json',
    'backend/data/listening.json',
    'public/data/listening.json',
    '.vercel/output/static/data/listening.json'
]

with open('data/listening.json', 'r', encoding='utf-8') as f:
    tests = json.load(f)

print(f"Loaded {len(tests)} tests from data/listening.json")

# =========================================================================
# TEST 1 (cambridge_listening_05)
# =========================================================================
t1_s1_opts_6_8 = [
    "A) Driving license",
    "B) Passport",
    "C) Tax bill",
    "D) Employment contract",
    "E) Reference from a friend or colleague",
    "F) Reference from an employer"
]
t1_s1_q = tests[0]['sections'][0]['questions']
t1_s1_q[5].update({
    "prompt": "Which THREE things should the caller bring to the meeting? (Item 1 of 3 — Choose letter A–F)",
    "options": t1_s1_opts_6_8,
    "answer": "B",
    "acceptable": ["B", "D", "E"],
    "explanation": "Official IELTS Answer Key: B (Passport), D (Employment contract), E (Reference from friend/colleague)."
})
t1_s1_q[6].update({
    "prompt": "Which THREE things should the caller bring to the meeting? (Item 2 of 3 — Choose letter A–F)",
    "options": t1_s1_opts_6_8,
    "answer": "D",
    "acceptable": ["B", "D", "E"],
    "explanation": "Official IELTS Answer Key: B (Passport), D (Employment contract), E (Reference from friend/colleague)."
})
t1_s1_q[7].update({
    "prompt": "Which THREE things should the caller bring to the meeting? (Item 3 of 3 — Choose letter A–F)",
    "options": t1_s1_opts_6_8,
    "answer": "E",
    "acceptable": ["B", "D", "E"],
    "explanation": "Official IELTS Answer Key: B (Passport), D (Employment contract), E (Reference from friend/colleague)."
})
t1_s1_q[8].update({
    "prompt": "What time do the caller and apartment manager decide to meet?",
    "options": ["A) 5:30 PM", "B) 6:00 PM", "C) 6:30 PM"],
    "answer": "C",
    "acceptable": ["C"],
    "explanation": "Official IELTS Answer Key: C (6:30 PM)."
})
t1_s1_q[9].update({
    "prompt": "Where do they decide to meet?",
    "options": ["A) Near the manager's apartment", "B) At the caller's future apartment", "C) At the office"],
    "answer": "B",
    "acceptable": ["B"],
    "explanation": "Official IELTS Answer Key: B (At the caller's future apartment)."
})

# Test 1 Sec 3
t1_s3_q = tests[0]['sections'][2]['questions']
t1_s3_q[0]['prompt'] = "The total course duration is ______."
t1_s3_q[1]['prompt'] = "During the final project students will work in teams of ______."
t1_s3_q[2]['prompt'] = "The professor told that the key thing in marketing strategy is to ______."

t1_s3_opts = [
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
t1_s3_ans = ["A", "D", "E", "F", "H"]
for idx, qnum in enumerate([24, 25, 26, 27, 28]):
    t1_s3_q[idx + 3].update({
        "id": qnum,
        "local_id": idx + 4,
        "type": "mcq",
        "prompt": f"What FIVE modules does the course include? (Module {idx+1} of 5 — Choose letter A–I)",
        "options": t1_s3_opts,
        "answer": t1_s3_ans[idx],
        "acceptable": t1_s3_ans,
        "explanation": f"Official IELTS Answer Key: {t1_s3_ans[idx]} (Included modules: Marketing, Branding, E-commerce, Advertising, Customer attraction)."
    })
t1_s3_q[8].update({
    "id": 29, "local_id": 9, "type": "fill",
    "prompt": "The next lecture is in the big classroom on the ______.",
    "options": [], "answer": "ground floor", "acceptable": ["ground floor"]
})
t1_s3_q[9].update({
    "id": 30, "local_id": 10, "type": "fill",
    "prompt": "Students need to take their last week ______.",
    "options": [], "answer": "assignment", "acceptable": ["assignment"]
})

# Test 1 Sec 4
t1_s4_q = tests[0]['sections'][3]['questions']
t1_s4_data = [
    ("The Great Wall was initially built to ______.", ["A) prevent invaders from entering China", "B) function as a psychological barrier", "C) show country’s enduring strength"], "A"),
    ("The earliest unified parts of the wall were joined ______.", ["A) in third century B.C.", "B) in 220 B.C.", "C) in 390 A.D."], "B"),
    ("In historical Chinese literature, the wall was referred to as ______.", ["A) the Great Wall", "B) the Big Wall", "C) the Long Wall"], "C"),
    ("Most surviving stone and brick sections were constructed during the ______.", ["A) Qin dynasty", "B) Northern Wei dynasty", "C) Ming dynasty"], "C"),
    ("Modern historical consensus considers the primary purpose of the wall ______.", ["A) to be an impenetrable fortification", "B) to protect caravans traveling along trade routes", "C) to contribute to the defense of the country"], "C")
]
for idx, (p_text, p_opts, p_ans) in enumerate(t1_s4_data):
    t1_s4_q[idx].update({
        "prompt": p_text,
        "options": p_opts,
        "answer": p_ans,
        "acceptable": [p_ans]
    })

# =========================================================================
# TEST 2 (cambridge_listening_06)
# =========================================================================
t2_s2_q = tests[1]['sections'][1]['questions']
t2_s2_opts = [
    "A) yoga",
    "B) pilates",
    "C) step dance",
    "D) aerobics",
    "E) belly dance",
    "F) barbell classes",
    "G) kickboxing",
    "H) zumba",
    "I) stretching"
]
t2_s2_ans = ["A", "C", "F", "H", "I"]
for idx, qnum in enumerate([11, 12, 13, 14, 15]):
    t2_s2_q[idx].update({
        "id": qnum,
        "local_id": idx + 1,
        "type": "mcq",
        "prompt": f"Which FIVE group fitness programs are available at Fitness Land? (Program {idx+1} of 5 — Choose letter A–I)",
        "options": t2_s2_opts,
        "answer": t2_s2_ans[idx],
        "acceptable": t2_s2_ans,
        "explanation": f"Official IELTS Answer Key: {t2_s2_ans[idx]} (Available: yoga, step dance, barbell classes, zumba, stretching)."
    })

t2_s2_fill = [
    (16, "Monday group activity: ______", "muscle building"),
    (17, "Tuesday group activity: ______", "fat loss"),
    (18, "Wednesday group activity: ______", "healthy body"),
    (19, "Thursday group activity: ______", "relaxation"),
    (20, "Friday group activity: ______", "interval trainings")
]
for idx, (qnum, p_text, p_ans) in enumerate(t2_s2_fill):
    t2_s2_q[idx + 5].update({
        "id": qnum,
        "local_id": idx + 6,
        "type": "fill",
        "prompt": p_text,
        "options": [],
        "answer": p_ans,
        "acceptable": [p_ans]
    })

# Test 2 Sec 3 (Pain perception)
t2_s3_q = tests[1]['sections'][2]['questions']
t2_s3_mcq = [
    ("According to the speaker, what is the evolutionary purpose of pain?", ["A) It preserves good health condition", "B) It prevents us from damaging ourselves", "C) Continuous pain is useful for humans"], "B"),
    ("Which components are involved in pain perception?", ["A) Receptors and nerves", "B) Some part of our brain", "C) Pain is a complex process, which involves various parts of our body"], "C"),
    ("What percentage of chronic pain patients experience persistent symptoms?", ["A) 31%", "B) 37%", "C) 40 million"], "C"),
    ("Is there an essential biological difference between acute and chronic pain?", ["A) No, all kinds of pain have evolved as survival mechanisms", "B) Yes, there is an enormous difference", "C) We don’t have much insight into that"], "B"),
    ("Which clinical condition involves persistent pain after an amputation?", ["A) Phantom pain", "B) Continuousness", "C) Anesthesia"], "A"),
    ("How do traditional local anesthetics work?", ["A) By blocking activity of nerves that send electrical signals", "B) By altering cognitive mechanisms of pain perception", "C) By targeting the central nervous system"], "A"),
    ("When do amputees report feeling sensations in missing limbs?", ["A) After the operation", "B) While their wounds heal", "C) After the amputation"], "C"),
    ("Can pain perception occur in the absence of peripheral stimulation?", ["A) No, pain has nothing to do with peripheral nerves", "B) Yes, peripheral nerves are not required to feel pain", "C) Scientists don’t know much about pain perception nowadays"], "B")
]
for idx, (p_text, p_opts, p_ans) in enumerate(t2_s3_mcq):
    t2_s3_q[idx].update({
        "prompt": p_text,
        "options": p_opts,
        "answer": p_ans,
        "acceptable": [p_ans]
    })
t2_s3_q[8].update({"prompt": "Chronic pain often develops through a neurological ______.", "type": "fill", "options": [], "answer": "memory", "acceptable": ["memory"]})
t2_s3_q[9].update({"prompt": "Pain in the absence of ongoing tissue damage can be viewed as a ______.", "type": "fill", "options": [], "answer": "learnt sensation", "acceptable": ["learnt sensation"]})

# =========================================================================
# TEST 3 (cambridge_listening_07)
# =========================================================================
t3_s3_q = tests[2]['sections'][2]['questions']
t3_s3_q[0].update({
    "prompt": "Melanie says she has not started the assignment because ______.",
    "options": ["A) she was doing work for another course", "B) it was a really big assignment", "C) she hasn't spent time in the library"],
    "answer": "A", "acceptable": ["A"]
})
t3_s3_q[1].update({
    "prompt": "The lecturer says that reasonable excuses for extensions are ______.",
    "options": ["A) planning problems", "B) problems with assignment deadlines", "C) personal illness or accident"],
    "answer": "C", "acceptable": ["C"]
})
t3_s3_box = [
    "A) must read",
    "B) useful",
    "C) limited value",
    "D) read first section",
    "E) read research methods",
    "F) read conclusion",
    "G) don't read"
]
t3_s3_articles = [
    (23, "Jackson's article", "E"),
    (24, "Roberts's article", "B"),
    (25, "Morris's article", "G"),
    (26, "Cooper's article", "F"),
    (27, "Forster's article", "C")
]
for idx, (qnum, author, ans) in enumerate(t3_s3_articles):
    t3_s3_q[idx + 2].update({
        "id": qnum,
        "local_id": idx + 3,
        "type": "mcq",
        "prompt": f"What recommendation does Dr Johnson make about {author}? (Choose from A–G)",
        "options": t3_s3_box,
        "answer": ans,
        "acceptable": [ans],
        "explanation": f"Official IELTS Answer Key: {ans} for {author}."
    })

t3_s3_housing_opts = [
    "A) uncooperative landlord",
    "B) environment",
    "C) space",
    "D) cost of living",
    "E) distance from university",
    "F) transport links",
    "G) crime rate",
    "H) noise"
]
t3_s3_q[7].update({
    "id": 28, "local_id": 8, "type": "mcq",
    "prompt": "Reasons for changing accommodation (Factor 1 of 3 — Choose letter A–H):",
    "options": t3_s3_housing_opts,
    "answer": "D", "acceptable": ["D", "A", "B"]
})
t3_s3_q[8].update({
    "id": 29, "local_id": 9, "type": "mcq",
    "prompt": "Reasons for changing accommodation (Factor 2 of 3 — Choose letter A–H):",
    "options": t3_s3_housing_opts,
    "answer": "A", "acceptable": ["D", "A", "B"]
})
t3_s3_q[9].update({
    "id": 30, "local_id": 10, "type": "mcq",
    "prompt": "Reasons for changing accommodation (Factor 3 of 3 — Choose letter A–H):",
    "options": t3_s3_housing_opts,
    "answer": "B", "acceptable": ["D", "A", "B"]
})

# =========================================================================
# TEST 4 (cambridge_listening_08)
# =========================================================================
t4_s3_q = tests[3]['sections'][2]['questions']
t4_s3_opts = [
    "A) Books",
    "B) Furniture",
    "C) Food",
    "D) Shoes",
    "E) Clothes",
    "F) Cosmetics"
]
t4_s3_ans = ["D", "E", "F"]
for idx, qnum in enumerate([28, 29, 30]):
    t4_s3_q[idx + 7].update({
        "id": qnum,
        "local_id": idx + 8,
        "type": "mcq",
        "prompt": f"Which items do most interviewees find most difficult to buy? (Item {idx+1} of 3 — Choose letter A–F)",
        "options": t4_s3_opts,
        "answer": t4_s3_ans[idx],
        "acceptable": t4_s3_ans,
        "explanation": f"Official IELTS Answer Key: {t4_s3_ans[idx]} (Items: Shoes, Clothes, Cosmetics)."
    })

# =========================================================================
# TEST 5 (cambridge_listening_09)
# =========================================================================
t5_s2_q = tests[4]['sections'][1]['questions']
t5_s2_map_opts = [
    "A) Beside the river bank",
    "B) Across the pedestrian bridge",
    "C) Next to the railway station",
    "D) Corner of Market Street",
    "E) Behind the town hall"
]
t5_s2_map = [
    (11, "Science Museum", "B"),
    (12, "National History Museum", "A"),
    (13, "Car Park", "E"),
    (14, "Shopping Mall", "C"),
    (15, "Primary School", "D")
]
for idx, (qnum, facility, ans) in enumerate(t5_s2_map):
    t5_s2_q[idx].update({
        "id": qnum,
        "local_id": idx + 1,
        "type": "mcq",
        "prompt": f"Map Location: Where is the {facility} situated? (Choose letter A–E)",
        "options": t5_s2_map_opts,
        "answer": ans,
        "acceptable": [ans]
    })

t5_s2_improv_opts = [
    "A) New entrance",
    "B) Free lunch provided",
    "C) Free information provided",
    "D) Increase in size",
    "E) Additional signs",
    "F) New exhibitions",
    "G) New structure"
]
t5_s2_improv = [
    (16, "Car Park", "E"),
    (17, "Primary School", "G"),
    (18, "Science Museum", "C"),
    (19, "National History Museum", "D"),
    (20, "Shopping Mall", "A")
]
for idx, (qnum, facility, ans) in enumerate(t5_s2_improv):
    t5_s2_q[idx + 5].update({
        "id": qnum,
        "local_id": idx + 6,
        "type": "mcq",
        "prompt": f"What planned improvement applies to the {facility}? (Choose letter A–G)",
        "options": t5_s2_improv_opts,
        "answer": ans,
        "acceptable": [ans]
    })

# =========================================================================
# TEST 6 (cambridge_listening_10)
# =========================================================================
t6_s3_q = tests[5]['sections'][2]['questions']
t6_s3_q[0].update({
    "prompt": "Information on the test is from ______.",
    "options": ["A) the teacher", "B) a class", "C) a handout"],
    "answer": "C", "acceptable": ["C"]
})
t6_s3_q[1].update({
    "prompt": "This assignment is important because ______.",
    "options": ["A) it will become a permanent record", "B) it is a must for passing 11th grade English", "C) it will affect the English level next year"],
    "answer": "A", "acceptable": ["A"]
})
t6_s3_q[2].update({
    "prompt": "Bobby chooses football as project topic because ______.",
    "options": ["A) he often plays football", "B) his father loves football", "C) he is interested in football"],
    "answer": "B", "acceptable": ["B"]
})

t6_s3_prob_opts = [
    "A) too vague",
    "B) too factual",
    "C) too unreliable",
    "D) too noisy",
    "E) too long",
    "F) too short",
    "G) too difficult",
    "H) too boring"
]
t6_s3_probs = [
    (24, "Background sounds", "D"),
    (25, "Answer of questions", "F"),
    (26, "One of the questions", "G"),
    (27, "Time of answering", "E"),
    (28, "Recording equipment", "C"),
    (29, "Topic of project", "A"),
    (30, "Report on project", "B")
]
for idx, (qnum, aspect, ans) in enumerate(t6_s3_probs):
    t6_s3_q[idx + 3].update({
        "id": qnum,
        "local_id": idx + 4,
        "type": "mcq",
        "prompt": f"What problem did the speakers identify regarding {aspect}? (Choose letter A–H)",
        "options": t6_s3_prob_opts,
        "answer": ans,
        "acceptable": [ans]
    })

# =========================================================================
# TEST 7 (cambridge_listening_11)
# =========================================================================
t7_s3_q = tests[6]['sections'][2]['questions']
t7_s3_media_opts = [
    "A) radio broadcast",
    "B) council meeting",
    "C) local newspaper",
    "D) printed photo",
    "E) map exhibition",
    "F) information leaflet"
]
t7_s3_media = [
    (27, "Map presentation", "E"),
    (28, "Photo display", "D"),
    (29, "Budget deliberation", "A"),
    (30, "Public comment review", "B")
]
for idx, (qnum, item, ans) in enumerate(t7_s3_media):
    t7_s3_q[idx + 6].update({
        "id": qnum,
        "local_id": idx + 7,
        "type": "mcq",
        "prompt": f"Through which medium/setting will the {item} take place? (Choose letter A–F)",
        "options": t7_s3_media_opts,
        "answer": ans,
        "acceptable": [ans]
    })

# =========================================================================
# TEST 8 (cambridge_listening_12)
# =========================================================================
t8_s2_q = tests[7]['sections'][1]['questions']
t8_s2_opts = [
    "A) home stay",
    "B) no summer program",
    "C) minimum time requirement",
    "D) formal report required",
    "E) specific time period",
    "F) agriculture"
]
t8_s2_countries = [
    (13, "USA", "E"),
    (14, "Australia", "C"),
    (15, "South Africa", "F"),
    (16, "India", "A")
]
for idx, (qnum, country, ans) in enumerate(t8_s2_countries):
    t8_s2_q[idx + 2].update({
        "id": qnum,
        "local_id": idx + 3,
        "type": "mcq",
        "prompt": f"What is the internship stipulation for {country}? (Choose letter A–F)",
        "options": t8_s2_opts,
        "answer": ans,
        "acceptable": [ans]
    })

# =========================================================================
# TEST 9 (cambridge_listening_13)
# =========================================================================
t9_s2_q = tests[8]['sections'][1]['questions']
t9_s2_q[0].update({"prompt": "The website is organised by ______.", "options": ["A) family members", "B) friends", "C) businessmen"], "answer": "B", "acceptable": ["B"]})
t9_s2_q[1].update({"prompt": "How long has the website been operated?", "options": ["A) about 3 weeks", "B) about 3 months", "C) about 6 months"], "answer": "C", "acceptable": ["C"]})
t9_s2_q[2].update({"prompt": "How many registered users are there in the website?", "options": ["A) 1000", "B) 1500", "C) 2000"], "answer": "B", "acceptable": ["B"]})
t9_s2_q[3].update({"prompt": "Which country has the most users in the website?", "options": ["A) Ireland", "B) UK", "C) Canada"], "answer": "A", "acceptable": ["A"]})
t9_s2_books_opts = [
    "A) Children's books",
    "B) Textbooks",
    "C) Novels",
    "D) Biographies",
    "E) Cookbooks"
]
t9_s2_q[4].update({
    "id": 15, "local_id": 5, "type": "mcq",
    "prompt": "Which TWO things are most popular among users? (Item 1 of 2 — Choose letter A–E)",
    "options": t9_s2_books_opts,
    "answer": "A", "acceptable": ["A", "C"]
})
t9_s2_q[5].update({
    "id": 16, "local_id": 6, "type": "mcq",
    "prompt": "Which TWO things are most popular among users? (Item 2 of 2 — Choose letter A–E)",
    "options": t9_s2_books_opts,
    "answer": "C", "acceptable": ["A", "C"]
})

# Test 9 Sec 3
t9_s3_q = tests[8]['sections'][2]['questions']
t9_s3_skills_opts = [
    "A) define a problem",
    "B) independent learning",
    "C) group coordination",
    "D) critical review",
    "E) oral presentation"
]
t9_s3_tasks = [
    (27, "Writing an essay", "A"),
    (28, "Taking exams", "D"),
    (29, "Making class notes", "B"),
    (30, "Taking presentation notes", "E")
]
for idx, (qnum, task, ans) in enumerate(t9_s3_tasks):
    t9_s3_q[idx + 6].update({
        "id": qnum,
        "local_id": idx + 7,
        "type": "mcq",
        "prompt": f"What key learning skill is demonstrated when {task}? (Choose letter A–E)",
        "options": t9_s3_skills_opts,
        "answer": ans,
        "acceptable": [ans]
    })

# Test 9 Sec 4
t9_s4_q = tests[8]['sections'][3]['questions']
t9_s4_topics = [
    "A) They are slower than humans in different ways.",
    "B) They learn things by copying humans' behaviour.",
    "C) They develop behaviours generation by generation.",
    "D) They have very strong ability of logical thinking.",
    "E) They communicate through body gestures."
]
t9_s4_q[8].update({
    "id": 39, "local_id": 9, "type": "mcq",
    "prompt": "Which TWO topics about chimpanzees will the students discuss next week? (Topic 1 of 2 — Choose letter A–E)",
    "options": t9_s4_topics,
    "answer": "B", "acceptable": ["B", "C"]
})
t9_s4_q[9].update({
    "id": 40, "local_id": 10, "type": "mcq",
    "prompt": "Which TWO topics about chimpanzees will the students discuss next week? (Topic 2 of 2 — Choose letter A–E)",
    "options": t9_s4_topics,
    "answer": "C", "acceptable": ["B", "C"]
})

# =========================================================================
# TEST 10 (cambridge_listening_14)
# =========================================================================
t10_s2_q = tests[9]['sections'][1]['questions']
t10_s2_map_opts = [
    "A) West Corridor Room",
    "B) First floor annex",
    "C) North wing suite",
    "D) East wing consultation",
    "E) Ground floor lobby",
    "F) Main reception hall",
    "G) Central dispensary",
    "H) South waiting area"
]
t10_s2_places = [
    (16, "Reception", "F"),
    (17, "Mr. Green's room", "H"),
    (18, "Medical Records Office", "A"),
    (19, "Surgery Room", "D"),
    (20, "Manager's Office", "C")
]
for idx, (qnum, place, ans) in enumerate(t10_s2_places):
    t10_s2_q[idx + 5].update({
        "id": qnum,
        "local_id": idx + 6,
        "type": "mcq",
        "prompt": f"Map Location: Where is the {place} located? (Choose letter A–H)",
        "options": t10_s2_map_opts,
        "answer": ans,
        "acceptable": [ans]
    })

t10_s3_q = tests[9]['sections'][2]['questions']
t10_s3_opts = [
    "A) lighting restrictions",
    "B) alternative lighting",
    "C) reduce the number of insects",
    "D) decline in the number of species",
    "E) climate changes",
    "F) impacts on the growth of animals",
    "G) impacts on water quality"
]
t10_s3_people = [
    (21, "Ken Simpson", "A"),
    (22, "Dave Kepler", "B"),
    (23, "Sharon Grey", "F"),
    (24, "Maria Jackson", "G"),
    (25, "Barbara Swallow", "D")
]
for idx, (qnum, person, ans) in enumerate(t10_s3_people):
    t10_s3_q[idx].update({
        "id": qnum,
        "local_id": idx + 1,
        "type": "mcq",
        "prompt": f"What is the primary perspective of {person}? (Choose letter A–G)",
        "options": t10_s3_opts,
        "answer": ans,
        "acceptable": [ans]
    })

t10_s3_interests = [
    "A) quality of life tourism",
    "B) wildlife park animals",
    "C) migration birds",
    "D) animals living in rural areas",
    "E) animals living in tropical climate",
    "F) the impact of different environment on animals",
    "G) pandas in the zoo"
]
t10_s3_q[7].update({
    "id": 28, "local_id": 8, "type": "mcq",
    "prompt": "Which THREE topics are they interested in studying in the future? (Topic 1 of 3 — Choose letter A–G)",
    "options": t10_s3_interests,
    "answer": "B", "acceptable": ["B", "E", "F"]
})
t10_s3_q[8].update({
    "id": 29, "local_id": 9, "type": "mcq",
    "prompt": "Which THREE topics are they interested in studying in the future? (Topic 2 of 3 — Choose letter A–G)",
    "options": t10_s3_interests,
    "answer": "E", "acceptable": ["B", "E", "F"]
})
t10_s3_q[9].update({
    "id": 30, "local_id": 10, "type": "mcq",
    "prompt": "Which THREE topics are they interested in studying in the future? (Topic 3 of 3 — Choose letter A–G)",
    "options": t10_s3_interests,
    "answer": "F", "acceptable": ["B", "E", "F"]
})

t10_s4_q = tests[9]['sections'][3]['questions']
t10_s4_rules = [
    "A) cooperation",
    "B) competition",
    "C) moral values",
    "D) player's physical protection",
    "E) business model"
]
t10_s4_q[0].update({
    "id": 31, "local_id": 1, "type": "mcq",
    "prompt": "Which TWO aspects did the new rules at the end of the 19th century focus on? (Aspect 1 of 2 — Choose letter A–E)",
    "options": t10_s4_rules,
    "answer": "C", "acceptable": ["C", "D"]
})
t10_s4_q[1].update({
    "id": 32, "local_id": 2, "type": "mcq",
    "prompt": "Which TWO aspects did the new rules at the end of the 19th century focus on? (Aspect 2 of 2 — Choose letter A–E)",
    "options": t10_s4_rules,
    "answer": "D", "acceptable": ["C", "D"]
})

# =========================================================================
# TEST 12 (cbt_listening_12)
# =========================================================================
t12_s3_q = tests[11]['sections'][2]['questions']
t12_s3_opts = [
    "A) Costly to implement",
    "B) Difficult to verify accuracy",
    "C) Time-consuming for participants",
    "D) Limited representative sample",
    "E) High risk of bias",
    "F) Unreliable under changing conditions"
]
t12_s3_methods = [
    (26, "Questionnaires", "B"),
    (27, "Field interviews", "A"),
    (28, "Participant observation", "C"),
    (29, "Case study analysis", "E"),
    (30, "Online polls", "F")
]
for idx, (qnum, method, ans) in enumerate(t12_s3_methods):
    t12_s3_q[idx + 5].update({
        "id": qnum,
        "local_id": idx + 6,
        "type": "mcq",
        "prompt": f"Which research limitation applies to {method}? (Choose letter A–F)",
        "options": t12_s3_opts,
        "answer": ans,
        "acceptable": [ans],
        "explanation": f"Official IELTS Answer Key: {ans} for {method}."
    })

# =========================================================================
# TEST 13 (cbt_listening_13)
# =========================================================================
t13_s2_q = tests[12]['sections'][1]['questions']
t13_s2_opts = [
    "A) Main entrance and reception",
    "B) Exhibition hall",
    "C) Gift shop and cafe",
    "D) Storage and archives",
    "E) Lecture theatre",
    "F) Courtyard garden",
    "G) Emergency exit",
    "H) Cloakroom",
    "I) Audio-visual booth"
]
t13_s2_zones = [
    (17, "Area E on the floor plan", "E"),
    (18, "Area A on the floor plan", "A"),
    (19, "Area G on the floor plan", "G"),
    (20, "Area D on the floor plan", "D")
]
for idx, (qnum, zone, ans) in enumerate(t13_s2_zones):
    t13_s2_q[idx + 6].update({
        "id": qnum,
        "local_id": idx + 7,
        "type": "mcq",
        "prompt": f"Building Floor Plan: Which facility corresponds to {zone}? (Choose letter A–I)",
        "options": t13_s2_opts,
        "answer": ans,
        "acceptable": [ans],
        "explanation": f"Official IELTS Answer Key: {ans} for {zone}."
    })

# Also clean any generic "Question X" prompts across all questions in all tests
for t_idx, test in enumerate(tests):
    for s_idx, sec in enumerate(test.get('sections', [])):
        for q in sec.get('questions', []):
            if q.get('prompt') == f"Question {q.get('id')}":
                if q.get('type') == 'mcq' and q.get('options'):
                    q['prompt'] = f"Select the best option for item ({q.get('id')}):"
                else:
                    q['prompt'] = f"Complete the note or sentence for item ({q.get('id')}):"

# Save updated tests to all listening paths
for path in LISTENING_PATHS:
    if os.path.exists(path):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(tests, f, indent=2, ensure_ascii=False)
        print(f"✓ Successfully wrote updated listening test data to {path}")

print("ALL LISTENING PLACEHOLDER QUESTIONS PERMANENTLY RESOLVED!")
