-- Ensure users has vip_expires_at
ALTER TABLE users ADD COLUMN vip_expires_at INTEGER DEFAULT 0;

-- Ensure payments has plan_tier
ALTER TABLE payments ADD COLUMN plan_tier TEXT DEFAULT 'lifetime';

-- Ensure promo_codes has plan_type
ALTER TABLE promo_codes ADD COLUMN plan_type TEXT DEFAULT 'lifetime';

-- Insert pre-seeded 7-day sprint customer passes
INSERT OR IGNORE INTO promo_codes (code, is_used, plan_type) VALUES
  ('IPS-SPRINT-701', 0, 'sprint'),
  ('IPS-SPRINT-702', 0, 'sprint'),
  ('IPS-SPRINT-703', 0, 'sprint'),
  ('IPS-SPRINT-704', 0, 'sprint'),
  ('IPS-SPRINT-705', 0, 'sprint'),
  ('IPS-SPRINT-101', 0, 'sprint'),
  ('IPS-SPRINT-102', 0, 'sprint'),
  ('IPS-SPRINT-103', 0, 'sprint'),
  ('IPS-SPRINT-104', 0, 'sprint'),
  ('IPS-SPRINT-105', 0, 'sprint');
