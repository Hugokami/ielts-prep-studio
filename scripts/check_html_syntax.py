#!/usr/bin/env python3
"""
Pre-commit syntax validation for monolithic HTML files with inline <script> tags.
Extracts each <script> block and verifies it via `node -c`.
Exits with code 0 on success, code 1 on any syntax error.
"""
import os, sys, re, subprocess

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except:
        pass

files_to_check = ['index.html', 'ielts_prep_studio_open_academic_edition.html']
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

total_errors = 0

for rel_path in files_to_check:
    full_path = os.path.join(root_dir, rel_path)
    if not os.path.exists(full_path):
        continue

    with open(full_path, 'r', encoding='utf-8') as f:
        html = f.read()

    pattern = re.compile(r'<script(?:\s+[^>]*)?>(.*?)</script>', re.DOTALL | re.IGNORECASE)
    matches = pattern.findall(html)
    print(f"[{rel_path}] Validating {len(matches)} inline script blocks...")

    file_errors = 0
    for idx, code in enumerate(matches):
        if not code.strip():
            continue
        tmp_name = os.path.join(root_dir, f".tmp_syntax_{idx}.js")
        try:
            with open(tmp_name, 'w', encoding='utf-8') as tf:
                tf.write(code)
            res = subprocess.run(["node", "-c", tmp_name], capture_output=True, text=True)
            if res.returncode != 0:
                print(f"[ERROR] SYNTAX ERROR in {rel_path} script block #{idx}:")
                print(res.stderr.strip())
                file_errors += 1
        finally:
            if os.path.exists(tmp_name):
                try:
                    os.remove(tmp_name)
                except:
                    pass

    if file_errors == 0:
        print(f"[PASS] {rel_path}: All script blocks passed syntax check cleanly.")
    else:
        total_errors += file_errors

if total_errors > 0:
    print(f"\n[FAIL] Validation failed with {total_errors} syntax error(s).")
    sys.exit(1)
else:
    print("\n[OK] All HTML inline scripts validated successfully.")
    sys.exit(0)
