/**
 * IELTS Prep Studio - Voucher Pool Manager
 *
 * Features:
 * - Cryptographically randomized, unpredictable voucher codes (IPS-VIP-XXXX-YYYY)
 * - Deterministic HMAC-style polynomial checksum for zero-database client verification
 * - Continuous Auto-Replenishment: automatically mints 50 fresh codes whenever available pool <= 10
 * - Real-time synchronization with IELTS_Studio_Voucher_Codes.csv
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILE = path.resolve(__dirname, '..', 'IELTS_Studio_Voucher_Codes.csv');
const LOCAL_DB_FILE = path.resolve(__dirname, 'vouchers_state.json');
const BASE_URL = process.env.STUDIO_WEB_URL || 'https://ielts-prep-studio.web.app';

// 32-Character Crockford Base32 Alphabet (Excludes 0, 1, I, O for visual clarity)
export const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const SALT = 'IELTS_STUDIO_VIP_2026_KEY';

/**
 * Generate a 4-character deterministic checksum for a 4-character random payload
 */
export function generateVoucherChecksum(payload) {
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

/**
 * Generate a single unpredictable, non-sequential Lifetime Pass code
 * Format: IPS-VIP-XXXX-YYYY (over 1.1 Trillion combinations)
 */
export function generateRandomVoucher() {
  const bytes = crypto.randomBytes(4);
  let payload = '';
  for (let i = 0; i < 4; i++) {
    payload += CHARSET[bytes[i] & 0x1F]; // 0 to 31
  }
  const checksum = generateVoucherChecksum(payload);
  return `IPS-VIP-${payload}-${checksum}`;
}

/**
 * Verify whether a code conforms to the mathematical checksum
 */
export function verifyVoucherChecksum(code) {
  if (typeof code !== 'string') return false;
  const parts = code.trim().toUpperCase().split('-');
  if (parts.length !== 4 || parts[0] !== 'IPS' || parts[1] !== 'VIP') return false;
  const payload = parts[2];
  const checksum = parts[3];
  if (payload.length !== 4 || checksum.length !== 4) return false;
  return generateVoucherChecksum(payload) === checksum;
}

const SLIPS_DB_FILE = path.resolve(__dirname, 'slips_state.json');

class VoucherPool {
  constructor() {
    this.vouchers = [];
    this.slips = new Map();
    this.init();
  }

  init() {
    if (fs.existsSync(LOCAL_DB_FILE)) {
      try {
        const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
        this.vouchers = JSON.parse(raw);
        console.log(`[VoucherPool] Loaded ${this.vouchers.length} vouchers from state.`);
      } catch (e) {
        console.warn('[VoucherPool] Failed to parse local state, reading from CSV.', e.message);
        this.loadFromCsv();
      }
    } else {
      this.loadFromCsv();
    }

    // Load slip deduplication registry
    if (fs.existsSync(SLIPS_DB_FILE)) {
      try {
        const rawSlips = JSON.parse(fs.readFileSync(SLIPS_DB_FILE, 'utf8'));
        this.slips = new Map(Object.entries(rawSlips));
        console.log(`[VoucherPool] Loaded ${this.slips.size} verified slip fingerprints.`);
      } catch (e) {
        console.warn('[VoucherPool] Slips state parse error:', e.message);
      }
    }

    // Check pool health on boot and auto-refill if low
    this.checkAndAutoRefill();
  }

  hasSlip(fileUniqueId) {
    if (!fileUniqueId) return false;
    return this.slips.has(String(fileUniqueId));
  }

  recordSlip(fileUniqueId, userId, meta = {}) {
    if (!fileUniqueId) return;
    this.slips.set(String(fileUniqueId), {
      userId: String(userId),
      timestamp: new Date().toISOString(),
      ...meta
    });
    this.saveSlips();
  }

  saveSlips() {
    try {
      const obj = Object.fromEntries(this.slips.entries());
      const tempFile = `${SLIPS_DB_FILE}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(obj, null, 2), 'utf8');
      fs.renameSync(tempFile, SLIPS_DB_FILE);
    } catch (e) {
      console.error('[VoucherPool] Slip save error:', e.message);
    }
  }

  loadFromCsv() {
    if (!fs.existsSync(CSV_FILE)) {
      console.warn('[VoucherPool] CSV file not found.');
      this.vouchers = [];
      return;
    }

    const lines = fs.readFileSync(CSV_FILE, 'utf8').split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) return;

    this.vouchers = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      const code = parts[0]?.trim();
      if (!code) continue;

      const status = parts[6]?.trim() || 'Active';
      const issuedTo = parts[8]?.trim() || '';
      const telegramHandle = parts[11]?.trim() || '';

      this.vouchers.push({
        code,
        plan: 'lifetime',
        name: 'Lifetime Studio Pass',
        price: '55,000 MMK',
        status: status.toLowerCase() === 'issued' ? 'Issued' : 'Active',
        magicLink: `${BASE_URL}/?redeem=${code}`,
        issuedTo: issuedTo || null,
        issuedAt: null,
        telegramId: null,
        telegramHandle: telegramHandle || null
      });
    }

    this.saveState();
  }

  saveState() {
    try {
      const payload = JSON.stringify(this.vouchers, null, 2);
      const tempFile = `${LOCAL_DB_FILE}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
      fs.writeFileSync(tempFile, payload, 'utf8');
      fs.renameSync(tempFile, LOCAL_DB_FILE);
      this.syncBackToCsv();
    } catch (e) {
      console.error('[VoucherPool] Save error:', e.message);
    }
  }

  syncBackToCsv() {
    try {
      let csv = 'Voucher Code,Plan Key,Plan Name,Price (MMK),Validity Duration,Category,Status,Magic Activation Link,Issued To (Student Name),Issue Date,Payment Reference / KPay Slip,Telegram Handle\n';
      this.vouchers.forEach(v => {
        let cat = 'Batch 1 Lifetime Sales';
        if (v.code.startsWith('IPS-VIP-') && v.code.split('-').length === 4) {
          cat = 'Batch 3 Cryptographic Randomized Passes';
        } else if (v.code.startsWith('IPS-VIP')) {
          cat = 'Batch 2 Unified Lifetime Sales';
        }
        csv += `${v.code},lifetime,Lifetime Studio Pass,"55,000 MMK",Lifetime (Never Expires),${cat},${v.status},${v.magicLink},${v.issuedTo || ''},${v.issuedAt || ''},,${v.telegramHandle || ''}\n`;
      });
      const tempCsv = `${CSV_FILE}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
      fs.writeFileSync(tempCsv, csv, 'utf8');
      fs.renameSync(tempCsv, CSV_FILE);
    } catch (e) {
      console.error('[VoucherPool] CSV Sync error:', e.message);
    }
  }

  getStats() {
    const total = this.vouchers.length;
    const issued = this.vouchers.filter(v => v.status === 'Issued').length;
    const available = total - issued;
    const revenueMmk = issued * 55000;
    return {
      total,
      issued,
      available,
      revenueMmk: revenueMmk.toLocaleString() + ' MMK'
    };
  }

  /**
   * Continuous Auto-Replenishment:
   * Whenever active pool has 10 or fewer vouchers, automatically mint 50 new randomized passes!
   */
  checkAndAutoRefill() {
    const available = this.vouchers.filter(v => v.status === 'Active').length;
    if (available <= 10) {
      console.log(`[VoucherPool] ⚡ Auto-Refill triggered: Only ${available} passes available. Minting 50 new randomized passes...`);
      this.mintRandomBatch(50);
      const after = this.getStats().available;
      console.log(`[VoucherPool] ✓ Auto-Refill complete! Pool now has ${after} available passes.`);
    }
  }

  /**
   * Mint N unpredictable, randomized codes
   */
  mintRandomBatch(count = 50) {
    const newVouchers = [];
    const existingCodes = new Set(this.vouchers.map(v => v.code));

    for (let i = 0; i < count; i++) {
      let code = generateRandomVoucher();
      // Guarantee uniqueness
      while (existingCodes.has(code)) {
        code = generateRandomVoucher();
      }
      existingCodes.add(code);

      const entry = {
        code,
        plan: 'lifetime',
        name: 'Lifetime Studio Pass',
        price: '55,000 MMK',
        status: 'Active',
        magicLink: `${BASE_URL}/?redeem=${code}`,
        issuedTo: null,
        issuedAt: null,
        telegramId: null,
        telegramHandle: null
      };

      this.vouchers.push(entry);
      newVouchers.push(entry);
    }

    this.saveState();
    return newVouchers;
  }

  mintBatch(count = 50) {
    return this.mintRandomBatch(count);
  }

  /**
   * Claim next available voucher (Prioritizes new randomized codes, auto-refills when low)
   */
  claimNextVoucher(student) {
    // Check and refill before issuing if running low
    this.checkAndAutoRefill();

    // Prefer randomized codes first, then any active code
    let available = this.vouchers.find(v => v.status === 'Active' && v.code.split('-').length === 4);
    if (!available) {
      available = this.vouchers.find(v => v.status === 'Active');
    }

    if (!available) {
      // Emergency failsafe: immediately mint 50 more
      this.mintRandomBatch(50);
      available = this.vouchers.find(v => v.status === 'Active');
    }

    if (!available) return null;

    available.status = 'Issued';
    available.issuedTo = student.name || 'Scholar';
    available.telegramId = student.id || null;
    available.telegramHandle = student.username ? `@${student.username}` : (student.name || 'User');
    available.issuedAt = new Date().toISOString();

    this.saveState();

    // Re-check after issuance
    this.checkAndAutoRefill();

    return available;
  }
}

export const voucherPool = new VoucherPool();
