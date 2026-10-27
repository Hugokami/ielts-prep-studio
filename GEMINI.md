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

## 4. Mandatory Pre-Commit Inline Script Syntax Verification
- Monolithic HTML files (`index.html` and `ielts_prep_studio_open_academic_edition.html`) contain large inline `<script>` blocks. A single syntax error halts script compilation and silently breaks all tabs and buttons in the browser.
- Before committing or pushing changes to any HTML file, run the automated syntax check extracting and verifying all inline scripts via Node:
  ```powershell
  python scripts/check_html_syntax.py
  ```
- Never push without a clean 0-error exit code across all script blocks.

## 5. Live D1 Database Schema Pre-Flight Invariant
- Never assume table columns or types exist based on code intent or comments.
- Before referencing new columns in backend/frontend queries, inspect the remote D1 schema:
  ```powershell
  npx wrangler d1 execute ielts-prep-db --remote --command="PRAGMA table_info(users);"
  ```
- If new columns or tables are needed, write and execute an explicit `.sql` migration file (`--file=migration.sql --remote`) before deploying worker code.

## 6. Windows PowerShell & Scripting Safety Invariants
- **No Complex Inline Python in PowerShell**: Never pass multi-line python code with nested quotes, commas, or parentheses via `python -c` in PowerShell. Always write a dedicated script file (`scripts/...`) and execute it.
- **UTF-8 Output Encoding**: In Python scripts on Windows, always ensure UTF-8 encoding (`sys.stdout.reconfigure(encoding='utf-8')` or avoid raw printing of non-ASCII characters) to prevent `charmap` codec crashes.
- **Line Ending Tolerance**: Handle CRLF (`\r\n`) vs LF (`\n`) explicitly when modifying Windows files to avoid silent target mismatch errors in `edit_file`.
