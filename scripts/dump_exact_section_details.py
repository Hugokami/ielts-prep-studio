import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

for enc in ['utf-16', 'utf-8', 'latin-1']:
    try:
        with open('scripts/all_pages_text.txt', 'r', encoding=enc) as f:
            raw_text = f.read()
        break
    except Exception:
        continue

def get_section(name):
    target = f"==================== TEST {name} ===================="
    idx = raw_text.find(target)
    if idx == -1: return ""
    end_idx = raw_text.find("==================== TEST ", idx + len(target))
    if end_idx == -1: end_idx = len(raw_text)
    return raw_text[idx:end_idx]

for sec_name in ['5.1', '5.3', '6.2', '7.3', '8.3', '9.2', '10.3', '11.3', '12.2', '13.2', '13.3', '13.4', '14.2', '14.3', '14.4']:
    sec_content = get_section(sec_name)
    print(f"\n==================== FULL TEXT FOR {sec_name} ====================")
    # Print lines that contain question options or boxes
    print(sec_content[:3000])
