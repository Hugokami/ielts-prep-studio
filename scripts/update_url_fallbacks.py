import shutil
import hashlib

index_path = r'C:\Users\lyan1\Documents\antigravity\ielts-prep-studio\index.html'
academic_path = r'C:\Users\lyan1\Documents\antigravity\ielts-prep-studio\ielts_prep_studio_open_academic_edition.html'

with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """window.openTmaInBrowser = function(url) {
  const target = url || "https://hugokami.github.io/ielts-prep-studio/";"""

replacement1 = """window.openTmaInBrowser = function(url) {
  const currentOrigin = (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin !== "null" && window.location.protocol.startsWith("http")) ? (window.location.origin + window.location.pathname) : "https://hugokami.github.io/ielts-prep-studio/";
  const target = url || currentOrigin;"""

target2 = """function openStudioInExternalBrowser(targetTab = 'aichat') {
  let base = 'https://hugokami.github.io/ielts-prep-studio/';"""

replacement2 = """function openStudioInExternalBrowser(targetTab = 'aichat') {
  let base = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null' && window.location.protocol.startsWith('http')) ? (window.location.origin + window.location.pathname) : 'https://hugokami.github.io/ielts-prep-studio/';"""

assert target1 in content, "target1 not found in index.html"
assert target2 in content, "target2 not found in index.html"

new_content = content.replace(target1, replacement1, 1).replace(target2, replacement2, 1)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

shutil.copyfile(index_path, academic_path)

def hash_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

h1 = hash_file(index_path)
h2 = hash_file(academic_path)
print(f"index.html:     {h1}")
print(f"academic.html:   {h2}")
assert h1 == h2, "Hash mismatch!"
print("SUCCESS: 100% byte parity preserved!")
