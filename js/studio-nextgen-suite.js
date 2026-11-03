/**
 * IELTS Prep Studio - Next-Gen Architecture Suite (Wave 1)
 * Modules:
 * 1. Ronin's Resolve Streak & Freeze Engine
 * 2. 4-Skill Weakness Diagnostic Radar & Daily Priority Mission
 * 3. 60-Second Band 9 Lexicon Duel Speed Arena
 *
 * Invariants: Local-first, zero external frameworks, 60 FPS integer truncation,
 * Web Audio singleton keep-alive, responsive zero-spill layout containment.
 */

(function (window) {
  "use strict";

  const STATE_KEY = "ips_nextgen_state_v1";

  const DEFAULT_NEXTGEN_STATE = {
    version: 1,
    streak: {
      current: 1,
      longest: 1,
      lastActiveDate: "", // YYYY-MM-DD
      freezesAvailable: 1,
      lastCheckinTime: 0
    },
    radar: {
      listening: { score: 7.0, subskills: { mc: 0.75, map: 0.65, blanks: 0.85 } },
      reading:   { score: 6.5, subskills: { tfng: 0.55, headings: 0.70, summary: 0.75 } },
      writing:   { score: 6.5, subskills: { ta: 6.5, cc: 6.0, lr: 7.0, gra: 6.5 } },
      speaking:  { score: 6.5, subskills: { fc: 6.5, lr: 7.0, gra: 6.0, pron: 7.0 } },
      weakestBottleneck: "reading.tfng"
    },
    lexiconDuel: {
      highScore: 0,
      totalXp: 0,
      maxCombo: 0,
      gamesPlayed: 0,
      history: []
    }
  };

  function loadNextGenState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return structuredClone(DEFAULT_NEXTGEN_STATE);
      const parsed = JSON.parse(raw);
      return Object.assign({}, DEFAULT_NEXTGEN_STATE, parsed, {
        streak: Object.assign({}, DEFAULT_NEXTGEN_STATE.streak, parsed.streak || {}),
        radar: Object.assign({}, DEFAULT_NEXTGEN_STATE.radar, parsed.radar || {}),
        lexiconDuel: Object.assign({}, DEFAULT_NEXTGEN_STATE.lexiconDuel, parsed.lexiconDuel || {})
      });
    } catch (_) {
      return structuredClone(DEFAULT_NEXTGEN_STATE);
    }
  }

  function saveNextGenState(state) {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("[NextGenSuite] State storage failed:", e);
    }
  }

  // --- AUDIO SYNTHESIS FALLBACK ---
  let sharedAudioCtx = null;
  function getSharedAudioContext() {
    if (!sharedAudioCtx && (window.AudioContext || window.webkitAudioContext)) {
      sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  }

  function playChime(isCorrect) {
    if (typeof window.duoPlaySound === "function") {
      window.duoPlaySound(isCorrect ? "correct" : "wrong");
      return;
    }
    try {
      const ctx = getSharedAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (isCorrect) {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now); // A3
        osc.frequency.exponentialRampToValueAtTime(146.83, now + 0.18); // D3
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (_) {}
  }

  // =========================================================================
  // 1. RONIN'S RESOLVE STREAK & FREEZE SYSTEM
  // =========================================================================

  window.tickRoninStreak = function (completedDiagnostic = false) {
    const state = loadNextGenState();
    const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
    const last = state.streak.lastActiveDate;

    if (last === today) {
      if (completedDiagnostic && state.streak.freezesAvailable < 3) {
        state.streak.freezesAvailable = Math.min(3, state.streak.freezesAvailable + 1);
        saveNextGenState(state);
      }
      return { current: state.streak.current, freezes: state.streak.freezesAvailable, status: "maintained" };
    }

    let status = "incremented";
    if (!last) {
      state.streak.current = 1;
    } else {
      const diffMs = new Date(today).getTime() - new Date(last).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        state.streak.current += 1;
      } else if (diffDays === 2 && state.streak.freezesAvailable > 0) {
        state.streak.freezesAvailable -= 1;
        status = "frozen";
        if (typeof window.showStudioNotification === "function") {
          window.showStudioNotification("🛡️ Ronin's Resolve Shield activated! Streak preserved.");
        }
      } else {
        state.streak.current = 1;
        status = "reset";
      }
    }

    state.streak.lastActiveDate = today;
    state.streak.lastCheckinTime = Date.now();
    if (state.streak.current > state.streak.longest) {
      state.streak.longest = state.streak.current;
    }

    if (completedDiagnostic && state.streak.current % 7 === 0) {
      state.streak.freezesAvailable = Math.min(3, state.streak.freezesAvailable + 1);
    }

    saveNextGenState(state);
    window.renderNextGenDashboardWidgets();
    return { current: state.streak.current, freezes: state.streak.freezesAvailable, status };
  };

  // =========================================================================
  // 2. 4-SKILL WEAKNESS DIAGNOSTIC RADAR & DAILY PRIORITY MISSION
  // =========================================================================

  window.computeWeaknessRadar = function () {
    const state = loadNextGenState();
    const r = state.radar;

    // Center is (110, 110), maximum radius is 78px
    const cx = 110;
    const cy = 110;
    const norm = (v) => (((Math.max(4, Math.min(9, v)) - 4) / 5) * 78) | 0;

    const L = r.listening.score || 7.0;
    const R = r.reading.score || 6.5;
    const W = r.writing.score || 6.5;
    const S = r.speaking.score || 6.5;

    // Top: Listening, Right: Reading, Bottom: Writing, Left: Speaking
    const pL = `${cx},${cy - norm(L)}`;
    const pR = `${cx + norm(R)},${cy}`;
    const pW = `${cx},${cy + norm(W)}`;
    const pS = `${cx - norm(S)},${cy}`;
    const svgPoints = `${pL} ${pR} ${pW} ${pS}`;

    // Calculate candidate's lowest sub-skill bottleneck
    const candidates = [
      {
        name: "Reading TF/NG/DNS Traps",
        score: (r.reading.subskills.tfng * 9).toFixed(1),
        val: r.reading.subskills.tfng * 9,
        action: "window.switchMainTab('reading');",
        tip: "Passage 1 & 2 True/False/Not Given Traps"
      },
      {
        name: "Writing Task 2 Cohesion & Band 6 Clichés",
        score: r.writing.subskills.cc.toFixed(1),
        val: r.writing.subskills.cc,
        action: "window.switchMainTab('writing'); window.runBand6TrapXRay?.();",
        tip: "Eliminate Overused Linkers with Band Surgery"
      },
      {
        name: "Speaking Fluency & Lexical Precision",
        score: r.speaking.subskills.fc.toFixed(1),
        val: r.speaking.subskills.fc,
        action: "window.switchMainTab('speaking');",
        tip: "Part 2 Cue Card Long-Turn Delivery"
      },
      {
        name: "Listening Section 3 Distractor Filtering",
        score: (r.listening.subskills.mc * 9).toFixed(1),
        val: r.listening.subskills.mc * 9,
        action: "window.switchMainTab('listening');",
        tip: "Multiple Choice Trap Recognition"
      }
    ].sort((a, b) => a.val - b.val);

    const bottleneck = candidates[0];

    return {
      scores: { L, R, W, S },
      svgPoints,
      bottleneckName: bottleneck.name,
      bottleneckScore: bottleneck.score,
      bottleneckTip: bottleneck.tip,
      missionAction: bottleneck.action
    };
  };

  window.renderWeaknessRadarWidget = function (mountId) {
    if (typeof document === "undefined") return;
    const el = document.getElementById(mountId);
    if (!el) return;

    const data = window.computeWeaknessRadar();
    const cx = 110;
    const cy = 110;

    // Ring radii for Band 5 (r=15.6), Band 7 (r=46.8), Band 9 (r=78)
    const r5 = 16;
    const r7 = 47;
    const r9 = 78;

    el.innerHTML = `
      <div style="display:flex; flex-direction:column; justify-content:space-between; height:100%; box-sizing:border-box;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:1.1rem;">🎯</span>
            <span style="font-size:0.86rem; font-weight:900; color:var(--text); text-transform:uppercase; letter-spacing:0.04em;">Candidate Weakness Radar</span>
          </div>
          <span class="occ-ver-pill" style="background:rgba(217,119,6,0.12); color:#D97706; font-size:0.7rem; font-weight:800; border:1px solid rgba(217,119,6,0.3);">
            Target: Band 8.5
          </span>
        </div>

        <div style="display:flex; align-items:center; justify-content:center; gap:16px; flex-wrap:wrap; margin:4px 0 12px 0;">
          <!-- SVG Radar Chart (220x220) -->
          <div style="position:relative; width:220px; height:220px; flex-shrink:0;">
            <svg viewBox="0 0 220 220" width="220" height="220" style="overflow:visible; display:block;">
              <!-- Concentric Reference Rings -->
              <circle cx="${cx}" cy="${cy}" r="${r9}" fill="none" stroke="var(--border)" stroke-width="1.2" stroke-dasharray="3,3" />
              <circle cx="${cx}" cy="${cy}" r="${r7}" fill="none" stroke="var(--border)" stroke-width="1" />
              <circle cx="${cx}" cy="${cy}" r="${r5}" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="2,2" />

              <!-- Cross Axis Lines -->
              <line x1="${cx}" y1="${cy - r9}" x2="${cx}" y2="${cy + r9}" stroke="var(--border)" stroke-width="1" />
              <line x1="${cx - r9}" y1="${cy}" x2="${cx + r9}" y2="${cy}" stroke="var(--border)" stroke-width="1" />

              <!-- Axis Labels -->
              <text x="${cx}" y="${cy - r9 - 6}" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text)">LISTENING ${data.scores.L}</text>
              <text x="${cx + r9 + 8}" y="${cy + 3}" text-anchor="start" font-size="10" font-weight="800" fill="var(--text)">READING ${data.scores.R}</text>
              <text x="${cx}" y="${cy + r9 + 14}" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text)">WRITING ${data.scores.W}</text>
              <text x="${cx - r9 - 8}" y="${cy + 3}" text-anchor="end" font-size="10" font-weight="800" fill="var(--text)">SPEAKING ${data.scores.S}</text>

              <!-- Dynamic Candidate Polygon -->
              <polygon points="${data.svgPoints}" fill="rgba(217, 119, 6, 0.28)" stroke="#D97706" stroke-width="2.5" stroke-linejoin="round" />
            </svg>
          </div>

          <!-- Diagnostic Metrics & Legend -->
          <div style="flex:1 1 160px; min-width:140px;">
            <div style="font-size:0.72rem; color:var(--text-muted); font-weight:800; text-transform:uppercase; margin-bottom:4px;">
              Primary Score Bottleneck:
            </div>
            <div style="font-size:0.95rem; font-weight:900; color:#EF4444; line-height:1.3; margin-bottom:4px;">
              ⚠️ ${data.bottleneckName}
            </div>
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:10px; line-height:1.4;">
              ${data.bottleneckTip}
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; font-size:0.7rem; color:var(--text-muted);">
              <span>⚪ Outer Ring: Band 9.0</span>
              <span>⚪ Mid Ring: Band 7.0</span>
            </div>
          </div>
        </div>

        <!-- Priority Mission CTA Button -->
        <button class="btn-accent-solid" onclick="${data.missionAction}" style="width:100%; justify-content:center; padding:9px 14px; font-size:0.82rem; font-weight:800; display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg, #D97706 0%, #B45309 100%);">
          <span>🚀</span> Launch Daily Priority Mission &rarr;
        </button>
      </div>
    `;
  };

  // =========================================================================
  // 3. RONIN'S RESOLVE STREAK WIDGET
  // =========================================================================

  window.renderRoninStreakWidget = function (mountId) {
    if (typeof document === "undefined") return;
    const el = document.getElementById(mountId);
    if (!el) return;

    const state = loadNextGenState();
    const s = state.streak;
    const today = new Date().toLocaleDateString("en-CA");
    const isCheckedIn = s.lastActiveDate === today;

    el.innerHTML = `
      <div style="display:flex; flex-direction:column; justify-content:space-between; height:100%; box-sizing:border-box;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:1.15rem;">🔥</span>
            <span style="font-size:0.86rem; font-weight:900; color:var(--text); text-transform:uppercase; letter-spacing:0.04em;">Ronin's Resolve Streak</span>
          </div>
          <span class="occ-ver-pill" style="background:rgba(239,68,68,0.12); color:#EF4444; font-size:0.7rem; font-weight:800; border:1px solid rgba(239,68,68,0.3);">
            ${s.freezesAvailable > 0 ? `🛡️ ${s.freezesAvailable} Freeze Available` : '⚠️ 0 Freezes Left'}
          </span>
        </div>

        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin:8px 0;">
          <div>
            <div style="font-size:2.2rem; font-weight:900; color:var(--accent); line-height:1; font-family:monospace;">
              ${s.current} <span style="font-size:1rem; font-weight:700; color:var(--text);">Days</span>
            </div>
            <div style="font-size:0.74rem; color:var(--text-muted); margin-top:4px;">
              Personal Record: <strong style="color:var(--text);">${s.longest} Days</strong>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.72rem; color:var(--text-secondary); line-height:1.4;">
              ${s.freezesAvailable > 0 ? 'Shield auto-protects streak if you miss a study day.' : 'Complete 7 days or 1 diagnostic placement to recharge freeze.'}
            </div>
          </div>
        </div>

        <div style="display:flex; gap:8px; align-items:center; margin-top:8px;">
          <button class="btn-outlined" onclick="window.tickRoninStreak();" ${isCheckedIn ? 'disabled' : ''} style="flex:1; justify-content:center; font-size:0.8rem; font-weight:700; padding:8px 12px; ${isCheckedIn ? 'opacity:0.6; cursor:default;' : 'border-color:var(--accent); color:var(--accent);'}">
            ${isCheckedIn ? '✓ Active Today (Streak Maintained)' : '⚡ Check-In Study Session (+1 Day)'}
          </button>
          <button class="btn-outlined" onclick="window.switchSubTab('lexicon', 'drills'); window.startLexiconDuel('lexiconDuelArena');" style="padding:8px 12px; font-size:0.78rem; font-weight:700; white-space:nowrap;" title="Train Collocations in 60s Duel">
            ⚔️ Duel
          </button>
        </div>
      </div>
    `;
  };

  window.renderNextGenDashboardWidgets = function () {
    if (typeof document === "undefined") return;
    window.renderRoninStreakWidget("nextgenStreakCard");
    window.renderWeaknessRadarWidget("nextgenRadarCard");
  };

  // =========================================================================
  // 4. BAND 9 LEXICON DUEL (60-SECOND RAPID SPEED ARENA)
  // =========================================================================

  const LEXICON_DUEL_BANK = [
    { prompt: "Solve a problem", correct: "Mitigate an urgent issue", options: ["Mitigate an urgent issue", "Do a big solution", "Make a problem out", "Break down troubles"] },
    { prompt: "Make progress", correct: "Achieve substantial headway", options: ["Achieve substantial headway", "Do high movement", "Progress forward rapidly", "Step up heavily"] },
    { prompt: "A lot of", correct: "An overwhelming preponderance of", options: ["An overwhelming preponderance of", "Much of many", "Large big numbers", "Huge counts of"] },
    { prompt: "Important role", correct: "Play a pivotal / instrumental role", options: ["Play a pivotal / instrumental role", "Take heavy major place", "Be a serious key spot", "Make strong main function"] },
    { prompt: "Discuss about", correct: "Discuss (No preposition 'about')", options: ["Discuss (No preposition 'about')", "Discuss with about", "Discussion upon", "Discuss around"] },
    { prompt: "Wreak", correct: "havoc (wreak havoc on...", options: ["havoc (wreak havoc on...)", "damage heavily", "anger outside", "trouble down"] },
    { prompt: "Formulate", correct: "comprehensive policy", options: ["comprehensive policy", "opinion thoughts", "writing speeches", "action habits"] },
    { prompt: "Mounting", correct: "evidence / pressure", options: ["evidence / pressure", "voices upwards", "talks loudly", "points fast"] },
    { prompt: "Unfounded", correct: "assumptions / allegations", options: ["assumptions / allegations", "facts together", "truths unknown", "words made"] },
    { prompt: "Exert", correct: "considerable pressure", options: ["considerable pressure", "hard strength", "force outside", "action forward"] },
    { prompt: "Adverse", correct: "ramifications / consequences", options: ["ramifications / consequences", "benefits gained", "ways taken", "effects well"] },
    { prompt: "Strike", correct: "a delicate balance", options: ["a delicate balance", "a strong strike", "a target accurately", "an agreement down"] },
    { prompt: "Fall short of", correct: "expectations / standards", options: ["expectations / standards", "high levels down", "target positions", "goal steps"] },
    { prompt: "Stand in", correct: "stark contrast to", options: ["stark contrast to", "big difference with", "opposed ways from", "unlike position"] },
    { prompt: "Pave the", correct: "way for future innovation", options: ["way for future innovation", "road forward ahead", "path of success", "ground for work"] },
    { prompt: "Shed", correct: "light on empirical findings", options: ["light on empirical findings", "vision onto data", "knowledge out", "bright clarity"] },
    { prompt: "Bear", correct: "a striking resemblance to", options: ["a striking resemblance to", "similar look with", "same copy like", "twin face of"] },
    { prompt: "Run the", correct: "risk of grave failure", options: ["risk of grave failure", "danger behind", "trouble ahead", "chance of loss"] },
    { prompt: "Give", correct: "rise to unprecedented debate", options: ["rise to unprecedented debate", "birth to disputes", "up opinions", "start to quarrel"] },
    { prompt: "Cast", correct: "doubt on current hypotheses", options: ["doubt on current hypotheses", "shadow over truth", "mistrust down", "unbelief around"] },
    { prompt: "Grapple", correct: "with complex socio-economic realities", options: ["with complex socio-economic realities", "against hard problems", "around dilemmas", "over arguments"] },
    { prompt: "Exercise", correct: "utmost caution", options: ["utmost caution", "careful actions", "safe routines", "strict measures"] },
    { prompt: "Reach", correct: "a broad consensus", options: ["a broad consensus", "same thoughts", "an agreement point", "union of minds"] },
    { prompt: "Bring into", correct: "sharp relief", options: ["sharp relief", "clear picture", "high view", "obvious sight"] },
    { prompt: "Garner", correct: "widespread international support", options: ["widespread international support", "collect assistance", "pull friendship", "win help"] },
    { prompt: "Stem", correct: "from systemic neglect", options: ["from systemic neglect", "out of root errors", "down to faults", "off bad causes"] },
    { prompt: "Harness", correct: "the transformative potential of AI", options: ["the transformative potential of AI", "use strong powers", "hold good tools", "steer energy"] },
    { prompt: "Corroborate", correct: "initial experimental findings", options: ["initial experimental findings", "agree with ideas", "match up reports", "support truths"] },
    { prompt: "Exacerbate", correct: "pre-existing wealth disparities", options: ["pre-existing wealth disparities", "make worse gaps", "increase splits", "harden pains"] },
    { prompt: "Underpin", correct: "sustainable economic growth", options: ["sustainable economic growth", "hold from below", "give strong base", "support under"] },
    { prompt: "Spark", correct: "fierce scholarly debate", options: ["fierce scholarly debate", "make fast arguments", "light up quarrels", "begin talks"] },
    { prompt: "Fuel", correct: "runaway inflationary pressures", options: ["runaway inflationary pressures", "feed more money", "burn high costs", "heat up bills"] },
    { prompt: "Bridge", correct: "the digital and economic divide", options: ["the digital and economic divide", "cross two shores", "fill the split", "tie two ends"] },
    { prompt: "Reap", correct: "substantial long-term dividends", options: ["substantial long-term dividends", "get big fruits", "harvest good results", "pick prizes"] },
    { prompt: "Set a", correct: "binding legal precedent", options: ["binding legal precedent", "standard past rule", "first example line", "copy model"] },
    { prompt: "Broach", correct: "a sensitive socio-political topic", options: ["a sensitive socio-political topic", "bring up carefully", "open hard issues", "start soft talks"] },
    { prompt: "Run", correct: "counter to prevailing orthodoxies", options: ["counter to prevailing orthodoxies", "against regular beliefs", "opposite to paths", "in collision"] },
    { prompt: "Warrant", correct: "closer academic scrutiny", options: ["closer academic scrutiny", "need deep checking", "call for study", "ask for looks"] },
    { prompt: "Stifle", correct: "creative thinking and innovation", options: ["creative thinking and innovation", "choke new ideas", "stop brain works", "kill fresh minds"] },
    { prompt: "Spur", correct: "unprecedented technological growth", options: ["unprecedented technological growth", "push faster speed", "drive big walks", "lead sharp rises"] },
    { prompt: "Nullify", correct: "the positive effects of policy", options: ["the positive effects of policy", "cancel out gains", "zero the profits", "void the good"] },
    { prompt: "Surmount", correct: "seemingly insurmountable hurdles", options: ["seemingly insurmountable hurdles", "climb over walls", "pass heavy blocks", "beat all fences"] },
    { prompt: "Foster", correct: "interdisciplinary collaboration", options: ["interdisciplinary collaboration", "nurture group talks", "raise teamwork", "grow partnerships"] },
    { prompt: "Hone", correct: "critical analytical skills", options: ["critical analytical skills", "sharpen brain tools", "polish study eyes", "make sharp mind"] }
  ];

  let duelTimerId = null;
  let duelRemaining = 60;
  let duelScore = 0;
  let duelCombo = 0;
  let duelMaxCombo = 0;
  let duelCorrectCount = 0;
  let duelTotalCount = 0;
  let duelQuestions = [];
  let duelCurrentQ = 0;

  window.startLexiconDuel = function (mountId) {
    if (typeof document === "undefined") return;
    const el = document.getElementById(mountId);
    if (!el) return;

    if (duelTimerId) clearInterval(duelTimerId);

    // Shuffle 30 questions from bank
    duelQuestions = [...LEXICON_DUEL_BANK].sort(() => Math.random() - 0.5).slice(0, 30);
    duelRemaining = 60;
    duelScore = 0;
    duelCombo = 0;
    duelMaxCombo = 0;
    duelCorrectCount = 0;
    duelTotalCount = 0;
    duelCurrentQ = 0;

    renderDuelArena(el);

    duelTimerId = setInterval(() => {
      duelRemaining -= 1;
      const tEl = document.getElementById("duelTimeDisplay");
      const bEl = document.getElementById("duelProgressBar");
      if (tEl) tEl.innerText = `${duelRemaining}s`;
      if (bEl) bEl.style.width = `${(duelRemaining / 60) * 100}%`;

      if (duelRemaining <= 0) {
        clearInterval(duelTimerId);
        duelTimerId = null;
        finishLexiconDuel(el);
      }
    }, 1000);
  };

  function renderDuelArena(el) {
    if (duelCurrentQ >= duelQuestions.length) {
      clearInterval(duelTimerId);
      duelTimerId = null;
      finishLexiconDuel(el);
      return;
    }

    const q = duelQuestions[duelCurrentQ];
    const shuffledOpts = [...q.options].sort(() => Math.random() - 0.5);

    el.innerHTML = `
      <div style="background:var(--bg-card); border:2px solid var(--accent); border-radius:12px; padding:20px; box-sizing:border-box; max-width:100%; box-shadow:0 8px 32px rgba(224, 86, 36, 0.15);">
        <!-- Top Status Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.1rem;">⚡</span>
            <span style="font-size:0.9rem; font-weight:900; color:var(--text); text-transform:uppercase;">Band 9 Lexicon Duel</span>
            <span class="occ-ver-pill" id="duelComboBadge" style="background:${duelCombo >= 3 ? '#10B981' : 'rgba(217,119,6,0.12)'}; color:${duelCombo >= 3 ? '#FFF' : '#D97706'}; font-size:0.75rem; font-weight:800;">
              ${duelCombo}x COMBO
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:1.2rem; font-weight:900; color:var(--accent); font-family:monospace;" id="duelScoreDisplay">${duelScore} XP</span>
            <span class="occ-ver-pill" id="duelTimeDisplay" style="background:#EF4444; color:#FFF; font-weight:900; font-size:0.82rem; min-width:44px; text-align:center;">
              ${duelRemaining}s
            </span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div style="width:100%; height:6px; background:var(--border); border-radius:3px; overflow:hidden; margin-bottom:18px;">
          <div id="duelProgressBar" style="width:${(duelRemaining / 60) * 100}%; height:100%; background:linear-gradient(90deg, #10B981, #D97706, #EF4444); transition:width 1s linear;"></div>
        </div>

        <!-- Question Prompt -->
        <div style="text-align:center; padding:16px 12px; background:var(--bg); border:1px solid var(--border); border-radius:8px; margin-bottom:16px;">
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:800; text-transform:uppercase; margin-bottom:4px;">
            Match Academic Collocation or Eliminate Cliché:
          </div>
          <div style="font-size:1.35rem; font-weight:900; color:var(--accent);">
            &ldquo;${q.prompt}&rdquo; &rarr; ...
          </div>
        </div>

        <!-- 4 Multiple Choice Options Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap:10px;">
          ${shuffledOpts.map(opt => `
            <button class="duel-opt-btn" onclick="window.submitDuelAnswer('${encodeURIComponent(opt)}', '${encodeURIComponent(q.correct)}', this)" style="background:var(--bg); border:1.5px solid var(--border); border-radius:8px; padding:14px 16px; font-size:0.88rem; font-weight:700; color:var(--text); text-align:left; cursor:pointer; transition:all 0.15s ease; box-sizing:border-box;">
              ${opt}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  window.submitDuelAnswer = function (chosenEnc, correctEnc, btnEl) {
    const chosen = decodeURIComponent(chosenEnc);
    const correct = decodeURIComponent(correctEnc);
    const isCorrect = (chosen === correct);

    duelTotalCount += 1;

    // Disable all options momentarily
    const allBtns = document.querySelectorAll(".duel-opt-btn");
    allBtns.forEach(b => { b.style.pointerEvents = "none"; });

    if (isCorrect) {
      duelCorrectCount += 1;
      duelCombo += 1;
      if (duelCombo > duelMaxCombo) duelMaxCombo = duelCombo;

      const multiplier = duelCombo >= 10 ? 4 : (duelCombo >= 6 ? 3 : (duelCombo >= 3 ? 2 : 1));
      duelScore += 100 * multiplier;

      btnEl.style.background = "#10B981";
      btnEl.style.color = "#FFFFFF";
      btnEl.style.borderColor = "#059669";
      playChime(true);
    } else {
      duelCombo = 0;
      btnEl.style.background = "#EF4444";
      btnEl.style.color = "#FFFFFF";
      btnEl.style.borderColor = "#DC2626";

      // Highlight correct answer
      allBtns.forEach(b => {
        if (b.innerText.trim() === correct) {
          b.style.borderColor = "#10B981";
          b.style.borderWidth = "2px";
        }
      });
      playChime(false);
    }

    setTimeout(() => {
      duelCurrentQ += 1;
      const el = document.getElementById("lexiconDuelArena");
      if (el) renderDuelArena(el);
    }, 450);
  };

  function finishLexiconDuel(el) {
    const state = loadNextGenState();
    const ld = state.lexiconDuel;

    ld.gamesPlayed += 1;
    ld.totalXp += duelScore;
    if (duelScore > ld.highScore) ld.highScore = duelScore;
    if (duelMaxCombo > ld.maxCombo) ld.maxCombo = duelMaxCombo;

    const acc = duelTotalCount > 0 ? Math.round((duelCorrectCount / duelTotalCount) * 100) : 0;
    ld.history.unshift({ ts: Date.now(), score: duelScore, acc, maxCombo: duelMaxCombo });
    if (ld.history.length > 20) ld.history = ld.history.slice(0, 20);

    saveNextGenState(state);

    if (typeof window.duoPlaySound === "function") {
      window.duoPlaySound("fanfare");
    }

    el.innerHTML = `
      <div style="background:var(--bg-card); border:2px solid var(--accent); border-radius:12px; padding:24px; text-align:center; box-sizing:border-box;">
        <span style="font-size:2.8rem; display:block; margin-bottom:8px;">🏆</span>
        <h3 style="margin:0 0 6px 0; font-size:1.3rem; font-weight:900; color:var(--text);">60-Second Lexicon Duel Complete!</h3>
        <p style="margin:0 0 18px 0; font-size:0.84rem; color:var(--text-secondary);">
          Rapid collocation recall builds Lexical Resource automaticity for exam conditions.
        </p>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:10px; margin-bottom:20px;">
          <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:12px;">
            <div style="font-size:0.7rem; color:var(--text-muted); font-weight:800; text-transform:uppercase;">SCORE EARNED</div>
            <div style="font-size:1.4rem; font-weight:900; color:var(--accent); font-family:monospace;">${duelScore} XP</div>
          </div>
          <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:12px;">
            <div style="font-size:0.7rem; color:var(--text-muted); font-weight:800; text-transform:uppercase;">ACCURACY</div>
            <div style="font-size:1.4rem; font-weight:900; color:#10B981; font-family:monospace;">${acc}%</div>
          </div>
          <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:12px;">
            <div style="font-size:0.7rem; color:var(--text-muted); font-weight:800; text-transform:uppercase;">MAX COMBO</div>
            <div style="font-size:1.4rem; font-weight:900; color:#D97706; font-family:monospace;">${duelMaxCombo}x</div>
          </div>
          <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:12px;">
            <div style="font-size:0.7rem; color:var(--text-muted); font-weight:800; text-transform:uppercase;">PERSONAL BEST</div>
            <div style="font-size:1.4rem; font-weight:900; color:var(--text); font-family:monospace;">${ld.highScore} XP</div>
          </div>
        </div>

        <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
          <button class="btn-accent-solid" onclick="window.startLexiconDuel('lexiconDuelArena');" style="padding:10px 20px; font-weight:800; font-size:0.88rem;">
            ⚡ Play Again
          </button>
          <button class="btn-outlined" onclick="window.renderDuelStartScreen('lexiconDuelArena');" style="padding:10px 18px; font-weight:700; font-size:0.84rem;">
            ← Back to Speed Arena
          </button>
        </div>
      </div>
    `;
  }

  window.renderDuelStartScreen = function (mountId) {
    if (typeof document === "undefined") return;
    const el = document.getElementById(mountId);
    if (!el) return;

    const state = loadNextGenState();
    const ld = state.lexiconDuel;

    el.innerHTML = `
      <div style="background:var(--bg-card); border:1px solid var(--border-accent); border-radius:12px; padding:22px; box-sizing:border-box;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:14px; border-bottom:1px solid var(--border); padding-bottom:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.3rem;">⚡</span>
              <h3 style="margin:0; font-size:1.15rem; font-weight:900; color:var(--text);">Band 9 Lexicon Duel (60s Arena)</h3>
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
              Test your instinctual recall of high-scoring academic collocations under real exam pressure.
            </div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span class="occ-ver-pill" style="background:rgba(217,119,6,0.12); color:#D97706; font-size:0.75rem; font-weight:800;">
              High Score: ${ld.highScore} XP
            </span>
            <span class="occ-ver-pill" style="background:rgba(16,185,129,0.12); color:#10B981; font-size:0.75rem; font-weight:800;">
              ${ld.gamesPlayed} Matches Played
            </span>
          </div>
        </div>

        <p style="font-size:0.86rem; color:var(--text-secondary); line-height:1.6; margin:0 0 16px 0;">
          Examiners deduct marks when students force unnatural synonyms or fall into common L1 clichés. In this fast-paced 60-second arena, connect verbs with their idiomatic noun targets and eliminate Band 6 patterns before the clock runs out!
        </p>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; gap:12px; font-size:0.75rem; color:var(--text-muted); flex-wrap:wrap;">
            <span>⏱️ 60-Second Blitz</span>
            <span>🔥 Combo Multipliers up to 4x</span>
            <span>🔊 Instant Audio Chimes</span>
          </div>
          <button class="btn-accent-solid" onclick="window.startLexiconDuel('${mountId}');" style="padding:10px 22px; font-weight:800; font-size:0.9rem; background:linear-gradient(135deg, #E05624 0%, #D97706 100%);">
            ⚔️ Start 60s Lexicon Duel &rarr;
          </button>
        </div>
      </div>
    `;
  };

  // Auto-initialize suite
  window.initNextGenSuite = function () {
    if (typeof document === "undefined") return;
    window.renderNextGenDashboardWidgets();
    const duelEl = document.getElementById("lexiconDuelArena");
    if (duelEl) window.renderDuelStartScreen("lexiconDuelArena");
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", window.initNextGenSuite);
    } else {
      setTimeout(window.initNextGenSuite, 100);
    }
  }

})(window);
