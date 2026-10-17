/**
 * IELTS Prep Studio - Voucher Pool Manager
 * Manages atomic voucher issuance, tracking, and CSV synchronization
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILE = path.resolve(__dirname, '..', 'IELTS_Studio_Voucher_Codes.csv');
const LOCAL_DB_FILE = path.resolve(__dirname, 'vouchers_state.json');
const BASE_URL = process.env.STUDIO_WEB_URL || 'https://ielts-prep-studio.web.app';

class VoucherPool {
  constructor() {
    this.vouchers = [];
    this.init();
  }

  init() {
    // If local state exists, load it
    if (fs.existsSync(LOCAL_DB_FILE)) {
      try {
        const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
        this.vouchers = JSON.parse(raw);
        console.log(`[VoucherPool] Loaded ${this.vouchers.length} vouchers from state.`);
        return;
      } catch (e) {
        console.warn('[VoucherPool] Failed to parse local state, reading from CSV.', e.message);
      }
    }

    // Otherwise load from CSV
    this.loadFromCsv();
  }

  loadFromCsv() {
    if (!fs.existsSync(CSV_FILE)) {
      console.warn('[VoucherPool] CSV file not found.');
      this.vouchers = [];
      return;
    }

    const lines = fs.readFileSync(CSV_FILE, 'utf8').split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) return;

    // Header: Voucher Code,Plan Key,Plan Name,Price (MMK),Validity Duration,Category,Status,Magic Activation Link,Issued To...
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
    console.log(`[VoucherPool] Initialized with ${this.vouchers.length} vouchers from CSV.`);
  }

  saveState() {
    try {
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(this.vouchers, null, 2), 'utf8');
      this.syncBackToCsv();
    } catch (e) {
      console.error('[VoucherPool] Save error:', e.message);
    }
  }

  syncBackToCsv() {
    try {
      let csv = 'Voucher Code,Plan Key,Plan Name,Price (MMK),Validity Duration,Category,Status,Magic Activation Link,Issued To (Student Name),Issue Date,Payment Reference / KPay Slip,Telegram Handle\n';
      this.vouchers.forEach(v => {
        const cat = v.code.startsWith('IPS-VIP') ? 'Batch 2 Unified Lifetime Sales' : 'Batch 1 Lifetime Sales';
        csv += `${v.code},lifetime,Lifetime Studio Pass,"55,000 MMK",Lifetime (Never Expires),${cat},${v.status},${v.magicLink},${v.issuedTo || ''},${v.issuedAt || ''},,${v.telegramHandle || ''}\n`;
      });
      fs.writeFileSync(CSV_FILE, csv, 'utf8');
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

  claimNextVoucher(student) {
    const available = this.vouchers.find(v => v.status === 'Active');
    if (!available) {
      return null;
    }

    available.status = 'Issued';
    available.issuedTo = student.name || 'Scholar';
    available.telegramId = student.id || null;
    available.telegramHandle = student.username ? `@${student.username}` : (student.name || 'User');
    available.issuedAt = new Date().toISOString();

    this.saveState();
    return available;
  }

  mintBatch(count = 10, prefix = 'IPS-VIP') {
    // Find highest current index for this prefix
    let maxNum = 100;
    this.vouchers.forEach(v => {
      if (v.code.startsWith(prefix + '-')) {
        const num = parseInt(v.code.split('-').pop(), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });

    const newVouchers = [];
    for (let i = 1; i <= count; i++) {
      const num = maxNum + i;
      const code = `${prefix}-${num}`;
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
}

export const voucherPool = new VoucherPool();
