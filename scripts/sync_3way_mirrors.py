import sys, shutil, hashlib

if sys.platform == "win32":
    try: sys.stdout.reconfigure(encoding="utf-8")
    except: pass

files = [
    r'C:\Users\lyan1\Documents\antigravity\ielts-prep-studio\index.html',
    r'C:\Users\lyan1\Documents\antigravity\ielts-prep-studio\ielts_prep_studio_open_academic_edition.html',
    r'C:\Users\lyan1\Downloads\ielts_prep_studio_open_academic_edition.html'
]

# Sync primary to mirror 2 and mirror 3
shutil.copyfile(files[0], files[1])
shutil.copyfile(files[0], files[2])

hashes = []
sizes = []
for f in files:
    with open(f, 'rb') as fp:
        b = fp.read()
        hashes.append(hashlib.sha256(b).hexdigest())
        sizes.append(len(b))

print("=== 3-WAY MIRROR PARITY CHECK ===")
for i, f in enumerate(files):
    print(f"[{i+1}] {f}")
    print(f"    Size: {sizes[i]} bytes | SHA256: {hashes[i]}")

if hashes[0] == hashes[1] == hashes[2]:
    print("\n✓ 100% 3-WAY SHA256 PARITY CONFIRMED ACROSS ALL MIRRORS!")
else:
    print("\n✗ Parity mismatch detected!")
    sys.exit(1)
