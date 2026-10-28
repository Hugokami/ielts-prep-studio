with open("backend/worker.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'const voucherCode = isSprint ? generateSecureVoucherCode("SPRINT")' in l:
        print(f"Found at line {i+1}")
        # check next lines
        if 'const expiresAt =' in lines[i+2]:
            print(f"Removing line {i+3}: {lines[i+2]}")
            del lines[i+2]
            break

with open("backend/worker.js", "w", encoding="utf-8") as f:
    f.writelines(lines)
print("Updated successfully")
