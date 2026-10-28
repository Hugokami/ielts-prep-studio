import urllib.request
import re
import sys
from bs4 import BeautifulSoup

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

test_sections = [
    (5, 1),
    (5, 3),
    (6, 2),
    (7, 3),
    (8, 3),
    (9, 2),
    (10, 3),
    (11, 3),
    (12, 2),
    (13, 2),
    (13, 3),
    (13, 4),
    (14, 2),
    (14, 3),
    (14, 4),
]

for t_num, s_num in test_sections:
    url = f"https://ielts-up.com/listening/ielts-listening-sample-{t_num}.{s_num}.html"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
        soup = BeautifulSoup(html, 'html.parser')
        # Extract main text
        print(f"\n==================== TEST {t_num}.{s_num} ====================")
        # Find all questions text
        body_text = soup.get_text()
        # Find where questions start
        m = re.search(r'Questions?\s+\d+.*', body_text, re.IGNORECASE)
        if m:
            print(body_text[m.start():m.start()+2500])
        else:
            print(body_text[:1500])
    except Exception as e:
        print(f"Failed {t_num}.{s_num}: {e}")
