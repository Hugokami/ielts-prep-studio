import hashlib
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
for i, l in enumerate(lines):
    if 'async function redeemVoucherCode(explicitCode) {' in l:
        start_idx = i
    if start_idx != -1 and 'if (fb) fb.innerHTML = `<span style="color:var(--crimson); font-weight:600;">Invalid voucher code.' in l:
        end_idx = i + 2
        break

print(f"redeemVoucherCode from line {start_idx+1} to {end_idx+1}")

nl = '\n'
new_function = [
    f'async function redeemVoucherCode(explicitCode) {{{nl}',
    f'  const inp = document.getElementById("vipVoucherInput");{nl}',
    f'  const rawCode = explicitCode || (inp ? inp.value : "");{nl}',
    f'  const code = (rawCode || "").trim().toUpperCase().replace(/[^A-Z0-9\\-]/g, "");{nl}',
    f'  if (inp && !explicitCode) inp.value = code;{nl}',
    f'  const fb = document.getElementById("vipVoucherFeedback");{nl}',
    f'{nl}',
    f'  if (!code) {{{nl}',
    f'    if (fb) fb.innerHTML = `<span style="color:var(--crimson); font-weight:600;">Please enter a voucher or access code.</span>`;{nl}',
    f'    return false;{nl}',
    f'  }}{nl}',
    f'{nl}',
    f'  // 1. Primary Authority: Cloudflare Serverless D1/KV Voucher Redemption{nl}',
    f'  if (window.StorageManager && typeof window.StorageManager.redeemActivationCode === "function") {{{nl}',
    f'    if (fb) fb.innerHTML = `<span style="color:var(--accent); font-weight:600;">Verifying code with server...</span>`;{nl}',
    f'    try {{{nl}',
    f'      const res = await window.StorageManager.redeemActivationCode(code);{nl}',
    f'      if (res && res.success) {{{nl}',
    f'        const isSprint = (res.plan === "sprint" || code.includes("SPRINT"));{nl}',
    f'        activateVipPass(isSprint ? "sprint" : "lifetime", code, true);{nl}',
    f'        if (fb) fb.innerHTML = `<span style="color:var(--green); font-weight:700;">✅ Valid Code! ${{isSprint ? "7-Day Sprint Pass" : "Lifetime VIP Pass"}} Unlocked.</span>`;{nl}',
    f'        return true;{nl}',
    f'      }} else if (res && res.error) {{{nl}',
    f'        if (fb) fb.innerHTML = `<span style="color:var(--crimson); font-weight:700;">❌ ${{escapeHtml(res.error)}}</span>`;{nl}',
    f'        return false;{nl}',
    f'      }}{nl}',
    f'    }} catch (e) {{{nl}',
    f'      console.warn("[Voucher Server Verification Notice]", e);{nl}',
    f'    }}{nl}',
    f'  }}{nl}',
    f'{nl}',
    f'  // 2. Cloud-backed One-Time Voucher Verification (Firestore) if authenticated{nl}',
    f'  if (window.firebaseDbInstance && window.currentUser) {{{nl}',
    f'    if (fb) fb.innerHTML = `<span style="color:var(--accent); font-weight:600;">Verifying voucher with cloud registry...</span>`;{nl}',
    f'    try {{{nl}',
    f'      const vRef = window.firebaseDbInstance.collection("vouchers").doc(code);{nl}',
    f'      const vDoc = await vRef.get();{nl}',
    f'      if (vDoc.exists) {{{nl}',
    f'        const vData = vDoc.data();{nl}',
    f'        if (vData.isOneTime && vData.redeemed) {{{nl}',
    f'          if (vData.redeemedBy === window.currentUser.uid) {{{nl}',
    f'            if (fb) fb.innerHTML = `<span style="color:var(--accent); font-weight:600;">You have already redeemed this voucher on this account.</span>`;{nl}',
    f'            activateVipPass(vData.plan || "lifetime", code, true);{nl}',
    f'            return true;{nl}',
    f'          }} else {{{nl}',
    f'            if (fb) fb.innerHTML = `<span style="color:var(--crimson); font-weight:700;">❌ This one-time voucher has already been redeemed by another user.</span>`;{nl}',
    f'            return false;{nl}',
    f'          }}{nl}',
    f'        }}{nl}',
    f'        if (vData.isOneTime) {{{nl}',
    f'          await vRef.update({{{nl}',
    f'            redeemed: true,{nl}',
    f'            redeemedBy: window.currentUser.uid,{nl}',
    f'            redeemedByEmail: window.currentUser.email || "user",{nl}',
    f'            redeemedAt: firebase.firestore.FieldValue.serverTimestamp(){nl}',
    f'          }});{nl}',
    f'        }}{nl}',
    f'        activateVipPass(vData.plan || "lifetime", code, true);{nl}',
    f'        if (fb) fb.innerHTML = `<span style="color:var(--green); font-weight:700;">✅ Valid Code! ${{vData.name || "Lifetime Studio Pass"}} activated.</span>`;{nl}',
    f'        return true;{nl}',
    f'      }}{nl}',
    f'    }} catch (err) {{{nl}',
    f'      console.warn("[Cloud Voucher Verification Notice]", err);{nl}',
    f'    }}{nl}',
    f'  }}{nl}',
    f'{nl}',
    f'  // 3. Fallback check ONLY for legacy pre-minted batch whitelist (IPS-VIP-101 to 150){nl}',
    f'  const found = VALID_VOUCHER_CODES[code];{nl}',
    f'  if (found) {{{nl}',
    f'    const planType = found.plan || (code.includes("SPRINT") ? "sprint" : "lifetime");{nl}',
    f'    const passName = found.name || (planType === "sprint" ? "7-Day Sprint Pass" : "Lifetime Studio Pass");{nl}',
    f'    activateVipPass(planType, code, true);{nl}',
    f'    if (fb) fb.innerHTML = `<span style="color:var(--green); font-weight:700;">✅ Valid Code! ${{passName}} applied to your account.</span>`;{nl}',
    f'    return true;{nl}',
    f'  }}{nl}',
    f'{nl}',
    f'  if (fb) fb.innerHTML = `<span style="color:var(--crimson); font-weight:600;">Invalid voucher code. Please check your transaction slip or contact @hyuguo.</span>`;{nl}',
    f'  return false;{nl}',
    f'}}{nl}'
]

lines[start_idx:end_idx+1] = new_function

with open("index.html", "w", encoding="utf-8") as f:
    f.writelines(lines)

with open("ielts_prep_studio_open_academic_edition.html", "w", encoding="utf-8") as f:
    f.writelines(lines)

downloads_path = r"C:\Users\lyan1\Downloads\ielts_prep_studio_open_academic_edition.html"
with open(downloads_path, "w", encoding="utf-8") as f:
    f.writelines(lines)

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
