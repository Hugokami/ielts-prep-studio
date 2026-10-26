/**
 * Category 3: Personalized Analytics & Offline Exam-Day Kit
 * IELTS Prep Studio - Academic VIP Suite
 * Pure Client-Side Zero-Latency Offline Simulation
 */

(function(window) {
  'use strict';

  // ==========================================
  // 3.1: CAMBRIDGE 4-AXIS COMPETENCY RADAR & DAILY PRESCRIPTION
  // ==========================================

  window.getCambridge4AxisScores = function() {
    // Read from appState or localStorage if available
    let masteredCount = 0;
    let readingCount = 0;
    let writingCount = 0;
    let drillScore = 80;

    try {
      if (window.appState) {
        masteredCount = window.appState.mastered ? window.appState.mastered.size : 0;
        readingCount = window.appState.completedReadingMocks ? window.appState.completedReadingMocks.size : 0;
        writingCount = window.appState.completedWritingMocks ? window.appState.completedWritingMocks.size : 0;
        drillScore = window.appState.drillBest || 80;
      }
    } catch(e) {}

    // Calculate normalized 5.0 to 9.0 scores
    const taccBand = Math.min(9.0, Math.max(5.5, Number((6.0 + (writingCount * 0.15) + (drillScore * 0.015)).toFixed(1))));
    const lrBand = Math.min(9.0, Math.max(5.5, Number((5.5 + (masteredCount * 0.02)).toFixed(1))));
    const graBand = Math.min(9.0, Math.max(5.0, Number((6.0 + (writingCount * 0.1) + (drillScore * 0.01)).toFixed(1))));
    const receptiveBand = Math.min(9.0, Math.max(5.5, Number((5.5 + (readingCount * 0.2) + (drillScore * 0.015)).toFixed(1))));

    return [
      { key: 'tacc', label: 'TA / CC', band: taccBand, fullTitle: 'Task Achievement & Cohesion', max: 9.0 },
      { key: 'lr', label: 'Lexical', band: lrBand, fullTitle: 'Lexical Resource & Collocations', max: 9.0 },
      { key: 'gra', label: 'Grammar', band: graBand, fullTitle: 'Grammatical Range & Accuracy', max: 9.0 },
      { key: 'receptive', label: 'Receptive', band: receptiveBand, fullTitle: 'Reading Traps & Distractors', max: 9.0 }
    ];
  };

  window.renderCambridge4AxisRadar = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const axes = window.getCambridge4AxisScores();
    const cx = 140, cy = 105, maxR = 68;

    // Convert Band 5.0-9.0 to 0.3-1.0 scale
    const scaleBand = (band) => {
      const clamped = Math.max(5.0, Math.min(9.0, band));
      return 0.35 + ((clamped - 5.0) / 4.0) * 0.65;
    };

    const ringPoints = (scale) => axes.map((_, i) => {
      const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
      return `${cx + Math.cos(a) * maxR * scale},${cy + Math.sin(a) * maxR * scale}`;
    }).join(" ");

    const dataPts = axes.map((ax, i) => {
      const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
      const r = scaleBand(ax.band) * maxR;
      return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
    }).join(" ");

    const verticesHtml = axes.map((ax, i) => {
      const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
      const r = scaleBand(ax.band) * maxR;
      const vx = cx + Math.cos(a) * r;
      const vy = cy + Math.sin(a) * r;
      return `<circle cx="${vx}" cy="${vy}" r="4" fill="#D97706" stroke="#FFFFFF" stroke-width="1.5"/>`;
    }).join("");

    const labelsSvg = axes.map((ax, i) => {
      const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
      const lx = cx + Math.cos(a) * (maxR + 24);
      const ly = cy + Math.sin(a) * (maxR + 14);
      return `
        <text x="${lx}" y="${ly - 4}" font-size="9" font-weight="700" font-family="system-ui, sans-serif" fill="var(--text)" text-anchor="middle" dominant-baseline="middle">${ax.label}</text>
        <text x="${lx}" y="${ly + 7}" font-size="8.5" font-weight="800" font-family="monospace" fill="#D97706" text-anchor="middle" dominant-baseline="middle">B${ax.band}</text>
      `;
    }).join("");

    container.innerHTML = `
      <div style="position:relative; width:100%; max-width:280px; margin:auto;">
        <svg viewBox="0 0 280 210" style="width:100%; height:auto; overflow:visible;">
          <!-- Grid Rings for Band 6.0, 7.5, 9.0 -->
          <polygon points="${ringPoints(1.0)}" fill="none" stroke="var(--border-mid)" stroke-width="1"/>
          <polygon points="${ringPoints(0.68)}" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="2,2"/>
          <polygon points="${ringPoints(0.35)}" fill="none" stroke="var(--border)" stroke-width="1"/>
          
          <!-- Axis Spokes -->
          ${axes.map((_, i) => {
            const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
            return `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * maxR}" y2="${cy + Math.sin(a) * maxR}" stroke="var(--border)" stroke-width="1"/>`;
          }).join("")}

          <!-- Candidate Score Polygon -->
          <polygon points="${dataPts}" fill="rgba(217, 119, 6, 0.2)" stroke="#D97706" stroke-width="2"/>
          ${verticesHtml}
          ${labelsSvg}
        </svg>
      </div>
    `;

    // Also trigger Daily Prescription update
    window.renderDailyPrescription('dailyPrescriptionContainer');
  };

  window.generateDailyPrescription = function() {
    const axes = window.getCambridge4AxisScores();
    const lowest = axes.reduce((prev, curr) => (prev.band < curr.band ? prev : curr), axes[0]);

    const workouts = {
      gra: [
        { title: "Live Band Surgery: Negative Inversions", duration: "5 mins", desc: "Rewrite 3 basic sentences into Inverted clauses (Seldom do..., Not only does...).", action: "surgery" },
        { title: "It-Cleft Nominalisation Drill", duration: "5 mins", desc: "Practice cleft focus sentences for body paragraph topic claims.", action: "surgery" },
        { title: "Deadly Band-6 Cliche Cleanse", duration: "5 mins", desc: "Scan current essay draft to eliminate informal contractions and colloquialisms.", action: "trapxray" }
      ],
      lr: [
        { title: "Band 8.5+ Precision Collocations", duration: "5 mins", desc: "Master 5 high-yield verb-noun collocations in Academic Tools.", action: "collocations" },
        { title: "Deadly Band-6 Cliche X-Ray", duration: "5 mins", desc: "Replace overused 'good/bad/problem' with elevated C1/C2 terms.", action: "trapxray" },
        { title: "12-Theme Argument Matrix Review", duration: "5 mins", desc: "Explore 5 topic-specific collocations for AI & Automation.", action: "matrix" }
      ],
      tacc: [
        { title: "12-Theme Argument Matrix Blueprint", duration: "5 mins", desc: "Study Band 9.0 Thesis statements and concession clause structures.", action: "matrix" },
        { title: "Speaking Part 2 PPF Mind-Map", duration: "5 mins", desc: "Practice 60s guided cue card planning with Past-Present-Future structure.", action: "lifeline" },
        { title: "Task 2 Body Paragraph Cohesion", duration: "5 mins", desc: "Insert concession clauses ('Notwithstanding...') into active essay draft.", action: "writing" }
      ],
      receptive: [
        { title: "False vs Not Given Decisive Arbiter", duration: "5 mins", desc: "Solve 5 Cambridge trap scenarios using the 3-step decision tree.", action: "tfng" },
        { title: "Reading Paraphrase Triggers", duration: "5 mins", desc: "Review Question-to-Passage synonym swaps in Academic Tools.", action: "traps" },
        { title: "Listening Distractor Checklist", duration: "5 mins", desc: "Review Section 1-4 self-correction pivots and spelling traps.", action: "cheatsheet" }
      ]
    };

    return {
      lowestAxis: lowest,
      workouts: workouts[lowest.key] || workouts.gra
    };
  };

  window.renderDailyPrescription = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const pres = window.generateDailyPrescription();
    const low = pres.lowestAxis;

    container.innerHTML = `
      <div style="padding:14px 16px; background:linear-gradient(135deg, rgba(217,119,6,0.06), rgba(217,119,6,0.02)); border:1px solid rgba(217,119,6,0.25); border-radius:10px; margin-top:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="occ-ver-pill" style="background:#D97706; color:#FFF; font-weight:800; font-size:0.7rem;">DAILY PRESCRIPTION</span>
            <strong style="color:var(--text); font-size:0.86rem;">15-Minute Weak-Spot Workout</strong>
          </div>
          <span style="font-size:0.76rem; color:var(--text-secondary);">
            Primary Focus: <strong style="color:#D97706;">${escapeHtml(low.fullTitle)} (Band ${low.band})</strong>
          </span>
        </div>

        <p style="margin:0 0 10px 0; font-size:0.78rem; color:var(--text-secondary); line-height:1.45;">
          Cambridge radar detects <strong>${escapeHtml(low.label)}</strong> as your highest-ROI growth lever. Complete these 3 targeted 5-minute drills today:
        </p>

        <div style="display:flex; flex-direction:column; gap:6px;">
          ${pres.workouts.map((w, i) => `
            <div style="padding:8px 10px; background:var(--bg); border:1px solid var(--border); border-radius:6px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
              <div>
                <span style="font-weight:700; font-size:0.8rem; color:var(--text);">${i+1}. ${escapeHtml(w.title)}</span>
                <span style="font-size:0.72rem; color:var(--text-secondary); margin-left:6px;">(${escapeHtml(w.duration)})</span>
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">${escapeHtml(w.desc)}</div>
              </div>
              <button class="btn-accent-solid" style="padding:4px 10px; font-size:0.72rem; font-weight:700;" onclick="window.launchPrescriptionWorkout('${w.action}')">
                Start Drill &rarr;
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  window.launchPrescriptionWorkout = function(action) {
    const navTo = function(view) {
      if (typeof window.switchView === 'function') window.switchView(view);
      else if (typeof window.switchTab === 'function') window.switchTab(view);
    };

    if (action === 'surgery') {
      navTo('tools');
      if (typeof window.switchAcademicToolsTab === 'function') window.switchAcademicToolsTab('surgery');
    } else if (action === 'tfng') {
      navTo('reading');
      if (typeof window.switchSubTab === 'function') window.switchSubTab('reading', 'tfng');
      if (typeof window.renderTfngArbiterPanel === 'function') window.renderTfngArbiterPanel('tfngArbiterContainer');
    } else if (action === 'lifeline') {
      navTo('speaking');
      if (typeof window.toggleCueCardLifeline === 'function') window.toggleCueCardLifeline();
    } else if (action === 'matrix') {
      navTo('tools');
      if (typeof window.switchAcademicToolsTab === 'function') window.switchAcademicToolsTab('topic');
      if (typeof window.loadArgumentThemeById === 'function') window.loadArgumentThemeById('ai_workplace');
    } else if (action === 'trapxray') {
      navTo('writing');
      if (typeof window.runBand6TrapXRay === 'function') window.runBand6TrapXRay();
    } else if (action === 'cheatsheet') {
      window.openNightBeforeCheatSheet();
    } else {
      navTo('tools');
    }
  };

  // ==========================================
  // 3.2: 1-CLICK "NIGHT-BEFORE EXAM CHEAT SHEET" PRINTABLE PDF
  // ==========================================

  window.openNightBeforeCheatSheet = function() {
    let modal = document.getElementById('nightBeforeCheatSheetModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'nightBeforeCheatSheetModal';
      modal.className = 'modal-backdrop';
      modal.style.zIndex = '99999';
      modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-card print-cheat-sheet-card" style="max-width:880px; width:95%; max-height:92vh; overflow-y:auto; background:var(--bg-card); border:1px solid var(--border-accent); border-radius:12px; padding:24px; box-sizing:border-box; margin:auto;" onclick="event.stopPropagation()">
        
        <!-- Controls Bar (Hidden during print) -->
        <div class="no-print" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="occ-ver-pill" style="background:#D97706; color:#FFF; font-weight:800; font-size:0.75rem;">OFFLINE KIT</span>
              <h2 style="margin:0; font-size:1.25rem; font-weight:900; color:var(--text);">IELTS Night-Before Exam Cheat Sheet</h2>
            </div>
            <p style="margin:4px 0 0 0; font-size:0.8rem; color:var(--text-secondary);">
              Print or save as 2-page PDF for last-minute review outside the British Council / IDP test center.
            </p>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn-accent-solid" onclick="window.printCheatSheet()" style="padding:8px 18px; font-weight:800; font-size:0.85rem; background:#D97706; border:none;">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-printer"/></svg> Print / Save PDF
            </button>
            <button class="btn-outlined" onclick="document.getElementById('nightBeforeCheatSheetModal').style.display='none'">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-x"/></svg> Close
            </button>
          </div>
        </div>

        <!-- High-Density Printable Content Sheet -->
        <div id="printableCheatSheetContent" style="color:var(--text); font-family:system-ui, -apple-system, sans-serif;">
          
          <!-- Sheet Header -->
          <div style="border-bottom:2px solid #D97706; padding-bottom:8px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:flex-end;">
            <div>
              <h1 style="margin:0; font-size:1.35rem; font-weight:900; color:#D97706; letter-spacing:-0.02em;">IELTS ACADEMIC // NIGHT-BEFORE MASTER SURVIVAL SHEET</h1>
              <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Official Cambridge Band 8.5/9.0 Emergency Mental Checklist</div>
            </div>
            <div style="font-size:0.72rem; font-weight:800; text-align:right;">
              <div>CONFIDENTIAL STUDY WEAPON</div>
              <div style="color:var(--text-secondary);">FOR TEST-MORNING REVIEW</div>
            </div>
          </div>

          <!-- PAGE 1: WRITING GOLDEN SKELETONS & 18 BANNED TRAPS -->
          <div style="margin-bottom:20px;">
            <div style="background:#D97706; color:#FFF; font-weight:900; font-size:0.8rem; padding:4px 10px; border-radius:4px; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.04em;">
              Part 1: Writing Task 1 &amp; Task 2 Golden Skeletons
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
              
              <!-- Task 1 Report Structure -->
              <div style="border:1px solid var(--border); padding:10px 12px; border-radius:6px; font-size:0.78rem; line-height:1.45;">
                <strong style="color:var(--accent); font-size:0.82rem; display:block; margin-bottom:4px;">Task 1 Academic Report (150 words / 20 mins):</strong>
                <div><strong>1. Intro:</strong> The provided line graph/bar chart delineates the fluctuations in [Topic] across [Timeframe].</div>
                <div><strong>2. Overview (Key!):</strong> Overall, what stands out from the data is that whereas [Category A] experienced an upward trajectory, [Category B] witnessed a precipitously downward trend.</div>
                <div><strong>3. Body 1:</strong> Regarding the former... (highest points, peak at X in year Y).</div>
                <div><strong>4. Body 2:</strong> In stark contrast... (lowest values, overtaking at Z).</div>
              </div>

              <!-- Task 2 Essay Structure -->
              <div style="border:1px solid var(--border); padding:10px 12px; border-radius:6px; font-size:0.78rem; line-height:1.45;">
                <strong style="color:var(--accent); font-size:0.82rem; display:block; margin-bottom:4px;">Task 2 Essay Blueprint (250 words / 40 mins):</strong>
                <div><strong>1. Intro:</strong> In contemporary society, the debate surrounding [Topic] has intensified. While [Perspective A claim], I contend that [Your Stance].</div>
                <div><strong>2. Body 1 (Proponents):</strong> On the one hand, it is widely argued that [Claim 1]. For instance, [Empirical Example].</div>
                <div><strong>3. Body 2 (Counter &amp; Stance):</strong> Conversely, critics highlight [Claim 2]. Notwithstanding these concerns, [Rebuttal &amp; Synthesis].</div>
                <div><strong>4. Conclusion:</strong> In the final analysis, having evaluated both perspectives...</div>
              </div>

            </div>

            <!-- The 18 Banned Clichés Quick-Swap Table -->
            <div style="border:1px solid var(--border); border-radius:6px; overflow:hidden; font-size:0.75rem;">
              <div style="background:rgba(239,68,68,0.1); padding:6px 10px; font-weight:800; color:#EF4444; border-bottom:1px solid var(--border);">
                CRITICAL: The 18 Forbidden Band-6 Clichés -> Instant Band 8.5 Swaps
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; padding:8px 10px; gap:6px; line-height:1.4;">
                <div><span style="color:#EF4444; text-decoration:line-through;">Nowadays</span> &rarr; <strong>in contemporary society / in the modern era</strong></div>
                <div><span style="color:#EF4444; text-decoration:line-through;">Every coin has two sides</span> &rarr; <strong>this issue engenders divergent perspectives</strong></div>
                <div><span style="color:#EF4444; text-decoration:line-through;">In a nutshell</span> &rarr; <strong>in the final analysis / in conclusion</strong></div>
                <div><span style="color:#EF4444; text-decoration:line-through;">A lot of / Lots of</span> &rarr; <strong>a substantial proportion of / numerous</strong></div>
                <div><span style="color:#EF4444; text-decoration:line-through;">More and more</span> &rarr; <strong>an increasing demographic of / progressively</strong></div>
                <div><span style="color:#EF4444; text-decoration:line-through;">Plays an important role</span> &rarr; <strong>serves as a pivotal catalyst for</strong></div>
                <div><span style="color:#EF4444; text-decoration:line-through;">Contractions (don't, can't)</span> &rarr; <strong>ALWAYS EXPAND (do not, cannot, will not)</strong></div>
                <div><span style="color:#EF4444; text-decoration:line-through;">Solve the problem</span> &rarr; <strong>ameliorate the dilemma / mitigate the crisis</strong></div>
                <div><span style="color:#EF4444; text-decoration:line-through;">All in all / To sum up</span> &rarr; <strong>to synthesize the aforementioned arguments</strong></div>
                <div><span style="color:#EF4444; text-decoration:line-through;">Since the dawn of time</span> &rarr; <strong>historically, / over recent decades,</strong></div>
              </div>
            </div>
          </div>

          <!-- PAGE 2: SPEAKING LIFELINES, TFNG ARBITER & MORNING MANTRAS -->
          <div>
            <div style="background:#10B981; color:#FFF; font-weight:900; font-size:0.8rem; padding:4px 10px; border-radius:4px; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.04em;">
              Part 2: Speaking Lifelines &amp; Reading/Listening Distractor Shields
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
              
              <!-- Speaking Part 2 PPF Formula -->
              <div style="border:1px solid var(--border); padding:10px 12px; border-radius:6px; font-size:0.78rem; line-height:1.45;">
                <strong style="color:#10B981; font-size:0.82rem; display:block; margin-bottom:4px;">Speaking Part 2: PPF 2-Minute Flow:</strong>
                <div><strong>0-40s (Past):</strong> "If my memory serves me correctly, it began approximately X years ago when..."</div>
                <div><strong>40-80s (Present):</strong> "What strikes me most about it today is its remarkable impact on..."</div>
                <div><strong>80-120s (Future):</strong> "Looking ahead, I believe it will continue to shape my prospective..."</div>
                <div style="margin-top:4px; font-weight:700; color:#D97706;">Pacing Rule: Speak smoothly at 130–150 WPM. Silent breath pauses > vocal fillers ("um").</div>
              </div>

              <!-- Reading TFNG Decisive Arbiter -->
              <div style="border:1px solid var(--border); padding:10px 12px; border-radius:6px; font-size:0.78rem; line-height:1.45;">
                <strong style="color:#6366F1; font-size:0.82rem; display:block; margin-bottom:4px;">Reading True / False / Not Given Arbiter:</strong>
                <div>• <strong>TRUE:</strong> Exact factual agreement in synonyms.</div>
                <div>• <strong>FALSE:</strong> Passage explicitly states the CONTRADICTORY fact or opposite qualifier.</div>
                <div>• <strong>NOT GIVEN:</strong> You cannot prove it from text alone without assuming. Even if it sounds true in real life, if the author didn't say it &rarr; NOT GIVEN!</div>
                <div style="margin-top:4px; font-weight:700; color:#EF4444;">Watch extreme qualifiers: all vs most, proved vs hypothesized.</div>
              </div>

            </div>

            <!-- Burmese Strategy Mantras -->
            <div style="padding:10px 14px; background:rgba(0,0,0,0.03); border:1px solid var(--border); border-radius:6px; font-size:0.78rem; line-height:1.5;">
              <strong style="color:var(--text); font-size:0.8rem; display:block; margin-bottom:2px;">Exam-Morning Mental Mantras (စိတ်အေးချမ်းစွာ ဖြေဆိုရန် သတိပေးချက်များ):</strong>
              <div class="burmese" style="font-family:'Pyidaungsu', 'Myanmar3', sans-serif;">
                ၁။ Writing တွင် မိနစ် ၂၀ စာ အစီရင်ခံစာ (Task 1) ထက် အမှတ်နှစ်ဆရသော Task 2 Essay ကို အရင်ဦးစားပေး စဉ်းစားပါ။ Overview မပါဘဲ Task 1 ဘယ်တော့မှ Band 7 မကျော်ပါ။<br>
                ၂။ Speaking တွင် အလွန်အမင်း မမြန်ပါစေနှင့် (၁၃၀–၁၅၀ WPM အရှိန်ဖြင့် စကားလုံးရှင်းလင်းစွာ ပြောပါ)။ "Um, uh" အသံထွက်မည့်အစား ၁ စက္ကန့် အသက်ရှူကာ ရပ်တန့်ပါ။<br>
                ၃။ Reading တွင် စာပိုဒ်တစ်ခုလုံး အလွတ်မဖတ်ပါနှင့်။ မေးခွန်းမှ Keyword ကို အရင်ရှာပြီး အထောက်အထားစာကြောင်းကိုသာ တိကျစွာ ခွဲခြမ်းစိတ်ဖြာပါ။
              </div>
            </div>

          </div>

        </div>

      </div>
    `;

    modal.style.display = 'flex';
  };

  window.printCheatSheet = function() {
    document.body.classList.add('printing-cheat-sheet');
    window.print();
    setTimeout(function() {
      document.body.classList.remove('printing-cheat-sheet');
    }, 1200);
  };

  window.saveExamTargetBand = function(band) {
    localStorage.setItem('ielts_target_band', String(band));
    window.renderExamReadinessBanner('examReadinessBanner');
  };

  window.saveExamTargetDate = function(dateStr) {
    localStorage.setItem('ielts_target_exam_date', String(dateStr));
    window.renderExamReadinessBanner('examReadinessBanner');
  };

  // ==========================================
  // 3.3: TARGET BAND EXAM COUNTDOWN & BURN-DOWN READINESS ENGINE
  // ==========================================

  window.getExamCountdownData = function() {
    let targetBand = localStorage.getItem('ielts_target_band') || '7.5';
    let targetDateStr = localStorage.getItem('ielts_target_exam_date');

    // Default to 21 days from now if not set
    if (!targetDateStr) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 21);
      targetDateStr = defaultDate.toISOString().split('T')[0];
      localStorage.setItem('ielts_target_exam_date', targetDateStr);
    }

    const now = new Date();
    const targetDate = new Date(targetDateStr);
    const diffMs = targetDate - now;
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Calculate readiness score
    let mastered = 0, readingCount = 0, writingCount = 0;
    try {
      if (window.appState) {
        mastered = window.appState.mastered ? window.appState.mastered.size : 0;
        readingCount = window.appState.completedReadingMocks ? window.appState.completedReadingMocks.size : 0;
        writingCount = window.appState.completedWritingMocks ? window.appState.completedWritingMocks.size : 0;
      }
    } catch(e) {}

    const totalReadinessScore = Math.min(100, Math.round(
      (mastered / 120) * 35 + 
      (readingCount / 10) * 30 + 
      (writingCount / 10) * 35
    ));

    return {
      targetBand: targetBand,
      targetDateStr: targetDateStr,
      daysRemaining: daysRemaining,
      readinessScore: Math.max(25, totalReadinessScore)
    };
  };

  window.setExamTargetDatePreset = function(days) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(days, 10));
    const dateStr = d.toISOString().split('T')[0];
    localStorage.setItem('ielts_target_exam_date', dateStr);
    window.renderExamReadinessBanner('examReadinessBanner');
    if (window.showAppToast) {
      window.showAppToast(`Exam countdown set to ${days} days (${dateStr})!`, 'success');
    }
  };

  window.renderExamReadinessBanner = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const data = window.getExamCountdownData();
    const isUrgent = data.daysRemaining <= 14;

    container.innerHTML = `
      <div style="padding:14px 16px; background:linear-gradient(135deg, rgba(217,119,6,0.08) 0%, rgba(180,83,9,0.02) 100%); border:1px solid rgba(217,119,6,0.25); border-radius:10px; margin-bottom:16px; overflow:hidden; box-sizing:border-box; max-width:100%;">
        <!-- Row 1: Days to Exam & Title -->
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
          <span class="occ-ver-pill" style="background:${isUrgent ? '#EF4444' : '#D97706'}; color:#FFF; font-weight:900; font-size:0.72rem; padding:3px 8px; border-radius:4px; white-space:nowrap; flex-shrink:0;">
            ${data.daysRemaining} DAYS TO EXAM
          </span>
          <strong style="color:var(--text); font-size:0.92rem; line-height:1.3; flex:1; min-width:180px;">Target Band: ${data.targetBand} Readiness Engine</strong>
        </div>

        <!-- Row 2: Timeline buttons & Cheat Sheet Action -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px; background:rgba(0,0,0,0.02); padding:6px 10px; border-radius:8px; border:1px solid var(--border);">
          <div style="display:flex; gap:5px; align-items:center; font-size:0.75rem; flex-wrap:wrap;">
            <span style="color:var(--text-secondary); font-weight:600; margin-right:2px;">Timeline:</span>
            <button class="btn-outlined" style="padding:2px 8px; font-size:0.72rem; border-radius:4px;" onclick="window.setExamTargetDatePreset(7)">7d</button>
            <button class="btn-outlined" style="padding:2px 8px; font-size:0.72rem; border-radius:4px;" onclick="window.setExamTargetDatePreset(14)">14d</button>
            <button class="btn-outlined" style="padding:2px 8px; font-size:0.72rem; border-radius:4px;" onclick="window.setExamTargetDatePreset(30)">30d</button>
          </div>
          <button class="btn-accent-solid" style="padding:4px 10px; font-size:0.72rem; font-weight:800; border-radius:6px; white-space:nowrap; flex-shrink:0;" onclick="window.openNightBeforeCheatSheet()">
            <svg class="ui-icon ui-icon-xs"><use href="#lucide-printer"/></svg> Cheat Sheet PDF
          </button>
        </div>

        <!-- Row 3: Progress Bar -->
        <div style="margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;">
            <span>Studio Burn-Down Readiness</span>
            <strong style="color:#D97706;">${data.readinessScore}% Ready</strong>
          </div>
          <div style="height:6px; background:rgba(0,0,0,0.08); border-radius:3px; overflow:hidden;">
            <div style="width:${data.readinessScore}%; height:100%; background:linear-gradient(90deg, #D97706, #10B981); transition:width 0.4s ease;"></div>
          </div>
        </div>

        <div style="font-size:0.74rem; color:var(--text-secondary); line-height:1.45;">
          Daily Velocity Target: <strong>1 Writing Mock + 2 Speaking Drills + 15 Lexicon words</strong> to guarantee Band ${data.targetBand} readiness.
        </div>
      </div>
    `;
  };

    function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})(window);
