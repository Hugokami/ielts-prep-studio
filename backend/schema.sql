-- Cloudflare D1 Database Schema for IELTS Prep Studio Telegram Mini App
-- Execute: npx wrangler d1 execute ielts-prep-db --file=schema.sql

CREATE TABLE IF NOT EXISTS users (
  telegram_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  is_vip INTEGER DEFAULT 0,
  vip_activated_at INTEGER DEFAULT 0,
  srs_due_count INTEGER DEFAULT 0,
  exam_date TEXT,
  target_band REAL DEFAULT 7.5,
  progress_json TEXT DEFAULT '{}',
  pending_tool TEXT,
  preferred_lang TEXT DEFAULT 'en', -- 'en' (default) or 'my'
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER,
  username TEXT,
  file_id TEXT,
  caption_note TEXT,
  amount_mmk INTEGER DEFAULT 55000,
  stars_amount INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'MMK', -- 'MMK', 'XTR'
  payment_method TEXT DEFAULT 'slip', -- 'slip', 'stars', 'voucher'
  stars_charge_id TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS promo_codes (
  code TEXT PRIMARY KEY,
  is_used INTEGER DEFAULT 0,
  used_by_tg_id INTEGER,
  used_at INTEGER
);

-- Daily API Tool Usage Quota for VIP and Free tiers
CREATE TABLE IF NOT EXISTS daily_quota (
  telegram_id INTEGER,
  date_str TEXT, -- 'YYYY-MM-DD' in Asia/Yangon time
  count INTEGER DEFAULT 0,
  PRIMARY KEY (telegram_id, date_str)
);

-- Seed initial partner & emergency promo codes
INSERT OR IGNORE INTO promo_codes (code, is_used) VALUES
  ('VIPPASS2026', 0),
  ('BAND9VIP', 0),
  ('SCHOLAR9', 0),
  ('BURMA2026', 0),
  ('ENGNOVATE', 0),
  ('IPS-VIP-101', 0),
  ('IPS-VIP-102', 0),
  ('IPS-VIP-103', 0),
  ('IPS-VIP-104', 0),
  ('IPS-VIP-105', 0);


-- v6.0 VIP Vouchers & Edge API Cache Tables
CREATE TABLE IF NOT EXISTS vip_vouchers (
  code_hash TEXT PRIMARY KEY,
  plan_type TEXT DEFAULT 'VIP_LIFETIME',
  redeemed_by_uid TEXT,
  redeemed_at INTEGER,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS api_cache (
  cache_key TEXT PRIMARY KEY,
  response_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
