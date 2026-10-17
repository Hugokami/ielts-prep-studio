/**
 * IELTS Prep Studio - Unified Lifetime Voucher Minting & Distribution Utility
 *
 * Usage:
 *   node scripts/mint-vouchers.cjs [count] [startNumber] [prefix]
 *
 * Example:
 *   node scripts/mint-vouchers.cjs 20 101 IPS-VIP
 *
 * Generates:
 *   - Formatted Lifetime VIP Codes
 *   - 1-Click Magic Activation Links (?redeem=IPS-VIP-XXX)
 *   - Appends entries to IELTS_Studio_Voucher_Codes.csv
 *   - Outputs copy-pasteable Telegram delivery templates
 */

const fs = require('fs');
const path = require('path');

const count = parseInt(process.argv[2], 10) || 10;
const startNumber = parseInt(process.argv[3], 10) || 101;
const prefix = process.argv[4] || 'IPS-VIP';

const BASE_URL = 'https://ielts-prep-studio.web.app';
const CSV_FILE = path.resolve(__dirname, '..', 'IELTS_Studio_Voucher_Codes.csv');

console.log(`\n=============================================================`);
console.log(`🎓 IELTS PREP STUDIO - MINTING ${count} UNIFIED LIFETIME PASSES`);
console.log(`Prefix: ${prefix} | Starting Index: ${startNumber} | Plan: Lifetime Studio Pass (55,000 MMK)`);
console.log(`=============================================================\n`);

const minted = [];

for (let i = 0; i < count; i++) {
  const num = startNumber + i;
  const code = `${prefix}-${num}`;
  const magicLink = `${BASE_URL}/?redeem=${code}`;

  minted.push({
    code,
    plan: 'lifetime',
    name: 'Lifetime Studio Pass',
    price: '55,000 MMK',
    magicLink
  });
}

// Display Table
console.log(`INDEX | CODE          | 1-CLICK MAGIC ACTIVATION LINK`);
console.log(`------|---------------|----------------------------------------------------------`);
minted.forEach((item, idx) => {
  const idxStr = String(idx + 1).padStart(5, ' ');
  const codeStr = item.code.padEnd(13, ' ');
  console.log(`${idxStr} | ${codeStr} | ${item.magicLink}`);
});

// Append to CSV
try {
  let csvContent = '';
  if (!fs.existsSync(CSV_FILE)) {
    csvContent += 'Voucher Code,Plan Key,Plan Name,Price (MMK),Validity Duration,Category,Status,Magic Activation Link,Issued To (Student Name),Issue Date,Payment Reference / KPay Slip,Telegram Handle\n';
  }

  minted.forEach(item => {
    csvContent += `${item.code},lifetime,Lifetime Studio Pass,"55,000 MMK",Lifetime (Never Expires),Batch 2 Unified Lifetime Sales,Active,${item.magicLink},,,,\n`;
  });

  fs.appendFileSync(CSV_FILE, csvContent, 'utf8');
  console.log(`\n✅ Appended ${minted.length} new passes to ${path.basename(CSV_FILE)}`);
} catch (err) {
  console.error(`⚠️ Failed to append to CSV:`, err.message);
}

// Telegram Message Template Example
console.log(`\n-------------------------------------------------------------`);
console.log(`💬 READY-TO-SEND TELEGRAM CUSTOMER MESSAGE TEMPLATE:`);
console.log(`-------------------------------------------------------------`);
console.log(`မင်္ဂလာပါခင်ဗျာ! IELTS Prep Studio Lifetime VIP Pass အား ဝယ်ယူအားပေးမှုအတွက် ကျေးဇူးတင်ရှိပါသည်။

👑 သင့်ရဲ့ Lifetime Studio VIP Pass (တစ်သက်တာအသုံးပြုခွင့်):
👉 1-Click Activate Link: ${minted[0].magicLink}

အထက်ပါ Link ကို နှိပ်ပြီး Google Account ဖြင့် Sign In ပြုလုပ်ရုံဖြင့် VIP Modules (Reading CBT Mocks 23 ခု၊ Writing Band 9 Models 40 ခု၊ AI Examiner Evaluation များနှင့် Speaking 2026 Forecast Topics များ) အားလုံး ချက်ချင်း Unlocked ဖြစ်သွားပါမည်ခင်ဗျာ။

(App အတွင်း တိုက်ရိုက်ထည့်လိုပါက Voucher Code: ${minted[0].code})
-------------------------------------------------------------\n`);
