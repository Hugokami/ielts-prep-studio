worker_path = r'C:\Users\lyan1\Documents\antigravity\ielts-prep-studio\backend\worker.js'

with open(worker_path, 'r', encoding='utf-8') as f:
    code = f.read()

count1 = code.count('https://hugokami.github.io/ielts-prep-studio/')
count2 = code.count('https://hugokami.github.io/ielts-prep-studio')

code = code.replace('https://hugokami.github.io/ielts-prep-studio/', 'https://ielts-prep-studio-olive.vercel.app/')
code = code.replace('https://hugokami.github.io/ielts-prep-studio', 'https://ielts-prep-studio-olive.vercel.app')

with open(worker_path, 'w', encoding='utf-8') as f:
    f.write(code)

print(f'Replaced {count1} slash occurrences and {count2 - count1} non-slash occurrences in backend/worker.js')
