// IELTS Prep Studio — Authentic Listening CBT Hub (Official Audio & Cambridge CBT Engine)
(function() {
  let LISTENING_DATA = null;
  let currentExamIdx = 0;
  let currentSection = 1;
  let userAnswers = {};
  let flaggedQuestions = new Set();
  let audioPlayer = null;
  let playbackSpeed = 1.0;
  let examMode = 'practice'; // 'practice' | 'strict'
  let isGraded = false;
  let showDirectory = false;

  const BAND_SCALE = [
    [39, 9.0], [37, 8.5], [35, 8.0], [32, 7.5], [30, 7.0],
    [26, 6.5], [23, 6.0], [18, 5.5], [16, 5.0], [13, 4.5],
    [10, 4.0], [8, 3.5], [6, 3.0], [4, 2.5], [0, 2.0]
  ];

  
  function loadSavedAnswersForExam(examId) {
    try {
      const saved = localStorage.getItem('ips_listening_answers_' + examId);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  }

  function calcListeningBand(rawScore) {
    for (const [minScore, band] of BAND_SCALE) {
      if (rawScore >= minScore) return band;
    }
    return 2.0;
  }

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  async function loadListeningData() {
    if (LISTENING_DATA && LISTENING_DATA.length > 0) return LISTENING_DATA;
    try {
      const res = await fetch("data/listening.json?v=9.3");
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
      <div style="padding: 32px; text-align: center; color: var(--text-secondary);">
        <div class="uiv-kinetic-loader" style="margin: 0 auto 16px auto;"></div>
        <p style="font-weight:700; font-size: 1rem;">Loading Authentic Cambridge Listening Audio & Simulations...</p>
        <p style="font-size:0.8rem; color:var(--text-secondary);">Accessing 13 Full Tests • 52 Sections • Studio MP3 Audio Recordings</p>
      </div>
    `;

    const data = await loadListeningData();
    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="sec-block" style="text-align:center; padding:24px;">
          <p style="color:var(--crimson); font-weight:700;">Unable to load authentic listening tests.</p>
          <button type="button" class="btn-accent-solid" onclick="window.initListeningHub()">Retry Loading</button>
        </div>
      `;
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

    const activeSecObj = exam.sections.find(s => s.section === (currentSection === 0 ? 1 : currentSection)) || exam.sections[0];

    container.innerHTML = `
      <div class="sec-eyebrow">AUTHENTIC COMPUTER-DELIVERED LISTENING SIMULATION</div>
      <div class="sec-header-row" style="margin-bottom:14px;">
        <div>
          <h2 class="sec-title" style="margin-bottom:4px;">${exam.title}</h2>
          <div style="font-size:0.82rem; color:var(--text-secondary); display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
            <span><svg class="ui-icon ui-icon-xs"><use href="#lucide-headphones"/></svg> 40 Questions • Official Band 1–9 Scoring</span>
            <span><svg class="ui-icon ui-icon-xs"><use href="#lucide-clock"/></svg> 30 Minutes + 2 Mins Review</span>
            <span class="occ-ver-pill" style="font-size:0.7rem; background:rgba(16,185,129,0.12); color:#10B981; border:1px solid rgba(16,185,129,0.3);"><svg class="ui-icon ui-icon-xs" style="color:#10B981; margin-right:3px;"><use href="#lucide-check"/></svg> 100% Studio Recorded Audio</span>
          </div>
        </div>
      </div>

      <!-- Main Toolbar -->
      <div class="occ-toolbar" style="margin-bottom:16px; display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
        <button type="button" class="${showDirectory ? 'btn-accent-solid' : 'btn-outlined'}" onclick="window.toggleListeningDirectory()" style="padding:6px 12px; font-size:0.78rem; font-weight:800;">
          <svg class="ui-icon ui-icon-xs" style="margin-right:4px;"><use href="#lucide-book"/></svg> ${showDirectory ? 'Hide Test Directory' : 'Browse All 13 Tests'}
        </button>

        <select id="listeningExamSelect" class="occ-select" style="flex:1; min-width:0; max-width:100%; text-overflow:ellipsis; overflow:hidden; font-weight:600;" onchange="window.switchListeningExam(this.value)" aria-label="Select Listening Test">
          ${examOptions}
        </select>

        <!-- Section Navigation Pills -->
        <div style="display:inline-flex; gap:5px; align-items:center; flex-wrap:wrap;">
          <button type="button" class="btn-outlined ${currentSection === 1 ? 'is-active' : ''}" onclick="window.setListeningSection(1)" style="padding:5px 12px; font-size:0.78rem; font-weight:700;">Sec 1 (1–10)</button>
          <button type="button" class="btn-outlined ${currentSection === 2 ? 'is-active' : ''}" onclick="window.setListeningSection(2)" style="padding:5px 12px; font-size:0.78rem; font-weight:700;">Sec 2 (11–20)</button>
          <button type="button" class="btn-outlined ${currentSection === 3 ? 'is-active' : ''}" onclick="window.setListeningSection(3)" style="padding:5px 12px; font-size:0.78rem; font-weight:700;">Sec 3 (21–30)</button>
          <button type="button" class="btn-outlined ${currentSection === 4 ? 'is-active' : ''}" onclick="window.setListeningSection(4)" style="padding:5px 12px; font-size:0.78rem; font-weight:700;">Sec 4 (31–40)</button>
          <button type="button" class="btn-outlined ${currentSection === 0 ? 'is-active' : ''}" onclick="window.setListeningSection(0)" style="padding:5px 10px; font-size:0.78rem;">All</button>
        </div>

        <!-- Mode Toggle & Grade Button -->
        <div style="display:flex; gap:8px; align-items:center; margin-left:auto;">
          <div style="display:inline-flex; border:1px solid var(--border); border-radius:6px; overflow:hidden;">
            <button type="button" class="btn-ghost ${examMode === 'practice' ? 'is-active' : ''}" onclick="window.setListeningMode('practice')" style="padding:5px 10px; font-size:0.74rem; font-weight:700; background:${examMode === 'practice' ? 'var(--accent)' : 'transparent'}; color:${examMode === 'practice' ? '#fff' : 'var(--text-secondary)'};">Practice</button>
            <button type="button" class="btn-ghost ${examMode === 'strict' ? 'is-active' : ''}" onclick="window.setListeningMode('strict')" style="padding:5px 10px; font-size:0.74rem; font-weight:700; background:${examMode === 'strict' ? 'var(--accent)' : 'transparent'}; color:${examMode === 'strict' ? '#fff' : 'var(--text-secondary)'};" title="Strict CBT Exam Mode locks scrubber and plays audio once">Strict CBT</button>
          </div>

          <button type="button" class="btn-accent-solid" id="listeningGradeBtn" onclick="window.gradeListeningMock()" style="padding:7px 18px; font-size:0.82rem; font-weight:800;">
            <svg class="ui-icon ui-icon-xs" style="margin-right:4px;"><use href="#lucide-check"/></svg> Grade Test
          </button>
        </div>
      </div>

      <!-- Cambridge Test Card Directory (Full Test vs. Practice a Section) -->
      <div id="listeningDirectoryDrawer" style="display:${showDirectory ? 'block' : 'none'}; margin-bottom:20px; padding:16px; border-radius:12px; background:var(--bg-card); border:1px solid var(--border);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="font-size:0.74rem; font-weight:800; color:var(--accent); text-transform:uppercase;">CAMBRIDGE CBT QUICK DIRECTORY</div>
            <div style="font-size:1rem; font-weight:800; color:var(--text);">Choose a Full 40-Question Test or Practice 1 Section</div>
          </div>
          <button type="button" class="btn-outlined" style="padding:4px 10px; font-size:0.75rem;" onclick="window.toggleListeningDirectory()">✕ Close Directory</button>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:12px;">
          ${LISTENING_DATA.map((t, idx) => `
            <div style="padding:14px; border-radius:10px; background:var(--bg-elevated); border:1px solid ${idx === currentExamIdx ? 'var(--accent)' : 'var(--border)'}; display:flex; flex-direction:column; gap:10px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                <strong style="font-size:0.88rem; color:var(--text); line-height:1.35;">${t.title}</strong>
                <span class="occ-ver-pill" style="font-size:0.68rem;">40 Qs</span>
              </div>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button type="button" class="btn-accent-solid" style="padding:5px 10px; font-size:0.74rem; height:auto; flex:1;" onclick="window.launchListeningTestAndSection(${idx}, 0)">▶ Take Full Test</button>
              </div>
              <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:5px;">
                ${[1,2,3,4].map(sNum => `
                  <button type="button" class="btn-outlined" style="padding:4px 4px; font-size:0.72rem; font-weight:700; text-align:center;" onclick="window.launchListeningTestAndSection(${idx}, ${sNum})">Sec ${sNum}</button>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- HTML5 Audio Console (Real MP3 Studio Player) -->
      <div class="speak-v6-card" style="margin-bottom:18px; padding:18px 20px; background:var(--bg-elevated); border:1px solid var(--border); border-radius:12px;">
        <!-- Header Row -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div class="speak-icon-well blue" style="width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(59,130,246,0.12); font-size:1.3rem;">🎧</div>
            <div>
              <div style="font-weight:800; font-size:0.98rem; color:var(--text);" id="audioConsoleTitle">
                Section ${activeSecObj.section}: Official Studio Audio Recording
              </div>
              <div style="font-size:0.76rem; color:var(--text-secondary); display:flex; gap:8px; align-items:center;">
                <span>Authentic Multi-Speaker British / Australian / International Dialogue</span>
                <span id="listeningAudioStatus" style="color:var(--text-secondary); font-weight:700;">• Ready</span>
              </div>
            </div>
          </div>

          <!-- Speed Controls -->
          <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
            <span style="font-size:0.74rem; font-weight:700; color:var(--text-secondary); margin-right:4px;">Speed:</span>
            <button type="button" class="btn-outlined ${playbackSpeed === 0.75 ? 'is-active' : ''}" onclick="window.setListeningSpeed(0.75)" style="padding:2px 8px; font-size:0.72rem; height:26px;">0.75x</button>
            <button type="button" class="btn-outlined ${playbackSpeed === 1.0 ? 'is-active' : ''}" onclick="window.setListeningSpeed(1.0)" style="padding:2px 8px; font-size:0.72rem; height:26px;">1.0x</button>
            <button type="button" class="btn-outlined ${playbackSpeed === 1.25 ? 'is-active' : ''}" onclick="window.setListeningSpeed(1.25)" style="padding:2px 8px; font-size:0.72rem; height:26px;">1.25x</button>
            <button type="button" class="btn-outlined ${playbackSpeed === 1.5 ? 'is-active' : ''}" onclick="window.setListeningSpeed(1.5)" style="padding:2px 8px; font-size:0.72rem; height:26px;">1.5x</button>
          </div>
        </div>

        <!-- Scrubber & Time Display -->
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
          <span id="listeningCurrentTime" style="font-family:var(--font-mono, monospace); font-size:0.8rem; font-weight:700; color:var(--text-secondary); min-width:44px;">00:00</span>
          <input type="range" id="listeningAudioSeek" min="0" max="100" value="0" step="0.1" oninput="window.onListeningSeek(this.value)" ${examMode === 'strict' ? 'disabled' : ''} style="flex:1; cursor:${examMode === 'strict' ? 'not-allowed' : 'pointer'}; accent-color:var(--accent);" aria-label="Audio Timeline Scrubber" />
          <span id="listeningTotalDuration" style="font-family:var(--font-mono, monospace); font-size:0.8rem; font-weight:700; color:var(--text-secondary); min-width:44px;">00:00</span>
        </div>

        <!-- Audio Action Controls -->
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <button type="button" id="btnPlayListeningAudio" class="btn-accent-solid" onclick="window.toggleListeningAudio()" style="padding:8px 22px; font-size:0.86rem; font-weight:800; min-width:130px;">
            <svg class="ui-icon ui-icon-xs" style="margin-right:4px;"><use href="#lucide-play"/></svg> Play Audio
          </button>
          
          <button type="button" class="btn-outlined" onclick="window.stopListeningAudio()" style="padding:8px 14px; font-size:0.84rem;">
            <svg class="ui-icon ui-icon-xs" style="margin-right:4px;"><use href="#lucide-square"/></svg> Stop
          </button>

          ${examMode === 'practice' ? `
            <button type="button" class="btn-outlined" onclick="window.skipListeningAudio(-10)" style="padding:8px 12px; font-size:0.84rem;" title="Rewind 10 Seconds">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-rewind"/></svg> -10s
            </button>
            <button type="button" class="btn-outlined" onclick="window.skipListeningAudio(10)" style="padding:8px 12px; font-size:0.84rem;" title="Fast Forward 10 Seconds">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-fast-forward"/></svg> +10s
            </button>
          ` : ''}

          <a href="${activeSecObj.audio_url}" download="IELTS_Listening_Test${exam.id}_Sec${activeSecObj.section}.mp3" target="_blank" rel="noopener noreferrer" class="btn-outlined" style="padding:8px 14px; font-size:0.82rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px; color:var(--text);">
            <svg class="ui-icon ui-icon-xs" style="margin-right:4px;"><use href="#lucide-download"/></svg> Download MP3
          </a>

          ${activeSecObj.transcript ? `
            <button type="button" class="btn-outlined" id="btnToggleTranscript" onclick="window.toggleListeningTranscript()" style="padding:8px 14px; font-size:0.82rem; margin-left:auto;">
              <svg class="ui-icon ui-icon-xs" style="margin-right:4px;"><use href="#lucide-file-text"/></svg> Reveal Transcript
            </button>
          ` : ''}
        </div>

        <!-- Transcript Drawer (Hidden by default) -->
        <div id="listeningTranscriptBox" style="display:none; margin-top:16px; padding:16px; background:var(--bg); border:1px solid var(--border); border-radius:8px; font-size:0.88rem; line-height:1.7; max-height:280px; overflow-y:auto; color:var(--text);">
        </div>

        <!-- Hidden Audio Element -->
        <audio id="ipsListeningAudioEl" preload="metadata" src="${activeSecObj.audio_url}" style="display:none;"></audio>
      </div>

      <!-- Question Palette Bar (1 - 40) -->
      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:10px; padding:12px 16px; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.75rem; font-weight:800; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.04em;">EXAM QUESTION PALETTE (1–40):</span>
            <span style="font-size:0.72rem; color:var(--text-muted);">(Click any number to jump)</span>
          </div>
          <div style="display:flex; gap:12px; align-items:center;">
            <span id="listeningProgressLabel" style="font-size:0.78rem; font-weight:700; color:var(--accent);">0 / 40 Answered</span>
            <span style="font-size:0.72rem; color:var(--text-muted);">| 🚩 Flag for review</span>
          </div>
        </div>
        <div id="listeningPaletteGrid" style="display:flex; flex-wrap:wrap; gap:6px;"></div>
      </div>

      <!-- Score Banner (Displayed after grading) -->
      <div id="listeningScoreResult" style="display:none; margin-bottom:24px; padding:20px 24px; border-radius:12px; background:var(--bg-card); border:2px solid var(--accent); box-shadow:0 8px 30px rgba(0,0,0,0.12);">
      </div>

      <!-- Questions Container -->
      <div id="listeningQuestionsContainer"></div>
    `;

    setupAudioElement();
    renderPalette();
    renderQuestions();
  }

  function setupAudioElement() {
    audioPlayer = document.getElementById("ipsListeningAudioEl");
    if (!audioPlayer) return;

    audioPlayer.playbackRate = playbackSpeed;

    audioPlayer.onerror = function() {
      const status = document.getElementById("listeningAudioStatus");
      const btn = document.getElementById("btnPlayListeningAudio");
      if (status) {
        status.textContent = "• Stream Connecting / Fallback Available";
        status.style.color = "var(--accent-gold, #F59E0B)";
      }
      if (btn) btn.innerHTML = '<svg class="ui-icon ui-icon-xs" style="margin-right:4px;"><use href="#lucide-play"/></svg> Retry Audio';
    };

    audioPlayer.ontimeupdate = function() {
      const cur = audioPlayer.currentTime || 0;
      const dur = audioPlayer.duration || 0;
      const curLabel = document.getElementById("listeningCurrentTime");
      const durLabel = document.getElementById("listeningTotalDuration");
      const seekSlider = document.getElementById("listeningAudioSeek");

      if (curLabel) curLabel.textContent = formatTime(cur);
      if (durLabel && dur > 0) durLabel.textContent = formatTime(dur);
      if (seekSlider && dur > 0) {
        seekSlider.value = (cur / dur) * 100;
      }
    };

    audioPlayer.onloadedmetadata = function() {
      const durLabel = document.getElementById("listeningTotalDuration");
      if (durLabel && audioPlayer.duration) {
        durLabel.textContent = formatTime(audioPlayer.duration);
      }
    };

    audioPlayer.onplay = function() {
      const btn = document.getElementById("btnPlayListeningAudio");
      const status = document.getElementById("listeningAudioStatus");
      if (btn) btn.innerHTML = '<svg class="ui-icon ui-icon-xs" style="margin-right:4px;"><use href="#lucide-pause"/></svg> Pause Audio';
      if (status) {
        status.textContent = `• Playing (${playbackSpeed}x)`;
        status.style.color = "var(--green, #10B981)";
      }
    };

    audioPlayer.onpause = function() {
      const btn = document.getElementById("btnPlayListeningAudio");
      const status = document.getElementById("listeningAudioStatus");
      if (btn) btn.innerHTML = '<svg class="ui-icon ui-icon-xs" style="margin-right:4px;"><use href="#lucide-play"/></svg> Resume Audio';
      if (status) {
        status.textContent = "• Paused";
        status.style.color = "var(--text-secondary)";
      }
    };

    audioPlayer.onended = function() {
      const btn = document.getElementById("btnPlayListeningAudio");
      const status = document.getElementById("listeningAudioStatus");
      if (btn) btn.innerHTML = '<svg class="ui-icon ui-icon-xs" style="margin-right:4px;"><use href="#lucide-play"/></svg> Replay Audio';
      if (status) {
        status.textContent = "• Completed";
        status.style.color = "var(--text-secondary)";
      }
    };

    audioPlayer.onerror = function(e) {
      console.warn("Audio playback error:", e);
      const status = document.getElementById("listeningAudioStatus");
      if (status) {
        status.textContent = "• Audio Stream Loading / Network Fallback";
        status.style.color = "var(--crimson, #EF4444)";
      }
    };
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
          <button type="button" class="${chipClass}" onclick="window.scrollToListeningQuestion(${q.id})" title="Jump to Question ${q.id} ${isAnswered ? '(Answered)' : ''}">
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
      const qStart = sec.questions[0] ? sec.questions[0].id : 1;
      const qEnd = sec.questions[sec.questions.length - 1] ? sec.questions[sec.questions.length - 1].id : 10;

      html += `
        <div class="sec-block" style="margin-bottom:32px;">
          <!-- Section Banner -->
          <div style="background:var(--bg-elevated); border:1px solid var(--border); border-left:4px solid var(--accent); border-radius:10px; padding:16px 20px; margin-bottom:18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div style="font-size:0.75rem; font-weight:800; color:var(--accent); text-transform:uppercase; letter-spacing:0.04em;">
                SECTION ${sec.section} • QUESTIONS ${qStart}–${qEnd}
              </div>
              <div style="font-size:0.74rem; color:var(--text-secondary); font-weight:700;">
                Audio: ${sec.audio_url.split('/').pop()}
              </div>
            </div>
            <h3 style="font-size:1.18rem; font-weight:800; color:var(--text); margin:6px 0;">${sec.title}</h3>
            <p style="font-size:0.86rem; color:var(--text-secondary); margin:4px 0 0 0; line-height:1.5;">${sec.instructions || sec.context}</p>
          </div>

          <!-- Questions Grid -->
          <div style="display:grid; gap:14px;">
      `;

      sec.questions.forEach(q => {
        const val = userAnswers[q.id] || "";
        const isFlagged = flaggedQuestions.has(q.id);

        if (q.type === "mcq" && q.options && q.options.length > 0) {
          let optionsHtml = q.options.map((opt, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx); // A, B, C...
            const isChecked = val.toUpperCase() === letter.toUpperCase();
            const cleanOpt = String(opt).replace(/^[A-Z][\)\.]\s*/, '').trim();
            return `
              <label class="q-opt" style="cursor:pointer; display:flex; align-items:flex-start; gap:10px; padding:8px 12px; border-radius:6px; border:1px solid ${isChecked ? 'var(--accent)' : 'var(--border)'}; background:${isChecked ? 'rgba(59,130,246,0.06)' : 'transparent'}; transition:all 0.15s ease;">
                <input type="radio" name="lis_q_${q.id}" value="${letter}" ${isChecked ? "checked" : ""} onchange="window.saveListeningAnswer(${q.id}, '${letter}')" style="margin-top:3px; accent-color:var(--accent);" />
                <span style="font-size:0.88rem; color:var(--text); line-height:1.5;"><strong>${letter})</strong> ${cleanOpt}</span>
              </label>
            `;
          }).join("");

          html += `
            <div class="q-card" id="lis-card-${q.id}" style="border:1px solid var(--border); border-radius:10px; padding:16px 18px; background:var(--bg-card);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:10px;">
                <strong style="color:var(--accent); font-size:0.9rem; letter-spacing:0.02em;">Question ${q.id}</strong>
                <button type="button" class="flag-q-btn ${isFlagged ? 'is-flagged' : ''}" onclick="window.toggleListeningFlag(${q.id})" style="border:none; background:transparent; font-size:0.75rem; cursor:pointer; color:${isFlagged ? 'var(--crimson)' : 'var(--text-secondary)'};">
                  <svg class="ui-icon ui-icon-xs" style="margin-right:3px;"><use href="#lucide-flag"/></svg> ${isFlagged ? 'Flagged' : 'Flag'}
                </button>
              </div>
              <p style="font-size:0.92rem; font-weight:700; color:var(--text); margin-bottom:12px; line-height:1.5;">${q.prompt}</p>
              <div style="display:grid; gap:8px;">${optionsHtml}</div>
              <div id="lis-exp-${q.id}" style="display:none; margin-top:12px; padding:12px 14px; border-radius:8px; font-size:0.84rem; line-height:1.6;"></div>
            </div>
          `;
        } else {
          // Fill-in-the-blank / Note / Form completion
          html += `
            <div class="q-card" id="lis-card-${q.id}" style="border:1px solid var(--border); border-radius:10px; padding:16px 18px; background:var(--bg-card);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:10px;">
                <strong style="color:var(--accent); font-size:0.9rem; letter-spacing:0.02em;">Question ${q.id}</strong>
                <button type="button" class="flag-q-btn ${isFlagged ? 'is-flagged' : ''}" onclick="window.toggleListeningFlag(${q.id})" style="border:none; background:transparent; font-size:0.75rem; cursor:pointer; color:${isFlagged ? 'var(--crimson)' : 'var(--text-secondary)'};">
                  <svg class="ui-icon ui-icon-xs" style="margin-right:3px;"><use href="#lucide-flag"/></svg> ${isFlagged ? 'Flagged' : 'Flag'}
                </button>
              </div>
              <p style="font-size:0.9rem; color:var(--text); margin-bottom:12px; line-height:1.6; font-weight:600;">${q.prompt}</p>
              <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="occ-input" value="${val}" placeholder="Type your answer here..." oninput="window.saveListeningAnswer(${q.id}, this.value)" style="max-width:340px; font-size:0.88rem; padding:8px 12px; border-radius:6px;" />
              </div>
              <div id="lis-exp-${q.id}" style="display:none; margin-top:12px; padding:12px 14px; border-radius:8px; font-size:0.84rem; line-height:1.6;"></div>
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
  window.toggleListeningDirectory = function() {
    showDirectory = !showDirectory;
    renderListeningUI(document.getElementById("listening-hub-mount"));
  };

  window.launchListeningTestAndSection = function(idx, sec) {
    currentExamIdx = parseInt(idx, 10) || 0;
    currentSection = sec;
    const exam = LISTENING_DATA && LISTENING_DATA[currentExamIdx];
    userAnswers = exam ? loadSavedAnswersForExam(exam.id) : {};
    flaggedQuestions.clear();
    isGraded = false;
    showDirectory = false;
    stopAudio();
    renderListeningUI(document.getElementById("listening-hub-mount"));
  };

  window.switchListeningExam = function(idx) {
    currentExamIdx = parseInt(idx, 10) || 0;
    currentSection = 1;
    const exam = LISTENING_DATA && LISTENING_DATA[currentExamIdx];
    userAnswers = exam ? loadSavedAnswersForExam(exam.id) : {};
    flaggedQuestions.clear();
    isGraded = false;
    stopAudio();
    renderListeningUI(document.getElementById("listening-hub-mount"));
  };

  window.setListeningSection = function(sec) {
    currentSection = sec;
    stopAudio();
    renderListeningUI(document.getElementById("listening-hub-mount"));
  };

  window.setListeningMode = function(mode) {
    examMode = mode;
    const seekSlider = document.getElementById("listeningAudioSeek");
    if (seekSlider) {
      seekSlider.disabled = (examMode === 'strict');
      seekSlider.style.cursor = (examMode === 'strict' ? 'not-allowed' : 'pointer');
    }
    const container = document.getElementById("listening-hub-mount");
    renderListeningUI(container);
  };

  window.saveListeningAnswer = function(qid, val) {
    userAnswers[qid] = val;
    renderPalette();
    try {
      const exam = LISTENING_DATA && LISTENING_DATA[currentExamIdx];
      if (exam) {
        localStorage.setItem('ips_listening_answers_' + exam.id, JSON.stringify(userAnswers));
        let allAnswers = {};
        try { allAnswers = JSON.parse(localStorage.getItem('ips_listening_answers') || '{}'); } catch (e) {}
        allAnswers[exam.id] = userAnswers;
        localStorage.setItem('ips_listening_answers', JSON.stringify(allAnswers));
        if (window.appState) {
          if (!window.appState.listening_answers) window.appState.listening_answers = {};
          window.appState.listening_answers[exam.id] = userAnswers;
        }
      }
    } catch (e) {}
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
    if (audioPlayer) {
      audioPlayer.playbackRate = spd;
    }
    const container = document.getElementById("listening-hub-mount");
    renderListeningUI(container);
  };

  function stopAudio() {
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
    }
    const btn = document.getElementById("btnPlayListeningAudio");
    const status = document.getElementById("listeningAudioStatus");
    if (btn) btn.innerHTML = '<svg class="ui-icon ui-icon-xs" style="margin-right:4px;"><use href="#lucide-play"/></svg> Play Audio';
    if (status) {
      status.textContent = "• Idle";
      status.style.color = "var(--text-secondary)";
    }
  }
  window.stopListeningAudio = stopAudio;

  window.toggleListeningAudio = function() {
    if (!audioPlayer) setupAudioElement();
    if (!audioPlayer) return;

    if (!audioPlayer.paused) {
      audioPlayer.pause();
    } else {
      audioPlayer.play().catch(e => {
        console.warn("Autoplay / audio stream error:", e);
      });
    }
  };

  window.onListeningSeek = function(percent) {
    if (!audioPlayer || examMode === 'strict') return;
    if (audioPlayer.duration) {
      audioPlayer.currentTime = (percent / 100) * audioPlayer.duration;
    }
  };

  window.skipListeningAudio = function(deltaSeconds) {
    if (!audioPlayer || examMode === 'strict') return;
    audioPlayer.currentTime = Math.max(0, Math.min(audioPlayer.duration || 3600, (audioPlayer.currentTime || 0) + deltaSeconds));
  };

  window.toggleListeningTranscript = function() {
    const box = document.getElementById("listeningTranscriptBox");
    const btn = document.getElementById("btnToggleTranscript");
    if (!box || !btn) return;

    const exam = LISTENING_DATA[currentExamIdx];
    if (!exam) return;
    const secObj = exam.sections.find(s => s.section === (currentSection === 0 ? 1 : currentSection)) || exam.sections[0];

    if (box.style.display === "none") {
      box.style.display = "block";
      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong style="color:var(--accent);">Official Verbatim Audio Transcript (Section ${secObj ? secObj.section : 1}):</strong>
          <span style="font-size:0.75rem; color:var(--text-secondary);">Cambridge Audio Recording</span>
        </div>
        <div>${(secObj && secObj.transcript ? secObj.transcript : "Transcript recording context available in audio stream.").replace(/\\n/g, "<br>")}</div>
      `;
      btn.innerHTML = '<svg class="ui-icon ui-icon-xs" style="margin-right:4px;"><use href="#lucide-eye-off"/></svg> Hide Transcript';
    } else {
      box.style.display = "none";
      btn.innerHTML = '<svg class="ui-icon ui-icon-xs" style="margin-right:4px;"><use href="#lucide-file-text"/></svg> Reveal Transcript';
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
          const allowed = (q.acceptable && q.acceptable.length > 0 ? q.acceptable : [q.answer]).map(a => String(a).trim().toUpperCase());
          isCorrect = allowed.includes(userAns.toUpperCase());
        } else {
          const userNorm = userAns.toLowerCase().replace(/[^a-z0-9]/g, '');
          const allowed = (q.acceptable && q.acceptable.length > 0 ? q.acceptable : [q.answer]).map(a => 
            String(a).toLowerCase().replace(/[^a-z0-9]/g, '')
          );
          isCorrect = allowed.includes(userNorm);
        }

        if (isCorrect) score++;

        if (expBox) {
          expBox.style.display = "block";
          if (isCorrect) {
            expBox.style.background = "rgba(16,185,129,0.1)";
            expBox.style.border = "1px solid rgba(16,185,129,0.35)";
            expBox.style.color = "var(--text)";
            expBox.innerHTML = `<strong><svg class="ui-icon ui-icon-xs" style="color:#10B981; margin-right:2px;"><use href="#lucide-check"/></svg> Correct!</strong> Official Answer: <strong style="color:#10B981;">${q.answer}</strong>.<br><span style="color:var(--text-secondary); font-size:0.8rem;">${q.explanation || ''}</span>`;
          } else {
            expBox.style.background = "rgba(239,68,68,0.1)";
            expBox.style.border = "1px solid rgba(239,68,68,0.35)";
            expBox.style.color = "var(--text)";
            expBox.innerHTML = `<strong><svg class="ui-icon ui-icon-xs" style="color:var(--crimson); margin-right:2px;"><use href="#lucide-x"/></svg> Incorrect.</strong> Your answer: <em style="color:var(--crimson);">${userAns || '(Empty)'}</em> • Official Answer: <strong style="color:#10B981;">${q.answer}</strong>.<br><span style="color:var(--text-secondary); font-size:0.8rem;">${q.explanation || ''}</span>`;
          }
        }
      });
    });

    const band = calcListeningBand(score);
    isGraded = true;
    try {
      const historyItem = {
        examId: exam.id,
        title: exam.title,
        score: score,
        total: total,
        band: band,
        date: new Date().toISOString()
      };
      let history = [];
      try { history = JSON.parse(localStorage.getItem('ips_listening_history') || '[]'); } catch (e) {}
      history.unshift(historyItem);
      if (history.length > 50) history = history.slice(0, 50);
      localStorage.setItem('ips_listening_history', JSON.stringify(history));
      if (window.appState) {
        if (!window.appState.listening_history) window.appState.listening_history = [];
        window.appState.listening_history = history;
      }
      if (window.StorageManager && typeof window.StorageManager.syncServerless === 'function') {
        window.StorageManager.syncServerless(window.appState);
      }
    } catch (e) {}
    if (typeof window.syncAndRenderStudyStreak === "function") {
      window.syncAndRenderStudyStreak(true);
    }
    if (typeof window.duoAddXp === "function") {
      window.duoAddXp(score * 3 + 10, "Listening Test");
    }
    if (band >= 7.0 && typeof window.duoCelebrate === "function") {
      window.duoCelebrate();
    }
    if (typeof window.duoShowFeedback === "function") {
      window.duoShowFeedback({
        title: `Listening CBT: Band ${band} (${score}/${total})`,
        message: band >= 7.0 ? "Outstanding accuracy! Paraphrase mapping on track for Band 8.5+." : "Good practice! Review the flagged distractors and transcript citations.",
        type: band >= 6.5 ? "success" : "warn"
      });
    }
    const resultBox = document.getElementById("listeningScoreResult");
    if (resultBox) {
      resultBox.style.display = "block";
      resultBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <div style="font-size:0.75rem; font-weight:800; color:var(--accent); text-transform:uppercase; letter-spacing:0.04em;">OFFICIAL CAMBRIDGE LISTENING ASSESSMENT</div>
            <h3 style="font-size:1.6rem; font-weight:900; color:var(--text); margin:6px 0;">Raw Score: ${score} / ${total}</h3>
            <p style="font-size:0.86rem; color:var(--text-secondary); margin:0;">Section-by-section correct answers and explanations revealed below.</p>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.75rem; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">OFFICIAL IELTS BAND</div>
            <div style="font-size:2.4rem; font-weight:900; color:var(--accent); line-height:1;">Band ${band}</div>
          </div>
        </div>
      `;
      resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
})();
