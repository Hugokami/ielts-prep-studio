# IELTS Prep Studio - Cloudflare Serverless Backend

Zero-cost, production-grade serverless backend built with **Cloudflare Workers**, **D1 SQLite**, and **Cloudflare KV**.

---

## 1. Prerequisites
Ensure you have `npm` and `wrangler` installed:
```bash
npm install -g wrangler
wrangler login
```

---

## 2. D1 Database Initialization
1. Create the D1 database:
```bash
wrangler d1 create ielts-prep-db
```
*(Copy the generated `database_id` into `wrangler.toml` under `[[d1_databases]]`)*

2. Apply the database schema:
```bash
wrangler d1 execute ielts-prep-db --file=schema.sql
```

---

## 3. Cloudflare KV VIP Bundle Upload
1. Create the KV namespace:
```bash
wrangler kv namespace create IELTS_VIP_KV
```
*(Copy the generated `id` into `wrangler.toml` under `[[kv_namespaces]]`)*

2. Upload the locked VIP curriculum dataset directly to KV:
```bash
wrangler kv key put --binding=VIP_KV "VIP_BUNDLE_JSON" --path=data/vip-bundle.json
```
*(Note: Because `data/vip-bundle.json` is gitignored, it is never exposed in the public frontend repository!)*

---

## 4. Telegram Bot Secrets
Set your Telegram Bot credentials as Cloudflare secrets:
```bash
wrangler secret put BOT_TOKEN
# Paste your BotFather API Token when prompted

wrangler secret put ADMIN_TG_ID
# Enter your numeric Telegram User ID (e.g. from @userinfobot)
```

---

## 5. Deploy Cloudflare Worker
Deploy the worker:
```bash
wrangler deploy
```

---

## 6. Register Telegram Webhook
Register your Cloudflare Worker URL with Telegram:
```bash
curl -F "url=https://ielts-prep-studio-backend.<your-subdomain>.workers.dev/webhook" \
  https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```
Or simply open in your browser:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://ielts-prep-studio-backend.<your-subdomain>.workers.dev/webhook
```

---

## 7. Admin Commands & Testing
- `/start` - Sends welcome message with "Launch Studio" TMA button and payment details.
- `/gen_codes 10` - Generates 10 one-time VIP activation codes (`VIP-XXXX-XXXX`) and inserts them into D1.
- Send payment screenshot photo to the bot -> Forwards to Admin with `[✅ Approve]` and `[❌ Reject]` buttons.
- Approving grants instant lifetime VIP access and triggers automated congratulatory notification.
