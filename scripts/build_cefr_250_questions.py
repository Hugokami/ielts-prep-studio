import os, sys, json
sys.stdout.reconfigure(encoding='utf-8')

# Ensure script dir in sys.path
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)

from batch1_data import BATCH_1
from batch2_data import BATCH_2
from batch3_data import BATCH_3
from batch4_data import BATCH_4
from batch5_data import BATCH_5

batches_meta = [
    ("batch_1", "Diagnostic Form Alpha (Standard Comprehensive)", BATCH_1),
    ("batch_2", "Diagnostic Form Beta (Advanced Grammar & Synonyms)", BATCH_2),
    ("batch_3", "Diagnostic Form Gamma (Academic Collocations & Inversions)", BATCH_3),
    ("batch_4", "Diagnostic Form Delta (Subjunctive & Syntactic Precision)", BATCH_4),
    ("batch_5", "Diagnostic Form Epsilon (Mastery Register & Nuance)", BATCH_5),
]

output_batches = []
total_questions = 0

for b_id, b_name, b_questions in batches_meta:
    print(f"Validating {b_name} ({len(b_questions)} questions)...")
    if len(b_questions) != 50:
        raise ValueError(f"{b_id} has {len(b_questions)} questions, expected 50!")

    counts = {"B1": 0, "B2": 0, "C1": 0, "C2": 0}
    seen_ids = set()

    for idx, q in enumerate(b_questions):
        q_id = q.get("id")
        if not q_id:
            raise ValueError(f"Question #{idx} in {b_id} missing 'id'")
        if q_id in seen_ids:
            raise ValueError(f"Duplicate question id '{q_id}' in {b_id}")
        seen_ids.add(q_id)

        lvl = q.get("level")
        if lvl not in counts:
            raise ValueError(f"Invalid level '{lvl}' in question {q_id}")
        counts[lvl] += 1

        options = q.get("options", [])
        if len(options) < 2:
            raise ValueError(f"Question {q_id} has fewer than 2 options")

        ans = q.get("answer")
        if ans not in options:
            raise ValueError(f"Question {q_id} answer '{ans}' not found in options: {options}")

        if not q.get("question") or not q.get("rationale") or not q.get("rationaleMm"):
            raise ValueError(f"Question {q_id} missing text or rationales")

    print(f"  Distribution: B1={counts['B1']} (req 10), B2={counts['B2']} (req 15), C1={counts['C1']} (req 15), C2={counts['C2']} (req 10)")
    if counts["B1"] != 10 or counts["B2"] != 15 or counts["C1"] != 15 or counts["C2"] != 10:
        raise ValueError(f"Distribution mismatch in {b_id}: {counts}")

    output_batches.append({
        "id": b_id,
        "name": b_name,
        "questions": b_questions
    })
    total_questions += len(b_questions)

master_payload = {
    "version": "2.0",
    "totalBatches": len(output_batches),
    "questionsPerBatch": 50,
    "totalQuestions": total_questions,
    "batches": output_batches
}

target_file = os.path.join(os.path.dirname(script_dir), "data", "cefr-diagnostic.json")
with open(target_file, "w", encoding="utf-8") as f:
    json.dump(master_payload, f, indent=2, ensure_ascii=False)

print(f"\n[SUCCESS] Wrote {total_questions} questions across {len(output_batches)} batches to {target_file}")
print(f"File size: {os.path.getsize(target_file) / 1024:.1f} KB")
