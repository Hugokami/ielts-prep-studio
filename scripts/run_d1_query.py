import subprocess, json, sys

query = sys.argv[1] if len(sys.argv) > 1 else "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%';"

cmd = [
    "npx.cmd", "wrangler", "d1", "execute", "ielts-prep-db",
    "--remote", "--json",
    f"--command={query}"
]

res = subprocess.run(cmd, cwd=r"c:\Users\lyan1\Documents\antigravity\ielts-prep-studio\backend", capture_output=True, text=True, encoding="utf-8")
if res.returncode != 0:
    print("STDERR:", res.stderr)
    print("STDOUT:", res.stdout)
else:
    data = json.loads(res.stdout)
    results = data[0].get("results", [])
    for r in results:
        print(f"=== {r.get('name')} ===")
        print(r.get("sql"))
        print()
