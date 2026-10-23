# IELTS Prep Studio (Open Academic Edition) 🎓

> **Examiner-Referenced IELTS Practice Suite • Offline PWA • Native Telegram Mini App • Serverless Edge AI**

[![Live Demo](https://img.shields.io/badge/Live_App-hugokami.github.io%2Fielts--prep--studio-blue?style=for-the-badge&logo=googlechrome)](https://hugokami.github.io/ielts-prep-studio/)
[![Telegram Bot](https://img.shields.io/badge/Telegram_Bot-@IELTSPrepStudioBot-2CA5E0?style=for-the-badge&logo=telegram)](https://t.me/IELTSPrepStudioBot)
[![Version](https://img.shields.io/badge/Version-8.8_Open_Academic-emerald?style=for-the-badge)](APP_BREAKDOWN.md)
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)](LICENSE)
[![Content Provenance](https://img.shields.io/badge/Content_Audit-Verified_Original-success?style=for-the-badge)](CONTENT_SOURCES.md)

---

## 🌟 Overview

**IELTS Prep Studio** is an all-in-one preparation ecosystem engineered for candidates targeting Band 7.5 to 8.5+ in the IELTS Academic and General Training examinations. Operating seamlessly across desktop/mobile web browsers and inside Telegram, it pairs authentic computer-delivered testing (CBT) simulations with automated criteria-referenced AI evaluations, spaced-repetition flashcards, and live academic tools.

📖 **For full architectural, database, and API specifications, see [APP_BREAKDOWN.md](APP_BREAKDOWN.md).**  
🔍 **For the complete copyright and provenance audit of all 23 reading tests and models, see [CONTENT_SOURCES.md](CONTENT_SOURCES.md).**

---

## ⚖️ Free Plan vs. Lifetime VIP Studio Pass

> 📢 **Special Update:** All **23 IELTS-style CBT reading mock tests (231 questions)** are now **100% Free** for all candidates!

| Feature / Resource | Free Plan (Default Scholar) | Lifetime VIP Studio Pass (👑) |
| :--- | :--- | :--- |
| **Pricing** | **0 MMK / $0 Free Forever** | **55,000 MMK** (one-time lifetime) or **750 ★ Telegram Stars** |
| **CBT Reading Tests** | **All 23 Passages (231 Questions) 100% Free** | **All 23 Passages (231 Questions) 100% Free** with split-screen CBT & band scoring |
| **Academic Lexicon** | 250 Core Words | **1,162 Academic Items** + full 1-3-7 Leitner Spaced Repetition |
| **Writing Model Essays** | 5 Models | **40 High-Scoring Models** (Task 1 charts/maps/processes + Task 2 arguments) |
| **AI Writing Evaluations** | **5 checks / month** | **60 checks / month** (Criteria-referenced band feedback + native rewrites) |
| **AI Speaking Assistant** | **10 checks / month** | **Unlimited AI Speech Evaluations** + 30 practice topics |
| **Speaking Frameworks** | PREP only | **All 5 Frameworks** (PREP, STAR, PEEP, Cause-Effect, Past-Present-Future) |
| **Paraphrasing Drills** | **10 drills / day** | **Unlimited Daily Drills** + Part 17 Academic Cloze + Mistake History Log |
| **AI Practice Mentor** | **10 daily queries** (Edge tools) | **Unlimited Practice Queries** (Multi-tier serverless failover) |
| **Access Scope** | Single browser (local storage) | **Multi-device cloud sync** (Telegram Mini App + Desktop PC/Mac browsers) |
| **Desktop Activation** | Not available | **Personal Cryptographic Voucher** (`IPS-VIP-XXXX-YYYY`) for PC/Mac login |
| **Future Curriculum** | Base version updates | **Lifetime free updates** (new practice topics & lexicon updates included) |

---

## 🚀 Key Features

* **7 Core Study Hubs**:
  1. **Overview & Cirrus Daylight Hero**: Personalized greeting, live presence pulse, kinetic decrypted text with slow organic loop, and 5-pillar readiness diagnostics.
  2. **1,162 Academic Lexicon Items**: Spaced repetition flashcards with 1-3-7 Leitner system, bilingual Burmese glosses, phonetic IPA, and Oxford 3000/5000 alignment.
  3. **23 IELTS-Style CBT Reading Passages (100% Free)**: 231 practice questions across Passages 1–8 (Mini Skill Drills) and Passages 9–23 (Full-Length CBT Passages) with split-screen layout and instant band score conversion.
  4. **40 High-Scoring Writing Models**: In-depth essay models across all Task 1 visual formats and Task 2 argument types with CEFR analytical evaluator.
  5. **Speaking Assistant & Practice Simulator**: 30 seasonal practice topics, 5 speaking frameworks (PREP, STAR, PEEP), and zero-mic live speech recognition.
  6. **Academic AI Tools Suite**: Collocations engine (`/collocate`), Academic paraphraser (`/syn`), live dictionary (`/dict`), and exam countdown timers.
  7. **AI Practice Mentor Copilot**: Full-page borderless chat interface with animated liquid morphing orb and serverless edge failover.
* **Security & Entitlement Architecture**:
  * Server-side entitlement verification on Cloudflare Workers edge (HMAC-verified `initData` and signed session tokens).
  * Multi-device voucher binding (up to 3 devices per code with SHA-256 voucher hashing).
  * Safe administrative Telegram operations (`/export` directly inside authenticated bot chat).
* **Motion-Anything Design System (`/open-design`)**:
  * Kinetic `decrypted-text` with slow continuous loop and tab-visibility awareness.
  * 360° GPU-accelerated `star-border` glow on action buttons.
  * Dynamic `shiny-text` headers and multi-sentence `typewriter-multi` telemetry.
  * Tactile 3-bar slider settings toggle button.

---

## 🛠️ Quick Start

### 1. Web / Desktop Usage
Open the live Progressive Web App directly:  
**[https://hugokami.github.io/ielts-prep-studio/](https://hugokami.github.io/ielts-prep-studio/)**

To run locally:
```bash
git clone https://github.com/Hugokami/ielts-prep-studio.git
cd ielts-prep-studio
python -m http.server 8080
```

### 2. Telegram Mini App
Open Telegram and start the official bot:  
**[@IELTSPrepStudioBot](https://t.me/IELTSPrepStudioBot)** or tap the bottom-left **`[ 🚀 Open App ]`** button.

---

## ⚖️ Legal & Trademark Disclaimers

> **Trademark & Non-Affiliation Notice:**  
> *IELTS is a registered trademark of the University of Cambridge, the British Council, and IDP Education Australia. IELTS Prep Studio is an independent educational platform and is not affiliated with, approved, or endorsed by Cambridge Assessment English, the British Council, or IDP Education.*

> **AI Practice Notice:**  
> *Automated AI evaluations provide estimated diagnostic feedback based on public IELTS band descriptors for practice purposes and are not official test scores.*

---

## 📄 License

MIT License. Open for scholarly IELTS preparation (see [LICENSE](LICENSE)).
