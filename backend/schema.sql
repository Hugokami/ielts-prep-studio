-- Cloudflare D1 Database Schema for IELTS Prep Studio Telegram Mini App
-- Execute: npx wrangler d1 execute ielts-prep-db --file=schema.sql

CREATE TABLE IF NOT EXISTS users (
  telegram_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  is_vip INTEGER DEFAULT 0,
  vip_activated_at INTEGER DEFAULT 0,
  srs_due_count INTEGER DEFAULT 0,
  progress_json TEXT DEFAULT '{}',
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER,
  username TEXT,
  file_id TEXT,
  caption_note TEXT,
  amount_mmk INTEGER DEFAULT 55000,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS promo_codes (
  code TEXT PRIMARY KEY,
  is_used INTEGER DEFAULT 0,
  used_by_tg_id INTEGER,
  used_at INTEGER
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
