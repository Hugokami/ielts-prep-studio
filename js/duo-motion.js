// ============================================================================
// IELTS Prep Studio v9.5 — Duolingo-Style Tactile Motion & Gamification Engine
// OpenDesign Craft Standards:
//   - Tactile 3D Button Press & Springs
//   - Web Audio API Synthesized Chimes (Zero external audio latency / zero CORS)
//   - Lightweight 60 FPS Canvas Confetti (Auto-cleanup, no dependencies)
//   - XP, Gems, Hearts, Daily Quests & Skill Path Tree
//   - Slide-Up Lesson Feedback Banner & Word-Bank Sentence Scramble Mini-Drill
// ============================================================================

(function () {
  "use strict";

  const GAMIFY_STORAGE_KEY = "ips_duo_gamify_v1";

  // Default Gamification State
  function getGamifyState() {
    try {
      const raw = localStorage.getItem(GAMIFY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.xp === "number") return parsed;
      }
    } catch (e) {}

    return {
      xp: 120,
      gems: 45,
      hearts: 5,
      maxHearts: 5,
      lastHeartRegen: Date.now(),
      soundEnabled: true,
      dailyQuests: [
        { id: "q_listen", title: "Complete 1 Cambridge Listening Section", target: 1, current: 0, xp: 20, done: false },
        { id: "q_vocab", title: "Master 5 Academic Collocations", target: 5, current: 0, xp: 15, done: false },
        { id: "q_speak", title: "Practice 1 Speaking Part 2 Cue Card", target: 1, current: 0, xp: 25, done: false }
      ],
      skillPathLevel: 1
    };
  }

  function saveGamifyState(state) {
    try {
      localStorage.setItem(GAMIFY_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
    renderHudPills();
    renderOverviewDuoHub();
  }

  // ==========================================================================
  // 1. WEB AUDIO API SYNTHESIZED SOUND EFFECTS (ZERO NETWORK REQUESTS)
  // ==========================================================================
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  window.duoPlaySound = function (type = "success") {
    const st = getGamifyState();
    if (st.soundEnabled === false) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === "success" || type === "correct") {
        // High upbeat dual chime (C6 -> G6)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12); // C6

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.22); // E6

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.08);
        osc1.stop(now + 0.38);
        osc2.stop(now + 0.38);
      } else if (type === "fanfare" || type === "levelup") {
        // 4-note victory arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteStart = now + idx * 0.07;
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, noteStart);
          gain.gain.setValueAtTime(0.001, noteStart);
          gain.gain.linearRampToValueAtTime(0.2, noteStart + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.32);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(noteStart);
          osc.stop(noteStart + 0.35);
        });
      } else if (type === "pop" || type === "tap") {
        // Short subtle wooden bubble pop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === "warn" || type === "error") {
        // Low soft thud
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch (e) {
      // Audio autoplay policy or unavailable
    }
  };

  window.duoToggleSound = function () {
    const st = getGamifyState();
    st.soundEnabled = !st.soundEnabled;
    saveGamifyState(st);
    if (typeof showStudioNotification === "function") {
      showStudioNotification(st.soundEnabled ? "🔊 Sound Effects ON" : "🔇 Sound Effects Muted");
    }
  };

  // ==========================================================================
  // 2. LIGHTWEIGHT 60 FPS CANVAS CONFETTI (AUTO-CLEANUP)
  // ==========================================================================
  window.duoCelebrate = function (type = "confetti") {
    duoPlaySound("fanfare");

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.id = "duoConfettiCanvas";
    canvas.style.cssText =
      "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = (canvas.width = window.innerWidth * dpr);
    const h = (canvas.height = window.innerHeight * dpr);

    const colors = ["#F59E0B", "#10B981", "#38BDF8", "#EF4444", "#EC4899", "#8B5CF6"];
    const count = 42;
    const particles = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: w * (0.35 + Math.random() * 0.3),
        y: h * 0.45,
        vx: (Math.random() - 0.5) * 14 * dpr,
        vy: (-Math.random() * 16 - 6) * dpr,
        size: (Math.random() * 7 + 4) * dpr,
        color: colors[i % colors.length],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12,
        alpha: 1
      });
    }

    let frame = 0;
    function render() {
      ctx.clearRect(0, 0, w, h);
      let alive = 0;
      for (const p of particles) {
        p.vy += 0.45 * dpr; // Gravity
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        if (frame > 25) {
          p.alpha -= 0.022;
        }
        if (p.alpha > 0 && p.y < h) {
          alive++;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.restore();
        }
      }
      frame++;
      if (alive > 0 && frame < 90) {
        requestAnimationFrame(render);
      } else {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    }
    requestAnimationFrame(render);
  };

  // ==========================================================================
  // 3. XP REWARD & FLOATING ANIMATION
  // ==========================================================================
  window.duoAddXp = function (amount = 10, source = "Practice", anchorEl = null) {
    const st = getGamifyState();
    st.xp = (st.xp || 0) + amount;
    st.gems = (st.gems || 0) + Math.max(1, Math.round(amount / 5));

    // Update Quests
    if (source.includes("Listening")) updateQuestProgress("q_listen", 1, st);
    if (source.includes("Vocab") || source.includes("Lexicon")) updateQuestProgress("q_vocab", 1, st);
    if (source.includes("Speaking")) updateQuestProgress("q_speak", 1, st);

    saveGamifyState(st);
    duoPlaySound("pop");

    // Spawn floating XP tag
    spawnFloatingXpTag(`+${amount} XP!`, anchorEl);

    // Trigger study streak sync
    if (typeof window.syncAndRenderStudyStreak === "function") {
      window.syncAndRenderStudyStreak(true);
    }
  };

  function updateQuestProgress(questId, delta, state) {
    if (!state.dailyQuests) return;
    const q = state.dailyQuests.find((it) => it.id === questId);
    if (q && !q.done) {
      q.current = Math.min(q.target, (q.current || 0) + delta);
      if (q.current >= q.target) {
        q.done = true;
        state.xp += q.xp;
        setTimeout(() => {
          duoShowFeedback({
            title: `🏆 Daily Quest Completed!`,
            message: `"${q.title}" finished! Earned +${q.xp} Bonus XP.`,
            type: "success"
          });
          window.duoCelebrate();
        }, 500);
      }
    }
  }

  function spawnFloatingXpTag(text, anchorEl) {
    let top = window.innerHeight * 0.3;
    let left = window.innerWidth * 0.5 - 45;

    if (anchorEl && anchorEl.getBoundingClientRect) {
      const rect = anchorEl.getBoundingClientRect();
      top = rect.top - 20;
      left = rect.left + rect.width / 2 - 40;
    }

    const tag = document.createElement("div");
    tag.className = "duo-xp-floater";
    tag.style.top = `${Math.max(10, top | 0)}px`;
    tag.style.left = `${Math.max(10, left | 0)}px`;
    tag.innerHTML = `⭐ <strong>${text}</strong>`;
    document.body.appendChild(tag);

    setTimeout(() => {
      if (tag.parentNode) tag.parentNode.removeChild(tag);
    }, 1400);
  }

  // ==========================================================================
  // 4. SLIDE-UP LESSON FEEDBACK BANNER
  // ==========================================================================
  let feedbackTimer = null;
  window.duoShowFeedback = function ({ title, message, type = "success", actionText = "Got it! Continue →", onAction = null }) {
    let banner = document.getElementById("duoBottomFeedbackBanner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "duoBottomFeedbackBanner";
      banner.className = "duo-bottom-feedback";
      document.body.appendChild(banner);
    }

    if (type === "success") {
      banner.classList.remove("is-warning");
      duoPlaySound("success");
    } else {
      banner.classList.add("is-warning");
      duoPlaySound("warn");
    }

    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:240px;">
        <div style="font-size:1.8rem;line-height:1;">${type === "success" ? "🎉" : "💡"}</div>
        <div>
          <div style="font-size:0.95rem;font-weight:900;color:var(--text);margin-bottom:2px;">${escapeHtml(title)}</div>
          <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.45;">${escapeHtml(message)}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button type="button" class="btn-accent-solid" id="duoFeedbackActionBtn" style="padding:8px 18px;font-size:0.84rem;font-weight:800;white-space:nowrap;">
          ${escapeHtml(actionText)}
        </button>
        <button type="button" class="btn-outlined" style="padding:6px 10px;font-size:0.75rem;" onclick="document.getElementById('duoBottomFeedbackBanner').classList.remove('visible')">✕</button>
      </div>
    `;

    const btn = banner.querySelector("#duoFeedbackActionBtn");
    if (btn) {
      btn.onclick = () => {
        banner.classList.remove("visible");
        if (typeof onAction === "function") onAction();
      };
    }

    clearTimeout(feedbackTimer);
    banner.classList.add("visible");
    feedbackTimer = setTimeout(() => {
      banner.classList.remove("visible");
    }, 7000);
  };

  // ==========================================================================
  // 5. WORD-BANK SENTENCE SCRAMBLE MINI-DRILL MODAL
  // ==========================================================================
  window.openDuoWordScrambleModal = function (vocabWord = null) {
    duoPlaySound("pop");

    // Sample Academic Collocation Sentences
    const SAMPLES = [
      {
        target: "Urban forests significantly mitigate carbon emissions in industrial cities.",
        focus: "mitigate",
        translation: "မြို့ပြသစ်တောများသည် စက်မှုမြို့များရှိ ကာဗွန်ထုတ်လွှတ်မှုကို သိသာစွာ လျော့ပါးစေသည်။"
      },
      {
        target: "Rapid technological advancements inevitably transform modern educational practices.",
        focus: "inevitably",
        translation: "လျင်မြန်သော နည်းပညာ တိုးတက်မှုများသည် ခေတ်သစ် ပညာရေးကို မလွဲမသွေ ပြောင်းလဲစေသည်။"
      },
      {
        target: "Governments should allocate substantial funding to sustainable infrastructure.",
        focus: "allocate",
        translation: "အစိုးရများသည် ရေရှည်တည်တံ့သော အခြေခံအဆောက်အအုံများအတွက် ရန်ပုံငွေ အမြောက်အမြား ခွဲဝေချထားပေးသင့်သည်။"
      },
      {
        target: "Comprehensive research is indispensable for establishing reliable academic conclusions.",
        focus: "indispensable",
        translation: "တိကျခိုင်မာသော ပညာရပ်ဆိုင်ရာ ကောက်ချက်များအတွက် ဘက်စုံသုတေသနသည် မရှိမဖြစ် လိုအပ်သည်။"
      }
    ];

    const pick = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
    const correctWords = pick.target.replace(/[.]/g, "").split(/\s+/);
    const scrambled = [...correctWords].sort(() => Math.random() - 0.5);

    let modal = document.getElementById("duoScrambleModalBackdrop");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "duoScrambleModalBackdrop";
      modal.style.cssText =
        "position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(5px);z-index:4100;display:flex;align-items:center;justify-content:center;padding:16px;";
      document.body.appendChild(modal);
    }

    modal.style.display = "flex";
    modal.innerHTML = `
      <div class="occ-card" style="max-width:540px;width:100%;padding:24px;background:var(--bg-card);border:2px solid var(--border-mid);border-radius:22px;box-shadow:0 24px 60px rgba(0,0,0,0.45);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:1.4rem;">🧩</span>
            <div>
              <strong style="font-size:1.02rem;color:var(--text);">Daily Word-Bank Challenge</strong>
              <div style="font-size:0.75rem;color:var(--accent-gold,#F59E0B);font-weight:700;">DUOLINGO SENTENCE BUILDER • +20 XP</div>
            </div>
          </div>
          <button class="btn-outlined" style="padding:4px 9px;font-size:0.78rem;" onclick="document.getElementById('duoScrambleModalBackdrop').style.display='none'">✕</button>
        </div>

        <div style="margin-bottom:14px;padding:12px 14px;border-radius:12px;background:var(--well-peach,#FFF7ED);border:1px solid rgba(245,158,11,0.25);">
          <div style="font-size:0.76rem;font-weight:800;color:var(--accent);text-transform:uppercase;margin-bottom:4px;">Burmese Prompt:</div>
          <div class="burmese" style="font-size:0.92rem;font-weight:700;color:var(--text);">${escapeHtml(pick.translation)}</div>
        </div>

        <!-- Candidate Constructed Sentence Slot -->
        <div id="duoScrambleSlot" style="min-height:56px;padding:10px 14px;border-radius:14px;background:var(--bg-elevated);border:2px dashed var(--border-mid);display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:16px;">
          <span id="duoScramblePlaceholder" style="font-size:0.82rem;color:var(--text-secondary);">Tap words from the bank below to build the sentence...</span>
        </div>

        <!-- Available Word Chips Bank -->
        <div id="duoChipsBank" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;min-height:70px;">
          ${scrambled
            .map(
              (w, i) => `
            <button type="button" class="duo-word-chip" id="duoChip_${i}" onclick="window.duoPickChip('${i}', ${JSON.stringify(w).replace(/"/g, "&quot;")})">
              ${escapeHtml(w)}
            </button>
          `
            )
            .join("")}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <button type="button" class="btn-outlined" style="font-size:0.8rem;" onclick="window.duoResetScramble()">↺ Clear</button>
          <button type="button" class="btn-accent-solid" id="duoCheckScrambleBtn" style="padding:10px 22px;font-size:0.88rem;font-weight:800;" onclick="window.duoCheckScrambleAnswer(${JSON.stringify(pick.target).replace(/"/g, "&quot;")})">
            Check Answer ✓
          </button>
        </div>
      </div>
    `;

    window.duoCurrentPickedChips = [];
  };

  window.duoPickChip = function (chipIdx, word) {
    const chipBtn = document.getElementById(`duoChip_${chipIdx}`);
    if (!chipBtn || chipBtn.classList.contains("used")) return;

    duoPlaySound("pop");
    chipBtn.classList.add("used");

    const slot = document.getElementById("duoScrambleSlot");
    const placeholder = document.getElementById("duoScramblePlaceholder");
    if (placeholder) placeholder.style.display = "none";

    const pickedId = `duoPicked_${chipIdx}`;
    const tokenBtn = document.createElement("button");
    tokenBtn.type = "button";
    tokenBtn.id = pickedId;
    tokenBtn.className = "duo-word-chip";
    tokenBtn.style.borderColor = "var(--accent)";
    tokenBtn.innerHTML = `${escapeHtml(word)} <small style="color:var(--text-secondary);margin-left:3px;">✕</small>`;
    tokenBtn.onclick = () => window.duoReturnChip(chipIdx, word);

    slot.appendChild(tokenBtn);
    window.duoCurrentPickedChips.push({ chipIdx, word });
  };

  window.duoReturnChip = function (chipIdx, word) {
    duoPlaySound("tap");
    const chipBtn = document.getElementById(`duoChip_${chipIdx}`);
    if (chipBtn) chipBtn.classList.remove("used");

    const pickedBtn = document.getElementById(`duoPicked_${chipIdx}`);
    if (pickedBtn && pickedBtn.parentNode) pickedBtn.parentNode.removeChild(pickedBtn);

    window.duoCurrentPickedChips = (window.duoCurrentPickedChips || []).filter(
      (c) => c.chipIdx !== chipIdx
    );

    const slot = document.getElementById("duoScrambleSlot");
    const placeholder = document.getElementById("duoScramblePlaceholder");
    if (slot && placeholder && slot.querySelectorAll(".duo-word-chip").length === 0) {
      placeholder.style.display = "block";
    }
  };

  window.duoResetScramble = function () {
    const slot = document.getElementById("duoScrambleSlot");
    if (!slot) return;
    document.querySelectorAll("#duoChipsBank .duo-word-chip").forEach((b) => b.classList.remove("used"));
    slot.querySelectorAll(".duo-word-chip").forEach((b) => b.remove());
    const placeholder = document.getElementById("duoScramblePlaceholder");
    if (placeholder) placeholder.style.display = "block";
    window.duoCurrentPickedChips = [];
  };

  window.duoCheckScrambleAnswer = function (targetSentence) {
    const pickedWords = (window.duoCurrentPickedChips || []).map((c) => c.word);
    const candidateStr = pickedWords.join(" ").trim().toLowerCase();
    const cleanTarget = targetSentence.replace(/[.]/g, "").trim().toLowerCase();

    const slot = document.getElementById("duoScrambleSlot");

    if (candidateStr === cleanTarget) {
      duoPlaySound("success");
      slot.classList.add("duo-pop");
      slot.style.borderColor = "#10B981";
      slot.style.background = "rgba(16,185,129,0.12)";

      window.duoCelebrate();
      window.duoAddXp(25, "Vocab Scramble Drill");

      setTimeout(() => {
        const modal = document.getElementById("duoScrambleModalBackdrop");
        if (modal) modal.style.display = "none";
        duoShowFeedback({
          title: "🎉 Excellent! +25 XP Earned",
          message: `Accurate Cambridge Collocation: "${targetSentence}"`,
          type: "success"
        });
      }, 700);
    } else {
      duoPlaySound("warn");
      slot.classList.add("duo-shake");
      slot.style.borderColor = "#EF4444";
      setTimeout(() => slot.classList.remove("duo-shake"), 400);

      const st = getGamifyState();
      st.hearts = Math.max(1, (st.hearts || 5) - 1);
      saveGamifyState(st);

      if (typeof showStudioNotification === "function") {
        showStudioNotification("⚠️ Not quite right yet! Tap chips to adjust word order.");
      }
    }
  };

  // ==========================================================================
  // 6. RENDER TOP HUD PILLS & OVERVIEW GAMIFICATION HUB
  // ==========================================================================
  function renderHudPills() {
    const mount = document.getElementById("duoTopHudMount");
    if (!mount) return;
    const st = getGamifyState();

    // Fetch streak count
    let streakDays = 1;
    const streakEl = document.getElementById("streakCountVal");
    if (streakEl) {
      const match = streakEl.textContent.match(/\d+/);
      if (match) streakDays = parseInt(match[0], 10);
    }

    mount.innerHTML = `
      <div class="duo-hud-bar">
        <div class="duo-hud-pill streak" title="Study Streak (${streakDays} Consecutive Days)" onclick="switchView('overview')">
          <span>🔥</span> <span>${streakDays}</span>
        </div>
        <div class="duo-hud-pill xp" title="Total Accumulated Academic XP" onclick="window.openDuoWordScrambleModal()">
          <span>⭐</span> <span>${st.xp || 120} XP</span>
        </div>
        <div class="duo-hud-pill hearts" title="Drill Lives (${st.hearts}/${st.maxHearts})" onclick="window.duoRegenHearts()">
          <span>❤️</span> <span>${st.hearts || 5}</span>
        </div>
        <div class="duo-hud-pill gems" title="Cambridge Academic Gems" onclick="switchView('lexicon')">
          <span>💎</span> <span>${st.gems || 45}</span>
        </div>
        <button type="button" class="btn-outlined" style="padding:3px 8px;font-size:0.72rem;border-radius:999px;" title="Toggle Sound Effects" onclick="window.duoToggleSound()">
          ${st.soundEnabled !== false ? "🔊" : "🔇"}
        </button>
      </div>
    `;
  }

  window.duoRegenHearts = function () {
    const st = getGamifyState();
    st.hearts = st.maxHearts || 5;
    saveGamifyState(st);
    duoPlaySound("success");
    if (typeof showStudioNotification === "function") {
      showStudioNotification("❤️ Hearts refilled to 5/5!");
    }
  };

  function renderOverviewDuoHub() {
    const mount = document.getElementById("duoOverviewHubMount");
    if (!mount) return;
    const st = getGamifyState();

    const quests = st.dailyQuests || [];
    const questsHtml = quests
      .map((q) => {
        const pct = Math.min(100, Math.round(((q.current || 0) / q.target) * 100));
        return `
          <div style="margin-bottom:12px;padding:10px 12px;border-radius:12px;background:var(--bg-elevated);border:1px solid var(--border);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-size:0.8rem;font-weight:700;color:var(--text);">${escapeHtml(q.title)}</span>
              <span class="occ-ver-pill" style="font-size:0.68rem;color:${q.done ? "#10B981" : "var(--accent-gold,#F59E0B)"};font-weight:800;">
                ${q.done ? "✓ Done (+ " + q.xp + " XP)" : q.current + "/" + q.target}
              </span>
            </div>
            <div class="duo-progress-track">
              <div class="duo-progress-fill" style="width:${pct}%;"></div>
            </div>
          </div>
        `;
      })
      .join("");

    mount.innerHTML = `
      <div class="duo-dashboard-hub">
        <!-- 1. DUOLINGO STYLE CAMBRIDGE SKILL TREE PATH -->
        <div class="duo-path-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div>
              <div style="font-size:0.74rem;font-weight:800;color:var(--accent);text-transform:uppercase;letter-spacing:0.06em;">UNIT 1 • FOUNDATION PATH</div>
              <h3 style="font-size:1.05rem;font-weight:900;color:var(--text);margin:2px 0 0 0;">Cambridge Academic Journey</h3>
            </div>
            <button type="button" class="btn-outlined" style="padding:4px 10px;font-size:0.75rem;font-weight:700;" onclick="window.openDuoWordScrambleModal()">
              🧩 Sentence Drill
            </button>
          </div>
          <p style="font-size:0.8rem;color:var(--text-secondary);margin:0 0 14px 0;">
            Follow the guided step-by-step path to master Reading, Listening, Lexicon, and Speaking drills with instant feedback.
          </p>

          <div class="duo-path-nodes">
            <div class="duo-path-node completed" onclick="switchView('lexicon')" title="Step 1: Academic Collocations (AWL Sublist 1)">
              <div class="duo-node-circle">🏛️</div>
              <div class="duo-node-label">Lexicon</div>
              <div class="duo-node-crowns">👑 5/5</div>
            </div>
            <div class="duo-path-node completed" onclick="switchView('listening')" title="Step 2: Listening Section 1 Dialogue Drill">
              <div class="duo-node-circle">🎧</div>
              <div class="duo-node-label">Listening</div>
              <div class="duo-node-crowns">👑 4/4</div>
            </div>
            <div class="duo-path-node active-node" onclick="switchView('reading')" title="Step 3: Cambridge Reading CBT Simulation">
              <div class="duo-node-circle">📖</div>
              <div class="duo-node-label">Reading CBT</div>
              <div class="duo-node-crowns">⭐ Current</div>
            </div>
            <div class="duo-path-node" onclick="switchView('speaking')" title="Step 4: Speaking 3-Part Mock Simulator">
              <div class="duo-node-circle">🎙️</div>
              <div class="duo-node-label">Speaking</div>
              <div class="duo-node-crowns">🔒 Next</div>
            </div>
            <div class="duo-path-node" onclick="switchView('writing')" title="Step 5: Task 2 Academic Essay Lab">
              <div class="duo-node-circle">✍️</div>
              <div class="duo-node-label">Writing Lab</div>
              <div class="duo-node-crowns">🔒 Locked</div>
            </div>
          </div>
        </div>

        <!-- 2. DAILY QUESTS & REWARD CHEST -->
        <div class="duo-quest-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:1.15rem;">🎯</span>
              <strong style="font-size:0.95rem;color:var(--text);">Daily Cambridge Quests</strong>
            </div>
            <span class="occ-ver-pill" style="font-size:0.68rem;color:var(--accent-gold,#F59E0B);font-weight:800;">RESETS IN 6H</span>
          </div>
          ${questsHtml}
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ==========================================================================
  // 7. INITIALIZE DUO MOTION ENGINE ON DOM READY
  // ==========================================================================
  function initDuoMotion() {
    // 1. Inject Top HUD Mount into the topbar if not already present
    const topUtils = document.querySelector(".top-utils");
    if (topUtils && !document.getElementById("duoTopHudMount")) {
      const hudMount = document.createElement("div");
      hudMount.id = "duoTopHudMount";
      topUtils.parentNode.insertBefore(hudMount, topUtils);
      renderHudPills();
    }

    // 2. Inject Overview Duolingo Skill Path Mount before Jump-In Lessons
    const overviewSec = document.getElementById("view-overview");
    if (overviewSec && !document.getElementById("duoOverviewHubMount")) {
      const hubMount = document.createElement("div");
      hubMount.id = "duoOverviewHubMount";
      const banner = overviewSec.querySelector(".speak-progress-banner");
      if (banner && banner.parentNode) {
        banner.parentNode.insertBefore(hubMount, banner.nextSibling);
      } else {
        overviewSec.appendChild(hubMount);
      }
      renderOverviewDuoHub();
    }

    // 3. Hook audio feedback to button clicks with class .star-btn, .btn-accent-solid
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-accent-solid, .star-btn, .duo-hud-pill, .duo-path-node");
      if (btn && !btn.id?.includes("CheckScramble")) {
        window.duoPlaySound("tap");
      }
    });

    renderHudPills();
    renderOverviewDuoHub();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDuoMotion);
  } else {
    setTimeout(initDuoMotion, 60);
  }
})();
