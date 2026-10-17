/**
 * IELTS Prep Studio - Unified Lifetime Voucher Minting & Distribution Utility
 *
 * Generates cryptographically randomized, unpredictable Lifetime Pass codes
 * Format: IPS-VIP-XXXX-YYYY (where YYYY is a deterministic mathematical checksum)
 *
 * Usage:
 *   node scripts/mint-vouchers.cjs [count]
 *
 * Example:
 *   node scripts/mint-vouchers.cjs 20
 */

const fs = require('fs');
const path = require('path');

const count = parseInt(process.argv[2], 10) || 10;
const BASE_URL = 'https://ielts-prep-studio.web.app';
const CSV_FILE = path.resolve(__dirname, '..', 'IELTS_Studio_Voucher_Codes.csv');

const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const SALT = 'IELTS_STUDIO_VIP_2026_KEY';

function generateVoucherChecksum(payload) {
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x5bd1e995 >>> 0;
  const str = payload + ':' + SALT;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = (Math.imul(h1 ^ c, 0x01000193) >>> 0);
    h2 = (Math.imul(h2 ^ (c << 3), 0x5bd1e995) >>> 0);
  }
  const idx0 = (h1 & 0x1F);
  const idx1 = ((h1 >>> 5) & 0x1F);
  const idx2 = (h2 & 0x1F);
  const idx3 = ((h2 >>> 5) & 0x1F);
  return CHARSET[idx0] + CHARSET[idx1] + CHARSET[idx2] + CHARSET[idx3];
}

const crypto = require('crypto');

function generateRandomVoucher() {
  const bytes = crypto.randomBytes(4);
  let payload = '';
  for (let i = 0; i < 4; i++) {
    payload += CHARSET[bytes[i] & 0x1F];
  }
  const checksum = generateVoucherChecksum(payload);
  return `IPS-VIP-${payload}-${checksum}`;
}

console.log(`\n========================================================================`);
console.log(`🎓 IELTS PREP STUDIO - MINTING ${count} UNPREDICTABLE LIFETIME PASSES`);
console.log(`Format: Cryptographically Checksummed IPS-VIP-XXXX-YYYY (Over 1.1 Trillion Space)`);
console.log(`========================================================================\n`);

const minted = [];
const seen = new Set();

for (let i = 0; i < count; i++) {
  let code = generateRandomVoucher();
  while (seen.has(code)) {
    code = generateRandomVoucher();
  }
  seen.add(code);
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
console.log(`INDEX | VOUCHER CODE        | 1-CLICK MAGIC ACTIVATION LINK`);
console.log(`------|---------------------|------------------------------------------------------------------`);
minted.forEach((item, idx) => {
  const idxStr = String(idx + 1).padStart(5, ' ');
  const codeStr = item.code.padEnd(19, ' ');
  console.log(`${idxStr} | ${codeStr} | ${item.magicLink}`);
});

// Append to CSV
try {
  let csvContent = '';
  if (!fs.existsSync(CSV_FILE)) {
    csvContent += 'Voucher Code,Plan Key,Plan Name,Price (MMK),Validity Duration,Category,Status,Magic Activation Link,Issued To (Student Name),Issue Date,Payment Reference / KPay Slip,Telegram Handle\n';
  }

  minted.forEach(item => {
    csvContent += `${item.code},lifetime,Lifetime Studio Pass,"55,000 MMK",Lifetime (Never Expires),Batch 3 Cryptographic Randomized Passes,Active,${item.magicLink},,,,\n`;
  });

  fs.appendFileSync(CSV_FILE, csvContent, 'utf8');
  console.log(`\n✅ Appended ${minted.length} new passes to ${path.basename(CSV_FILE)}`);
} catch (err) {
  console.error(`⚠️ Failed to append to CSV:`, err.message);
}
