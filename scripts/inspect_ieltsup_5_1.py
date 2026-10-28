import urllib.request
import sys
from bs4 import BeautifulSoup

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

url = "https://ielts-up.com/listening/ielts-listening-sample-5.1.html"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=15) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

idx = html.find("Questions 6-8")
if idx != -1:
    soup = BeautifulSoup(html[idx:idx+4000], 'html.parser')
    print(soup.get_text())
