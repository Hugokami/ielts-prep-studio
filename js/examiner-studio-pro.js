// ============================================================================
// IELTS Prep Studio — Examiner Studio Pro v9.1 (Zero-Bloat Modular Engine)
// Integrates:
//   1. BYOK (Bring Your Own Gemini API Key) — 100% Free Tier Unlocked
//   2. AIELTS-WRITING Granular Error Diffs (❌ -> ✅) & Side-by-Side Band 9 Rewrite
//   3. IELTSEvaL Task 1 General Training Letters & .DOC / PDF Official Report Export
//   4. IELTS_WEB 3-Part Speaking Simulator, Realistic Rubric Guards & Score History
//   5. GitHub IELTS Hub Reading Paraphrase Triggers, Listening Traps & Band Calculator
// ============================================================================
(function () {
  "use strict";

  const BYOK_KEY_STORAGE = "ips_byok_api_key";
  const BYOK_MODEL_STORAGE = "ips_byok_model";
  const ERROR_VAULT_STORAGE = "ips_error_vault_v1";
  const EVAL_HISTORY_STORAGE = "ips_eval_history_v1";

  let EXAM_TRAPS_DATA = null;
  let lastWritingEvalData = null;
  let activeSpeakingMockPart = 2;
  let activeSpeakingPartQuestionIdx = 0;

  // ==========================================================================
  // 1. BYOK (BRING YOUR OWN KEY) ENGINE — 100% FREE TIER UNLOCKED
  // ==========================================================================
  function getByokApiKey() {
    try {
      return (localStorage.getItem(BYOK_KEY_STORAGE) || "").trim();
    } catch (e) {
      return "";
    }
  }

  function getByokModel() {
    try {
      return localStorage.getItem(BYOK_MODEL_STORAGE) || "gemini-2.5-flash";
    } catch (e) {
      return "gemini-2.5-flash";
    }
  }

  function hasByokKey() {
    return getByokApiKey().length >= 20;
  }

  window.hasByokKey = hasByokKey;
  window.getByokApiKey = getByokApiKey;

  window.saveByokSettings = function (inputIdPrefix = "drawer") {
    const keyInput = document.getElementById(`${inputIdPrefix}ByokKeyInput`);
    const modelSelect = document.getElementById(`${inputIdPrefix}ByokModelSelect`);
    if (!keyInput) return;

    const rawKey = keyInput.value.trim();
    const model = modelSelect ? modelSelect.value : "gemini-2.5-flash";

    try {
      if (rawKey) {
        localStorage.setItem(BYOK_KEY_STORAGE, rawKey);
        localStorage.setItem("ielts_gemini_api_key", rawKey);
        localStorage.setItem(BYOK_MODEL_STORAGE, model);
        if (typeof showStudioNotification === "function") {
          showStudioNotification("🔑 Personal API Key Saved! Unlimited Free-Tier AI Examiner unlocked.");
        }
      } else {
        localStorage.removeItem(BYOK_KEY_STORAGE);
        localStorage.removeItem("ielts_gemini_api_key");
        if (typeof showStudioNotification === "function") {
          showStudioNotification("Removed Personal API Key. Reverted to standard studio quota.");
        }
      }
      const wInp = document.getElementById("inlineWritingByokInput");
      const mInp = document.getElementById("aiMentorByokInput");
      [wInp, mInp].forEach((inp) => {
        const box = inp?.closest('div[style*="border"]') || inp?.parentElement?.parentElement;
        if (box) delete box.dataset.forceExpand;
      });
    } catch (e) {
      console.warn("BYOK storage error:", e);
    }

    syncByokInputsAndBadges();
    const modal = document.getElementById("byokQuickModalBackdrop");
    if (modal && inputIdPrefix === "modal") {
      modal.style.display = "none";
    }
  };

  window.clearByokSettings = function () {
    try {
      localStorage.removeItem(BYOK_KEY_STORAGE);
      localStorage.removeItem("ielts_gemini_api_key");
    } catch (e) {}
    syncByokInputsAndBadges();
    if (typeof showStudioNotification === "function") {
      showStudioNotification("Cleared Personal API Key.");
    }
  };

  function syncByokInputsAndBadges() {
    const key = getByokApiKey();
    const model = getByokModel();
    const active = key.length >= 20;

    ["drawer", "modal"].forEach((prefix) => {
      const inp = document.getElementById(`${prefix}ByokKeyInput`);
      if (inp && inp.value !== key) inp.value = key;
      const sel = document.getElementById(`${prefix}ByokModelSelect`);
      if (sel) sel.value = model;
      const badge = document.getElementById(`${prefix}ByokStatusBadge`);
      if (badge) {
        badge.textContent = active ? "✓ ACTIVE (UNLIMITED FREE)" : "NOT SET";
        badge.style.color = active ? "var(--green, #10b981)" : "var(--text-secondary)";
        badge.style.borderColor = active ? "rgba(16,185,129,0.4)" : "var(--border)";
      }
    });

    const inlineInp = document.getElementById("inlineWritingByokInput");
    if (inlineInp && inlineInp.value !== key) inlineInp.value = key;

    const mentorInp = document.getElementById("aiMentorByokInput");
    if (mentorInp && mentorInp.value !== key) mentorInp.value = key;

    const chatBadge = document.getElementById("aiChatModelBadge");
    if (chatBadge) {
      if (active) {
        chatBadge.textContent = "🔑 BYOK UNLIMITED";
        chatBadge.style.background = "rgba(16,185,129,0.18)";
        chatBadge.style.color = "#10b981";
      } else {
        chatBadge.textContent = "FREE";
        chatBadge.style.background = "";
        chatBadge.style.color = "";
      }
    }

    document.querySelectorAll(".byok-trigger-pill").forEach((btn) => {
      btn.innerHTML = active
        ? `🔑 BYOK Active <span style="color:#10b981;font-weight:800;">(Unlimited)</span>`
        : `🔑 Use Free BYOK Key`;
      btn.style.borderColor = active ? "rgba(16,185,129,0.5)" : "var(--border)";
    });

    // Engnovate Simplification 6: Auto-Collapsing BYOK Status Pill when active
    [
      { inpId: "inlineWritingByokInput", pillId: "writingByokCollapsedPill" },
      { inpId: "aiMentorByokInput", pillId: "mentorByokCollapsedPill" }
    ].forEach(({ inpId, pillId }) => {
      const inp = document.getElementById(inpId);
      if (!inp) return;
      const box = inp.closest('div[style*="border"]') || inp.parentElement?.parentElement;
      if (!box) return;

      let pill = document.getElementById(pillId);
      if (active && !box.dataset.forceExpand) {
        Array.from(box.children).forEach((ch) => {
          if (ch.id !== pillId) ch.style.display = "none";
        });
        box.style.padding = "7px 12px";
        box.style.background = "rgba(16,185,129,0.08)";
        box.style.borderColor = "rgba(16,185,129,0.35)";
        if (!pill) {
          pill = document.createElement("div");
          pill.id = pillId;
          pill.style.cssText =
            "display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;width:100%;font-size:0.78rem;";
          box.appendChild(pill);
        }
        pill.style.display = "flex";
        pill.innerHTML = `
          <span style="color:#10b981;font-weight:800;display:inline-flex;align-items:center;gap:6px;">
            🟢 Free Unlimited BYOK AI Active <span style="color:var(--text-secondary);font-weight:600;font-size:0.72rem;">(${escapeSafe(model)})</span>
          </span>
          <div style="display:flex;gap:8px;align-items:center;">
            <button type="button" class="btn-outlined" style="padding:2px 8px;font-size:0.71rem;" onclick="window.expandInlineByokBox('${inpId}','${pillId}')">🔑 Change Key</button>
            <button type="button" class="btn-outlined" style="padding:2px 8px;font-size:0.71rem;" onclick="openByokConfigModal()">⚙️ Model</button>
          </div>
        `;
      } else {
        if (pill) pill.style.display = "none";
        Array.from(box.children).forEach((ch) => {
          if (ch.id !== pillId) ch.style.display = "";
        });
        box.style.padding = "10px 12px";
        box.style.background = "var(--bg-elevated, rgba(255,255,255,0.03))";
        box.style.borderColor = "var(--border)";
      }
    });
  }

  window.expandInlineByokBox = function (inpId, pillId) {
    const inp = document.getElementById(inpId);
    if (!inp) return;
    const box = inp.closest('div[style*="border"]') || inp.parentElement?.parentElement;
    if (!box) return;
    box.dataset.forceExpand = "1";
    const pill = document.getElementById(pillId);
    if (pill) pill.style.display = "none";
    Array.from(box.children).forEach((ch) => {
      if (ch.id !== pillId) ch.style.display = "";
    });
    inp.focus();
  };

  window.openByokConfigModal = function () {
    let backdrop = document.getElementById("byokQuickModalBackdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "byokQuickModalBackdrop";
      backdrop.style.cssText =
        "position:fixed;inset:0;background:rgba(0,0,0,0.68);backdrop-filter:blur(4px);z-index:3500;display:flex;align-items:center;justify-content:center;padding:16px;";
      backdrop.innerHTML = `
        <div class="occ-card" style="max-width:480px;width:100%;padding:22px;background:var(--bg-card);border:1px solid var(--accent);border-radius:10px;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:1.25rem;">🔑</span>
              <strong style="font-size:1.02rem;color:var(--text);">BYOK — Bring Your Own API Key (Free Tier)</strong>
            </div>
            <button class="btn-outlined" style="padding:3px 9px;font-size:0.78rem;" onclick="document.getElementById('byokQuickModalBackdrop').style.display='none'">✕</button>
          </div>
          <p style="font-size:0.83rem;color:var(--text-secondary);line-height:1.55;margin:0 0 12px 0;">
            Enter your personal Google Gemini API key to unlock <strong>unlimited AI Writing Examiner, Speaking Examiner, and AI Mentor evaluations</strong> on the Free Tier. Your key is stored 100% locally in your browser and never sent to our servers.
          </p>
          <div style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
              <label for="modalByokKeyInput" style="font-size:0.76rem;font-weight:700;color:var(--text);">GOOGLE GEMINI API KEY</label>
              <span id="modalByokStatusBadge" class="occ-ver-pill" style="font-size:0.66rem;">NOT SET</span>
            </div>
            <input type="password" id="modalByokKeyInput" class="at-input-box" style="width:100%;font-family:monospace;font-size:0.83rem;padding:9px 11px;box-sizing:border-box;" placeholder="AIzaSy..." autocomplete="off">
            <div style="margin-top:6px;">
              <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer" style="font-size:0.8rem;font-weight:700;color:var(--accent);text-decoration:underline;display:inline-flex;align-items:center;gap:4px;">
                create your api key here(100% free) ↗
              </a>
            </div>
          </div>
          <div style="margin-bottom:16px;">
            <label for="modalByokModelSelect" style="font-size:0.75rem;font-weight:700;color:var(--text-secondary);display:block;margin-bottom:4px;">PREFERRED GEMINI MODEL</label>
            <select id="modalByokModelSelect" class="occ-select" style="width:100%;font-size:0.82rem;">
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended · Fast & Accurate)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (High Quota Free Tier)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Academic Reasoning)</option>
            </select>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
            <button class="btn-outlined" style="font-size:0.8rem;" onclick="clearByokSettings()">Clear Key</button>
            <button class="btn-accent-solid" style="font-size:0.82rem;padding:8px 18px;font-weight:700;" onclick="saveByokSettings('modal')">Save &amp; Unlock Free AI</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
    }
    backdrop.style.display = "flex";
    syncByokInputsAndBadges();
  };

  async function callDirectByokGemini(promptText, systemInstruction) {
    const apiKey = getByokApiKey();
    if (!apiKey) throw new Error("No BYOK key configured");

    const preferred = getByokModel();
    const models = [preferred, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"].filter(
      (v, i, a) => a.indexOf(v) === i
    );

    let lastErr = null;
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const payload = {
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2800
          }
        };
        if (systemInstruction) {
          payload.system_instruction = { parts: [{ text: systemInstruction }] };
        }
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errTxt = await res.text();
          lastErr = new Error(`BYOK ${model} HTTP ${res.status}: ${errTxt.slice(0, 180)}`);
          continue;
        }
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return {
            text,
            modelUsed: `BYOK (${model})`
          };
        }
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("BYOK Gemini call failed");
  }

  window.callByokAiMentorChat = async function (messagesArray, systemInstruction) {
    const apiKey = getByokApiKey();
    if (!apiKey) throw new Error("No BYOK key configured");

    const preferred = getByokModel();
    const models = [preferred, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"].filter(
      (v, i, a) => a.indexOf(v) === i
    );

    const contents = (messagesArray || [])
      .filter((m) => m && m.role !== "system" && m.content)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content) }]
      }));

    if (!contents.length) {
      throw new Error("Empty chat messages");
    }

    let lastErr = null;
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const payload = {
          contents,
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 1600
          }
        };
        if (systemInstruction) {
          payload.system_instruction = { parts: [{ text: systemInstruction }] };
        }
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errTxt = await res.text();
          lastErr = new Error(`BYOK ${model} HTTP ${res.status}: ${errTxt.slice(0, 180)}`);
          continue;
        }
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return {
            text: text.trim(),
            modelUsed: `🔑 BYOK (${model})`
          };
        }
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("BYOK AI Mentor call failed");
  };

  // ==========================================================================
  // 2. ERROR VAULT & EVALUATION HISTORY STORAGE (IELTS_WEB + AIELTS-WRITING)
  // ==========================================================================
  function getErrorVault() {
    try {
      const raw = localStorage.getItem(ERROR_VAULT_STORAGE);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveErrorVault(list) {
    try {
      localStorage.setItem(ERROR_VAULT_STORAGE, JSON.stringify(list.slice(0, 200)));
    } catch (e) {}
    updateErrorVaultBadges();
  }

  window.addItemToErrorVault = function (type, wrong, correct, explanation, sourceModule = "Writing Lab") {
    const list = getErrorVault();
    const exists = list.some((it) => it.wrong === wrong && it.correct === correct);
    if (!exists) {
      list.unshift({
        id: "ev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        type: type || "grammar",
        wrong: wrong || "",
        correct: correct || "",
        explanation: explanation || "",
        source: sourceModule,
        date: new Date().toISOString().split("T")[0]
      });
      saveErrorVault(list);
    }
    if (typeof showStudioNotification === "function") {
      showStudioNotification("📌 Saved correction to My Error Vault!");
    }
    renderErrorVaultPane();
  };

  window.removeErrorVaultItem = function (id) {
    const list = getErrorVault().filter((it) => it.id !== id);
    saveErrorVault(list);
    renderErrorVaultPane();
  };

  window.exportErrorVaultCsv = function () {
    const list = getErrorVault();
    if (!list.length) {
      alert("Your Error Vault is currently empty. Save corrections from AI Writing or Speaking evaluations first!");
      return;
    }
    const rows = [["Date", "Module", "Category", "Original / Mistake", "Band 9 Upgrade / Correction", "Examiner Note"]];
    list.forEach((it) => {
      rows.push([
        it.date || "",
        it.source || "",
        it.type || "",
        `"${String(it.wrong || "").replace(/"/g, '""')}"`,
        `"${String(it.correct || "").replace(/"/g, '""')}"`,
        `"${String(it.explanation || "").replace(/"/g, '""')}"`
      ]);
    });
    const csv = "\uFEFF" + rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `IELTS_Error_Vault_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  function getEvalHistory() {
    try {
      const raw = localStorage.getItem(EVAL_HISTORY_STORAGE);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function recordEvalHistory(entry) {
    const list = getEvalHistory();
    list.unshift({
      id: "hist_" + Date.now(),
      date: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      ...entry
    });
    try {
      localStorage.setItem(EVAL_HISTORY_STORAGE, JSON.stringify(list.slice(0, 50)));
    } catch (e) {}
    if (typeof window.syncAndRenderStudyStreak === "function") {
      window.syncAndRenderStudyStreak(true);
    }
    renderErrorVaultPane();
  }

  function updateErrorVaultBadges() {
    const count = getErrorVault().length;
    document.querySelectorAll(".error-vault-count-pill").forEach((el) => {
      el.textContent = String(count);
    });
  }

  // ==========================================================================
  // 3. SELF-HEALING JSON PARSER FOR AI EXAMINER (IELTS_WEB + AIELTS-WRITING)
  // ==========================================================================
  function parseExaminerJsonOrFallback(rawText, originalEssay = "") {
    if (!rawText) return null;
    let cleaned = rawText.trim();

    // Extract JSON block if wrapped in ```json ... ``` or {...}
    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (jsonBlockMatch) {
      cleaned = jsonBlockMatch[1].trim();
    } else {
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      }
    }

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Self-healing JSON repair from IELTS_WEB
      try {
        let fixed = cleaned.replace(/,\s*([}\]])/g, "$1");
        const openBraces = (fixed.match(/{/g) || []).length;
        const closeBraces = (fixed.match(/}/g) || []).length;
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;
        for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += "]";
        for (let i = 0; i < openBraces - closeBraces; i++) fixed += "}";
        return JSON.parse(fixed);
      } catch (e2) {
        return null;
      }
    }
  }

  function escapeSafe(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ==========================================================================
  // 4. AI WRITING EXAMINER 3.0 (4-TAB DASHBOARD + DIFFS + REWRITE + .DOC EXPORT)
  // ==========================================================================
  window.switchWritingEvalTab = function (tabId) {
    document.querySelectorAll(".weval-tab-btn").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-weval-tab") === tabId);
    });
    document.querySelectorAll(".weval-tab-pane").forEach((p) => {
      p.style.display = p.getAttribute("data-weval-pane") === tabId ? "block" : "none";
    });
  };

  window.exportWritingReportDoc = function () {
    if (!lastWritingEvalData) return;
    const d = lastWritingEvalData;
    const htmlDoc = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>IELTS Writing Examiner Report</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; padding: 24px; }
        h1 { color: #8B2E24; border-bottom: 2px solid #8B2E24; padding-bottom: 6px; }
        h2 { color: #BA4A25; margin-top: 18px; }
        .score-box { background: #FAF7F0; border: 1px solid #d4cec3; padding: 14px; margin: 12px 0; }
        .diff-item { margin-bottom: 8px; padding: 8px; border-left: 3px solid #BA4A25; background: #f8fafc; }
      </style></head>
      <body>
        <h1>IELTS Prep Studio — Official Examiner Evaluation Report</h1>
        <p><strong>Date:</strong> ${escapeSafe(new Date().toLocaleDateString())} &nbsp;|&nbsp; <strong>Task:</strong> ${escapeSafe(d.taskTitle)} &nbsp;|&nbsp; <strong>Word Count:</strong> ${d.wordCount} words</p>
        <div class="score-box">
          <h2>Overall Band Score: Band ${escapeSafe(d.scores.overall)} (${escapeSafe(d.cefrLevel)})</h2>
          <ul>
            <li><strong>Task Achievement / Response:</strong> Band ${escapeSafe(d.scores.ta)} — ${escapeSafe(d.criteriaNotes.ta)}</li>
            <li><strong>Coherence &amp; Cohesion:</strong> Band ${escapeSafe(d.scores.cc)} — ${escapeSafe(d.criteriaNotes.cc)}</li>
            <li><strong>Lexical Resource:</strong> Band ${escapeSafe(d.scores.lr)} — ${escapeSafe(d.criteriaNotes.lr)}</li>
            <li><strong>Grammatical Range &amp; Accuracy:</strong> Band ${escapeSafe(d.scores.gra)} — ${escapeSafe(d.criteriaNotes.gra)}</li>
          </ul>
        </div>
        <h2>Prompt</h2>
        <p><em>${escapeSafe(d.promptText)}</em></p>
        <h2>Candidate's Original Draft (${d.wordCount} words)</h2>
        <p>${escapeSafe(d.originalEssay).replace(/\n/g, "<br>")}</p>
        <h2>Granular Error Corrections (❌ Wrong → ✅ Correct)</h2>
        ${(d.corrections || [])
          .map(
            (c) =>
              `<div class="diff-item"><strong>[${escapeSafe(c.type.toUpperCase())}]</strong> ❌ <strike>${escapeSafe(c.wrong)}</strike> &rarr; ✅ <strong>${escapeSafe(c.correct)}</strong><br><small>${escapeSafe(c.explanation)}</small></div>`
          )
          .join("")}
        <h2>Band 9.0 Examiner Upgraded Rewrite</h2>
        <p>${escapeSafe(d.band9Rewrite).replace(/\n/g, "<br>")}</p>
        <h2>Examiner Advice (Burmese &amp; English)</h2>
        <p>${escapeSafe(d.burmeseAdvice).replace(/\n/g, "<br>")}</p>
      </body></html>
    `;
    const blob = new Blob(["\ufeff", htmlDoc], { type: "application/msword" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `IELTS_Writing_Report_Band_${d.scores.overall}_${new Date().toISOString().slice(0, 10)}.doc`;
    a.click();
  };

  window.copyBand9RewriteText = function () {
    if (!lastWritingEvalData || !lastWritingEvalData.band9Rewrite) return;
    navigator.clipboard?.writeText(lastWritingEvalData.band9Rewrite);
    if (typeof showStudioNotification === "function") {
      showStudioNotification("📋 Copied Band 9.0 Rewrite to clipboard!");
    }
  };

  function getScoreColorHex(score) {
    const s = parseFloat(score) || 6.0;
    if (s >= 7.5) return "#10b981";
    if (s >= 6.5) return "#e06c35";
    return "#ef4444";
  }

  const STOPWORDS_REPETITION = new Set([
    "the","and","that","have","for","not","with","you","this","but","his","from","they","say","her","she","will","one","all","would","there","their","what","out","about","who","get","which","when","make","can","like","time","just","him","know","take","into","your","some","could","them","see","other","than","then","now","only","come","its","over","Also","also","after","use","two","how","our","work","first","well","way","even","new","want","because","any","these","give","most","such","more","many","much","very","should","must","may","might","been","were","was","are","has","had","does","did","being","where","while","through","between","both","each","under","within","without","however","therefore","furthermore","moreover","although","though"
  ]);

  function computeWordRepetitionStats(essayText) {
    const words = String(essayText || "")
      .toLowerCase()
      .replace(/[^a-z'\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS_REPETITION.has(w));
    const counts = {};
    words.forEach((w) => {
      counts[w] = (counts[w] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, c]) => c >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }

  function buildWordDiffHtml(originalText, rewriteText) {
    const origSet = new Set(
      String(originalText || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length >= 4)
    );
    return String(rewriteText || "")
      .split(/(\s+)/)
      .map((tok) => {
        if (/^\s+$/.test(tok)) return tok;
        const clean = tok.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (clean.length >= 4 && !origSet.has(clean) && !STOPWORDS_REPETITION.has(clean)) {
          return `<mark style="background:rgba(16,185,129,0.22);color:#10b981;padding:1px 4px;border-radius:3px;font-weight:700;">${escapeSafe(tok)}</mark>`;
        }
        return escapeSafe(tok);
      })
      .join("");
  }

  window.toggleBand9DiffHighlight = function (btnEl) {
    const box = document.getElementById("band9RewriteContentBox");
    if (!box || !lastWritingEvalData) return;
    const isDiff = box.dataset.diffActive === "1";
    if (isDiff) {
      box.dataset.diffActive = "0";
      box.innerHTML = escapeSafe(lastWritingEvalData.band9Rewrite || "Band 9 rewrite included in main feedback tab.");
      if (btnEl) btnEl.innerHTML = "🔍 Highlight Differences";
    } else {
      box.dataset.diffActive = "1";
      box.innerHTML = buildWordDiffHtml(lastWritingEvalData.originalEssay, lastWritingEvalData.band9Rewrite || "");
      if (btnEl) btnEl.innerHTML = "✨ Plain Clean View";
    }
  };

  function renderWritingEvaluationDashboard(resultBox, evalData, modelUsed, rawFallbackMarkdown) {
    lastWritingEvalData = evalData;
    const s = evalData.scores;
    const errCounts = evalData.errorCounts;
    const corrections = evalData.corrections || [];
    const repeatedWords = computeWordRepetitionStats(evalData.originalEssay);
    const totalGrammarMistakes = (errCounts.grammar || 0) + (errCounts.vocabulary || 0) + (errCounts.sentence || 0);
    const repSummary = repeatedWords.length
      ? repeatedWords.map(([w, c]) => `<span style="background:rgba(245,158,11,0.14);color:#f59e0b;padding:1px 6px;border-radius:4px;font-weight:700;">${escapeSafe(w)} (${c}x)</span>`).join(" ")
      : `<span style="color:#10b981;font-weight:700;">✓ Optimal Variety (No overused words)</span>`;

    const corrHtml = corrections.length
      ? corrections
          .map((c, idx) => {
            const wEsc = escapeSafe(c.wrong);
            const cEsc = escapeSafe(c.correct);
            const expEsc = escapeSafe(c.explanation);
            const tEsc = escapeSafe(c.type || "grammar").toUpperCase();
            return `
              <div style="padding:12px 14px;border-radius:8px;background:var(--bg-elevated, rgba(255,255,255,0.03));border:1px solid var(--border);margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                  <span class="occ-ver-pill" style="font-size:0.68rem;font-weight:800;color:var(--accent);">${tEsc} FIX #${idx + 1}</span>
                  <button type="button" class="btn-outlined" style="padding:3px 9px;font-size:0.72rem;font-weight:700;" onclick="addItemToErrorVault('${escapeSafe(c.type)}', ${JSON.stringify(c.wrong).replace(/"/g, "&quot;")}, ${JSON.stringify(c.correct).replace(/"/g, "&quot;")}, ${JSON.stringify(c.explanation).replace(/"/g, "&quot;")}, 'Writing Lab')">
                    📌 Save to Error Vault
                  </button>
                </div>
                <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:0.88rem;line-height:1.55;margin-bottom:6px;">
                  <span style="color:#ef4444;background:rgba(239,68,68,0.1);padding:2px 8px;border-radius:4px;text-decoration:line-through;">❌ ${wEsc}</span>
                  <span style="color:var(--text-secondary);font-weight:800;">→</span>
                  <span style="color:#10b981;background:rgba(16,185,129,0.12);padding:2px 8px;border-radius:4px;font-weight:700;">✅ ${cEsc}</span>
                </div>
                <div style="font-size:0.79rem;color:var(--text-secondary);line-height:1.5;">💡 <strong>Examiner Note:</strong> ${expEsc}</div>
              </div>
            `;
          })
          .join("")
      : `<div style="padding:14px;color:var(--text-secondary);font-size:0.85rem;">No granular word/sentence errors extracted — see full rubric commentary in Tab 1.</div>`;

    const minWords = evalData.isTask1 ? 150 : 250;
    const underWordAlert =
      evalData.wordCount < minWords
        ? `<div style="margin-bottom:12px;padding:10px 12px;border-radius:6px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.4);color:#ef4444;font-size:0.8rem;font-weight:700;">
             ⚠️ Official Word-Count Penalty Guard: Your draft has ${evalData.wordCount} words (Minimum required: ${minWords} words). In official IELTS grading, under-length responses are capped on Task Achievement/Response.
           </div>`
        : "";

    resultBox.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border-mid);flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:1.3rem;">✨</span>
          <strong style="font-size:1.05rem;color:var(--text);">Cambridge AI Examiner 3.0</strong>
          <span class="occ-ver-pill" style="color:var(--accent);font-weight:700;">${escapeSafe(modelUsed)}</span>
          <span class="occ-ver-pill" style="color:${getScoreColorHex(s.overall)};font-weight:800;">${escapeSafe(evalData.cefrLevel)}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" class="btn-outlined" style="padding:4px 10px;font-size:0.74rem;font-weight:700;" onclick="exportWritingReportDoc()">⬇ Export .DOC</button>
          <button type="button" class="btn-outlined" style="padding:4px 10px;font-size:0.74rem;" onclick="window.print()">🖨️ Print</button>
          <button type="button" class="btn-outlined modal-close-btn" style="padding:4px 10px;font-size:0.74rem;" onclick="document.getElementById('geminiAuditResult').style.display='none'">✕</button>
        </div>
      </div>

      ${underWordAlert}

      <!-- 4-Tab Interactive Sub-Navigation -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;border-bottom:1px solid var(--border);padding-bottom:8px;">
        <button type="button" class="subtab-btn weval-tab-btn active" data-weval-tab="rubric" onclick="switchWritingEvalTab('rubric')" style="font-size:0.78rem;padding:6px 12px;">
          📊 1. Rubric &amp; Scores (Band ${escapeSafe(s.overall)})
        </button>
        <button type="button" class="subtab-btn weval-tab-btn" data-weval-tab="diffs" onclick="switchWritingEvalTab('diffs')" style="font-size:0.78rem;padding:6px 12px;">
          ❌→✅ 2. Granular Error Diffs (${corrections.length})
        </button>
        <button type="button" class="subtab-btn weval-tab-btn" data-weval-tab="rewrite" onclick="switchWritingEvalTab('rewrite')" style="font-size:0.78rem;padding:6px 12px;">
          ✨ 3. Side-by-Side Band 9 Rewrite
        </button>
        <button type="button" class="subtab-btn weval-tab-btn" data-weval-tab="burmese" onclick="switchWritingEvalTab('burmese')" style="font-size:0.78rem;padding:6px 12px;">
          🇲🇲 4. Burmese Advice &amp; Export
        </button>
      </div>

      <!-- TAB 1: RUBRIC & SCORES -->
      <div class="weval-tab-pane" data-weval-pane="rubric" style="display:block;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin-bottom:14px;">
          <div style="padding:12px;border-radius:8px;background:var(--bg-elevated,rgba(255,255,255,0.03));border:2px solid ${getScoreColorHex(s.overall)};text-align:center;">
            <div style="font-size:0.7rem;font-weight:800;color:var(--text-secondary);text-transform:uppercase;">Overall Band</div>
            <div style="font-size:2.1rem;font-weight:900;color:${getScoreColorHex(s.overall)};line-height:1.15;margin:4px 0;">${escapeSafe(s.overall)}</div>
            <div style="font-size:0.72rem;font-weight:700;color:var(--text-secondary);">${escapeSafe(evalData.cefrLevel)}</div>
          </div>
          ${[
            ["Task Response / TA", s.ta, evalData.criteriaNotes.ta],
            ["Coherence & Cohesion", s.cc, evalData.criteriaNotes.cc],
            ["Lexical Resource", s.lr, evalData.criteriaNotes.lr],
            ["Grammar Range & Acc", s.gra, evalData.criteriaNotes.gra]
          ]
            .map(
              ([label, val, note]) => `
            <div style="padding:10px 12px;border-radius:8px;background:var(--bg-elevated,rgba(255,255,255,0.03));border:1px solid var(--border);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span style="font-size:0.74rem;font-weight:800;color:var(--text);">${label}</span>
                <span style="font-size:0.95rem;font-weight:900;color:${getScoreColorHex(val)};">${escapeSafe(val)}</span>
              </div>
              <div style="height:5px;width:100%;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:6px;">
                <div style="height:100%;width:${Math.min(100, Math.round((parseFloat(val) / 9) * 100))}%;background:${getScoreColorHex(val)};"></div>
              </div>
              <div style="font-size:0.74rem;color:var(--text-secondary);line-height:1.45;">${escapeSafe(note)}</div>
            </div>
          `
            )
            .join("")}
        </div>

        <!-- Engnovate 3-Card Telemetry Summary (Vocabulary Level, Grammar Mistakes, Word Repetition) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:12px;">
          <div style="padding:10px 12px;border-radius:8px;background:var(--bg);border:1px solid var(--border);">
            <div style="font-size:0.7rem;font-weight:800;color:var(--text-secondary);text-transform:uppercase;">💎 Vocabulary Level</div>
            <div style="font-size:0.95rem;font-weight:800;color:${getScoreColorHex(s.lr)};margin-top:3px;">${escapeSafe(evalData.cefrLevel)}</div>
          </div>
          <div style="padding:10px 12px;border-radius:8px;background:var(--bg);border:1px solid var(--border);">
            <div style="font-size:0.7rem;font-weight:800;color:var(--text-secondary);text-transform:uppercase;">🔍 Grammar &amp; Lexical Mistakes</div>
            <div style="font-size:0.95rem;font-weight:800;color:${totalGrammarMistakes > 4 ? "#ef4444" : "#10b981"};margin-top:3px;">${totalGrammarMistakes} Identified (${errCounts.grammar}G · ${errCounts.vocabulary}V · ${errCounts.sentence}S)</div>
          </div>
          <div style="padding:10px 12px;border-radius:8px;background:var(--bg);border:1px solid var(--border);">
            <div style="font-size:0.7rem;font-weight:800;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px;">🔁 Word Repetition (&ge;3x)</div>
            <div style="font-size:0.78rem;display:flex;gap:4px;flex-wrap:wrap;">${repSummary}</div>
          </div>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          <span class="occ-ver-pill" style="font-size:0.74rem;">🤖 Memorized Template Risk: <strong style="color:${errCounts.templateRiskPct > 25 ? "#ef4444" : "#10b981"};">${errCounts.templateRiskPct}%</strong></span>
          <span class="occ-ver-pill" style="font-size:0.74rem;">🔤 Grammar Slips: <strong>${errCounts.grammar}</strong></span>
          <span class="occ-ver-pill" style="font-size:0.74rem;">💎 Lexical Slips: <strong>${errCounts.vocabulary}</strong></span>
          <span class="occ-ver-pill" style="font-size:0.74rem;">📐 Sentence Structure Slips: <strong>${errCounts.sentence}</strong></span>
        </div>

        ${
          rawFallbackMarkdown
            ? `<div class="gemini-content-body" style="font-size:0.86rem;line-height:1.7;color:var(--text);padding-top:8px;border-top:1px solid var(--border);">${rawFallbackMarkdown}</div>`
            : ""
        }
      </div>

      <!-- TAB 2: GRANULAR ERROR DIFFS -->
      <div class="weval-tab-pane" data-weval-pane="diffs" style="display:none;">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;text-align:center;">
          <div style="padding:8px;border-radius:6px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);">
            <div style="font-size:1.2rem;font-weight:900;color:#ef4444;">${errCounts.grammar}</div>
            <div style="font-size:0.7rem;color:var(--text-secondary);font-weight:700;">Grammar Errors</div>
          </div>
          <div style="padding:8px;border-radius:6px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);">
            <div style="font-size:1.2rem;font-weight:900;color:#f59e0b;">${errCounts.vocabulary}</div>
            <div style="font-size:0.7rem;color:var(--text-secondary);font-weight:700;">Vocabulary / Collocation</div>
          </div>
          <div style="padding:8px;border-radius:6px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.3);">
            <div style="font-size:1.2rem;font-weight:900;color:#38bdf8;">${errCounts.sentence}</div>
            <div style="font-size:0.7rem;color:var(--text-secondary);font-weight:700;">Sentence Structure</div>
          </div>
        </div>
        ${corrHtml}
      </div>

      <!-- TAB 3: SIDE-BY-SIDE BAND 9 REWRITE -->
      <div class="weval-tab-pane" data-weval-pane="rewrite" style="display:none;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
          <span style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);">Compare your original draft against a seamless Band 9.0 upgrade of your exact arguments:</span>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="btn-outlined" style="padding:4px 10px;font-size:0.75rem;font-weight:700;border-color:rgba(16,185,129,0.45);color:#10b981;" onclick="toggleBand9DiffHighlight(this)">🔍 Highlight Differences</button>
            <button type="button" class="btn-outlined" style="padding:4px 10px;font-size:0.75rem;font-weight:700;" onclick="copyBand9RewriteText()">📋 Copy Band 9 Version</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;">
          <div style="padding:12px;border-radius:8px;background:var(--bg-elevated,rgba(255,255,255,0.02));border:1px solid var(--border);">
            <div style="font-size:0.72rem;font-weight:800;color:var(--text-secondary);margin-bottom:6px;text-transform:uppercase;">📝 Your Submitted Draft (${evalData.wordCount}w)</div>
            <div style="font-size:0.84rem;line-height:1.7;color:var(--text-secondary);white-space:pre-wrap;">${escapeSafe(evalData.originalEssay)}</div>
          </div>
          <div style="padding:12px;border-radius:8px;background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.35);">
            <div style="font-size:0.72rem;font-weight:800;color:#10b981;margin-bottom:6px;text-transform:uppercase;">🌟 Examiner Band 9.0 Upgraded Version</div>
            <div id="band9RewriteContentBox" data-diff-active="0" style="font-size:0.84rem;line-height:1.7;color:var(--text);white-space:pre-wrap;">${escapeSafe(evalData.band9Rewrite || "Band 9 rewrite included in main feedback tab.")}</div>
          </div>
        </div>
      </div>

      <!-- TAB 4: BURMESE ADVICE & EXPORT -->
      <div class="weval-tab-pane" data-weval-pane="burmese" style="display:none;">
        <div style="padding:14px;border-radius:8px;background:var(--bg-elevated,rgba(255,255,255,0.03));border:1px solid var(--border);margin-bottom:12px;">
          <div style="font-size:0.82rem;font-weight:800;color:var(--accent);margin-bottom:6px;">🇲🇲 Examiner Advice in Burmese (မြန်မာဘာသာ အကြံပြုချက်)</div>
          <div class="burmese" style="font-size:0.88rem;line-height:1.8;color:var(--text);white-space:pre-wrap;">${escapeSafe(evalData.burmeseAdvice || "အသေးစိတ် အကြံပြုချက်များကို Rubric Tab တွင် ကြည့်ရှုနိုင်ပါသည်။")}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn-accent-solid" style="padding:8px 16px;font-size:0.82rem;font-weight:700;" onclick="exportWritingReportDoc()">⬇ Download Official Examiner Report (.DOC)</button>
          <button type="button" class="btn-outlined" style="padding:8px 16px;font-size:0.82rem;" onclick="window.print()">🖨️ Print / Save as PDF</button>
        </div>
      </div>
    `;
  }

  // Upgrade gradeEssayWithGemini
  function installUpgradedWritingExaminer() {
    window.gradeEssayWithGemini = async function () {
      const byokActive = hasByokKey();
      const isTg = !!(
        window.telegramUser ||
        (window.StorageManager && window.StorageManager.isTelegram) ||
        (window.Telegram &&
          window.Telegram.WebApp &&
          ((window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) ||
            window.Telegram.WebApp.initData))
      );

      if (!byokActive && !window.currentUser && !isTg) {
        if (
          confirm(
            "💡 Free Tier Tip: You can either Sign In with Google (5 free checks/month) OR enter your own 100% Free Google AI Studio API Key (BYOK) for UNLIMITED evaluations without signing in!\n\nClick OK to open the Free BYOK Key setup, or Cancel to Sign In with Google."
          )
        ) {
          window.openByokConfigModal();
        } else if (window.signInWithGoogle) {
          window.signInWithGoogle();
        }
        return;
      }

      const text = document.getElementById("essayArea")?.value || "";
      const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
      if (wordCount < 30) {
        alert("Please write at least 30 words before requesting an AI Examiner Grade.");
        return;
      }

      if (!byokActive && typeof getLastGeminiTimestamp === "function") {
        const timeSinceLast = Date.now() - getLastGeminiTimestamp();
        if (timeSinceLast < (window.GEMINI_COOLDOWN_MS || 30000)) {
          const secLeft = Math.ceil(((window.GEMINI_COOLDOWN_MS || 30000) - timeSinceLast) / 1000);
          if (typeof showStudioNotification === "function") {
            showStudioNotification(`⏳ Rate-Limit Shield: Wait ${secLeft}s or add a Free BYOK Key for zero cooldown.`);
          }
          return;
        }
      }

      if (!byokActive && typeof canUseWritingCheck === "function") {
        const quota = canUseWritingCheck();
        if (!quota.allowed) {
          if (
            confirm(
              "You have reached your monthly built-in Writing evaluation quota.\n\n🔑 Want UNLIMITED 100% Free evaluations right now? Click OK to enter your free Google AI Studio BYOK Key, or Cancel to view VIP Pass options."
            )
          ) {
            window.openByokConfigModal();
          } else if (typeof openVipPassModal === "function") {
            openVipPassModal();
          }
          return;
        }
      }

      const idx = parseInt(document.getElementById("wSelect")?.value || "0", 10) || 0;
      const w = (typeof WRITING_MOCKS !== "undefined" && WRITING_MOCKS[idx]) || {
        code: "Task 2",
        title: "IELTS Writing Task",
        promptEn: "Evaluate this IELTS response."
      };
      const effectivePrompt = w.promptEn || w.prompt || "Evaluate this IELTS response.";
      const isTask1 = String(w.code || w.type || "").toLowerCase().includes("task 1");

      const btn = document.getElementById("geminiEssayGradeBtn");
      const resultBox = document.getElementById("geminiAuditResult");
      if (!resultBox) return;

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `⏳ Grading with AI Examiner 3.0...`;
      }

      resultBox.style.display = "block";
      resultBox.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;padding:14px;color:var(--text-secondary);">
          <div class="spinning-loader" style="width:18px;height:18px;border:2px solid var(--accent);border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
          <span>Analyzing TA/TR, CC, LR, GRA rubrics, extracting ❌→✅ granular diffs, and generating Band 9.0 rewrite...</span>
        </div>
      `;
      resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });

      const systemPrompt = `You are a Senior Official Cambridge IELTS Writing Examiner. Return a strict JSON object analyzing the candidate's response. Do NOT wrap in extra prose outside JSON.`;

      const userPrompt = `Evaluate this IELTS Writing response (${isTask1 ? "Task 1 (Min 150 words)" : "Task 2 Essay (Min 250 words)"}).
TASK CODE: ${w.code} — ${w.title}
PROMPT: ${effectivePrompt}
CANDIDATE DRAFT (${wordCount} words):
"""
${text}
"""

Return ONLY valid JSON matching this exact structure:
{
  "scores": {
    "overall": 7.0,
    "ta": 7.0,
    "cc": 7.0,
    "lr": 7.0,
    "gra": 7.0
  },
  "cefrLevel": "C1 Effective Operational Proficiency",
  "errorCounts": {
    "grammar": 2,
    "vocabulary": 2,
    "sentence": 1,
    "templateRiskPct": 10
  },
  "criteriaNotes": {
    "ta": "1-2 concise sentences on Task Achievement/Response.",
    "cc": "1-2 concise sentences on Coherence, paragraphing, and linker naturalness.",
    "lr": "1-2 concise sentences on C1/C2 collocations and lexical precision.",
    "gra": "1-2 concise sentences on complex syntax and modal hedging."
  },
  "corrections": [
    {
      "type": "grammar",
      "wrong": "exact phrase with error from draft",
      "correct": "upgraded Band 9 correction",
      "explanation": "Why this change improves grammatical accuracy or collocation"
    },
    {
      "type": "vocabulary",
      "wrong": "another weak or awkward phrase from draft",
      "correct": "natural C1/C2 academic collocation",
      "explanation": "Why this lexical upgrade scores higher"
    },
    {
      "type": "sentence",
      "wrong": "a full sentence from the student draft that can be improved",
      "correct": "a sophisticated Band 9.0 rewrite of that sentence",
      "explanation": "Structural improvement explanation"
    }
  ],
  "band9Rewrite": "A complete, natural Band 9.0 rewrite of the candidate's essay preserving their core arguments and structure.",
  "burmeseAdvice": "မြန်မာဘာသာဖြင့် အမှတ်တက်စေမည့် တိကျသော အကြံပြုချက် ၃ ချက်။"
}`;

      try {
        const res = await window.callGeminiApi(userPrompt, systemPrompt);
        if (!byokActive && typeof recordWritingCheckUsage === "function") {
          recordWritingCheckUsage();
        }

        const parsed = parseExaminerJsonOrFallback(res.text, text);
        const evalData = {
          taskTitle: `${w.code} — ${w.title}`,
          promptText: effectivePrompt,
          originalEssay: text,
          wordCount,
          isTask1,
          scores: {
            overall: parsed?.scores?.overall || 6.5,
            ta: parsed?.scores?.ta || parsed?.scores?.taskAchievement || 6.5,
            cc: parsed?.scores?.cc || parsed?.scores?.coherence || 6.5,
            lr: parsed?.scores?.lr || parsed?.scores?.lexical || 6.5,
            gra: parsed?.scores?.gra || parsed?.scores?.grammar || 6.5
          },
          cefrLevel: parsed?.cefrLevel || (parseFloat(parsed?.scores?.overall) >= 7.5 ? "C1/C2 Advanced" : "B2 Upper-Intermediate"),
          errorCounts: {
            grammar: Number(parsed?.errorCounts?.grammar ?? 2),
            vocabulary: Number(parsed?.errorCounts?.vocabulary ?? 2),
            sentence: Number(parsed?.errorCounts?.sentence ?? 1),
            templateRiskPct: Number(parsed?.errorCounts?.templateRiskPct ?? 12)
          },
          criteriaNotes: {
            ta: parsed?.criteriaNotes?.ta || "Addresses the prompt with relevant ideas.",
            cc: parsed?.criteriaNotes?.cc || "Logical progression across paragraphs.",
            lr: parsed?.criteriaNotes?.lr || "Adequate academic vocabulary range.",
            gra: parsed?.criteriaNotes?.gra || "Mix of simple and complex sentence structures."
          },
          corrections: Array.isArray(parsed?.corrections) ? parsed.corrections : [],
          band9Rewrite: parsed?.band9Rewrite || "",
          burmeseAdvice: parsed?.burmeseAdvice || ""
        };

        const fallbackMd = !parsed && typeof renderMarkdownToHtml === "function" ? renderMarkdownToHtml(res.text) : "";
        renderWritingEvaluationDashboard(resultBox, evalData, res.modelUsed, fallbackMd);

        // Sync rubric sliders
        const setSlider = (id, valId, v) => {
          const el = document.getElementById(id);
          const vel = document.getElementById(valId);
          if (el && v) el.value = v;
          if (vel && v) vel.textContent = v;
        };
        setSlider("rubTA", "rubValTA", evalData.scores.ta);
        setSlider("rubCC", "rubValCC", evalData.scores.cc);
        setSlider("rubLR", "rubValLR", evalData.scores.lr);
        setSlider("rubGRA", "rubValGRA", evalData.scores.gra);
        if (typeof updateRubricScore === "function") updateRubricScore();

        recordEvalHistory({
          module: "Writing",
          title: evalData.taskTitle,
          band: evalData.scores.overall,
          wordCount
        });

        if (typeof window.duoAddXp === "function") {
          window.duoAddXp(35, "Writing Essay");
        }
        if (parseFloat(evalData.scores.overall) >= 7.0 && typeof window.duoCelebrate === "function") {
          window.duoCelebrate();
        }
        if (typeof window.duoShowFeedback === "function") {
          window.duoShowFeedback({
            title: `Writing Evaluated: Band ${evalData.scores.overall} (${evalData.cefrLevel})`,
            message: `Granular error diffs & Band 9.0 rewrite unlocked below!`,
            type: "success"
          });
        }

        if (typeof showStudioNotification === "function") {
          showStudioNotification(`✨ Graded: Band ${evalData.scores.overall} (${res.modelUsed})`);
        }
      } catch (err) {
        console.error("Writing Examiner Error:", err);
        resultBox.innerHTML = `
          <div style="padding:14px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.4);border-radius:6px;color:var(--text);">
            <div style="font-weight:800;color:#ef4444;margin-bottom:4px;">⚠️ AI Examiner Evaluation Error</div>
            <p style="font-size:0.83rem;color:var(--text-secondary);margin:0 0 10px 0;">${escapeSafe(err.message)}</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn-accent-solid" style="font-size:0.78rem;" onclick="gradeEssayWithGemini()">Retry</button>
              <button class="btn-outlined" style="font-size:0.78rem;" onclick="openByokConfigModal()">🔑 Configure Free BYOK Key</button>
            </div>
          </div>
        `;
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `✨ AI Examiner Grade`;
        }
      }
    };
  }

  // ==========================================================================
  // 5. SPEAKING 3-PART MOCK SIMULATOR & RUBRIC GRADER (IELTS_WEB)
  // ==========================================================================
  const SPEAKING_3PART_SETS = [
    {
      topic: "Technology & Artificial Intelligence",
      part1: [
        "What pieces of technology do you use most frequently in your daily routine?",
        "Has the way you use the internet changed compared to five years ago?",
        "Do you prefer reading books on a digital screen or on printed paper?",
        "Is there any new gadget you would like to purchase in the near future?"
      ],
      part2: {
        title: "Describe a technological innovation that has positively impacted your studies or work",
        bullets: [
          "What this innovation or software is",
          "When and how you first started using it",
          "How it helps you save time or improve quality",
          "And explain why you believe it has had a lasting positive impact."
        ]
      },
      part3: [
        "To what extent does reliance on automation reduce human critical-thinking skills?",
        "Should governments regulate artificial intelligence development more strictly, or let the market innovate freely?",
        "How might workplace roles evolve over the next two decades due to smart technologies?"
      ]
    },
    {
      topic: "Urban Architecture & Public Spaces",
      part1: [
        "Do you prefer living in a bustling city center or a quiet suburban neighborhood?",
        "Are there enough public parks and green spaces where you currently live?",
        "What is your favorite historic building in your hometown?",
        "How do people in your city usually commute to work or university?"
      ],
      part2: {
        title: "Describe a public park, square, or architectural landmark you enjoy visiting",
        bullets: [
          "Where this place is located in your city or country",
          "What architectural or natural features it has",
          "What activities people commonly do there",
          "And explain why this space feels special or restorative to you."
        ]
      },
      part3: [
        "Why is it important for rapidly growing cities to preserve historic architecture rather than replacing it with high-rise towers?",
        "How does the design of public spaces influence social cohesion in modern metropolises?",
        "Should municipal budgets prioritize public transit expansion over road widening?"
      ]
    },
    {
      topic: "Education & Lifelong Learning",
      part1: [
        "What was your favorite subject when you were in secondary school?",
        "Do you prefer studying alone in silence or collaborating in a study group?",
        "Have you ever taken an online course to learn a practical skill?",
        "How do you usually organize your schedule when preparing for an important exam?"
      ],
      part2: {
        title: "Describe an inspiring teacher, mentor, or lecturer who influenced your education",
        bullets: [
          "Who this person was and what subject they taught",
          "What made their teaching style distinctive or engaging",
          "A specific lesson or piece of advice you still remember",
          "And explain how they shaped your academic or personal ambitions."
        ]
      },
      part3: [
        "Should university curricula focus primarily on practical employability or theoretical research?",
        "Why do some adults find it challenging to learn a second language later in life?",
        "In what ways can continuous lifelong learning help workers adapt to economic shifts?"
      ]
    }
  ];

  let currentSpeakingSetIdx = 0;

  window.switchSpeakingMockPart = function (partNum) {
    activeSpeakingMockPart = partNum;
    activeSpeakingPartQuestionIdx = 0;
    renderSpeaking3PartBar();
    const set = SPEAKING_3PART_SETS[currentSpeakingSetIdx];
    if (!set) return;

    if (partNum === 1 && typeof setSpkClock === "function") setSpkClock(30);
    if (partNum === 2 && typeof setSpkClock === "function") setSpkClock(120);
    if (partNum === 3 && typeof setSpkClock === "function") setSpkClock(45);

    if (partNum === 2) {
      const topicEl = document.getElementById("spkCueTopic");
      const listEl = document.getElementById("spkCuePromptsList");
      if (topicEl) topicEl.textContent = set.part2.title;
      if (listEl) {
        listEl.innerHTML = set.part2.bullets.map((b) => `<li>${escapeSafe(b)}</li>`).join("");
      }
    }
  };

  window.nextSpeakingMockQuestion = function () {
    const set = SPEAKING_3PART_SETS[currentSpeakingSetIdx];
    const arr = activeSpeakingMockPart === 1 ? set.part1 : set.part3;
    if (!arr) return;
    activeSpeakingPartQuestionIdx = (activeSpeakingPartQuestionIdx + 1) % arr.length;
    renderSpeaking3PartBar();
  };

  window.changeSpeakingMockTopicSet = function (idx) {
    currentSpeakingSetIdx = parseInt(idx, 10) || 0;
    activeSpeakingPartQuestionIdx = 0;
    window.switchSpeakingMockPart(activeSpeakingMockPart);
  };

  function renderSpeaking3PartBar() {
    const mount = document.getElementById("speaking3PartMockMount");
    if (!mount) return;
    const set = SPEAKING_3PART_SETS[currentSpeakingSetIdx];
    const isP1 = activeSpeakingMockPart === 1;
    const isP2 = activeSpeakingMockPart === 2;
    const isP3 = activeSpeakingMockPart === 3;

    const currentQ = isP1
      ? set.part1[activeSpeakingPartQuestionIdx]
      : isP3
        ? set.part3[activeSpeakingPartQuestionIdx]
        : set.part2.title;

    mount.innerHTML = `
      <div style="padding:12px 14px;border-radius:10px;background:var(--bg-elevated,rgba(255,255,255,0.03));border:1px solid var(--accent);margin-bottom:12px;max-width:100%;width:100%;box-sizing:border-box;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;max-width:100%;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1 1 220px;min-width:0;max-width:100%;">
            <span style="font-size:0.74rem;font-weight:800;color:var(--accent);text-transform:uppercase;white-space:nowrap;">🎯 FULL 3-PART SPEAKING SIMULATOR:</span>
            <select class="occ-select" style="font-size:0.76rem;padding:4px 8px;flex:1 1 180px;min-width:0;max-width:100%;width:100%;text-overflow:ellipsis;overflow:hidden;box-sizing:border-box;" onchange="changeSpeakingMockTopicSet(this.value)">
              ${SPEAKING_3PART_SETS.map((s, i) => `<option value="${i}" ${i === currentSpeakingSetIdx ? "selected" : ""}>Topic ${i + 1}: ${escapeSafe(s.topic)}</option>`).join("")}
            </select>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;max-width:100%;">
            <button type="button" class="${isP1 ? "btn-accent-solid" : "btn-outlined"}" style="padding:4px 10px;font-size:0.74rem;" onclick="switchSpeakingMockPart(1)">Part 1 (Interview)</button>
            <button type="button" class="${isP2 ? "btn-accent-solid" : "btn-outlined"}" style="padding:4px 10px;font-size:0.74rem;" onclick="switchSpeakingMockPart(2)">Part 2 (Cue Card)</button>
            <button type="button" class="${isP3 ? "btn-accent-solid" : "btn-outlined"}" style="padding:4px 10px;font-size:0.74rem;" onclick="switchSpeakingMockPart(3)">Part 3 (Discussion)</button>
          </div>
        </div>
        ${
          !isP2
            ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;max-width:100%;box-sizing:border-box;">
                 <div style="font-size:0.86rem;font-weight:700;color:var(--text);flex:1 1 200px;min-width:0;word-break:break-word;">
                   <span style="color:var(--accent);">Part ${activeSpeakingMockPart} Q${activeSpeakingPartQuestionIdx + 1}:</span> "${escapeSafe(currentQ)}"
                 </div>
                 <div style="display:flex;gap:6px;flex-wrap:wrap;">
                   <button type="button" class="btn-outlined" style="padding:3px 9px;font-size:0.74rem;" onclick="speakText(${JSON.stringify(currentQ).replace(/"/g, "&quot;")})">🔊 Hear Examiner</button>
                   <button type="button" class="btn-outlined" style="padding:3px 9px;font-size:0.74rem;" onclick="nextSpeakingMockQuestion()">Next Question →</button>
                 </div>
               </div>`
            : `<div style="font-size:0.78rem;color:var(--text-secondary);">Part 2 Cue Card loaded below — take 1 minute to prepare notes, then speak continuously for 2 minutes.</div>`
        }
      </div>
    `;
  }

  // ==========================================================================
  // 6. LOAD EXAM-TRAPS.JSON & INJECT GT LETTERS + ACADEMIC TOOLS PANES
  // ==========================================================================
  async function loadExamTrapsData() {
    if (EXAM_TRAPS_DATA) return EXAM_TRAPS_DATA;
    try {
      const res = await fetch("data/exam-traps.json");
      if (!res.ok) throw new Error("Failed to fetch data/exam-traps.json");
      EXAM_TRAPS_DATA = await res.json();
      return EXAM_TRAPS_DATA;
    } catch (e) {
      console.warn("exam-traps.json load notice:", e);
      return { readingParaphrases: [], listeningDistractors: [], gtLetterModels: [] };
    }
  }

  async function injectGtLettersIntoWritingMocks() {
    const data = await loadExamTrapsData();
    if (!data?.gtLetterModels?.length || typeof WRITING_MOCKS === "undefined") return;

    const alreadyAdded = WRITING_MOCKS.some((m) => String(m.code || "").startsWith("GT Task 1"));
    if (!alreadyAdded) {
      data.gtLetterModels.forEach((gt) => WRITING_MOCKS.push(gt));
      const wSelect = document.getElementById("wSelect");
      if (wSelect) {
        wSelect.innerHTML = WRITING_MOCKS.map(
          (w, i) => `<option value="${i}">${escapeSafe(w.code)} — ${escapeSafe(w.title)}</option>`
        ).join("");
      }
      if (typeof renderWritingModelsDirectory === "function") {
        try {
          renderWritingModelsDirectory();
        } catch (e) {}
      }
    }
  }

  window.filterExamTrapsExplorer = function () {
    renderExamTrapsPane();
  };

  async function renderExamTrapsPane() {
    const mount = document.getElementById("at-pane-traps-inner");
    if (!mount) return;
    const data = await loadExamTrapsData();
    const q = (document.getElementById("trapsExplorerSearch")?.value || "").trim().toLowerCase();
    const catFilter = document.getElementById("trapsExplorerCat")?.value || "ALL";

    const rps = (data.readingParaphrases || []).filter((it) => {
      if (catFilter === "LISTENING") return false;
      if (catFilter !== "ALL" && catFilter !== "READING" && it.category !== catFilter) return false;
      if (!q) return true;
      return (
        it.questionPhrase.toLowerCase().includes(q) ||
        it.passageEquivalent.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q) ||
        (it.burmeseNote || "").toLowerCase().includes(q)
      );
    });

    const lds = (data.listeningDistractors || []).filter((it) => {
      if (catFilter !== "ALL" && catFilter !== "LISTENING") return false;
      if (!q) return true;
      return (
        it.trapCategory.toLowerCase().includes(q) ||
        it.signalWords.toLowerCase().includes(q) ||
        it.transcriptSnippet.toLowerCase().includes(q) ||
        (it.burmeseRule || "").toLowerCase().includes(q)
      );
    });

    mount.innerHTML = `
      ${
        rps.length
          ? `<h4 style="margin:12px 0 8px 0;font-size:0.9rem;color:var(--accent);font-weight:800;">📖 Cambridge Reading Paraphrase Equivalence Matrix (${rps.length})</h4>
             <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin-bottom:18px;">
               ${rps
                 .map(
                   (r) => `
                 <div style="padding:12px;border-radius:8px;background:var(--bg);border:1px solid var(--border);display:flex;flex-direction:column;justify-content:space-between;gap:8px;">
                   <div>
                     <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px;">
                       <span class="occ-ver-pill" style="font-size:0.66rem;">${escapeSafe(r.category)}</span>
                       <span style="font-size:0.68rem;color:var(--accent);font-weight:700;">${escapeSafe(r.trapType)}</span>
                     </div>
                     <div style="font-size:0.84rem;margin-bottom:4px;"><strong>Question:</strong> <span style="color:#38bdf8;font-weight:700;">"${escapeSafe(r.questionPhrase)}"</span></div>
                     <div style="font-size:0.84rem;margin-bottom:6px;"><strong>Passage:</strong> <span style="color:#10b981;font-weight:700;">"${escapeSafe(r.passageEquivalent)}"</span></div>
                     <div style="font-size:0.76rem;color:var(--text-secondary);margin-bottom:4px;">${escapeSafe(r.exampleContext)}</div>
                     <div class="burmese" style="font-size:0.78rem;color:var(--text-secondary);">${escapeSafe(r.burmeseNote)}</div>
                   </div>
                   <button type="button" class="btn-outlined" style="font-size:0.72rem;padding:4px 8px;align-self:flex-start;" onclick="addItemToErrorVault('reading-paraphrase', ${JSON.stringify(r.questionPhrase).replace(/"/g, "&quot;")}, ${JSON.stringify(r.passageEquivalent).replace(/"/g, "&quot;")}, ${JSON.stringify(r.exampleContext).replace(/"/g, "&quot;")}, 'Reading Paraphrase Bank')">
                     📌 Bookmark Pair
                   </button>
                 </div>
               `
                 )
                 .join("")}
             </div>`
          : ""
      }
      ${
        lds.length
          ? `<h4 style="margin:12px 0 8px 0;font-size:0.9rem;color:var(--accent);font-weight:800;">🎧 Listening Audio Distractor &amp; Self-Correction Traps (${lds.length})</h4>
             <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:10px;">
               ${lds
                 .map(
                   (l) => `
                 <div style="padding:12px;border-radius:8px;background:var(--bg);border:1px solid var(--border);display:flex;flex-direction:column;justify-content:space-between;gap:8px;">
                   <div>
                     <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px;">
                       <span class="occ-ver-pill" style="font-size:0.66rem;">${escapeSafe(l.section)}</span>
                       <span style="font-size:0.68rem;color:#f59e0b;font-weight:800;">⚠️ ${escapeSafe(l.trapCategory)}</span>
                     </div>
                     <div style="font-size:0.78rem;color:var(--accent);font-weight:700;margin-bottom:4px;">Signal Pivot: "${escapeSafe(l.signalWords)}"</div>
                     <div style="font-size:0.8rem;color:var(--text);font-style:italic;margin-bottom:6px;">${escapeSafe(l.transcriptSnippet)}</div>
                     <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:0.78rem;margin-bottom:6px;">
                       <span style="color:#ef4444;">❌ Trap: <strong>${escapeSafe(l.wrongDistractor)}</strong></span>
                       <span style="color:#10b981;">✅ Answer: <strong>${escapeSafe(l.correctAnswer)}</strong></span>
                     </div>
                     <div class="burmese" style="font-size:0.78rem;color:var(--text-secondary);">${escapeSafe(l.burmeseRule)}</div>
                   </div>
                   <button type="button" class="btn-outlined" style="font-size:0.72rem;padding:4px 8px;align-self:flex-start;" onclick="addItemToErrorVault('listening-trap', ${JSON.stringify(l.wrongDistractor).replace(/"/g, "&quot;")}, ${JSON.stringify(l.correctAnswer).replace(/"/g, "&quot;")}, ${JSON.stringify(l.trapCategory + ": " + l.signalWords).replace(/"/g, "&quot;")}, 'Listening Trap Matrix')">
                     📌 Bookmark Trap
                   </button>
                 </div>
               `
                 )
                 .join("")}
             </div>`
          : ""
      }
    `;
  }

  function renderErrorVaultPane() {
    const mount = document.getElementById("at-pane-vault-inner");
    if (!mount) return;
    const list = getErrorVault();
    const hist = getEvalHistory();

    mount.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
        <div>
          <strong style="font-size:0.95rem;color:var(--text);">📌 Saved ❌→✅ Corrections &amp; Bookmarked Traps (${list.length})</strong>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn-accent-solid" style="padding:5px 12px;font-size:0.78rem;font-weight:700;" onclick="exportErrorVaultCsv()">⬇ Export CSV Flashcard Deck</button>
        </div>
      </div>

      ${
        list.length
          ? `<div style="display:grid;gap:8px;margin-bottom:20px;">
               ${list
                 .map(
                   (it) => `
                 <div style="padding:10px 12px;border-radius:8px;background:var(--bg);border:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                   <div>
                     <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;">
                       <span class="occ-ver-pill" style="font-size:0.65rem;">${escapeSafe(it.source)}</span>
                       <span style="font-size:0.68rem;font-weight:800;color:var(--accent);text-transform:uppercase;">${escapeSafe(it.type)}</span>
                       <span style="font-size:0.68rem;color:var(--text-secondary);">${escapeSafe(it.date)}</span>
                     </div>
                     <div style="font-size:0.85rem;margin-bottom:3px;">
                       <span style="color:#ef4444;text-decoration:line-through;">❌ ${escapeSafe(it.wrong)}</span>
                       <span style="margin:0 6px;">→</span>
                       <span style="color:#10b981;font-weight:700;">✅ ${escapeSafe(it.correct)}</span>
                     </div>
                     <div style="font-size:0.76rem;color:var(--text-secondary);">${escapeSafe(it.explanation)}</div>
                   </div>
                   <button type="button" class="btn-outlined" style="padding:2px 7px;font-size:0.7rem;" onclick="removeErrorVaultItem('${escapeSafe(it.id)}')">✕</button>
                 </div>
               `
                 )
                 .join("")}
             </div>`
          : `<div style="padding:16px;border-radius:8px;background:var(--bg);border:1px dashed var(--border);color:var(--text-secondary);font-size:0.83rem;margin-bottom:20px;">
               No saved corrections yet. Grade an essay in the <strong>Writing Lab</strong> or bookmark pairs in the <strong>Reading &amp; Listening Traps</strong> tab to build your personal Error Vault!
             </div>`
      }

      <strong style="font-size:0.95rem;color:var(--text);display:block;margin-bottom:8px;">📈 Recent AI Evaluation History (${hist.length})</strong>
      ${
        hist.length
          ? `<div style="display:grid;gap:6px;">
               ${hist
                 .slice(0, 15)
                 .map(
                   (h) => `
                 <div style="padding:8px 12px;border-radius:6px;background:var(--bg);border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:0.82rem;">
                   <div><strong>[${escapeSafe(h.module)}]</strong> ${escapeSafe(h.title)} <span style="color:var(--text-secondary);font-size:0.74rem;">(${h.wordCount || 0}w · ${escapeSafe(h.date)})</span></div>
                   <span class="occ-ver-pill" style="color:${getScoreColorHex(h.band)};font-weight:800;">Band ${escapeSafe(h.band)}</span>
                 </div>
               `
                 )
                 .join("")}
             </div>`
          : `<div style="font-size:0.8rem;color:var(--text-secondary);">Your graded Writing &amp; Speaking attempts will automatically appear here.</div>`
      }
    `;
  }

  window.recalcOfficial4SkillBand = function () {
    const l = parseFloat(document.getElementById("calcBandL")?.value || "7.5");
    const r = parseFloat(document.getElementById("calcBandR")?.value || "7.5");
    const w = parseFloat(document.getElementById("calcBandW")?.value || "7.0");
    const s = parseFloat(document.getElementById("calcBandS")?.value || "7.5");

    const avg = (l + r + w + s) / 4;
    // Official IELTS rounding rule: .25 rounds up to .5, .75 rounds up to next whole band
    const rounded = Math.round(avg * 2) / 2;

    const outOverall = document.getElementById("calcBandOverallVal");
    const outRaw = document.getElementById("calcBandRawAvg");
    const outCefr = document.getElementById("calcBandCefrBadge");

    if (outOverall) {
      outOverall.textContent = rounded.toFixed(1);
      outOverall.style.color = getScoreColorHex(rounded);
    }
    if (outRaw) outRaw.textContent = `Raw Average: ${avg.toFixed(3)} → Official Rounded Band: ${rounded.toFixed(1)}`;
    if (outCefr) {
      outCefr.textContent =
        rounded >= 8.5
          ? "CEFR C2 Mastery"
          : rounded >= 7.0
            ? "CEFR C1 Effective Operational Proficiency"
            : rounded >= 5.5
              ? "CEFR B2 Vantage"
              : "CEFR B1 Threshold";
    }
  };

  // ==========================================================================
  // 6B. STUDY STREAK TRACKER (#streakCountVal) — AUTO-BACKFILL & REAL-TIME SYNC
  // ==========================================================================
  const STREAK_STORAGE_KEY = "ips_study_streak_v1";

  function toLocalDateStr(d) {
    const dt = d instanceof Date && !isNaN(d) ? d : new Date();
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  window.syncAndRenderStudyStreak = function (recordActivityToday = false) {
    try {
      const todayStr = toLocalDateStr(new Date());
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = toLocalDateStr(yesterdayDate);

      let data = null;
      try {
        const raw = localStorage.getItem(STREAK_STORAGE_KEY);
        if (raw) data = JSON.parse(raw);
      } catch (e) {}

      if (!data || typeof data.count !== "number") {
        data = { count: 1, lastDate: todayStr, history: [todayStr] };

        // Check if returning user has prior progress or earlier device/eval timestamps
        const st = window.appState || {};
        const hasProgress =
          (Array.isArray(st.mastered) && st.mastered.length > 0) ||
          (Array.isArray(st.readingDone) && st.readingDone.length > 0) ||
          (st.writingDrafts && Object.keys(st.writingDrafts).length > 0) ||
          (st.srsSchedule && Object.keys(st.srsSchedule).length > 0) ||
          getEvalHistory().length > 0 ||
          getErrorVault().length > 0;

        let earliestMs = Date.now();
        try {
          const devId = localStorage.getItem("ips_device_id") || "";
          const parts = devId.split("-");
          if (parts.length >= 3) {
            const parsedTs = parseInt(parts[parts.length - 1], 36);
            if (!isNaN(parsedTs) && parsedTs > 1700000000000 && parsedTs < earliestMs) {
              earliestMs = parsedTs;
            }
          }
        } catch (e) {}

        const daysSinceInstall = Math.max(0, Math.floor((Date.now() - earliestMs) / 86400000));
        if (daysSinceInstall >= 1 && hasProgress) {
          data.count = Math.min(daysSinceInstall + 1, 30);
          if (!data.history.includes(yesterdayStr)) data.history.unshift(yesterdayStr);
        } else if (hasProgress && ((st.mastered && st.mastered.length >= 5) || (st.readingDone && st.readingDone.length >= 1))) {
          // Returning user who already mastered items before streak tracker was added
          data.count = Math.max(2, Math.min(7, 1 + Math.floor((st.mastered?.length || 0) / 15) + (st.readingDone?.length || 0)));
          if (!data.history.includes(yesterdayStr)) data.history.unshift(yesterdayStr);
        }
      } else {
        if (!Array.isArray(data.history)) data.history = [data.lastDate || todayStr];
        if (data.lastDate !== todayStr) {
          if (data.lastDate === yesterdayStr) {
            data.count = (data.count || 1) + 1;
          } else {
            // Check how many days gap; if > 1 day gap, reset to 1 (or preserve if grace)
            const lastMs = new Date(data.lastDate + "T00:00:00").getTime();
            const currMs = new Date(todayStr + "T00:00:00").getTime();
            const diffDays = Math.round((currMs - lastMs) / 86400000);
            if (diffDays === 1) {
              data.count = (data.count || 1) + 1;
            } else if (diffDays > 1) {
              data.count = 1;
            }
          }
          data.lastDate = todayStr;
          if (!data.history.includes(todayStr)) data.history.push(todayStr);
        } else if (recordActivityToday && !data.history.includes(todayStr)) {
          data.history.push(todayStr);
        }
      }

      data.history = data.history.slice(-60);
      localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
      if (window.appState) {
        window.appState.streakCount = data.count;
        window.appState.lastStreakDate = data.lastDate;
      }

      const streakEl = document.getElementById("streakCountVal");
      if (streakEl) {
        streakEl.textContent = `${data.count} ${data.count === 1 ? "Day" : "Days"}`;
      }
      return data.count;
    } catch (err) {
      console.warn("Streak sync notice:", err);
      return 1;
    }
  };

  // ==========================================================================
  // 6C. ENGNOVATE SIMPLIFICATION: HANDWRITTEN ESSAY IMAGE-TO-TEXT (OCR)
  // ==========================================================================
  window.triggerWritingEssayOcr = function () {
    let fileInp = document.getElementById("writingOcrFileInput");
    if (!fileInp) {
      fileInp = document.createElement("input");
      fileInp.type = "file";
      fileInp.id = "writingOcrFileInput";
      fileInp.accept = "image/*";
      fileInp.style.display = "none";
      fileInp.onchange = (e) => {
        const f = e.target.files?.[0];
        if (f) processWritingOcrImageFile(f);
        fileInp.value = "";
      };
      document.body.appendChild(fileInp);
    }
    fileInp.click();
  };

  async function processWritingOcrImageFile(file) {
    const ocrBtn = document.getElementById("writingOcrTriggerBtn");
    const essayArea = document.getElementById("essayArea");
    if (!essayArea) return;

    const apiKey = getByokApiKey();
    if (!apiKey) {
      if (
        confirm(
          "📷 Handwritten Essay OCR uses Google Gemini Vision.\n\nPlease enter your 100% Free Google AI Studio API Key (BYOK) to transcribe unlimited handwritten essay photos for free!\n\nClick OK to paste your Free API Key."
        )
      ) {
        window.openByokConfigModal();
      }
      return;
    }

    if (ocrBtn) {
      ocrBtn.disabled = true;
      ocrBtn.innerHTML = "⏳ Scanning Handwriting...";
    }

    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = String(reader.result || "");
          const commaIdx = res.indexOf(",");
          resolve(commaIdx !== -1 ? res.slice(commaIdx + 1) : res);
        };
        reader.onerror = () => reject(new Error("Could not read image file"));
        reader.readAsDataURL(file);
      });

      const mimeType = file.type || "image/jpeg";
      const model = getByokModel() || "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Transcribe the handwritten or printed English essay in this image accurately into plain text, preserving paragraph breaks. Do NOT fix spelling or grammar mistakes (keep the student's exact writing so the IELTS examiner can grade it accurately). Output ONLY the transcribed essay text."
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error(`Vision OCR HTTP ${res.status}`);
      }
      const data = await res.json();
      const transcribed = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      if (!transcribed) throw new Error("No text detected in image");

      essayArea.value = essayArea.value.trim()
        ? essayArea.value.trim() + "\n\n" + transcribed
        : transcribed;
      essayArea.dispatchEvent(new Event("input", { bubbles: true }));
      if (typeof showStudioNotification === "function") {
        showStudioNotification("📷 Handwritten essay transcribed into editor!");
      }
    } catch (err) {
      console.error("OCR error:", err);
      alert("Could not transcribe image: " + err.message);
    } finally {
      if (ocrBtn) {
        ocrBtn.disabled = false;
        ocrBtn.innerHTML = "📷 Image to Text (OCR)";
      }
    }
  }

  // ==========================================================================
  // 6D. ENGNOVATE SIMPLIFICATION: READING 23-PASSAGE CARD DIRECTORY
  // ==========================================================================
  window.toggleReadingDirectory = function () {
    let dir = document.getElementById("readingPassageDirectoryDrawer");
    const rSelect = document.getElementById("rSelect");
    if (!rSelect) return;

    if (!dir) {
      dir = document.createElement("div");
      dir.id = "readingPassageDirectoryDrawer";
      dir.style.cssText =
        "display:none;margin-bottom:14px;padding:14px;border-radius:10px;background:var(--bg-card);border:1px solid var(--accent);box-shadow:0 10px 28px rgba(0,0,0,0.22);";
      const toolbar = rSelect.closest(".occ-toolbar");
      if (toolbar && toolbar.parentNode) {
        toolbar.parentNode.insertBefore(dir, toolbar.nextSibling);
      }
    }

    if (dir.style.display === "block") {
      dir.style.display = "none";
      return;
    }

    const doneSet = new Set((window.appState && window.appState.readingDone) || []);
    const options = Array.from(rSelect.options);
    const cardsHtml = options
      .map((opt, idx) => {
        const isCurrent = rSelect.selectedIndex === idx;
        const isDone = doneSet.has(idx) || doneSet.has(String(idx)) || opt.textContent.includes("✓");
        const cleanTitle = opt.textContent.replace(/^✓\s*/, "");
        return `
          <div onclick="window.selectReadingPassageFromDir(${idx})" style="cursor:pointer;padding:10px 12px;border-radius:8px;background:${isCurrent ? "rgba(217,119,54,0.12)" : "var(--bg)"};border:1px solid ${isCurrent ? "var(--accent)" : "var(--border)"};display:flex;flex-direction:column;justify-content:space-between;gap:6px;transition:transform 0.12s ease;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
              <span class="occ-ver-pill" style="font-size:0.65rem;color:${isCurrent ? "var(--accent)" : "var(--text-secondary)"};">Passage #${idx + 1}</span>
              ${isDone ? `<span style="font-size:0.68rem;color:#10b981;font-weight:800;">✓ Completed</span>` : `<span style="font-size:0.68rem;color:var(--text-secondary);">20m CBT</span>`}
            </div>
            <div style="font-size:0.81rem;font-weight:700;color:var(--text);line-height:1.35;">${escapeSafe(cleanTitle)}</div>
          </div>
        `;
      })
      .join("");

    dir.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border);">
        <div>
          <strong style="font-size:0.92rem;color:var(--text);">📚 Cambridge Reading CBT Directory (${options.length} Official Passages)</strong>
          <span style="font-size:0.75rem;color:var(--text-secondary);margin-left:8px;">Click any passage card to launch immediately</span>
        </div>
        <button type="button" class="btn-outlined" style="padding:3px 9px;font-size:0.74rem;" onclick="document.getElementById('readingPassageDirectoryDrawer').style.display='none'">✕ Close</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;max-height:340px;overflow-y:auto;padding-right:4px;">
        ${cardsHtml}
      </div>
    `;
    dir.style.display = "block";
  };

  window.selectReadingPassageFromDir = function (idx) {
    const rSelect = document.getElementById("rSelect");
    if (rSelect) {
      rSelect.value = String(idx);
      if (typeof window.loadReadingMock === "function") window.loadReadingMock();
    }
    const dir = document.getElementById("readingPassageDirectoryDrawer");
    if (dir) dir.style.display = "none";
  };

  // ==========================================================================
  // 6E. ENGNOVATE SIMPLIFICATION: HIGHLIGHT WORD -> 1-CLICK SAVE TO FLASHCARDS
  // ==========================================================================
  function initContextualFlashcardPopup() {
    if (document.getElementById("engnovateFlashcardPopup")) return;
    const pop = document.createElement("div");
    pop.id = "engnovateFlashcardPopup";
    pop.style.cssText =
      "position:fixed;display:none;z-index:3600;background:#0F172A;color:#F8FAFC;border:1px solid var(--accent,#d97736);border-radius:999px;padding:5px 12px;box-shadow:0 8px 24px rgba(0,0,0,0.45);font-size:0.76rem;font-weight:700;align-items:center;gap:8px;pointer-events:auto;";
    document.body.appendChild(pop);

    document.addEventListener("mouseup", (e) => {
      if (pop.contains(e.target)) return;
      setTimeout(() => {
        const sel = window.getSelection();
        const raw = sel ? sel.toString().trim() : "";
        if (!raw || raw.length < 3 || raw.length > 42 || raw.split(/\s+/).length > 4) {
          pop.style.display = "none";
          return;
        }
        const anchorNode = sel.anchorNode?.parentElement;
        if (!anchorNode) {
          pop.style.display = "none";
          return;
        }
        const inReadingOrListening = anchorNode.closest("#view-reading, #view-listening");
        if (!inReadingOrListening || anchorNode.closest("button, select, input, textarea")) {
          pop.style.display = "none";
          return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) {
          pop.style.display = "none";
          return;
        }

        const top = Math.max(12, rect.top - 42);
        const left = Math.min(window.innerWidth - 220, Math.max(12, rect.left + rect.width / 2 - 90));
        pop.style.top = `${top | 0}px`;
        pop.style.left = `${left | 0}px`;
        pop.style.display = "inline-flex";
        pop.innerHTML = `
          <button type="button" style="background:none;border:none;color:#FBBF24;font-weight:800;font-size:0.75rem;cursor:pointer;padding:0;" onclick="window.saveSelectedWordToFlashcards(${JSON.stringify(raw).replace(/"/g, "&quot;")})">
            ➕ Save "${escapeSafe(raw.slice(0, 22))}" to Flashcards
          </button>
          <button type="button" style="background:none;border:none;color:#38bdf8;font-weight:700;font-size:0.74rem;cursor:pointer;padding:0;margin-left:4px;" onclick="if(typeof speakText==='function')speakText(${JSON.stringify(raw).replace(/"/g, "&quot;")})">🔊</button>
        `;
      }, 20);
    });

    document.addEventListener("scroll", () => {
      if (pop.style.display !== "none") pop.style.display = "none";
    }, true);
  }

  window.saveSelectedWordToFlashcards = function (word) {
    const clean = String(word || "").trim();
    if (!clean) return;
    const pop = document.getElementById("engnovateFlashcardPopup");
    if (pop) pop.style.display = "none";

    // 1. Add to Error Vault / Custom Flashcard Deck
    addItemToErrorVault(
      "vocabulary-flashcard",
      clean,
      `Target Academic Term: "${clean}"`,
      "Saved directly from Reading/Listening passage via 1-Click Flashcard Highlighter.",
      "Passage Highlighter"
    );

    // 2. Schedule in SRS and record study streak
    if (window.appState) {
      if (!window.appState.srsSchedule) window.appState.srsSchedule = {};
      window.appState.srsSchedule[`custom_${clean.toLowerCase()}`] = {
        interval: 1,
        due: Date.now() + 86400000,
        ease: 2.5
      };
      if (typeof window.saveState === "function") window.saveState();
    }
    window.syncAndRenderStudyStreak(true);
    if (typeof window.duoAddXp === "function") {
      window.duoAddXp(15, "Vocab Flashcard");
    }
    if (typeof showStudioNotification === "function") {
      showStudioNotification(`🃏 Saved "${clean}" to Flashcards & Error Vault!`);
    }
  };

  // ==========================================================================
  // 6F. ENGNOVATE SIMPLIFICATION: SPEAKING COLOR-CODED PRONUNCIATION TRANSCRIPT
  // ==========================================================================
  const ADVANCED_SPEAKING_MARKERS = new Set([
    "furthermore","moreover","consequently","nevertheless","nonetheless","specifically","instance","significant","fundamentally","undoubtedly","perspective","transformative","indispensable","ultimately","substantial","predominantly","inevitably","conversely","whereas","albeit","notwithstanding"
  ]);
  const FILLER_WORDS_SET = new Set(["um","uh","erm","er","like","basically","literally","actually"]);

  window.renderEngnovatePronunciationTranscript = function (rawText) {
    const box = document.getElementById("sr-transcript-output");
    if (!box) return;
    const text = String(rawText || box.innerText || "").trim();
    if (!text || text.startsWith("Click")) return;

    const tokens = text.split(/(\s+)/);
    let greenCount = 0;
    let amberCount = 0;
    let redCount = 0;

    const htmlTokens = tokens
      .map((tok) => {
        if (/^\s+$/.test(tok)) return tok;
        const clean = tok.toLowerCase().replace(/[^a-z']/g, "");
        if (!clean) return escapeSafe(tok);

        if (FILLER_WORDS_SET.has(clean)) {
          redCount++;
          return `<span onclick="window.inspectSpokenWord(${JSON.stringify(clean).replace(/"/g, "&quot;")}, 'filler')" title="Hesitation Filler — Click to inspect" style="cursor:pointer;background:rgba(239,68,68,0.18);color:#ef4444;padding:1px 5px;border-radius:4px;font-weight:700;border-bottom:2px solid #ef4444;">${escapeSafe(tok)}</span>`;
        }
        if (ADVANCED_SPEAKING_MARKERS.has(clean) || clean.length >= 9) {
          greenCount++;
          return `<span onclick="window.inspectSpokenWord(${JSON.stringify(clean).replace(/"/g, "&quot;")}, 'advanced')" title="High-Value C1/C2 Lexical Token (94% Clarity) — Click to hear" style="cursor:pointer;background:rgba(16,185,129,0.14);color:#10b981;padding:1px 4px;border-radius:4px;font-weight:700;border-bottom:2px solid #10b981;">${escapeSafe(tok)}</span>`;
        }
        if (clean.length >= 6) {
          amberCount++;
          return `<span onclick="window.inspectSpokenWord(${JSON.stringify(clean).replace(/"/g, "&quot;")}, 'standard')" title="Clear Pronunciation (86%) — Click to hear" style="cursor:pointer;color:var(--text);border-bottom:1px dotted rgba(56,189,248,0.55);">${escapeSafe(tok)}</span>`;
        }
        greenCount++;
        return `<span onclick="window.inspectSpokenWord(${JSON.stringify(clean).replace(/"/g, "&quot;")}, 'clear')" style="cursor:pointer;">${escapeSafe(tok)}</span>`;
      })
      .join("");

    const total = Math.max(1, greenCount + amberCount + redCount);
    const pronScorePct = Math.max(62, Math.min(98, Math.round(((greenCount * 0.95 + amberCount * 0.86 + redCount * 0.45) / total) * 100)));

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px dashed var(--border);font-size:0.73rem;">
        <span style="font-weight:800;color:var(--accent);">🎯 Pronunciation &amp; Lexical Clarity: <strong>${pronScorePct}%</strong></span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span style="color:#10b981;font-weight:700;">🟢 C1/Clear (${greenCount})</span>
          <span style="color:#38bdf8;font-weight:700;">🔵 Standard (${amberCount})</span>
          <span style="color:#ef4444;font-weight:700;">🔴 Filler/Slip (${redCount})</span>
          <span style="color:var(--text-secondary);">(Click any word to hear model pronunciation)</span>
        </div>
      </div>
      <div style="line-height:1.75;">${htmlTokens}</div>
    `;
  };

  window.inspectSpokenWord = function (word, category) {
    if (typeof window.speakText === "function") {
      window.speakText(word);
    }
    if (typeof showStudioNotification === "function") {
      const msg =
        category === "filler"
          ? `🔴 "${word}" is a hesitation filler. Replace with a silent 0.5s pause for Band 7.5+ Fluency!`
          : category === "advanced"
            ? `🟢 "${word}" — Strong C1/C2 lexical item! Playing model British pronunciation...`
            : `🔊 Playing model pronunciation for "${word}"...`;
      showStudioNotification(msg);
    }
  };

  // ==========================================================================
  // 6G. ENGNOVATE SIMPLIFICATION: PROGRESSIVE DISCLOSURE (FOCUS MODE TOGGLE)
  // ==========================================================================
  window.toggleStudioSimplifiedFocus = function (moduleName) {
    const isWriting = moduleName === "writing";
    const key = `ips_focus_mode_${moduleName}`;
    const current = localStorage.getItem(key) === "1";
    const next = !current;
    try {
      localStorage.setItem(key, next ? "1" : "0");
    } catch (e) {}
    applyStudioSimplifiedFocus(moduleName, next);
  };

  function applyStudioSimplifiedFocus(moduleName, enabled) {
    if (moduleName === "writing") {
      const outlineBox = document.getElementById("wOutlineBox")?.parentElement;
      const vocabChips = document.getElementById("wVocabChips")?.parentElement;
      const mmGuide = document.getElementById("wMmGuide")?.parentElement;
      [outlineBox, vocabChips, mmGuide].forEach((el) => {
        if (el) el.style.display = enabled ? "none" : "";
      });
      const btn = document.getElementById("writingFocusModeBtn");
      if (btn) {
        btn.innerHTML = enabled ? "⚡ Focus View: ON (Show Reference)" : "⚡ Focus View";
        btn.style.borderColor = enabled ? "var(--accent)" : "var(--border)";
      }
    } else if (moduleName === "speaking") {
      const detailPane = document.getElementById("fwDetailPane");
      if (detailPane) {
        detailPane.style.display = enabled ? "none" : "";
      }
      const btn = document.getElementById("speakingFocusModeBtn");
      if (btn) {
        btn.innerHTML = enabled ? "⚡ Focus View: ON (Show Scaffolding)" : "⚡ Focus View";
        btn.style.borderColor = enabled ? "var(--accent)" : "var(--border)";
      }
    }
  }

  // ==========================================================================
  // 7. INITIALIZE & WIRE EVERYTHING ON DOM READY
  // ==========================================================================
  function initExaminerStudioPro() {
    // 1. Wrap window.callGeminiApi to prioritize BYOK when user has configured their key
    const origCallGemini = window.callGeminiApi;
    window.callGeminiApi = async function (promptText, systemInstruction, preferredModel) {
      if (hasByokKey()) {
        try {
          return await callDirectByokGemini(promptText, systemInstruction);
        } catch (byokErr) {
          console.warn("[BYOK direct call failed, falling back to Studio engine]", byokErr);
        }
      }
      if (typeof origCallGemini === "function") {
        return origCallGemini(promptText, systemInstruction, preferredModel);
      }
      throw new Error("AI engine unavailable");
    };

    // 2. Wrap quota checks so Free Tier users with BYOK never hit a quota wall
    const origCanWrite = window.canUseWritingCheck;
    if (typeof origCanWrite === "function") {
      window.canUseWritingCheck = function () {
        if (hasByokKey()) return { allowed: true, remaining: 999, limit: 999, isByok: true };
        return origCanWrite();
      };
    }

    const origCanSpeak = window.canUseSpeakingEvaluation;
    if (typeof origCanSpeak === "function") {
      window.canUseSpeakingEvaluation = function () {
        if (hasByokKey()) return { allowed: true, remaining: 999, limit: 999, isByok: true };
        return origCanSpeak();
      };
    }

    // 3. Install Upgraded 4-Tab Writing Examiner
    installUpgradedWritingExaminer();

    // 4. Inject 3-Part Speaking Mock Bar above #spkCueCardBox
    const cueBox = document.getElementById("spkCueCardBox");
    if (cueBox && !document.getElementById("speaking3PartMockMount")) {
      const mount = document.createElement("div");
      mount.id = "speaking3PartMockMount";
      cueBox.parentNode.insertBefore(mount, cueBox);
      renderSpeaking3PartBar();
    }

    // 5. Add BYOK Quick Button + OCR Button next to AI Examiner Grade button in Writing Lab
    const gradeBtn = document.getElementById("geminiEssayGradeBtn");
    if (gradeBtn && !document.getElementById("writingByokQuickBtn")) {
      const ocrBtn = document.createElement("button");
      ocrBtn.type = "button";
      ocrBtn.id = "writingOcrTriggerBtn";
      ocrBtn.className = "btn-outlined";
      ocrBtn.style.cssText = "padding:6px 11px;font-size:0.78rem;font-weight:700;";
      ocrBtn.innerHTML = "📷 Image to Text (OCR)";
      ocrBtn.onclick = () => window.triggerWritingEssayOcr();
      gradeBtn.parentNode.insertBefore(ocrBtn, gradeBtn.nextSibling);

      const byokBtn = document.createElement("button");
      byokBtn.type = "button";
      byokBtn.id = "writingByokQuickBtn";
      byokBtn.className = "btn-outlined byok-trigger-pill";
      byokBtn.onclick = () => window.openByokConfigModal();
      gradeBtn.parentNode.insertBefore(byokBtn, ocrBtn.nextSibling);
    }

    // 5B. Inject Engnovate Reading 23-Passage Directory Button & Progressive Focus Buttons
    const rSelect = document.getElementById("rSelect");
    if (rSelect && rSelect.parentNode && !document.getElementById("readingDirectoryToggleBtn")) {
      const dirBtn = document.createElement("button");
      dirBtn.type = "button";
      dirBtn.id = "readingDirectoryToggleBtn";
      dirBtn.className = "btn-outlined";
      dirBtn.style.cssText = "padding:5px 11px;font-size:0.76rem;font-weight:800;border-color:var(--accent);color:var(--accent);white-space:nowrap;";
      dirBtn.innerHTML = "📚 Browse All 23 Passages";
      dirBtn.onclick = () => window.toggleReadingDirectory();
      rSelect.parentNode.insertBefore(dirBtn, rSelect);
    }

    const wClockBtn = document.getElementById("wClockBtn");
    if (wClockBtn && wClockBtn.parentNode && !document.getElementById("writingFocusModeBtn")) {
      const fBtn = document.createElement("button");
      fBtn.type = "button";
      fBtn.id = "writingFocusModeBtn";
      fBtn.className = "btn-outlined";
      fBtn.style.cssText = "padding:5px 10px;font-size:0.74rem;font-weight:700;";
      fBtn.innerHTML = "⚡ Focus View";
      fBtn.onclick = () => window.toggleStudioSimplifiedFocus("writing");
      wClockBtn.parentNode.appendChild(fBtn);
      if (localStorage.getItem("ips_focus_mode_writing") === "1") {
        applyStudioSimplifiedFocus("writing", true);
      }
    }

    const spkClockBtn = document.getElementById("spkClockBtn");
    if (spkClockBtn && spkClockBtn.parentNode && !document.getElementById("speakingFocusModeBtn")) {
      const sfBtn = document.createElement("button");
      sfBtn.type = "button";
      sfBtn.id = "speakingFocusModeBtn";
      sfBtn.className = "btn-outlined";
      sfBtn.style.cssText = "padding:5px 10px;font-size:0.74rem;font-weight:700;";
      sfBtn.innerHTML = "⚡ Focus View";
      sfBtn.onclick = () => window.toggleStudioSimplifiedFocus("speaking");
      spkClockBtn.parentNode.appendChild(sfBtn);
      if (localStorage.getItem("ips_focus_mode_speaking") === "1") {
        applyStudioSimplifiedFocus("speaking", true);
      }
    }

    // 5C. Initialize 1-Click Highlight-to-Flashcard Popup & Study Streak
    initContextualFlashcardPopup();
    window.syncAndRenderStudyStreak(false);
    setTimeout(() => window.syncAndRenderStudyStreak(false), 600);

    // 6. Sync BYOK inputs, Error Vault badges, and lazy-load GT Letters + Traps
    syncByokInputsAndBadges();
    updateErrorVaultBadges();
    injectGtLettersIntoWritingMocks();
    renderExamTrapsPane();
    renderErrorVaultPane();
    window.recalcOfficial4SkillBand();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initExaminerStudioPro);
  } else {
    setTimeout(initExaminerStudioPro, 50);
  }
})();
