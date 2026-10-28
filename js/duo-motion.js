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
  // 5. CAMBRIDGE ACADEMIC SYNTAX BUILDER (DAILY REFRESH & ROTATING BANK)
  // ==========================================================================
  const SYNTAX_BANK = [
    {
      target: "Urban forests significantly mitigate carbon emissions in industrial cities.",
      focus: "mitigate",
      grammarPattern: "Academic Collocation",
      category: "Environment & Ecology",
      translation: "မြို့ပြသစ်တောများသည် စက်မှုမြို့ကြီးများရှိ ကာဗွန်ထုတ်လွှတ်မှုကို သိသာစွာ လျော့ပါးသက်သာစေသည်။"
    },
    {
      target: "Rarely do developing economies transition to clean energy without international financial assistance.",
      focus: "Rarely do ... transition",
      grammarPattern: "Negative Inversion",
      category: "Economics & Energy",
      translation: "ဖွံ့ဖြိုးဆဲစီးပွားရေးနိုင်ငံများသည် နိုင်ငံတကာငွေကြေးအကူအညီမပါဘဲ သန့်ရှင်းသောစွမ်းအင်သို့ ကူးပြောင်းနိုင်ခဲသည်။"
    },
    {
      target: "Rapid technological advancements inevitably transform contemporary pedagogical methodologies.",
      focus: "inevitably transform",
      grammarPattern: "Advanced Collocation",
      category: "Education & Technology",
      translation: "လျင်မြန်သော နည်းပညာ တိုးတက်မှုများသည် ခေတ်သစ် သင်ကြားရေး နည်းစနစ်များကို မလွဲမသွေ ပြောင်းလဲစေသည်။"
    },
    {
      target: "Having evaluated empirical data, researchers concluded that renewable subsidies accelerate decarbonisation.",
      focus: "Having evaluated",
      grammarPattern: "Fronted Perfect Participle",
      category: "Science & Environment",
      translation: "လက်တွေ့အချက်အလက်များကို အကဲဖြတ်ပြီးနောက် သုတေသီများက ပြန်လည်ပြည့်ဖြိုးမြဲစွမ်းအင် ထောက်ပံ့ကြေးများသည် ကာဗွန်လျှော့ချရေးကို အရှိန်မြှင့်တင်ပေးကြောင်း ကောက်ချက်ချခဲ့ကြသည်။"
    },
    {
      target: "It is through comprehensive academic research that institutions formulate effective educational reforms.",
      focus: "It is through ... that",
      grammarPattern: "Cleft Sentence",
      category: "Education & Policy",
      translation: "ဘက်စုံပညာရပ်ဆိုင်ရာ သုတေသနများမှတစ်ဆင့်သာ အဖွဲ့အစည်းများသည် ထိရောက်သော ပညာရေးပြုပြင်ပြောင်းလဲမှုများကို ပုံဖော်နိုင်ခြင်းဖြစ်သည်။"
    },
    {
      target: "Governments should allocate substantial funding to modernise public healthcare infrastructure.",
      focus: "allocate substantial funding",
      grammarPattern: "Academic Collocation",
      category: "Public Health & Governance",
      translation: "အစိုးရများသည် ပြည်သူ့ကျန်းမာရေး အခြေခံအဆောက်အအုံကို ခေတ်မီစေရန် ရန်ပုံငွေ အမြောက်အမြား ခွဲဝေချထားပေးသင့်သည်။"
    },
    {
      target: "Seldom have scholars observed such unprecedented fluctuations in global financial markets.",
      focus: "Seldom have ... observed",
      grammarPattern: "Negative Inversion",
      category: "Finance & Economics",
      translation: "ပညာရှင်များသည် ကမ္ဘာ့ဘဏ္ဍာရေးစျေးကွက်များတွင် ဤကဲ့သို့ မကြုံစဖူး မတည်ငြိမ်မှုများကို တွေ့မြင်ရခဲသည်။"
    },
    {
      target: "Subsidising electric vehicles fosters sustainable transportation alternatives in metropolitan regions.",
      focus: "Subsidising ... fosters",
      grammarPattern: "Fronted Gerund Subject",
      category: "Transportation & Ecology",
      translation: "လျှပ်စစ်မော်တော်ယာဉ်များကို ထောက်ပံ့ပေးခြင်းသည် မြို့ကြီးများတွင် ရေရှည်တည်တံ့သော သယ်ယူပို့ဆောင်ရေး အစားထိုးရွေးချယ်စရာများကို အားပေးအားမြှောက်ပြုစေသည်။"
    },
    {
      target: "Artificial intelligence systems are widely recognised to enhance diagnostic precision in clinical trials.",
      focus: "are widely recognised to enhance",
      grammarPattern: "Academic Passive",
      category: "Technology & Medicine",
      translation: "ဉာဏ်ရည်တုစနစ်များသည် ဆေးဘက်ဆိုင်ရာစမ်းသပ်မှုများတွင် ရောဂါရှာဖွေမှု တိကျမှုကို မြှင့်တင်ပေးကြောင်း ကျယ်ကျယ်ပြန့်ပြန့် အသိအမှတ်ပြုထားကြသည်။"
    },
    {
      target: "Notwithstanding substantial initial capital expenditure, solar energy yields significant long-term economic dividends.",
      focus: "Notwithstanding",
      grammarPattern: "Concessive Prepositional Phrase",
      category: "Energy & Infrastructure",
      translation: "ကနဦး အရင်းအနှီး အသုံးစရိတ် ကြီးမားသော်လည်း နေရောင်ခြည်စွမ်းအင်သည် ရေရှည်တွင် သိသာထင်ရှားသော စီးပွားရေးအကျိုးအမြတ်များကို ပေးဆောင်သည်။"
    },
    {
      target: "Under no circumstances should corporate entities compromise digital privacy safeguards for commercial gains.",
      focus: "Under no circumstances should",
      grammarPattern: "Negative Inversion",
      category: "Ethics & Technology",
      translation: "မည်သည့်အခြေအနေမျိုးတွင်မျှ စီးပွားရေးအဖွဲ့အစည်းများသည် စီးပွားဖြစ်အမြတ်အစွန်းအတွက် ဒစ်ဂျစ်တယ်ကိုယ်ရေးကိုယ်တာ အကာအကွယ်များကို လျှော့မပေါ့သင့်ပါ။"
    },
    {
      target: "Implementing stringent environmental regulations motivates corporations to adopt circular economy principles.",
      focus: "Implementing ... motivates",
      grammarPattern: "Gerund Subject + Collocation",
      category: "Business & Environment",
      translation: "တင်းကျပ်သော သဘာဝပတ်ဝန်းကျင်ဆိုင်ရာ စည်းမျဉ်းများကို အကောင်အထည်ဖော်ခြင်းသည် စက်မှုကော်ပိုရေးရှင်းများအား သံသရာစီးပွားရေးမူများကို ကျင့်သုံးရန် တွန်းအားပေးသည်။"
    },
    {
      target: "What distinguishes exceptional academic institutions is their unyielding commitment to rigorous scientific inquiry.",
      focus: "What distinguishes ... is",
      grammarPattern: "Wh- Cleft Sentence",
      category: "Academia & Research",
      translation: "ထူးချွန်သော ပညာရပ်ဆိုင်ရာ အဖွဲ့အစည်းများကို ခြားနားစေသည့် အချက်မှာ တိကျခိုင်မာသော သိပ္ပံနည်းကျ စူးစမ်းရှာဖွေမှုအပေါ် မယိမ်းယိုင်သော ကတိကဝတ်ဖြစ်သည်။"
    },
    {
      target: "Comprehensive statistical analysis is indispensable for substantiating academic hypotheses.",
      focus: "indispensable for substantiating",
      grammarPattern: "Advanced Collocation",
      category: "Research & Methodology",
      translation: "ဘက်စုံစာရင်းအင်းဆိုင်ရာ ခွဲခြမ်းစိတ်ဖြာမှုသည် ပညာရပ်ဆိုင်ရာ ယူဆချက်များကို ခိုင်လုံစွာသက်သေပြရန် မရှိမဖြစ် လိုအပ်သည်။"
    },
    {
      target: "Hardly had the government implemented fiscal reforms when foreign direct investment increased noticeably.",
      focus: "Hardly had ... when",
      grammarPattern: "Temporal Inversion",
      category: "Economics & Governance",
      translation: "အစိုးရက ဘဏ္ဍာရေးပြုပြင်ပြောင်းလဲမှုများကို အကောင်အထည်ဖော်ပြီးသည်နှင့် မရှေးမနှောင်းပင် နိုင်ငံခြားတိုက်ရိုက်ရင်းနှီးမြှုပ်နှံမှု သိသာစွာ တိုးတက်လာခဲ့သည်။"
    },
    {
      target: "Prolonged exposure to automated algorithms can inadvertently reinforce societal echo chambers.",
      focus: "inadvertently reinforce",
      grammarPattern: "Adverbial Modification + Collocation",
      category: "Media & Society",
      translation: "အလိုအလျောက် အယ်လဂိုရီသမ်များနှင့် ကြာရှည်ထိတွေ့မှုသည် လူ့အဖွဲ့အစည်းအတွင်း သဘောထားတူရာ စုပြုံခြင်း (echo chambers) ကို မရည်ရွယ်ဘဲ ပိုမိုအားကောင်းစေနိုင်သည်။"
    },
    {
      target: "Only by fostering interdisciplinary collaboration can universities resolve complex existential dilemmas.",
      focus: "Only by ... can",
      grammarPattern: "Restrictive Inversion",
      category: "Higher Education",
      translation: "ဘာသာရပ်ပေါင်းစုံ ပူးပေါင်းဆောင်ရွက်မှုကို အားပေးခြင်းဖြင့်သာ တက္ကသိုလ်များသည် ရှုပ်ထွေးသော ဖြစ်တည်မှုဆိုင်ရာ ပြဿနာများကို ဖြေရှင်းနိုင်မည်ဖြစ်သည်။"
    },
    {
      target: "The proliferation of remote working arrangements has precipitated profound structural shifts in urban housing.",
      focus: "proliferation ... precipitated profound",
      grammarPattern: "Academic Nominalisation",
      category: "Sociology & Urban Studies",
      translation: "အဝေးမှ အလုပ်လုပ်သော အစီအစဉ်များ ပြန့်ပွားလာခြင်းသည် မြို့ပြအိမ်ရာကဏ္ဍတွင် ကြီးမားနက်ရှိုင်းသော ဖွဲ့စည်းပုံဆိုင်ရာ အပြောင်းအလဲများကို ဖြစ်ပေါ်စေခဲ့သည်။"
    },
    {
      target: "Had public transit networks been expanded earlier, commuter congestion would have dissipated substantially.",
      focus: "Had ... been",
      grammarPattern: "Inverted Conditional",
      category: "Urban Infrastructure",
      translation: "အများပြည်သူ သယ်ယူပို့ဆောင်ရေးကွန်ရက်များကို စောစီးစွာ တိုးချဲ့ခဲ့ပါက ခရီးသွားပြည်သူများ၏ ယာဉ်ကြောပိတ်ဆို့မှုသည် သိသိသာသာ လျော့ကျသွားမည်ဖြစ်သည်။"
    },
    {
      target: "Preserving indigenous biodiversity is essential for sustaining resilient regional ecosystems.",
      focus: "Preserving ... is essential",
      grammarPattern: "Gerund Phrase as Subject",
      category: "Conservation Biology",
      translation: "ဒေသရင်း ဇီဝမျိုးစုံမျိုးကွဲများကို ထိန်းသိမ်းခြင်းသည် ခံနိုင်ရည်ရှိသော ဒေသတွင်း ဂေဟစနစ်များကို တည်တံ့စေရန် မရှိမဖြစ် လိုအပ်သည်။"
    },
    {
      target: "Not only do vocational training programmes cultivate practical skills, but they also bolster youth employability.",
      focus: "Not only do ... but they also",
      grammarPattern: "Correlative Inversion",
      category: "Education & Employment",
      translation: "သက်မွေးပညာသင်တန်းများသည် လက်တွေ့ကျသော ကျွမ်းကျင်မှုများကို ပြုစုပျိုးထောင်ပေးရုံသာမက လူငယ်များ အလုပ်အကိုင်ရရှိနိုင်စွမ်းကိုလည်း အားကောင်းစေသည်။"
    },
    {
      target: "Fostering critical thinking skills equips students to navigate misleading digital disinformation.",
      focus: "Fostering ... equips",
      grammarPattern: "Gerund Subject + Object Infinitive",
      category: "Education & Digital Literacy",
      translation: "ဝေဖန်ပိုင်းခြားတွေးခေါ်နိုင်စွမ်းကို လေ့ကျင့်ပေးခြင်းသည် ကျောင်းသားများအား လမ်းလွဲစေသော ဒစ်ဂျစ်တယ်သတင်းမှားများကို ခွဲခြားသိမြင်စေရန် အရည်အချင်း တပ်ဆင်ပေးသည်။"
    },
    {
      target: "Autonomous transportation technologies are anticipated to alleviate urban traffic bottlenecks considerably.",
      focus: "are anticipated to alleviate",
      grammarPattern: "Passive Predictive Construction",
      category: "Technology & Urban Mobility",
      translation: "အလိုအလျောက် မောင်းနှင်သည့် သယ်ယူပို့ဆောင်ရေး နည်းပညာများသည် မြို့ပြယာဉ်ကြော ပိတ်ဆို့မှုများကို များစွာ သက်သာစေလိမ့်မည်ဟု ခန့်မှန်းရသည်။"
    },
    {
      target: "Were corporate leaders to prioritise environmental sustainability, consumer brand loyalty would intensify dramatically.",
      focus: "Were ... to prioritise",
      grammarPattern: "Inverted Conditional",
      category: "Business & Corporate Ethics",
      translation: "ကော်ပိုရိတ်ခေါင်းဆောင်များသည် သဘာဝပတ်ဝန်းကျင် ရေရှည်တည်တံ့မှုကို ဦးစားပေးခဲ့ပါက စားသုံးသူများ၏ အမှတ်တံဆိပ်အပေါ် သစ္စာစောင့်သိမှုသည် သိသာစွာ တိုးမြင့်လာမည်ဖြစ်သည်။"
    },
    {
      target: "Equitable distribution of medical resources remains imperative for mitigating socioeconomic disparities.",
      focus: "remains imperative for mitigating",
      grammarPattern: "Nominalised Subject + Gerund Complement",
      category: "Public Health & Social Equity",
      translation: "ဆေးဘက်ဆိုင်ရာ အရင်းအမြစ်များကို မျှတစွာ ဖြန့်ဝေခြင်းသည် လူမှုစီးပွား မညီမျှမှုများကို လျော့ပါးစေရန် မရှိမဖြစ် လိုအပ်သောအချက်အဖြစ် ဆက်လက်တည်ရှိနေသည်။"
    },
    {
      target: "Scarcely had the international treaty been ratified when signatory nations initiated emission reductions.",
      focus: "Scarcely had ... when",
      grammarPattern: "Temporal Inversion",
      category: "International Relations & Climate",
      translation: "နိုင်ငံတကာစာချုပ်ကို အတည်ပြုပြီးသည်နှင့် မရှေးမနှောင်းပင် လက်မှတ်ရေးထိုးထားသော နိုင်ငံများသည် ဓာတ်ငွေ့ထုတ်လွှတ်မှု လျှော့ချရေးကို စတင်ခဲ့ကြသည်။"
    },
    {
      target: "Integrating experiential learning into university curricula bolsters scholarly engagement significantly.",
      focus: "Integrating ... bolsters",
      grammarPattern: "Fronted Gerund Phrase",
      category: "Higher Education Pedagogy",
      translation: "လက်တွေ့သင်ယူမှုများကို တက္ကသိုလ် သင်ရိုးညွှန်းတမ်းတွင် ထည့်သွင်းပေါင်းစပ်ခြင်းသည် ပညာရပ်ဆိုင်ရာ စိတ်ပါဝင်စားမှုကို သိသာစွာ တိုးတက်စေသည်။"
    },
    {
      target: "It is the absence of comprehensive oversight that exacerbates algorithmic discrimination in modern credit scoring.",
      focus: "It is ... that",
      grammarPattern: "Cleft Focus Construction",
      category: "Data Ethics & AI",
      translation: "ခေတ်သစ် အကြွေးအကဲဖြတ်မှုများတွင် အယ်လဂိုရီသမ်ဆိုင်ရာ ခွဲခြားဆက်ဆံမှုကို ပိုမိုဆိုးရွားစေသည့် အဓိကအကြောင်းရင်းမှာ ဘက်စုံကြီးကြပ်ကွပ်ကဲမှု ကင်းမဲ့နေခြင်းပင်ဖြစ်သည်။"
    },
    {
      target: "In no way does automation eliminate the necessity for human empathy in palliative medical care.",
      focus: "In no way does ... eliminate",
      grammarPattern: "Negative Prepositional Inversion",
      category: "Healthcare & Human Ethics",
      translation: "မည်သည့်နည်းနှင့်မျှ အလိုအလျောက်စနစ်သည် ဝေဒနာသက်သာစောင့်ရှောက်မှုတွင် လူသားချင်းစာနာထောက်ထားမှု လိုအပ်ချက်ကို မဖယ်ရှားနိုင်ပါ။"
    },
    {
      target: "Cultivating linguistic diversity within academic institutions enriches collective intellectual discourse.",
      focus: "Cultivating ... enriches",
      grammarPattern: "Gerund Subject",
      category: "Linguistics & Academia",
      translation: "ပညာရပ်ဆိုင်ရာ အဖွဲ့အစည်းများအတွင်း ဘာသာစကားဆိုင်ရာ မတူကွဲပြားမှုကို ပြုစုပျိုးထောင်ခြင်းသည် စုပေါင်းဉာဏဆွေးနွေးမှုများကို ပိုမိုကြွယ်ဝစေသည်။"
    },
    {
      target: "Little did early climatologists realise that oceanic warming would accelerate polar ice retreat so rapidly.",
      focus: "Little did ... realise",
      grammarPattern: "Adverbial Inversion",
      category: "Climate Science",
      translation: "သမုဒ္ဒရာများ ပူနွေးလာမှုသည် ဝင်ရိုးစွန်းရေခဲများ အရည်ပျော်မှုကို ဤမျှလျင်မြန်စွာ အရှိန်မြှင့်တင်လိမ့်မည်ဟု အစောပိုင်း ရာသီဥတုပညာရှင်များ မထင်မှတ်ခဲ့ကြပေ။"
    }
  ];

  function getTodayDateString() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  let syntaxCountdownInterval = null;

  function getDailySyntaxDrillIndex(dateStr, totalCount) {
    if (!totalCount || totalCount <= 0) return 0;
    const parts = (dateStr || "").split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const epoch = new Date(2026, 0, 1);
      const cur = new Date(y, m, d);
      const diffDays = Math.round((cur - epoch) / (1000 * 60 * 60 * 24));
      return Math.abs(diffDays) % totalCount;
    }
    return 0;
  }

  function updateSyntaxCountdown() {
    const el = document.getElementById("duoSyntaxCountdownText");
    if (!el) return;
    const timeUntil = getTimeUntilMidnight();
    el.innerHTML = `Next daily drill in <strong>${timeUntil.hours}h ${timeUntil.mins}m</strong>`;
  }

  function getTimeUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const diff = midnight - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, mins };
  }

  window.duoCloseScrambleModal = function () {
    if (syntaxCountdownInterval) {
      clearInterval(syntaxCountdownInterval);
      syntaxCountdownInterval = null;
    }
    const modal = document.getElementById("duoScrambleModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      modal.style.display = "none";
    }
  };

  window.openDuoWordScrambleModal = function (requestedDrill = null) {
    duoPlaySound("pop");

    const todayStr = getTodayDateString();
    const isCompletedToday = localStorage.getItem("ips_daily_syntax_completed_date") === todayStr;
    const dailyIndex = getDailySyntaxDrillIndex(todayStr, SYNTAX_BANK.length);
    const timeUntil = getTimeUntilMidnight();

    let targetIndex = dailyIndex;
    let isDaily = true;

    if (requestedDrill === "next" || requestedDrill === "bonus") {
      const last = typeof window.duoActiveDrillIdx === "number" ? window.duoActiveDrillIdx : dailyIndex;
      targetIndex = (last + 1) % SYNTAX_BANK.length;
      isDaily = false;
    } else if (typeof requestedDrill === "number") {
      targetIndex = Math.abs(requestedDrill) % SYNTAX_BANK.length;
      isDaily = (targetIndex === dailyIndex);
    } else {
      targetIndex = dailyIndex;
      isDaily = true;
    }

    window.duoActiveDrillIdx = targetIndex;
    window.duoIsDailyDrill = isDaily;

    const pick = SYNTAX_BANK[targetIndex];
    const correctWords = pick.target.replace(/[.]/g, "").split(/\s+/);
    const scrambled = [...correctWords].sort(() => Math.random() - 0.5);
    if (scrambled.join(" ") === correctWords.join(" ") && scrambled.length > 2) {
      const temp = scrambled[0];
      scrambled[0] = scrambled[1];
      scrambled[1] = temp;
    }

    let modal = document.getElementById("duoScrambleModalBackdrop");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "duoScrambleModalBackdrop";
      modal.className = "ips-modal-overlay";
      document.body.appendChild(modal);
    }

    const isTodayMastered = isDaily && isCompletedToday;

    modal.classList.add("open");
    modal.style.display = "flex";
    modal.innerHTML = `
      <div class="ips-modal-shell" style="max-width:580px;border-radius:18px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;gap:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:38px;height:38px;border-radius:10px;background:rgba(59,130,246,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg class="ui-icon" style="width:22px;height:22px;color:#3B82F6;" aria-hidden="true"><use href="#lucide-puzzle"/></svg>
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <strong style="font-size:1.02rem;color:var(--text);font-weight:800;">Cambridge Academic Syntax Builder</strong>
                ${isDaily ? `
                  <span style="font-size:0.68rem;font-weight:800;padding:2px 7px;border-radius:10px;background:rgba(59,130,246,0.12);color:#2563EB;border:1px solid rgba(59,130,246,0.25);letter-spacing:0.04em;">DAILY DRILL</span>
                ` : `
                  <span style="font-size:0.68rem;font-weight:800;padding:2px 7px;border-radius:10px;background:rgba(16,185,129,0.12);color:#059669;border:1px solid rgba(16,185,129,0.25);letter-spacing:0.04em;">BONUS PRACTICE</span>
                `}
              </div>
              <div style="font-size:0.74rem;color:var(--text-secondary);margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span>Drill #${targetIndex + 1} of ${SYNTAX_BANK.length}</span>
                <span>&bull;</span>
                <span style="color:var(--accent);font-weight:700;">${escapeHtml(pick.grammarPattern)}</span>
              </div>
            </div>
          </div>
          <button class="btn-outlined" style="padding:4px 9px;font-size:0.85rem;line-height:1;border-radius:8px;" onclick="window.duoCloseScrambleModal();" aria-label="Close Syntax Builder">&times;</button>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 12px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);margin-bottom:12px;font-size:0.75rem;">
          <div style="display:flex;align-items:center;gap:6px;">
            <svg class="ui-icon" style="width:14px;height:14px;color:var(--accent-gold,#F59E0B);"><use href="#lucide-calendar"/></svg>
            <span style="font-weight:700;color:var(--text);">${todayStr}</span>
            ${isTodayMastered ? `
              <span style="display:inline-flex;align-items:center;gap:3px;color:#10B981;font-weight:700;padding:1px 6px;border-radius:4px;background:rgba(16,185,129,0.1);">
                <svg class="ui-icon" style="width:12px;height:12px;"><use href="#lucide-check-circle-2"/></svg> Completed (+25 XP)
              </span>
            ` : isDaily ? `
              <span style="display:inline-flex;align-items:center;gap:3px;color:#F59E0B;font-weight:700;padding:1px 6px;border-radius:4px;background:rgba(245,158,11,0.1);">
                <svg class="ui-icon" style="width:12px;height:12px;"><use href="#lucide-sparkles"/></svg> +25 XP &amp; +5 Gems
              </span>
            ` : `
              <span style="display:inline-flex;align-items:center;gap:3px;color:#3B82F6;font-weight:700;padding:1px 6px;border-radius:4px;background:rgba(59,130,246,0.1);">
                <svg class="ui-icon" style="width:12px;height:12px;"><use href="#lucide-sparkles"/></svg> +10 XP Practice
              </span>
            `}
          </div>
          <div style="color:var(--text-secondary);display:flex;align-items:center;gap:4px;">
            <svg class="ui-icon" style="width:13px;height:13px;"><use href="#lucide-clock"/></svg>
            <span id="duoSyntaxCountdownText">Next daily drill in <strong>${timeUntil.hours}h ${timeUntil.mins}m</strong></span>
          </div>
        </div>

        <div style="margin-bottom:14px;padding:12px 14px;border-radius:12px;background:var(--well-peach,#FFF7ED);border:1px solid rgba(245,158,11,0.25);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <div style="font-size:0.74rem;font-weight:800;color:var(--accent);text-transform:uppercase;letter-spacing:0.04em;">Burmese Academic Meaning:</div>
            <div style="font-size:0.72rem;font-weight:700;color:var(--text-secondary);">Focus: <strong style="color:var(--text);">${escapeHtml(pick.focus)}</strong></div>
          </div>
          <div class="burmese" style="font-size:0.92rem;font-weight:700;color:var(--text);line-height:1.5;">${escapeHtml(pick.translation)}</div>
          <div style="margin-top:6px;font-size:0.72rem;color:var(--text-secondary);">
            Topic Domain: <span style="font-weight:600;color:var(--text);">${escapeHtml(pick.category)}</span>
          </div>
        </div>

        <div id="duoScrambleSlot" style="min-height:58px;padding:10px 14px;border-radius:14px;background:var(--bg-elevated);border:2px dashed var(--border-mid);display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px;transition:all 0.25s ease;">
          <span id="duoScramblePlaceholder" style="font-size:0.82rem;color:var(--text-secondary);">Tap words from the bank below in correct academic syntax sequence...</span>
        </div>

        <div id="duoChipsBank" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;min-height:68px;">
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
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="btn-outlined" style="font-size:0.78rem;padding:6px 11px;" onclick="window.duoResetScramble()" title="Reset constructed sentence">
              <svg class="ui-icon" style="width:13px;height:13px;margin-right:4px;"><use href="#lucide-rotate-ccw"/></svg> Clear
            </button>
            <button type="button" class="btn-outlined" style="font-size:0.78rem;padding:6px 11px;color:#0284C7;border-color:rgba(2,132,199,0.3);" onclick="window.duoUseScrambleHint(${JSON.stringify(correctWords).replace(/"/g, "&quot;")})" title="Reveal next word (-10 Gems)">
              <svg class="ui-icon" style="color:#F59E0B;width:13px;height:13px;margin-right:3px;"><use href="#lucide-lightbulb"/></svg> Hint (10 <svg class="ui-icon" style="color:#06B6D4;width:12px;height:12px;"><use href="#lucide-gem"/></svg>)
            </button>
            <button type="button" class="btn-outlined" style="font-size:0.78rem;padding:6px 11px;color:var(--accent);border-color:rgba(234,88,12,0.3);" onclick="window.openDuoWordScrambleModal('next')" title="Try another academic sentence">
              <svg class="ui-icon" style="width:13px;height:13px;margin-right:3px;"><use href="#lucide-sparkles"/></svg> ${isTodayMastered || !isDaily ? "Next Drill" : "Practice Another"}
            </button>
          </div>
          <button type="button" class="btn-accent-solid" id="duoCheckScrambleBtn" style="padding:9px 20px;font-size:0.86rem;font-weight:800;" onclick="window.duoCheckScrambleAnswer(${JSON.stringify(pick.target).replace(/"/g, "&quot;")}, ${targetIndex}, ${isDaily})">
            Check Answer <svg class="ui-icon" style="width:14px;height:14px;margin-left:4px;" aria-hidden="true"><use href="#lucide-check"/></svg>
          </button>
        </div>
      </div>
    `;

    window.duoCurrentPickedChips = [];
    if (syntaxCountdownInterval) clearInterval(syntaxCountdownInterval);
    syntaxCountdownInterval = setInterval(updateSyntaxCountdown, 60000);
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
    tokenBtn.innerHTML = `${escapeHtml(word)} <svg class="ui-icon" style="width:12px;height:12px;color:var(--text-secondary);margin-left:4px;" aria-hidden="true"><use href="#lucide-x"/></svg>`;
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
    if (syntaxCountdownInterval) clearInterval(syntaxCountdownInterval);
    syntaxCountdownInterval = setInterval(updateSyntaxCountdown, 60000);
  };

  window.duoUseScrambleHint = function (correctWords) {
    const st = getGamifyState();
    if ((st.gems || 0) < 10) {
      duoPlaySound("warn");
      if (typeof showStudioNotification === "function") {
        showStudioNotification("Need at least 10 Gems for a Hint! Earn gems by completing daily practice.");
      }
      return;
    }

    const currentCount = (window.duoCurrentPickedChips || []).length;
    if (currentCount >= correctWords.length) return;

    const nextWord = correctWords[currentCount];
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
          showStudioNotification(`Hint placed: "${nextWord}" (-10 Gems)`);
        }
      }
    }
  };

  window.duoCheckScrambleAnswer = function (targetSentence, drillIdx, isDaily) {
    const pickedWords = (window.duoCurrentPickedChips || []).map((c) => c.word);
    const candidateStr = pickedWords.join(" ").trim().toLowerCase();
    const cleanTarget = targetSentence.replace(/[.]/g, "").trim().toLowerCase();

    const slot = document.getElementById("duoScrambleSlot");

    if (candidateStr === cleanTarget) {
      duoPlaySound("success");
      if (slot) {
        slot.classList.add("duo-pop");
        slot.style.borderColor = "#10B981";
        slot.style.background = "rgba(16,185,129,0.12)";
      }

      window.duoCelebrate();

      const todayStr = getTodayDateString();
      const alreadyMastered = localStorage.getItem("ips_daily_syntax_completed_date") === todayStr;

      if (isDaily && !alreadyMastered) {
        localStorage.setItem("ips_daily_syntax_completed_date", todayStr);
        window.duoAddXp(25, "Daily Academic Syntax Drill");
        const st = getGamifyState();
        st.gems = (st.gems || 0) + 5;
        saveGamifyState(st);

        // Update Overview hub immediately so button reflects completed state
        renderOverviewDuoHub();

        setTimeout(() => {
          const modal = document.getElementById("duoScrambleModalBackdrop");
          if (modal) {
            modal.classList.remove("open");
            modal.style.display = "none";
          }
          duoShowFeedback({
            title: "Daily Syntax Mastered! +25 XP & +5 Gems",
            message: `Mastered Band 9.0 Sentence: "${targetSentence}"`,
            type: "success"
          });
        }, 700);
      } else {
        // Bonus practice completion
        window.duoAddXp(10, "Bonus Academic Syntax Drill");
        setTimeout(() => {
          const modal = document.getElementById("duoScrambleModalBackdrop");
          if (modal) {
            modal.classList.remove("open");
            modal.style.display = "none";
          }
          duoShowFeedback({
            title: "Bonus Syntax Practice Complete! +10 XP",
            message: `Constructed: "${targetSentence}"`,
            type: "success"
          });
        }, 700);
      }
    } else {
      duoPlaySound("warn");
      if (slot) {
        slot.classList.add("duo-shake");
        slot.style.borderColor = "#EF4444";
        setTimeout(() => slot.classList.remove("duo-shake"), 400);
      }

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
            Play Daily Syntax Drill (+25 XP)
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
            <strong><svg class="ui-icon" style="display:inline-block;vertical-align:-2px;margin-right:4px;"><use href="#lucide-book-open"/></svg>Lexicon &amp; Drills</strong><br><span style="color:var(--text-secondary);font-size:0.72rem;">1,322+ Academic, culinary &amp; recent test words with 1-3-7 SRS</span>
          </div>
          <div style="padding:8px 10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);font-size:0.78rem;">
            <strong><svg class="ui-icon" style="display:inline-block;vertical-align:-2px;margin-right:4px;"><use href="#lucide-headphones"/></svg>Listening CBT</strong><br><span style="color:var(--text-secondary);font-size:0.72rem;">160 Cambridge audio tests with transcripts</span>
          </div>
          <div style="padding:8px 10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);font-size:0.78rem;">
            <strong><svg class="ui-icon" style="display:inline-block;vertical-align:-2px;margin-right:4px;"><use href="#lucide-book"/></svg>CBT Reading</strong><br><span style="color:var(--text-secondary);font-size:0.72rem;">47 Full Passages (551 Qs) with split highlighter</span>
          </div>
          <div style="padding:8px 10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);font-size:0.78rem;">
            <strong><svg class="ui-icon" style="display:inline-block;vertical-align:-2px;margin-right:4px;"><use href="#lucide-pen-tool"/></svg>Writing Lab</strong><br><span style="color:var(--text-secondary);font-size:0.72rem;">43+ Task 1 &amp; Task 2 models with AI CEFR evaluator</span>
          </div>
          <div style="padding:8px 10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);font-size:0.78rem;">
            <strong><svg class="ui-icon" style="display:inline-block;vertical-align:-2px;margin-right:4px;"><use href="#lucide-mic"/></svg>Speaking Studio</strong><br><span style="color:var(--text-secondary);font-size:0.72rem;">50 Forecast topics (164 Qs) &amp; 5 strategic frameworks</span>
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
        <button type="button" class="duo-hud-pill sound-pill" title="Toggle Sound Effects" onclick="window.duoToggleSound()" aria-label="Toggle Sound Effects">
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
              ${(function(){
                const todayStr = getTodayDateString();
                const isDailyDone = localStorage.getItem("ips_daily_syntax_completed_date") === todayStr;
                return isDailyDone ? `
                  <button type="button" class="btn-outlined" style="padding:4px 10px;font-size:0.74rem;font-weight:700;flex-shrink:0;color:#10B981;border-color:rgba(16,185,129,0.35);background:rgba(16,185,129,0.06);" onclick="window.openDuoWordScrambleModal()" title="Today's Syntax Drill completed (+25 XP). Click to practice more.">
                    <svg class="ui-icon" style="width:14px;height:14px;margin-right:4px;color:#10B981;"><use href="#lucide-check-circle-2"/></svg> Syntax (Done)
                  </button>
                ` : `
                  <button type="button" class="btn-accent-solid" style="padding:4px 10px;font-size:0.74rem;font-weight:700;flex-shrink:0;" onclick="window.openDuoWordScrambleModal()" title="Today's Academic Syntax Challenge (+25 XP &amp; +5 Gems)">
                    <svg class="ui-icon" style="width:14px;height:14px;margin-right:4px;"><use href="#lucide-puzzle"/></svg> Syntax Drill
                  </button>
                `;
              })()}
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
              <div class="duo-node-crowns"><svg class="ui-icon" style="color:#8B5CF6;width:11px;height:11px;" aria-hidden="true"><use href="#lucide-mic"/></svg> Studio</div>
            </div>
            <div class="duo-path-node" onclick="switchView('writing')" title="Step 5: Task 2 Academic Essay Lab">
              <div class="duo-node-circle"><svg class="ui-icon" style="width:24px;height:24px;color:#EC4899;" aria-hidden="true"><use href="#lucide-pen-tool"/></svg></div>
              <div class="duo-node-label">Writing</div>
              <div class="duo-node-crowns"><svg class="ui-icon" style="color:#EC4899;width:11px;height:11px;" aria-hidden="true"><use href="#lucide-pen-tool"/></svg> Essay</div>
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
