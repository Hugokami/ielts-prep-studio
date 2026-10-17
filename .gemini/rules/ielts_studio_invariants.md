# IELTS Prep Studio Architecture & Engineering Invariants

## 1. 3-Way Monolithic Distribution Mirror Parity
When developing or maintaining standalone single-page applications with distribution entry points:
- Primary file: `index.html` (repo root)
- Named open edition: `ielts_prep_studio_open_academic_edition.html` (repo root)
- User desktop download mirror: `C:\Users\lyan1\Downloads\ielts_prep_studio_open_academic_edition.html`
- **Rule**: All modifications to `index.html` must be replicated bit-for-bit to both mirrors.
- **Verification**: Enforce identical SHA256 checksums across all three files before committing or completing tasks.
- **Zero-Truncation Rule**: Never replace code with ellipsis placeholders (`<!-- rest of code -->` or `// ... existing code ...`). Edits must be complete and surgical.

## 2. Bilingual Unicode & Number String Preservation
- Preserve non-Latin scripts (e.g. Burmese Unicode `မြန်မာ` numerals `၁, ၂, ၃` and explanatory notes) verbatim.
- When updating English numerals in copy (e.g., passage counts, question totals, drill sizes), always update the corresponding Burmese strings (e.g., `၂၃` vs `၃၀`, `၂၃၁` vs `၃၀၀+`).
- Maintain clean UTF-8 encoding without BOM corruption.

## 3. Progressive Tab Disclosure & Deep-Linking Interceptor Protocol
- Single-active-tab architecture (`.studio-tab-section` / `.studio-tab-section.active-tab`) must be used for large workspaces to prevent cognitive overload and scroll fatigue.
- In-page navigation links (`<a href="#...">`), quick-action buttons, and `⌘K` global quick search results must automatically activate the target parent tab before scrolling to the destination element.
- Restore the user's active tab from `localStorage` or URL `#hash` upon page load.

## 4. Resilient Client-Side Hybrid Media Protocols
- Audio players for language learning must employ a two-tier hybrid architecture:
  - **Tier 1 (High-Fidelity Neural Assets)**: Stream pre-generated neural audio files (e.g. `data/audio/listening_set_{id}.mp3`).
  - **Tier 2 (Zero-Crash Fallback)**: Gracefully catch missing files or offline errors and fall back to browser Web Speech API (`SpeechSynthesisUtterance` in `en-GB` at 0.95 rate).
- Never throw unhandled console exceptions or leave audio controls permanently disabled.
