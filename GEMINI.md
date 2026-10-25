# IELTS Prep Studio — Architecture & Quality Invariants

## 1. 100% Distribution Byte Parity Invariant
- `index.html` and `ielts_prep_studio_open_academic_edition.html` are duplicate distributions that MUST remain identical.
- Whenever editing `index.html`, copy it to `ielts_prep_studio_open_academic_edition.html` and verify identical SHA-256 hashes:
  ```powershell
  Get-FileHash index.html, ielts_prep_studio_open_academic_edition.html
  ```
- Never commit with mismatched checksums.

## 2. Dual-Runtime Telegram Bot Synchronization
- The Telegram bot runs in two environments:
  1. **Production Webhook**: Cloudflare Worker in `backend/worker.js` deployed to `ielts-prep-studio-backend.lyan123-lh.workers.dev/webhook`.
  2. **Local Development Poller**: Node.js/grammY in `telegram-bot/bot.js`.
- Any command, callback, intake logic, or BYOK handler added to one MUST be added to the other in lockstep.
- After modifying `backend/worker.js`, verify syntax with `node -c backend/worker.js` and immediately deploy via `npx wrangler deploy` from `backend/`.

## 3. Cloudflare Worker Resource Bindings
- KV Namespace binding is `env.VIP_KV` (ID: `7309348eed4d4856822ff0bbcbea8673`). Do NOT reference undefined bindings like `env.BOT_STATE`.
- D1 Database binding is `env.DB` (`ielts-prep-db`).
- Serverless AI binding is `env.AI` (`@cf/meta/llama-3.2-3b-instruct`).
- Always use the in-memory cache fallback (`memoryByokCache`) alongside `env.VIP_KV` for sub-millisecond edge lookups.
