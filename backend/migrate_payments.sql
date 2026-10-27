ALTER TABLE payments ADD COLUMN stars_amount INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN currency TEXT DEFAULT 'MMK';
ALTER TABLE payments ADD COLUMN payment_method TEXT DEFAULT 'kpay';
ALTER TABLE payments ADD COLUMN stars_charge_id TEXT;
CREATE INDEX IF NOT EXISTS idx_payments_stars_charge_id ON payments(stars_charge_id);
CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_id);
