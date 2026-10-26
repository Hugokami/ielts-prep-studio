// ============================================================================
// IELTS Prep Studio v10.1 — Academic Motion, Study Economy & Onboarding Guide
// OpenDesign Craft Standards:
//   - Tactile 3D Button Press & Springs
//   - Web Audio API Synthesized Chimes (Zero external latency / zero CORS)
//   - Lightweight 60 FPS Canvas Confetti (Auto-cleanup, no dependencies)
//   - Interactive Academic Study Economy:
//       * Consistency Streak (with Streak Freeze Protection)
//       * Academic XP & Cambridge Scholar Rank Progression (Level 1–5)
//       * Focus Hearts (stamina in drills; regenerates or practice-heals)
//       * Academic Gems & Spendable Scholar Store (Hints, Refills, Boosts)
//   - 4-Step Interactive New User Onboarding & Studio Guide Modal
//   - Cambridge Academic Syntax Builder (with Smart Hint Power-Up)
// ============================================================================

(function () {
  "use strict";

  // Magic UI Number Ticker for Gamification HUD Pills
  function animateDuoTicker(el, endVal, suffix = "") {
    if (!el) return;
    const start = parseInt(el.textContent.replace(/[^0-9]/g, ''), 10) || 0;
    const end = parseInt(endVal, 10) || 0;
    if (start === end) {
      el.textContent = end + suffix;
      return;
    }
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / 450);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(start + (end - start) * ease);
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = end + suffix;
    }
    requestAnimationFrame(tick);
  }



  const GAMIFY_STORAGE_KEY = "ips_duo_gamify_v1";
  const GUIDE_SEEN_KEY = "ips_onboarding_guide_seen_v1";

  // Default Gamification State
  function getGamifyState() {
    try {
      const raw = localStorage.getItem(GAMIFY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.xp === "number") {
          if (typeof parsed.gems !== "number") parsed.gems = 45;
          if (typeof parsed.hearts !== "number") parsed.hearts = 5;
          if (typeof parsed.maxHearts !== "number") parsed.maxHearts = 5;
          if (typeof parsed.streakFreezes !== "number") parsed.streakFreezes = 0;
          if (typeof parsed.doubleXpUntil !== "number") parsed.doubleXpUntil = 0;
          return parsed;
        }
      }
    } catch (e) {}

    return {
      xp: 120,
      gems: 45,
      hearts: 5,
      maxHearts: 5,
      streakFreezes: 1,
      doubleXpUntil: 0,
      lastHeartRegen: Date.now(),
      soundEnabled: true,
      dailyQuests: [
        { id: "q_listen", title: "Complete 1 Cambridge Listening Section", target: 1, current: 0, xp: 25, gems: 5, done: false },
        { id: "q_vocab", title: "Master 5 Academic Collocations", target: 5, current: 0, xp: 20, gems: 5, done: false },
        { id: "q_speak", title: "Practice 1 Speaking Part 2 Cue Card", target: 1, current: 0, xp: 30, gems: 5, done: false }
      ],
      unlockedBoosterCards: []
    };
  }

  function saveGamifyState(state) {
    try {
      localStorage.setItem(GAMIFY_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
    renderHudPills();
    renderOverviewDuoHub();
  }

  // Scholar Rank Tiers
  window.getScholarRankInfo = function (xp) {
    const val = typeof xp === "number" ? xp : (getGamifyState().xp || 0);
    if (val >= 2000) {
      return { level: 5, title: "Cambridge Master", bandTrack: "Band 8.5 – 9.0 Track", nextAt: 3000, progressPct: 100, badge: "lucide-crown" };
    } else if (val >= 1000) {
      return { level: 4, title: "Distinction Fellow", bandTrack: "Band 8.0 Track", nextAt: 2000, progressPct: Math.round(((val - 1000) / 1000) * 100), badge: "lucide-award" };
    } else if (val >= 500) {
      return { level: 3, title: "Honours Scholar", bandTrack: "Band 7.5 Track", nextAt: 1000, progressPct: Math.round(((val - 500) / 500) * 100), badge: "lucide-medal" };
    } else if (val >= 200) {
      return { level: 2, title: "Academic Contender", bandTrack: "Band 6.5 – 7.0 Track", nextAt: 500, progressPct: Math.round(((val - 200) / 300) * 100), badge: "lucide-star" };
    }
    return { level: 1, title: "Foundation Candidate", bandTrack: "Band 6.0 Track", nextAt: 200, progressPct: Math.round((val / 200) * 100), badge: "lucide-sprout" };
  };

  // Heart Auto-Regeneration (1 Heart per 15 minutes)
  function checkHeartRegen() {
    const st = getGamifyState();
    if (st.hearts < (st.maxHearts || 5)) {
      const now = Date.now();
      const elapsedMins = (now - (st.lastHeartRegen || now)) / (1000 * 60);
      if (elapsedMins >= 15) {
        const heartsToAdd = Math.floor(elapsedMins / 15);
        st.hearts = Math.min(st.maxHearts || 5, st.hearts + heartsToAdd);
        st.lastHeartRegen = now;
        saveGamifyState(st);
      }
    }
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
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(523.25, now);
        osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12);

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(659.25, now + 0.08);
        osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.22);

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
    } catch (e) {}
  };

  window.duoToggleSound = function () {
    const st = getGamifyState();
    st.soundEnabled = !st.soundEnabled;
    saveGamifyState(st);
    if (typeof showStudioNotification === "function") {
      showStudioNotification(st.soundEnabled ? "Sound Effects ON" : "Sound Effects Muted");
    }
  };

  // ==========================================================================
  // 2. LIGHTWEIGHT 60 FPS CANVAS CONFETTI (AUTO-CLEANUP)
  // ==========================================================================
  window.duoCelebrate = function () {
    duoPlaySound("fanfare");

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.id = "duoConfettiCanvas";
    canvas.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;";
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
        p.vy += 0.45 * dpr;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        if (frame > 25) p.alpha -= 0.022;
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
  // 3. XP REWARD & STUDY ECONOMY LOGIC
  // ==========================================================================
  window.duoAddXp = function (amount = 10, source = "Practice", anchorEl = null) {
    const st = getGamifyState();
    const oldLevel = window.getScholarRankInfo(st.xp).level;

    // Apply Double XP if active
    let mult = 1;
    if (st.doubleXpUntil && Date.now() < st.doubleXpUntil) {
      mult = 2;
    }
    const finalXp = amount * mult;
    const gemsAwarded = Math.max(1, Math.round(finalXp / 5));

    st.xp = (st.xp || 0) + finalXp;
    st.gems = (st.gems || 0) + gemsAwarded;

    // Check rank level up
    const newRank = window.getScholarRankInfo(st.xp);
    if (newRank.level > oldLevel) {
      st.gems += 25; // Level-up bonus
      setTimeout(() => {
        window.duoCelebrate();
        window.duoShowFeedback({
          title: `SCHOLAR RANK UP! Level ${newRank.level}`,
          message: `Promoted to "${newRank.title}" (${newRank.bandTrack})! +25 Gems Bonus awarded!`,
          type: "success"
        });
      }, 600);
    }

    // Update Quests
    if (source.includes("Listening")) updateQuestProgress("q_listen", 1, st);
    if (source.includes("Vocab") || source.includes("Lexicon") || source.includes("SRS")) updateQuestProgress("q_vocab", 1, st);
    if (source.includes("Speaking")) updateQuestProgress("q_speak", 1, st);

    saveGamifyState(st);
    duoPlaySound("pop");

    spawnFloatingXpTag(mult > 1 ? `+${finalXp} XP (2× Boost!)` : `+${finalXp} XP`, anchorEl);

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
        state.gems += q.gems || 5;
        setTimeout(() => {
          duoShowFeedback({
            title: `Daily Quest Completed!`,
            message: `"${q.title}" finished! +${q.xp} XP & +${q.gems || 5} Gems claimed.`,
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
    tag.innerHTML = `<svg class="ui-icon" style="color:#EAB308;"><use href="#lucide-star"/></svg> <strong>${text}</strong>`;
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
        <div style="font-size:1.8rem;line-height:1;">${type === "success" ? '<svg class="ui-icon" style="width:32px;height:32px;color:#F59E0B;"><use href="#lucide-party-popper"/></svg>' : '<svg class="ui-icon" style="width:32px;height:32px;color:#F59E0B;"><use href="#lucide-lightbulb"/></svg>'}</div>
        <div>
          <div style="font-size:0.95rem;font-weight:900;color:var(--text);margin-bottom:2px;">${escapeHtml(title)}</div>
          <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.45;">${escapeHtml(message)}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button type="button" class="btn-accent-solid" id="duoFeedbackActionBtn" style="padding:8px 18px;font-size:0.84rem;font-weight:800;white-space:nowrap;">
          ${escapeHtml(actionText)}
        </button>
        <button type="button" class="btn-outlined" style="padding:6px 10px;font-size:0.75rem;" onclick="document.getElementById('duoBottomFeedbackBanner').classList.remove('visible')">&times;</button>
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
  // 5. CAMBRIDGE ACADEMIC SYNTAX BUILDER (WITH HINT POWER-UP)
  // ==========================================================================
  window.openDuoWordScrambleModal = function () {
    duoPlaySound("pop");

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
      },
      {
        target: "Subsidising public transit fosters equitable access to economic opportunities.",
        focus: "equitable",
        translation: "အများပြည်သူ သယ်ယူပို့ဆောင်ရေးကို ထောက်ပံ့ပေးခြင်းသည် စီးပွားရေးအခွင့်အလမ်းများကို မျှတစွာရရှိစေသည်။"
      }
    ];

    const pick = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
    const correctWords = pick.target.replace(/[.]/g, "").split(/\s+/);
    const scrambled = [...correctWords].sort(() => Math.random() - 0.5);

    let modal = document.getElementById("duoScrambleModalBackdrop");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "duoScrambleModalBackdrop";
      modal.className = "ips-modal-overlay";
      document.body.appendChild(modal);
    }

    modal.classList.add("open");
    modal.style.display = "flex";
    modal.innerHTML = `
      <div class="ips-modal-shell" style="max-width:540px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <svg class="ui-icon" style="width:24px;height:24px;color:#3B82F6;" aria-hidden="true"><use href="#lucide-puzzle"/></svg>
            <div>
              <strong style="font-size:1.02rem;color:var(--text);">Cambridge Academic Syntax Builder</strong>
              <div style="font-size:0.75rem;color:var(--accent-gold,#F59E0B);font-weight:700;">DAILY COLLOCATION CHALLENGE • +25 XP &amp; +5 Gems</div>
            </div>
          </div>
          <button class="btn-outlined" style="padding:4px 9px;font-size:0.78rem;" onclick="document.getElementById('duoScrambleModalBackdrop').classList.remove('open');document.getElementById('duoScrambleModalBackdrop').style.display='none';">&times;</button>
        </div>

        <div style="margin-bottom:14px;padding:12px 14px;border-radius:12px;background:var(--well-peach,#FFF7ED);border:1px solid rgba(245,158,11,0.25);">
          <div style="font-size:0.76rem;font-weight:800;color:var(--accent);text-transform:uppercase;margin-bottom:4px;">Burmese Prompt:</div>
          <div class="burmese" style="font-size:0.92rem;font-weight:700;color:var(--text);">${escapeHtml(pick.translation)}</div>
        </div>

        <!-- Candidate Constructed Sentence Slot -->
        <div id="duoScrambleSlot" style="min-height:56px;padding:10px 14px;border-radius:14px;background:var(--bg-elevated);border:2px dashed var(--border-mid);display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:16px;">
          <span id="duoScramblePlaceholder" style="font-size:0.82rem;color:var(--text-secondary);">Tap words from the bank below to construct the Band 8.5+ sentence...</span>
        </div>

        <!-- Available Word Chips Bank -->
        <div id="duoChipsBank" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;min-height:70px;">
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

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding-top:10px;border-top:1px solid var(--border);">
          <div style="display:flex;gap:6px;">
            <button type="button" class="btn-outlined" style="font-size:0.8rem;" onclick="window.duoResetScramble()">↺ Clear</button>
            <button type="button" class="btn-outlined" style="font-size:0.8rem;color:#0284C7;border-color:rgba(2,132,199,0.3);" onclick="window.duoUseScrambleHint(${JSON.stringify(correctWords).replace(/"/g, "&quot;")})">
              <svg class="ui-icon" style="color:#F59E0B;" aria-hidden="true"><use href="#lucide-lightbulb"/></svg> Hint (10 <svg class="ui-icon" style="color:#06B6D4;" aria-hidden="true"><use href="#lucide-gem"/></svg>)
            </button>
          </div>
          <button type="button" class="btn-accent-solid" id="duoCheckScrambleBtn" style="padding:10px 22px;font-size:0.88rem;font-weight:800;" onclick="window.duoCheckScrambleAnswer(${JSON.stringify(pick.target).replace(/"/g, "&quot;")})">
            Check Answer <svg class="ui-icon" aria-hidden="true"><use href="#lucide-check"/></svg>
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
    tokenBtn.style.borderColor = "var(--accent-gold,#F59E0B)";
    tokenBtn.innerHTML = `${escapeHtml(word)} <small style="color:var(--text-secondary);margin-left:3px;">&times;</small>`;
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

  window.duoUseScrambleHint = function (correctWords) {
    const st = getGamifyState();
    if ((st.gems || 0) < 10) {
      duoPlaySound("warn");
      if (typeof showStudioNotification === "function") {
        showStudioNotification("Need at least 10 Gems for a Hint! Earn gems by practicing.");
      }
      return;
    }

    const currentCount = (window.duoCurrentPickedChips || []).length;
    if (currentCount >= correctWords.length) return;

    const nextWord = correctWords[currentCount];
    // Find unpicked chip matching nextWord
    const allChips = document.querySelectorAll("#duoChipsBank .duo-word-chip:not(.used)");
    let targetChip = null;
    for (const chip of allChips) {
      if (chip.textContent.trim().toLowerCase() === nextWord.toLowerCase()) {
        targetChip = chip;
        break;
      }
    }

    if (targetChip) {
      st.gems -= 10;
      saveGamifyState(st);
      const match = targetChip.id.match(/\d+/);
      if (match) {
        window.duoPickChip(match[0], nextWord);
        if (typeof showStudioNotification === "function") {
          showStudioNotification(`Hint used: "${nextWord}" placed (-10 Gems)`);
        }
      }
    }
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
        if (modal) {
          modal.classList.remove("open");
          modal.style.display = "none";
        }
        duoShowFeedback({
          title: "Flawless Syntax! +25 XP & +5 Gems",
          message: `Mastered Collocation: "${targetSentence}"`,
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
        showStudioNotification(`Incorrect word sequence (-1 Heart). Remaining: ${st.hearts}/5.`);
      }
    }
  };

  // ==========================================================================
  // 6. ACADEMIC STUDY ECONOMY & SCHOLAR GEM STORE MODAL
  // ==========================================================================
  window.openAcademicEconomyModal = function (initialTab = "stats") {
    duoPlaySound("pop");
    checkHeartRegen();
    const st = getGamifyState();
    const rank = window.getScholarRankInfo(st.xp);

    let modal = document.getElementById("ipsAcademicEconomyModalBackdrop");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "ipsAcademicEconomyModalBackdrop";
      modal.className = "ips-modal-overlay";
      document.body.appendChild(modal);
    }

    modal.classList.add("open");
    modal.style.display = "flex";

    const isDoubleXp = st.doubleXpUntil && Date.now() < st.doubleXpUntil;
    const doubleXpMins = isDoubleXp ? Math.ceil((st.doubleXpUntil - Date.now()) / (1000 * 60)) : 0;

    modal.innerHTML = `
      <div class="ips-modal-shell">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1.5px solid var(--border);padding-bottom:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <svg class="ui-icon" style="width:28px;height:28px;color:#EA580C;" aria-hidden="true"><use href="#lucide-landmark"/></svg>
            <div>
              <strong style="font-size:1.06rem;color:var(--text);">Academic Economy &amp; Scholar Rewards</strong>
              <div style="font-size:0.75rem;color:var(--text-secondary);">How Consistency, XP, Focus Hearts, and Gems power your IELTS Band 8.5+</div>
            </div>
          </div>
          <button class="btn-outlined" style="padding:4px 9px;font-size:0.78rem;" onclick="document.getElementById('ipsAcademicEconomyModalBackdrop').classList.remove('open');document.getElementById('ipsAcademicEconomyModalBackdrop').style.display='none';">&times;</button>
        </div>

        <!-- SCHOLAR RANK TIER HERO -->
        <div style="padding:16px;border-radius:18px;background:linear-gradient(135deg, rgba(245,158,11,0.14), rgba(217,119,6,0.06));border:2px solid rgba(245,158,11,0.3);margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
            <div>
              <div style="font-size:0.72rem;font-weight:800;color:#D97706;text-transform:uppercase;letter-spacing:0.06em;">CURRENT SCHOLAR RANK</div>
              <h3 style="font-size:1.2rem;font-weight:900;color:var(--text);margin:2px 0 0 0;">${rank.badge} Level ${rank.level}: ${rank.title}</h3>
              <span style="font-size:0.78rem;color:var(--text-secondary);font-weight:700;">Target Track: ${rank.bandTrack}</span>
            </div>
            <div style="text-align:right;">
              <span style="font-size:1.25rem;font-weight:900;color:#D97706;">${st.xp} XP</span>
              <div style="font-size:0.72rem;color:var(--text-secondary);">${rank.nextAt > st.xp ? (rank.nextAt - st.xp) + ' XP to Level ' + (rank.level + 1) : 'Max Rank Reached!'}</div>
            </div>
          </div>
          <div class="duo-progress-track">
            <div class="duo-progress-fill" style="width:${rank.progressPct}%;"></div>
          </div>
          ${isDoubleXp ? `<div style="margin-top:8px;font-size:0.74rem;color:#D97706;font-weight:800;">2× Double XP Boost ACTIVE (${doubleXpMins} minutes remaining)</div>` : ''}
        </div>

        <!-- 4 CORE CURRENCIES EXPLAINED -->
        <div class="ips-economy-grid">
          <div class="ips-stat-explain-card">
            <div style="display:flex;align-items:center;gap:6px;">
              <svg class="ui-icon" style="width:24px;height:24px;color:#F97316;"><use href="#lucide-flame"/></svg>
              <strong style="font-size:0.86rem;color:#EA580C;">Study Streak</strong>
            </div>
            <p style="font-size:0.76rem;color:var(--text-secondary);margin:0;line-height:1.4;">
              Tracks consecutive active study days. Study at least 1 lesson daily to maintain.
            </p>
            <div style="margin-top:4px;font-size:0.72rem;font-weight:700;color:var(--text);">
              Status: <strong>${st.streakFreezes > 0 ? 'Streak Freeze Shield Equipped (' + st.streakFreezes + ')' : 'No freeze shield active'}</strong>
            </div>
          </div>

          <div class="ips-stat-explain-card">
            <div style="display:flex;align-items:center;gap:6px;">
              <svg class="ui-icon" style="width:24px;height:24px;color:#EAB308;"><use href="#lucide-star"/></svg>
              <strong style="font-size:0.86rem;color:#D97706;">Academic XP</strong>
            </div>
            <p style="font-size:0.76rem;color:var(--text-secondary);margin:0;line-height:1.4;">
              Earned by mastering collocations (+5), completing speed drills (+30), and mock tests (+40).
            </p>
            <div style="margin-top:4px;font-size:0.72rem;font-weight:700;color:var(--text);">
              Total: <strong>${st.xp} XP</strong> (${rank.title})
            </div>
          </div>

          <div class="ips-stat-explain-card">
            <div style="display:flex;align-items:center;gap:6px;">
              <svg class="ui-icon" style="width:24px;height:24px;color:#EF4444;"><use href="#lucide-heart"/></svg>
              <strong style="font-size:0.86rem;color:#E11D48;">Focus Hearts</strong>
            </div>
            <p style="font-size:0.76rem;color:var(--text-secondary);margin:0;line-height:1.4;">
              Exam stamina during drills. Mistakes cost 1 Focus Heart. Refills over time or with Gems.
            </p>
            <div style="margin-top:4px;font-size:0.72rem;font-weight:700;color:var(--text);">
              Lives: <strong>${st.hearts}/${st.maxHearts || 5} Hearts</strong>
            </div>
          </div>

          <div class="ips-stat-explain-card">
            <div style="display:flex;align-items:center;gap:6px;">
              <svg class="ui-icon" style="width:24px;height:24px;color:#06B6D4;"><use href="#lucide-gem"/></svg>
              <strong style="font-size:0.86rem;color:#0284C7;">Academic Gems</strong>
            </div>
            <p style="font-size:0.76rem;color:var(--text-secondary);margin:0;line-height:1.4;">
              Spendable scholar currency. Earn +1 Gem per 5 XP and +15 Gems per Daily Quest.
            </p>
            <div style="margin-top:4px;font-size:0.72rem;font-weight:700;color:var(--text);">
              Balance: <strong>${st.gems || 45} Gems</strong>
            </div>
          </div>
        </div>

        <!-- SCHOLAR GEM STORE -->
        <div style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <h4 style="font-size:0.92rem;font-weight:800;color:var(--text);margin:0;"><svg class="ui-icon" style="color:#06B6D4;"><use href="#lucide-gem"/></svg> Scholar Gem Store (Spend Your Gems)</h4>
            <span style="font-size:0.75rem;color:#0284C7;font-weight:800;">Available: ${st.gems || 45} Gems</span>
          </div>

          <div class="ips-shop-row">
            <div>
              <strong style="font-size:0.84rem;color:var(--text);"><svg class="ui-icon" style="color:#EF4444;fill:#EF4444;" aria-hidden="true"><use href="#lucide-heart"/></svg> Instant Full Heart Refill</strong>
              <div style="font-size:0.73rem;color:var(--text-secondary);">Restores Focus Hearts back to 5/5 immediately.</div>
            </div>
            <button type="button" class="btn-outlined" style="font-size:0.76rem;font-weight:800;color:#E11D48;border-color:rgba(225,29,72,0.3);" onclick="window.duoBuyStoreItem('refill_hearts')">
              15 Gems Refill
            </button>
          </div>

          <div class="ips-shop-row">
            <div>
              <strong style="font-size:0.84rem;color:var(--text);"><svg class="ui-icon" style="color:#F59E0B;" aria-hidden="true"><use href="#lucide-zap"/></svg> 2× Double XP Boost (15 Mins)</strong>
              <div style="font-size:0.73rem;color:var(--text-secondary);">Doubles all XP earned across the studio for 15 minutes of intensive study.</div>
            </div>
            <button type="button" class="btn-outlined" style="font-size:0.76rem;font-weight:800;color:#D97706;border-color:rgba(217,119,6,0.3);" onclick="window.duoBuyStoreItem('double_xp')">
              30 Gems Activate
            </button>
          </div>

          <div class="ips-shop-row">
            <div>
              <strong style="font-size:0.84rem;color:var(--text);"><svg class="ui-icon" style="color:#38BDF8;" aria-hidden="true"><use href="#lucide-snowflake"/></svg> Streak Freeze Shield</strong>
              <div style="font-size:0.73rem;color:var(--text-secondary);">Protects your daily consistency streak if you miss a study day.</div>
            </div>
            <button type="button" class="btn-outlined" style="font-size:0.76rem;font-weight:800;color:#0284C7;border-color:rgba(2,132,199,0.3);" onclick="window.duoBuyStoreItem('streak_freeze')">
              50 Gems Shield
            </button>
          </div>

          <div class="ips-shop-row">
            <div>
              <strong style="font-size:0.84rem;color:var(--text);"><svg class="ui-icon" style="color:#10B981;" aria-hidden="true"><use href="#lucide-target"/></svg> Band 9 Examiner Collocation Card</strong>
              <div style="font-size:0.73rem;color:var(--text-secondary);">Unlock a secret Band 9 Golden Academic Expression with audio and Burmese analysis.</div>
            </div>
            <button type="button" class="btn-outlined" style="font-size:0.76rem;font-weight:800;color:#10B981;border-color:rgba(16,185,129,0.3);" onclick="window.duoBuyStoreItem('booster_card')">
              25 Gems Draw
            </button>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding-top:10px;border-top:1.5px solid var(--border);">
          <button type="button" class="btn-outlined" style="font-size:0.78rem;" onclick="window.openStudioGuideModal()">
            Open Full Studio Guide
          </button>
          <button type="button" class="btn-accent-solid" style="padding:8px 18px;font-size:0.82rem;font-weight:800;" onclick="window.openDuoWordScrambleModal()">
            Play Syntax Builder (+25 XP)
          </button>
        </div>
      </div>
    `;
  };

  window.duoBuyStoreItem = function (itemKey) {
    const st = getGamifyState();
    if (itemKey === "refill_hearts") {
      if ((st.gems || 0) < 15) {
        duoPlaySound("warn");
        if (typeof showStudioNotification === "function") showStudioNotification("Need 15 Gems to refill hearts!");
        return;
      }
      st.gems -= 15;
      st.hearts = st.maxHearts || 5;
      saveGamifyState(st);
      duoPlaySound("success");
      if (typeof showStudioNotification === "function") showStudioNotification("Focus Hearts refilled to 5/5!");
      window.openAcademicEconomyModal();
    } else if (itemKey === "double_xp") {
      if ((st.gems || 0) < 30) {
        duoPlaySound("warn");
        if (typeof showStudioNotification === "function") showStudioNotification("Need 30 Gems for Double XP!");
        return;
      }
      st.gems -= 30;
      st.doubleXpUntil = Date.now() + 15 * 60 * 1000;
      saveGamifyState(st);
      window.duoCelebrate();
      if (typeof showStudioNotification === "function") showStudioNotification("2× Double XP Activated for 15 minutes!");
      window.openAcademicEconomyModal();
    } else if (itemKey === "streak_freeze") {
      if ((st.gems || 0) < 50) {
        duoPlaySound("warn");
        if (typeof showStudioNotification === "function") showStudioNotification("Need 50 Gems for Streak Freeze!");
        return;
      }
      st.gems -= 50;
      st.streakFreezes = (st.streakFreezes || 0) + 1;
      saveGamifyState(st);
      duoPlaySound("success");
      if (typeof showStudioNotification === "function") showStudioNotification("Streak Freeze Shield equipped!");
      window.openAcademicEconomyModal();
    } else if (itemKey === "booster_card") {
      if ((st.gems || 0) < 25) {
        duoPlaySound("warn");
        if (typeof showStudioNotification === "function") showStudioNotification("Need 25 Gems to draw a card!");
        return;
      }
      st.gems -= 25;
      saveGamifyState(st);
      window.duoCelebrate();
      const CARDS = [
        "\"A compelling body of empirical evidence demonstrates that...\" (Writing Task 2 Band 9 Anchor)",
        "\"This demographic transition exerts unprecedented strain on social infrastructure.\" (Urbanization Collocation)",
        "\"From my vantage point, it would be imprudent to overlook the ramifications of...\" (Speaking Part 3 Band 9)",
        "\"The data exhibits a pronounced upward trajectory, albeit with minor fluctuations.\" (Writing Task 1 Band 9)"
      ];
      const drawn = CARDS[Math.floor(Math.random() * CARDS.length)];
      window.duoShowFeedback({
        title: "Golden Band 9 Academic Card Unlocked!",
        message: drawn,
        type: "success"
      });
      window.openAcademicEconomyModal();
    }
  };

  // ==========================================================================
  // 7. NEW USER ONBOARDING & STUDIO GUIDE MODAL (4-STEP WALKTHROUGH)
  // ==========================================================================
  window.openStudioGuideModal = function (step = 1) {
    duoPlaySound("pop");

    let modal = document.getElementById("ipsNewUserGuideModalBackdrop");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "ipsNewUserGuideModalBackdrop";
      modal.className = "ips-modal-overlay";
      document.body.appendChild(modal);
    }

    modal.classList.add("open");
    modal.style.display = "flex";

    const contentSteps = {
      1: `
        <div style="font-size:0.74rem;font-weight:800;color:#D97706;text-transform:uppercase;">STEP 1 OF 4 • CORE ARCHITECTURE</div>
        <h3 style="font-size:1.15rem;font-weight:900;color:var(--text);margin:3px 0 8px 0;">Welcome to IELTS Prep Studio</h3>
        <p style="font-size:0.83rem;color:var(--text-secondary);line-height:1.5;margin-bottom:14px;">
          An open academic mastery workspace designed to take you from Band 6.0 to Band 8.5+. You have 8 unified study hubs:
        </p>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:14px;">
          <div style="padding:8px 10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);font-size:0.78rem;">
            <strong><svg class="ui-icon" style="display:inline-block;vertical-align:-2px;margin-right:4px;"><use href="#lucide-house"/></svg>Home Overview</strong><br><span style="color:var(--text-secondary);font-size:0.72rem;">Journey tree, daily quests &amp; streak tracker</span>
          </div>
          <div style="padding:8px 10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);font-size:0.78rem;">
            <strong><svg class="ui-icon" style="display:inline-block;vertical-align:-2px;margin-right:4px;"><use href="#lucide-book-open"/></svg>Lexicon &amp; Drills</strong><br><span style="color:var(--text-secondary);font-size:0.72rem;">1,162 AWL words &amp; 1-3-7 Spaced Repetition</span>
          </div>
          <div style="padding:8px 10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);font-size:0.78rem;">
            <strong><svg class="ui-icon" style="display:inline-block;vertical-align:-2px;margin-right:4px;"><use href="#lucide-headphones"/></svg>Listening CBT</strong><br><span style="color:var(--text-secondary);font-size:0.72rem;">160 Cambridge audio tests with transcripts</span>
          </div>
          <div style="padding:8px 10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);font-size:0.78rem;">
            <strong><svg class="ui-icon" style="display:inline-block;vertical-align:-2px;margin-right:4px;"><use href="#lucide-book"/></svg>CBT Reading</strong><br><span style="color:var(--text-secondary);font-size:0.72rem;">23 Full Passages with split highlighter</span>
          </div>
          <div style="padding:8px 10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);font-size:0.78rem;">
            <strong><svg class="ui-icon" style="display:inline-block;vertical-align:-2px;margin-right:4px;"><use href="#lucide-pen-tool"/></svg>Writing Lab</strong><br><span style="color:var(--text-secondary);font-size:0.72rem;">Task 1 charts &amp; Task 2 AI CEFR evaluator</span>
          </div>
          <div style="padding:8px 10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);font-size:0.78rem;">
            <strong><svg class="ui-icon" style="display:inline-block;vertical-align:-2px;margin-right:4px;"><use href="#lucide-mic"/></svg>Speaking Studio</strong><br><span style="color:var(--text-secondary);font-size:0.72rem;">35 Forecasts, auto-cue cards &amp; live weather</span>
          </div>
        </div>
      `,
      2: `
        <div style="font-size:0.74rem;font-weight:800;color:#D97706;text-transform:uppercase;">STEP 2 OF 4 • STUDY REWARDS &amp; ECONOMY</div>
        <h3 style="font-size:1.15rem;font-weight:900;color:var(--text);margin:3px 0 8px 0;">How Streak, XP, Hearts &amp; Gems Work</h3>
        <p style="font-size:0.83rem;color:var(--text-secondary);line-height:1.5;margin-bottom:14px;">
          The studio uses a tactical study economy to build daily discipline and reward genuine exam skills:
        </p>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
          <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);">
            <svg class="ui-icon" style="width:24px;height:24px;color:#F97316;"><use href="#lucide-flame"/></svg>
            <div><strong style="font-size:0.82rem;color:#EA580C;">Streak</strong><div style="font-size:0.74rem;color:var(--text-secondary);">Your daily habit chain. Complete at least one exercise daily to keep it glowing.</div></div>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);">
            <svg class="ui-icon" style="width:24px;height:24px;color:#EAB308;"><use href="#lucide-star"/></svg>
            <div><strong style="font-size:0.82rem;color:#D97706;">Academic XP</strong><div style="font-size:0.74rem;color:var(--text-secondary);">Progresses your Scholar Rank from Level 1 (Band 6.0) to Level 5 (Band 9.0).</div></div>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);">
            <svg class="ui-icon" style="width:24px;height:24px;color:#EF4444;"><use href="#lucide-heart"/></svg>
            <div><strong style="font-size:0.82rem;color:#E11D48;">Focus Hearts</strong><div style="font-size:0.74rem;color:var(--text-secondary);">Your stamina in recall drills. Careless slips cost 1 Focus Heart. Refills over time or in the Gem Store.</div></div>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);">
            <svg class="ui-icon" style="width:24px;height:24px;color:#06B6D4;"><use href="#lucide-gem"/></svg>
            <div><strong style="font-size:0.82rem;color:#0284C7;">Gems (Store Currency)</strong><div style="font-size:0.74rem;color:var(--text-secondary);">Earn gems by studying. Spend them on Syntax Builder Hints, 2× XP Boosts, and Streak Shields.</div></div>
          </div>
        </div>
      `,
      3: `
        <div style="font-size:0.74rem;font-weight:800;color:#D97706;text-transform:uppercase;">STEP 3 OF 4 • VOCABULARY MASTERY</div>
        <h3 style="font-size:1.15rem;font-weight:900;color:var(--text);margin:3px 0 8px 0;">1–3–7 Day Spaced Repetition (SRS)</h3>
        <p style="font-size:0.83rem;color:var(--text-secondary);line-height:1.5;margin-bottom:12px;">
          Never memorize a word once and forget it. The Lexicon uses scientific Spaced Repetition:
        </p>
        <div style="display:flex;gap:6px;margin-bottom:12px;">
          <div style="flex:1;padding:8px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:10px;text-align:center;">
            <strong style="font-size:0.76rem;color:#EF4444;">Again (1d)</strong>
            <div style="font-size:0.68rem;color:var(--text-secondary);">Forgot word; review tomorrow</div>
          </div>
          <div style="flex:1;padding:8px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;text-align:center;">
            <strong style="font-size:0.76rem;color:#D97706;">Good (3d)</strong>
            <div style="font-size:0.68rem;color:var(--text-secondary);">Recalled with effort; review in 3 days</div>
          </div>
          <div style="flex:1;padding:8px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:10px;text-align:center;">
            <strong style="font-size:0.76rem;color:#10B981;">Easy (7d)</strong>
            <div style="font-size:0.68rem;color:var(--text-secondary);">Solid mastery; review in 1 week</div>
          </div>
        </div>
        <div style="padding:10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);font-size:0.76rem;line-height:1.45;">
          When words come due, the topbar shows <strong>Due Today</strong>. Click it to review in under 3 minutes before the memory decays.
        </div>
      `,
      4: `
        <div style="font-size:0.74rem;font-weight:800;color:#D97706;text-transform:uppercase;">STEP 4 OF 4 • RECOMMENDED DAILY ROUTINE</div>
        <h3 style="font-size:1.15rem;font-weight:900;color:var(--text);margin:3px 0 8px 0;">Your 30-Minute Daily Band 8.5 Routine</h3>
        <p style="font-size:0.83rem;color:var(--text-secondary);line-height:1.5;margin-bottom:12px;">
          For steady band increases without burnout, follow this 3-block sequence daily:
        </p>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
          <div style="padding:8px 12px;border-radius:10px;background:var(--bg-elevated);border-left:4px solid #F59E0B;font-size:0.78rem;">
            <strong>Block 1 (10 Mins)</strong>: Review 10 SRS Vocabulary Words + 1 Syntax Scramble Drill (+30 XP)
          </div>
          <div style="padding:8px 12px;border-radius:10px;background:var(--bg-elevated);border-left:4px solid #38BDF8;font-size:0.78rem;">
            <strong>Block 2 (10 Mins)</strong>: Complete 1 Cambridge Listening Section or Reading Passage (+40 XP)
          </div>
          <div style="padding:8px 12px;border-radius:10px;background:var(--bg-elevated);border-left:4px solid #10B981;font-size:0.78rem;">
            <strong>Block 3 (10 Mins)</strong>: Speak 1 Forecast Part 2 Cue Card or write 1 Task 2 Body Paragraph (+40 XP)
          </div>
        </div>
        <div style="text-align:center;">
          <button type="button" class="btn-accent-solid" style="padding:10px 24px;font-size:0.9rem;font-weight:800;" onclick="window.markGuideCompleteAndStart()">
            Start My First Session &rarr;
          </button>
        </div>
      `
    };

    modal.innerHTML = `
      <div class="ips-modal-shell" style="max-width:580px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <svg class="ui-icon" style="width:24px;height:24px;color:var(--accent);"><use href="#lucide-award"/></svg>
            <strong style="font-size:0.98rem;color:var(--text);">IELTS Prep Studio — Student Quick Guide</strong>
          </div>
          <button class="btn-outlined" style="padding:3px 8px;font-size:0.75rem;" onclick="document.getElementById('ipsNewUserGuideModalBackdrop').classList.remove('open');document.getElementById('ipsNewUserGuideModalBackdrop').style.display='none';">&times;</button>
        </div>

        <div class="ips-guide-step-tabs">
          <button type="button" class="ips-guide-tab-btn ${step === 1 ? 'active' : ''}" onclick="window.openStudioGuideModal(1)">1. Overview</button>
          <button type="button" class="ips-guide-tab-btn ${step === 2 ? 'active' : ''}" onclick="window.openStudioGuideModal(2)">2. Economy</button>
          <button type="button" class="ips-guide-tab-btn ${step === 3 ? 'active' : ''}" onclick="window.openStudioGuideModal(3)">3. 1-3-7 SRS</button>
          <button type="button" class="ips-guide-tab-btn ${step === 4 ? 'active' : ''}" onclick="window.openStudioGuideModal(4)">4. Routine</button>
        </div>

        <div style="min-height:260px;">
          ${contentSteps[step]}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:10px;border-top:1px solid var(--border);">
          <button type="button" class="btn-outlined" style="font-size:0.78rem;" ${step === 1 ? 'disabled style="opacity:0.4;"' : ''} onclick="window.openStudioGuideModal(${Math.max(1, step - 1)})">
            ← Previous
          </button>
          ${step < 4 ? `
            <button type="button" class="btn-accent-solid" style="padding:6px 16px;font-size:0.8rem;font-weight:700;" onclick="window.openStudioGuideModal(${step + 1})">
              Next Step →
            </button>
          ` : `
            <button type="button" class="btn-accent-solid" style="padding:6px 16px;font-size:0.8rem;font-weight:700;" onclick="window.markGuideCompleteAndStart()">
              Got It
            </button>
          `}
        </div>
      </div>
    `;
  };

  window.markGuideCompleteAndStart = function () {
    try {
      localStorage.setItem(GUIDE_SEEN_KEY, "1");
    } catch (e) {}
    const modal = document.getElementById("ipsNewUserGuideModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      modal.style.display = "none";
    }
    duoPlaySound("success");
    if (typeof window.switchView === "function") {
      window.switchView("overview");
    }
  };

  // ==========================================================================
  // 8. RENDER SINGLE-LINE TOP HUD CAPSULE
  // ==========================================================================
  function renderHudPills() {
    const mount = document.getElementById("duoTopHudMount");
    if (!mount) return;
    const st = getGamifyState();
    checkHeartRegen();

    let streakDays = 1;
    const streakEl = document.getElementById("streakCountVal");
    if (streakEl) {
      const match = streakEl.textContent.match(/\d+/);
      if (match) streakDays = parseInt(match[0], 10);
    }

    mount.innerHTML = `
      <div class="duo-hud-bar">
        <div class="duo-hud-pill streak" title="Consistency Streak: ${streakDays} Consecutive Days" onclick="window.openAcademicEconomyModal('streak')">
          <svg class="ui-icon" style="color:#F97316;" aria-hidden="true"><use href="#lucide-flame"/></svg> <span>${streakDays}</span>
        </div>
        <div class="duo-hud-pill xp" title="Academic XP (${st.xp} Total) — Click for Scholar Rank" onclick="window.openAcademicEconomyModal('xp')">
          <svg class="ui-icon" style="color:#EAB308;" aria-hidden="true"><use href="#lucide-star"/></svg> <span>${st.xp || 120} XP</span>
        </div>
        <div class="duo-hud-pill hearts" title="Focus Hearts: ${st.hearts}/${st.maxHearts || 5} Lives" onclick="window.openAcademicEconomyModal('hearts')">
          <svg class="ui-icon" style="color:#EF4444; fill:#EF4444;" aria-hidden="true"><use href="#lucide-heart"/></svg> <span>${st.hearts || 5}</span>
        </div>
        <div class="duo-hud-pill gems" title="Scholar Gems (${st.gems || 45}) — Click for Gem Store" onclick="window.openAcademicEconomyModal('gems')">
          <svg class="ui-icon" style="color:#06B6D4;" aria-hidden="true"><use href="#lucide-gem"/></svg> <span>${st.gems || 45}</span>
        </div>
        <div class="duo-hud-pill guide-pill" title="Open Student Quick Guide" onclick="window.openStudioGuideModal(1)">
          <svg class="ui-icon" style="color:#3B82F6;" aria-hidden="true"><use href="#lucide-book-marked"/></svg> <span>Guide</span>
        </div>
        <button type="button" class="btn-outlined" style="padding:2px 7px;font-size:0.72rem;border-radius:999px;border:none;" title="Toggle Sound Effects" onclick="window.duoToggleSound()">
          ${st.soundEnabled !== false ? '<svg class="ui-icon" aria-hidden="true"><use href="#lucide-volume-2"/></svg>' : '<svg class="ui-icon" aria-hidden="true"><use href="#lucide-volume-x"/></svg>'}
        </button>
      </div>
    `;
  }

  function renderOverviewDuoHub() {
    const mount = document.getElementById("duoOverviewHubMount");
    if (!mount) return;
    const st = getGamifyState();

    const quests = st.dailyQuests || [];
    const questsHtml = quests
      .map((q) => {
        const pct = Math.min(100, Math.round(((q.current || 0) / q.target) * 100));
        return `
          <div style="margin-bottom:10px;padding:10px 12px;border-radius:12px;background:var(--bg-elevated);border:1px solid var(--border);width:100%;max-width:100%;min-width:0;box-sizing:border-box;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;min-width:0;">
              <span style="font-size:0.79rem;font-weight:700;color:var(--text);flex:1 1 160px;min-width:0;word-break:break-word;">${escapeHtml(q.title)}</span>
              <span class="occ-ver-pill" style="font-size:0.68rem;color:${q.done ? "#10B981" : "var(--accent-gold,#F59E0B)"};font-weight:800;flex-shrink:0;">
                ${q.done ? "Done (+ " + q.xp + " XP)" : q.current + "/" + q.target}
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
        <!-- 1. CAMBRIDGE SKILL TREE PATH -->
        <div class="duo-path-card">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;min-width:0;">
            <div style="flex:1 1 180px;min-width:0;">
              <div style="font-size:0.72rem;font-weight:800;color:var(--accent);text-transform:uppercase;letter-spacing:0.06em;">UNIT 1 • FOUNDATION PATH</div>
              <h3 style="font-size:1.02rem;font-weight:900;color:var(--text);margin:2px 0 0 0;word-break:break-word;">Cambridge Academic Journey</h3>
            </div>
            <div style="display:flex;gap:6px;">
              <button type="button" class="btn-outlined" style="padding:4px 9px;font-size:0.74rem;font-weight:700;flex-shrink:0;" onclick="window.openStudioGuideModal(1)">
                <svg class="ui-icon" style="width:14px;height:14px;"><use href="#lucide-book-open"/></svg> Guide
              </button>
              <button type="button" class="btn-accent-solid" style="padding:4px 10px;font-size:0.74rem;font-weight:700;flex-shrink:0;" onclick="window.openDuoWordScrambleModal()">
                <svg class="ui-icon" style="width:14px;height:14px;"><use href="#lucide-puzzle"/></svg> Syntax Drill
              </button>
            </div>
          </div>
          <p style="font-size:0.79rem;color:var(--text-secondary);margin:0 0 12px 0;line-height:1.45;word-break:break-word;">
            Follow the guided step-by-step path to master Reading, Listening, Lexicon, and Speaking drills with instant feedback.
          </p>

          <div class="duo-path-nodes">
            <div class="duo-path-node completed" onclick="switchView('lexicon')" title="Step 1: Academic Collocations (AWL Sublist 1)">
              <div class="duo-node-circle"><svg class="ui-icon" style="width:24px;height:24px;color:#EA580C;" aria-hidden="true"><use href="#lucide-landmark"/></svg></div>
              <div class="duo-node-label">Lexicon</div>
              <div class="duo-node-crowns"><svg class="ui-icon" style="color:#F59E0B;width:11px;height:11px;" aria-hidden="true"><use href="#lucide-crown"/></svg> 5/5</div>
            </div>
            <div class="duo-path-node completed" onclick="switchView('listening')" title="Step 2: Listening Section 1 Dialogue Drill">
              <div class="duo-node-circle"><svg class="ui-icon" style="width:24px;height:24px;color:#3B82F6;" aria-hidden="true"><use href="#lucide-headphones"/></svg></div>
              <div class="duo-node-label">Listening</div>
              <div class="duo-node-crowns"><svg class="ui-icon" style="color:#F59E0B;width:11px;height:11px;" aria-hidden="true"><use href="#lucide-crown"/></svg> 4/4</div>
            </div>
            <div class="duo-path-node active-node" onclick="switchView('reading')" title="Step 3: Cambridge Reading CBT Simulation">
              <div class="duo-node-circle"><svg class="ui-icon" style="width:24px;height:24px;color:#10B981;" aria-hidden="true"><use href="#lucide-book"/></svg></div>
              <div class="duo-node-label">Reading</div>
              <div class="duo-node-crowns"><svg class="ui-icon" style="color:#EAB308;width:11px;height:11px;" aria-hidden="true"><use href="#lucide-star"/></svg> Now</div>
            </div>
            <div class="duo-path-node" onclick="switchView('speaking')" title="Step 4: Speaking 3-Part Mock Simulator">
              <div class="duo-node-circle"><svg class="ui-icon" style="width:24px;height:24px;color:#8B5CF6;" aria-hidden="true"><use href="#lucide-mic"/></svg></div>
              <div class="duo-node-label">Speaking</div>
              <div class="duo-node-crowns"><svg class="ui-icon" style="width:11px;height:11px;" aria-hidden="true"><use href="#lucide-lock"/></svg> Next</div>
            </div>
            <div class="duo-path-node" onclick="switchView('writing')" title="Step 5: Task 2 Academic Essay Lab">
              <div class="duo-node-circle"><svg class="ui-icon" style="width:24px;height:24px;color:#EC4899;" aria-hidden="true"><use href="#lucide-pen-tool"/></svg></div>
              <div class="duo-node-label">Writing</div>
              <div class="duo-node-crowns"><svg class="ui-icon" style="width:11px;height:11px;" aria-hidden="true"><use href="#lucide-lock"/></svg> Lab</div>
            </div>
          </div>
        </div>

        <!-- 2. DAILY QUESTS & REWARD CHEST -->
        <div class="duo-quest-card">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;min-width:0;">
              <span style="font-size:1.1rem;flex-shrink:0;"><svg class="ui-icon" style="color:var(--accent);"><use href="#lucide-target"/></svg></span>
              <strong style="font-size:0.92rem;color:var(--text);">Daily Cambridge Quests</strong>
            </div>
            <span class="occ-ver-pill" style="font-size:0.66rem;color:var(--accent-gold,#F59E0B);font-weight:800;flex-shrink:0;">RESETS DAILY</span>
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
  // 9. INITIALIZE ENGINE ON DOM READY & FIRST-TIME ONBOARDING CHECK
  // ==========================================================================
  function initDuoMotion() {
    // 1. Inject Top HUD Mount cleanly into .top-utils as the FIRST item
    const topUtils = document.querySelector(".top-utils");
    if (topUtils && !document.getElementById("duoTopHudMount")) {
      const hudMount = document.createElement("div");
      hudMount.id = "duoTopHudMount";
      topUtils.insertBefore(hudMount, topUtils.firstChild);
      renderHudPills();
    }

    // 2. Inject Overview Skill Path Mount before Jump-In Lessons
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

    // 3. Audio feedback hooks
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-accent-solid, .star-btn, .duo-hud-pill, .duo-path-node");
      if (btn && !btn.id?.includes("CheckScramble")) {
        window.duoPlaySound("tap");
      }
    });

    renderHudPills();
    renderOverviewDuoHub();
    initTopbarManualToggle();
    initTopUtilsDragScroll();

    // 4. First-time user onboarding guide auto-prompt (3.8s after launch, once only)
    try {
      if (!localStorage.getItem(GUIDE_SEEN_KEY)) {
        setTimeout(() => {
          if (!localStorage.getItem(GUIDE_SEEN_KEY)) {
            window.openStudioGuideModal(1);
          }
        }, 3800);
      }
    } catch (e) {}
  }

  // ==========================================================================
  // 10. TOPBAR MANUAL COLLAPSE / EXPAND TOGGLE & HORIZONTAL DRAG SCROLLER
  // ==========================================================================
  window.toggleTopbarCollapse = function(forceState) {
    const isCurrentlyCollapsed = document.body.classList.contains("topbar-collapsed");
    const nextState = (typeof forceState === "boolean") ? forceState : !isCurrentlyCollapsed;

    if (nextState) {
      document.body.classList.add("topbar-collapsed");
    } else {
      document.body.classList.remove("topbar-collapsed");
    }

    const hangBtn = document.getElementById("topbarHangToggleBtn");
    const hangLabel = document.getElementById("topbarHangLabel");
    if (hangBtn) {
      hangBtn.setAttribute("aria-expanded", nextState ? "false" : "true");
      hangBtn.title = nextState ? "Show Top Bar" : "Hide Top Bar";
    }
    if (hangLabel) {
      hangLabel.textContent = nextState ? "Show Top Bar" : "Hide Top Bar";
    }

    const toggleBtn = document.getElementById("topbarCollapseBtn");
    if (toggleBtn) {
      toggleBtn.innerHTML = nextState ? "▾" : "▴";
      toggleBtn.title = nextState ? "Expand Top Bar" : "Collapse Top Bar";
      toggleBtn.setAttribute("aria-expanded", nextState ? "false" : "true");
    }

    const expandPill = document.getElementById("topbarExpandPill");
    if (expandPill) {
      expandPill.style.display = nextState ? "inline-flex" : "none";
    }

    try {
      localStorage.setItem("ips_topbar_collapsed", nextState ? "1" : "0");
    } catch (e) {}

    if (typeof studioHaptic === "function") studioHaptic(10);
  };

  window.revealTopbar = function() {
    window.toggleTopbarCollapse(false);
  };

  function initTopbarManualToggle() {
    // Check saved user preference (default: expanded)
    let savedState = false;
    try {
      savedState = localStorage.getItem("ips_topbar_collapsed") === "1";
    } catch (e) {}

    if (savedState) {
      window.toggleTopbarCollapse(true);
    } else {
      window.toggleTopbarCollapse(false);
    }
  }

  function initTopUtilsDragScroll() {
    const el = document.querySelector(".top-utils");
    if (!el || el.dataset.dragScrollBound) return;
    el.dataset.dragScrollBound = "true";

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasMoved = false;

    el.addEventListener("mousedown", (e) => {
      // Allow mouse drag-scrolling for desktop mouse users and devtools responsive mode
      if (e.button !== 0) return;
      isDown = true;
      hasMoved = false;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    });

    window.addEventListener("mouseup", () => {
      isDown = false;
    });

    el.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      if (Math.abs(walk) > 5) {
        hasMoved = true;
      }
      el.scrollLeft = scrollLeft - walk;
    });

    el.addEventListener("click", (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        hasMoved = false;
      }
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDuoMotion);
  } else {
    setTimeout(initDuoMotion, 60);
  }
})();
