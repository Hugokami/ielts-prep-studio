import urllib.request, urllib.error, json, sys

if sys.platform == "win32":
    try: sys.stdout.reconfigure(encoding="utf-8")
    except: pass

BASE_URL = 'https://ielts-prep-studio-backend.lyan123-lh.workers.dev'

endpoints = [
    ('/api/health', 'GET', None),
    ('/api/tools/collocations?word=sustainable', 'GET', None),
    ('/api/tools/synonyms?word=crucial', 'GET', None),
    ('/api/tools/topic?topic=environment', 'GET', None),
    ('/api/tools/dict?word=paradigm', 'GET', None),
    ('/api/tools/quote', 'GET', None),
    ('/api/tools/quota', 'GET', None),
    ('/api/tools/podcast?channel=ielts', 'GET', None),
    ('/api/tools/podcast?channel=bbc6', 'GET', None),
    ('/api/tools/podcast?channel=energy', 'GET', None),
    ('/api/tools/podcast?channel=we_speak', 'GET', None),
]

for path, method, data in endpoints:
    url = BASE_URL + path
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read().decode('utf-8')
            parsed = json.loads(raw)
            print(f"[200 OK] {path[:40]:40} -> Keys: {list(parsed.keys())}")
    except Exception as e:
        print(f"[FAIL]   {path[:40]:40} -> Error: {e}")
