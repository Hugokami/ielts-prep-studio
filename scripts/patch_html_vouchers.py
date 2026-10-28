import sys
import shutil
import hashlib

sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Patch StorageManager error handling in redeemVoucherCode
target1 = """  // 1. Try TMA / Cloudflare Serverless redemption first if in Telegram
  if (window.StorageManager && typeof window.StorageManager.redeemActivationCode === "function") {
\tif (fb) fb.innerHTML = `<span style="color:var(--accent); font-weight:600;"> Verifying code with server...</span>`;
    try {
      const res = await window.StorageManager.redeemActivationCode(code);
      if (res && res.success) {
        const isSprint = (res.plan === "sprint" || code.includes("SPRINT"));
        activateVipPass(isSprint ? "sprint" : "lifetime", code, true);
        if (fb) fb.innerHTML = `<span style="color:var(--green); font-weight:700;">✅ Valid Code! ${isSprint ? "7-Day Sprint Pass" : "Lifetime VIP Pass"} Unlocked.</span>`;
        return true;
      }
    } catch (e) {}
  }"""

replace1 = """  // 1. Try Cloudflare Serverless redemption (Primary Authority for One-Time Codes)
  if (window.StorageManager && typeof window.StorageManager.redeemActivationCode === "function") {
    if (fb) fb.innerHTML = `<span style="color:var(--accent); font-weight:600;"> Verifying code with server...</span>`;
    try {
      const res = await window.StorageManager.redeemActivationCode(code);
      if (res && res.success) {
        const isSprint = (res.plan === "sprint" || code.includes("SPRINT"));
        activateVipPass(isSprint ? "sprint" : "lifetime", code, true);
        if (fb) fb.innerHTML = `<span style="color:var(--green); font-weight:700;">✅ Valid Code! ${isSprint ? "7-Day Sprint Pass" : "Lifetime VIP Pass"} Unlocked.</span>`;
        return true;
      } else if (res && res.error) {
        if (fb) fb.innerHTML = `<span style="color:var(--crimson); font-weight:700;">❌ ${escapeHtml(res.error)}</span>`;
        return false;
      }
    } catch (e) {
      console.warn("[Voucher Server Verification Notice]", e);
    }
  }"""

# 2. Patch Step 3 to remove client-side algorithmic mock bypass
target2 = """  // 3. Verified Whitelist Code or Cryptographic Random Checksum Pass
  const found = VALID_VOUCHER_CODES[code];
  const isAlgorithmicValid = (typeof verifyVoucherChecksum === 'function') ? verifyVoucherChecksum(code) : false;

  if (found || isAlgorithmicValid) {
    const planType = (found && found.plan) || (code.includes("SPRINT") ? "sprint" : "lifetime");
    const passName = (found && found.name) || (planType === "sprint" ? "7-Day Sprint Pass" : "Lifetime Studio Pass");
    activateVipPass(planType, code, true);
\tif (fb) fb.innerHTML = `<span style="color:var(--green); font-weight:700;"> Valid Code! ${passName} applied to your account.</span>`;
    return true;
  } else {"""

replace2 = """  // 3. Verified Pre-Minted Batch Whitelist Pass (Legacy Fallback)
  const found = VALID_VOUCHER_CODES[code];

  if (found) {
    const planType = found.plan || (code.includes("SPRINT") ? "sprint" : "lifetime");
    const passName = found.name || (planType === "sprint" ? "7-Day Sprint Pass" : "Lifetime Studio Pass");
    activateVipPass(planType, code, true);
    if (fb) fb.innerHTML = `<span style="color:var(--green); font-weight:700;">✅ Valid Code! ${passName} applied to your account.</span>`;
    return true;
  } else {"""

# 3. Patch verifyVoucherChecksum to remove dummy VIP 4-char bypass
target3 = """  if (parts.length === 3 && parts[0] === 'VIP') {
    return parts[1].length === 4 && parts[2].length === 4;
  }
  return false;"""

replace3 = """  return false;"""

target1_crlf = target1.replace("\n", "\r\n")
replace1_crlf = replace1.replace("\n", "\r\n")
target2_crlf = target2.replace("\n", "\r\n")
replace2_crlf = replace2.replace("\n", "\r\n")
target3_crlf = target3.replace("\n", "\r\n")
replace3_crlf = replace3.replace("\n", "\r\n")

if target1_crlf in content:
    content = content.replace(target1_crlf, replace1_crlf)
    print("Patched target 1 (CRLF)")
elif target1 in content:
    content = content.replace(target1, replace1)
    print("Patched target 1 (LF)")
else:
    print("FAILED target 1")

if target2_crlf in content:
    content = content.replace(target2_crlf, replace2_crlf)
    print("Patched target 2 (CRLF)")
elif target2 in content:
    content = content.replace(target2, replace2)
    print("Patched target 2 (LF)")
else:
    print("FAILED target 2")

if target3_crlf in content:
    content = content.replace(target3_crlf, replace3_crlf)
    print("Patched target 3 (CRLF)")
elif target3 in content:
    content = content.replace(target3, replace3)
    print("Patched target 3 (LF)")
else:
    print("FAILED target 3")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)

# Mirror to academic edition and Downloads
with open("ielts_prep_studio_open_academic_edition.html", "w", encoding="utf-8") as f:
    f.write(content)

downloads_path = r"C:\Users\lyan1\Downloads\ielts_prep_studio_open_academic_edition.html"
with open(downloads_path, "w", encoding="utf-8") as f:
    f.write(content)

# Verify hashes
h1 = hashlib.sha256(open("index.html", "rb").read()).hexdigest()
h2 = hashlib.sha256(open("ielts_prep_studio_open_academic_edition.html", "rb").read()).hexdigest()
h3 = hashlib.sha256(open(downloads_path, "rb").read()).hexdigest()

print(f"index.html: {h1}")
print(f"open_academic: {h2}")
print(f"downloads: {h3}")
if h1 == h2 == h3:
    print("ALL 3 MIRRORS HAVE 100% SHA-256 PARITY!")
else:
    print("HASH MISMATCH!")
