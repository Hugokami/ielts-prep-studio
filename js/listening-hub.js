// IELTS Prep Studio — Listening CBT Hub (Zero-Bloat Lazy-Loaded Module)
(function() {
  let LISTENING_DATA = null;
  let currentExamIdx = 0;
  let currentSection = 1;
  let userAnswers = {};
  let flaggedQuestions = new Set();
  let speechUtterance = null;
  let isPlayingAudio = false;
  let playbackSpeed = 1.0;
  let currentWordIndex = 0;

  const BAND_SCALE = [
    [39, 9.0], [37, 8.5], [35, 8.0], [32, 7.5], [30, 7.0],
    [26, 6.5], [23, 6.0], [18, 5.5], [16, 5.0], [13, 4.5],
    [10, 4.0], [8, 3.5], [6, 3.0], [4, 2.5], [0, 2.0]
  ];

  function calcListeningBand(rawScore) {
    for (const [minScore, band] of BAND_SCALE) {
      if (rawScore >= minScore) return band;
    }
    return 2.0;
  }

  async function loadListeningData() {
    if (LISTENING_DATA) return LISTENING_DATA;
    try {
      const res = await fetch("data/listening.json");
      if (!res.ok) throw new Error("Failed to load data/listening.json");
      LISTENING_DATA = await res.json();
      return LISTENING_DATA;
    } catch (e) {
      console.error("Listening data load error:", e);
      return [];
    }
  }

  window.initListeningHub = async function() {
    const container = document.getElementById("listening-hub-mount");
    if (!container) return;
    
    container.innerHTML = `
      <div style="padding: 24px; text-align: center; color: var(--text-secondary);">
        <div class="uiv-kinetic-loader" style="margin-bottom:12px;"></div>
        <p style="font-weight:700;">Loading Cambridge Listening CBT Simulations...</p>
      </div>
    `;

    const data = await loadListeningData();
    if (!data || data.length === 0) {
      container.innerHTML = `<div class="sec-block"><p style="color:var(--crimson);">Unable to load listening test data.</p></div>`;
      return;
    }

    renderListeningUI(container);
  };

  function renderListeningUI(container) {
    const exam = LISTENING_DATA[currentExamIdx];
    if (!exam) return;

    let examOptions = LISTENING_DATA.map((ex, i) => 
      `<option value="${i}" ${i === currentExamIdx ? "selected" : ""}>${ex.title}</option>`
    ).join("");

    container.innerHTML = `
      <div class="sec-eyebrow">COMPUTER-BASED LISTENING SIMULATION</div>
      <div class="sec-header-row">
        <h2 class="sec-title">${exam.title} <span class="ver-muted">40 Questions • Official Band Scoring</span></h2>
        <div class="sec-timestamp">30 Minutes • 10 Questions Per Section</div>
      </div>

      <!-- Toolbar -->
      <div class="occ-toolbar" style="margin-bottom:16px;">
        <select id="listeningExamSelect" class="occ-select" style="flex:1; min-width:240px;" onchange="window.switchListeningExam(this.value)" aria-label="Select Listening Test">
          ${examOptions}
        </select>

        <div style="display:inline-flex; gap:6px; align-items:center; flex-wrap:nowrap;">
          <button type="button" class="btn-outlined ${currentSection === 1 ? 'is-active' : ''}" onclick="window.setListeningSection(1)" style="padding:4px 10px; font-size:0.75rem;">Sec 1</button>
          <button type="button" class="btn-outlined ${currentSection === 2 ? 'is-active' : ''}" onclick="window.setListeningSection(2)" style="padding:4px 10px; font-size:0.75rem;">Sec 2</button>
          <button type="button" class="btn-outlined ${currentSection === 3 ? 'is-active' : ''}" onclick="window.setListeningSection(3)" style="padding:4px 10px; font-size:0.75rem;">Sec 3</button>
          <button type="button" class="btn-outlined ${currentSection === 4 ? 'is-active' : ''}" onclick="window.setListeningSection(4)" style="padding:4px 10px; font-size:0.75rem;">Sec 4</button>
          <button type="button" class="btn-outlined ${currentSection === 0 ? 'is-active' : ''}" onclick="window.setListeningSection(0)" style="padding:4px 10px; font-size:0.75rem;">All</button>
        </div>

        <button type="button" class="btn-accent-solid" id="listeningGradeBtn" onclick="window.gradeListeningMock()" style="padding:6px 16px; font-size:0.8rem; font-weight:800;">
          ✓ Grade Test
        </button>
      </div>

      <!-- Audio Player Console -->
      <div class="speak-v6-card" style="margin-bottom:18px; padding:18px 20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="speak-icon-well blue">🎧</div>
            <div>
              <div style="font-weight:800; font-size:0.95rem; color:var(--text);" id="audioConsoleTitle">
                Section ${currentSection === 0 ? 1 : currentSection} Audio Stream
              </div>
              <div style="font-size:0.76rem; color:var(--text-secondary);">Native Cambridge-Style Speech Synthesis • High-Fidelity Accent</div>
            </div>
          </div>
          <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
            <span style="font-size:0.74rem; font-weight:700; color:var(--text-secondary);">Speed:</span>
            <button class="btn-outlined ${playbackSpeed === 0.75 ? 'is-active' : ''}" onclick="window.setListeningSpeed(0.75)" style="padding:2px 8px; font-size:0.72rem; height:28px;">0.75x</button>
            <button class="btn-outlined ${playbackSpeed === 1.0 ? 'is-active' : ''}" onclick="window.setListeningSpeed(1.0)" style="padding:2px 8px; font-size:0.72rem; height:28px;">1.0x</button>
            <button class="btn-outlined ${playbackSpeed === 1.25 ? 'is-active' : ''}" onclick="window.setListeningSpeed(1.25)" style="padding:2px 8px; font-size:0.72rem; height:28px;">1.25x</button>
          </div>
        </div>

        <!-- Audio Controls -->
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <button type="button" id="btnPlayListeningAudio" class="btn-accent-solid" onclick="window.toggleListeningAudio()" style="padding:8px 18px; font-size:0.84rem; font-weight:800;">
            ▶ Play Section Audio
          </button>
          <button type="button" class="btn-outlined" onclick="window.stopListeningAudio()" style="padding:8px 14px; font-size:0.84rem;">
            ⏹ Stop
          </button>
          <button type="button" class="btn-outlined" id="btnToggleTranscript" onclick="window.toggleListeningTranscript()" style="padding:8px 14px; font-size:0.84rem;">
            📄 Reveal Transcript
          </button>
          <span id="listeningAudioStatus" class="occ-ver-pill" style="font-size:0.76rem;">Idle</span>
        </div>

        <!-- Transcript Drawer (Hidden by default for genuine exam simulation) -->
        <div id="listeningTranscriptBox" style="display:none; margin-top:14px; padding:14px; background:var(--bg); border:1px solid var(--border-mid); border-radius:8px; font-size:0.88rem; line-height:1.7; max-height:260px; overflow-y:auto; color:var(--text);">
        </div>
      </div>

      <!-- Question Palette Bar (Questions 1 - 40) -->
      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:8px; padding:10px 14px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
          <span style="font-size:0.75rem; font-weight:800; color:var(--text-secondary);">EXAM QUESTION PALETTE (1–40):</span>
          <span id="listeningProgressLabel" style="font-size:0.75rem; font-weight:700; color:var(--accent);">0 / 40 Answered</span>
        </div>
        <div id="listeningPaletteGrid" style="display:flex; flex-wrap:wrap; gap:5px;"></div>
      </div>

      <!-- Score Banner (Displayed after grading) -->
      <div id="listeningScoreResult" style="display:none; margin-bottom:20px; padding:18px; border-radius:12px; background:var(--bg-card); border:2px solid var(--accent); box-shadow:0 8px 24px rgba(0,0,0,0.12);">
      </div>

      <!-- Questions Container -->
      <div id="listeningQuestionsContainer"></div>
    `;

    renderPalette();
    renderQuestions();
  }

  function renderPalette() {
    const grid = document.getElementById("listeningPaletteGrid");
    if (!grid) return;
    const exam = LISTENING_DATA[currentExamIdx];
    if (!exam) return;

    let html = "";
    let answeredCount = 0;
    let totalQuestions = 0;

    exam.sections.forEach(sec => {
      sec.questions.forEach(q => {
        totalQuestions++;
        const ans = (userAnswers[q.id] || "").trim();
        const isAnswered = ans.length > 0;
        if (isAnswered) answeredCount++;
        const isFlagged = flaggedQuestions.has(q.id);

        let chipClass = "cbt-palette-chip";
        if (isAnswered) chipClass += " answered";
        if (isFlagged) chipClass += " flagged";

        html += `
          <button type="button" class="${chipClass}" onclick="window.scrollToListeningQuestion(${q.id})" title="Jump to Question ${q.id}">
            ${q.id}
          </button>
        `;
      });
    });

    grid.innerHTML = html;
    const label = document.getElementById("listeningProgressLabel");
    if (label) label.textContent = `${answeredCount} / ${totalQuestions} Answered`;
  }

  function renderQuestions() {
    const container = document.getElementById("listeningQuestionsContainer");
    if (!container) return;
    const exam = LISTENING_DATA[currentExamIdx];
    if (!exam) return;

    const sectionsToRender = currentSection === 0 
      ? exam.sections 
      : exam.sections.filter(s => s.section === currentSection);

    let html = "";

    sectionsToRender.forEach(sec => {
      html += `
        <div class="sec-block" style="margin-bottom:28px;">
          <div style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:10px; padding:14px 18px; margin-bottom:16px;">
            <div style="font-size:0.75rem; font-weight:800; color:var(--accent); text-transform:uppercase;">SECTION ${sec.section}</div>
            <h3 style="font-size:1.15rem; font-weight:800; color:var(--text); margin:4px 0;">${sec.title}</h3>
            <p style="font-size:0.84rem; color:var(--text-secondary); margin:0;">${sec.context}</p>
          </div>

          <div style="display:grid; gap:12px;">
      `;

      sec.questions.forEach(q => {
        const val = userAnswers[q.id] || "";
        const isFlagged = flaggedQuestions.has(q.id);

        if (q.type === "mcq") {
          let optionsHtml = q.options.map(opt => {
            const letter = opt.trim()[0];
            const isChecked = val === letter;
            return `
              <label class="q-opt" style="cursor:pointer; display:flex; align-items:center; gap:8px;">
                <input type="radio" name="lis_q_${q.id}" value="${letter}" ${isChecked ? "checked" : ""} onchange="window.saveListeningAnswer(${q.id}, '${letter}')" />
                <span style="font-size:0.86rem; color:var(--text);">${opt}</span>
              </label>
            `;
          }).join("");

          html += `
            <div class="q-card" id="lis-card-${q.id}" style="border:1px solid var(--border); border-radius:8px; padding:14px 16px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:8px;">
                <strong style="color:var(--accent); font-size:0.88rem;">Question ${q.id}</strong>
                <button type="button" class="flag-q-btn ${isFlagged ? 'is-flagged' : ''}" onclick="window.toggleListeningFlag(${q.id})">
                  🚩 ${isFlagged ? 'Flagged' : 'Flag'}
                </button>
              </div>
              <p style="font-size:0.9rem; font-weight:700; color:var(--text); margin-bottom:10px;">${q.prompt}</p>
              <div style="display:grid; gap:6px;">${optionsHtml}</div>
              <div id="lis-exp-${q.id}" style="display:none; margin-top:10px; padding:10px 12px; border-radius:6px; font-size:0.82rem; line-height:1.5;"></div>
            </div>
          `;
        } else {
          // Fill-in-the-blank question
          html += `
            <div class="q-card" id="lis-card-${q.id}" style="border:1px solid var(--border); border-radius:8px; padding:14px 16px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:8px;">
                <strong style="color:var(--accent); font-size:0.88rem;">Question ${q.id}</strong>
                <button type="button" class="flag-q-btn ${isFlagged ? 'is-flagged' : ''}" onclick="window.toggleListeningFlag(${q.id})">
                  🚩 ${isFlagged ? 'Flagged' : 'Flag'}
                </button>
              </div>
              <p style="font-size:0.88rem; color:var(--text); margin-bottom:10px;">${q.prompt}</p>
              <div style="display:flex; gap:8px; align-items:center;">
                <input type="text" class="occ-input" value="${val}" placeholder="Type answer..." oninput="window.saveListeningAnswer(${q.id}, this.value)" style="max-width:320px; font-size:0.86rem; padding:6px 10px;" />
              </div>
              <div id="lis-exp-${q.id}" style="display:none; margin-top:10px; padding:10px 12px; border-radius:6px; font-size:0.82rem; line-height:1.5;"></div>
            </div>
          `;
        }
      });

      html += `
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // Window methods
  window.switchListeningExam = function(idx) {
    currentExamIdx = parseInt(idx, 10) || 0;
    currentSection = 1;
    userAnswers = {};
    flaggedQuestions.clear();
    stopAudio();
    renderListeningUI(document.getElementById("listening-hub-mount"));
  };

  window.setListeningSection = function(sec) {
    currentSection = sec;
    stopAudio();
    renderListeningUI(document.getElementById("listening-hub-mount"));
  };

  window.saveListeningAnswer = function(qid, val) {
    userAnswers[qid] = val;
    renderPalette();
  };

  window.toggleListeningFlag = function(qid) {
    if (flaggedQuestions.has(qid)) flaggedQuestions.delete(qid);
    else flaggedQuestions.add(qid);
    renderPalette();
    renderQuestions();
  };

  window.scrollToListeningQuestion = function(qid) {
    const el = document.getElementById(`lis-card-${qid}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("q-card-focused");
      setTimeout(() => el.classList.remove("q-card-focused"), 1800);
    }
  };

  window.setListeningSpeed = function(spd) {
    playbackSpeed = spd;
    if (isPlayingAudio) {
      stopAudio();
      window.toggleListeningAudio();
    } else {
      const container = document.getElementById("listening-hub-mount");
      renderListeningUI(container);
    }
  };

  function stopAudio() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isPlayingAudio = false;
    const btn = document.getElementById("btnPlayListeningAudio");
    const status = document.getElementById("listeningAudioStatus");
    if (btn) btn.innerHTML = "▶ Play Section Audio";
    if (status) {
      status.textContent = "Idle";
      status.style.color = "var(--text-secondary)";
    }
  }
  window.stopListeningAudio = stopAudio;

  window.toggleListeningAudio = function() {
    if (isPlayingAudio) {
      stopAudio();
      return;
    }

    const exam = LISTENING_DATA[currentExamIdx];
    if (!exam) return;

    const secObj = exam.sections.find(s => s.section === (currentSection === 0 ? 1 : currentSection));
    if (!secObj || !secObj.transcript) return;

    if (!('speechSynthesis' in window)) {
      alert("Web Speech API is not supported in this browser. Please use a modern browser to listen.");
      return;
    }

    window.speechSynthesis.cancel();
    speechUtterance = new SpeechSynthesisUtterance(secObj.transcript);
    speechUtterance.rate = playbackSpeed;
    
    // Pick an English voice
    const voices = window.speechSynthesis.getVoices();
    const gbVoice = voices.find(v => v.lang.includes("en-GB") || v.name.includes("UK") || v.name.includes("British")) || voices.find(v => v.lang.startsWith("en"));
    if (gbVoice) speechUtterance.voice = gbVoice;

    speechUtterance.onstart = function() {
      isPlayingAudio = true;
      const btn = document.getElementById("btnPlayListeningAudio");
      const status = document.getElementById("listeningAudioStatus");
      if (btn) btn.innerHTML = "⏸ Pause Audio";
      if (status) {
        status.textContent = `Playing Section ${secObj.section} (${playbackSpeed}x)`;
        status.style.color = "var(--green)";
      }
    };

    speechUtterance.onend = function() {
      stopAudio();
    };

    speechUtterance.onerror = function() {
      stopAudio();
    };

    window.speechSynthesis.speak(speechUtterance);
  };

  window.toggleListeningTranscript = function() {
    const box = document.getElementById("listeningTranscriptBox");
    const btn = document.getElementById("btnToggleTranscript");
    if (!box || !btn) return;

    const exam = LISTENING_DATA[currentExamIdx];
    if (!exam) return;
    const secObj = exam.sections.find(s => s.section === (currentSection === 0 ? 1 : currentSection));

    if (box.style.display === "none") {
      box.style.display = "block";
      box.innerHTML = `<strong>Verbatim Audio Transcript (Section ${secObj ? secObj.section : 1}):</strong><br><br>${(secObj ? secObj.transcript : "").replace(/\\n/g, "<br>")}`;
      btn.textContent = "🙈 Hide Transcript";
    } else {
      box.style.display = "none";
      btn.textContent = "📄 Reveal Transcript";
    }
  };

  window.gradeListeningMock = function() {
    const exam = LISTENING_DATA[currentExamIdx];
    if (!exam) return;

    let score = 0;
    let total = 0;

    exam.sections.forEach(sec => {
      sec.questions.forEach(q => {
        total++;
        const userAns = (userAnswers[q.id] || "").trim();
        const expBox = document.getElementById(`lis-exp-${q.id}`);
        const card = document.getElementById(`lis-card-${q.id}`);

        let isCorrect = false;
        if (q.type === "mcq") {
          isCorrect = userAns.toUpperCase() === q.answer.trim().toUpperCase();
        } else {
          const userNorm = userAns.toLowerCase().replace(/[^a-z0-9]/g, '');
          const allowed = (q.acceptable || [q.answer]).map(a => a.toLowerCase().replace(/[^a-z0-9]/g, ''));
          isCorrect = allowed.includes(userNorm);
        }

        if (isCorrect) score++;

        if (expBox) {
          expBox.style.display = "block";
          if (isCorrect) {
            expBox.style.background = "var(--green-soft)";
            expBox.style.border = "1px solid var(--green)";
            expBox.style.color = "var(--text)";
            expBox.innerHTML = `<strong>✓ Correct!</strong> Answer: <strong>${q.answer}</strong>.<br>${q.explanation || ''}`;
          } else {
            expBox.style.background = "var(--crimson-soft)";
            expBox.style.border = "1px solid var(--crimson)";
            expBox.style.color = "var(--text)";
            expBox.innerHTML = `<strong>✕ Incorrect.</strong> Your answer: <em>${userAns || '(Empty)'}</em> • Correct Answer: <strong>${q.answer}</strong>.<br>${q.explanation || ''}`;
          }
        }
      });
    });

    const band = calcListeningBand(score);
    const resultBox = document.getElementById("listeningScoreResult");
    if (resultBox) {
      resultBox.style.display = "block";
      resultBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="font-size:0.75rem; font-weight:800; color:var(--accent); text-transform:uppercase;">OFFICIAL CAMBRIDGE LISTENING RESULT</div>
            <h3 style="font-size:1.6rem; font-weight:900; color:var(--text); margin:4px 0;">Raw Score: ${score} / ${total}</h3>
            <p style="font-size:0.86rem; color:var(--text-secondary); margin:0;">Target: Band 8.5+ • Review detailed question explanations and transcripts below.</p>
          </div>
          <div style="text-align:center; padding:12px 24px; border-radius:12px; background:var(--accent); color:#ffffff;">
            <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; opacity:0.9;">IELTS BAND</div>
            <div style="font-size:2.4rem; font-weight:900; line-height:1;">${band.toFixed(1)}</div>
          </div>
        </div>
      `;
      resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

})();
