import sys
import json
import urllib.request

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE = "https://ielts-prep-studio-backend.lyan123-lh.workers.dev"

def test_endpoint(path, name):
    url = f"{BASE}{path}"
    print(f"\n--- Testing {name}: {url} ---")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "IPS-Tester/1.0"})
        with urllib.request.urlopen(req, timeout=15) as res:
            data = json.loads(res.read().decode('utf-8'))
            print(f"Status: {res.status}")
            print(f"Success: {data.get('success', data.get('status'))}")
            if 'data' in data:
                d = data['data']
                print(f"Word: {d.get('word')}")
                print(f"POS: {d.get('pos')}")
                print(f"Burmese Meaning: {d.get('meaning_mm')}")
                if 'collocations' in d:
                    print(f"Verb-Noun Collocations: {d['collocations'].get('verb_noun')}")
                    print(f"Frame (Burmese): {d['collocations'].get('frame_mm')}")
                if 'definitions' in d:
                    print(f"Definitions: {d.get('definitions')}")
            else:
                print(f"Response: {data}")
    except Exception as e:
        print(f"❌ Error: {e}")

test_endpoint("/api/health", "Health")
test_endpoint("/api/tools/collocations?word=mistake", "Collocations for 'mistake'")
test_endpoint("/api/tools/collocations?word=important", "Collocations for 'important'")
test_endpoint("/api/tools/dict?word=mistake", "Dictionary for 'mistake'")
test_endpoint("/api/tools/dict?word=mitigate", "Dictionary for 'mitigate'")
