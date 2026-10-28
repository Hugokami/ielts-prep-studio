import os
import re
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('js/listening-hub.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add loadSavedAnswersForExam helper
helper_code = """
  function loadSavedAnswersForExam(examId) {
    try {
      const saved = localStorage.getItem('ips_listening_answers_' + examId);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  }
"""
if "loadSavedAnswersForExam" not in content:
    content = content.replace("function calcListeningBand(rawScore) {", helper_code + "\n  function calcListeningBand(rawScore) {")

# 2. Update renderQuestions options mapping
old_opt_render = """          let optionsHtml = q.options.map((opt, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx); // A, B, C...
            const isChecked = val.toUpperCase() === letter.toUpperCase();
            return `
              <label class="q-opt" style="cursor:pointer; display:flex; align-items:flex-start; gap:10px; padding:8px 12px; border-radius:6px; border:1px solid ${isChecked ? 'var(--accent)' : 'var(--border)'}; background:${isChecked ? 'rgba(59,130,246,0.06)' : 'transparent'}; transition:all 0.15s ease;">
                <input type="radio" name="lis_q_${q.id}" value="${letter}" ${isChecked ? "checked" : ""} onchange="window.saveListeningAnswer(${q.id}, '${letter}')" style="margin-top:3px; accent-color:var(--accent);" />
                <span style="font-size:0.88rem; color:var(--text); line-height:1.5;">${opt}</span>
              </label>
            `;
          }).join("");"""

new_opt_render = """          let optionsHtml = q.options.map((opt, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx); // A, B, C...
            const isChecked = val.toUpperCase() === letter.toUpperCase();
            const cleanOpt = String(opt).replace(/^[A-Z][\)\.]\s*/, '').trim();
            return `
              <label class="q-opt" style="cursor:pointer; display:flex; align-items:flex-start; gap:10px; padding:8px 12px; border-radius:6px; border:1px solid ${isChecked ? 'var(--accent)' : 'var(--border)'}; background:${isChecked ? 'rgba(59,130,246,0.06)' : 'transparent'}; transition:all 0.15s ease;">
                <input type="radio" name="lis_q_${q.id}" value="${letter}" ${isChecked ? "checked" : ""} onchange="window.saveListeningAnswer(${q.id}, '${letter}')" style="margin-top:3px; accent-color:var(--accent);" />
                <span style="font-size:0.88rem; color:var(--text); line-height:1.5;"><strong>${letter})</strong> ${cleanOpt}</span>
              </label>
            `;
          }).join("");"""

content = content.replace(old_opt_render, new_opt_render)

# 3. Update exam switching to load saved answers
old_launch = """  window.launchListeningTestAndSection = function(idx, sec) {
    currentExamIdx = parseInt(idx, 10) || 0;
    currentSection = sec;
    userAnswers = {};
    flaggedQuestions.clear();
    isGraded = false;
    showDirectory = false;
    stopAudio();
    renderListeningUI(document.getElementById("listening-hub-mount"));
  };

  window.switchListeningExam = function(idx) {
    currentExamIdx = parseInt(idx, 10) || 0;
    currentSection = 1;
    userAnswers = {};
    flaggedQuestions.clear();
    isGraded = false;
    stopAudio();
    renderListeningUI(document.getElementById("listening-hub-mount"));
  };"""

new_launch = """  window.launchListeningTestAndSection = function(idx, sec) {
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
  };"""

content = content.replace(old_launch, new_launch)

# 4. Update saveListeningAnswer to persist to localStorage & appState
old_save = """  window.saveListeningAnswer = function(qid, val) {
    userAnswers[qid] = val;
    renderPalette();
  };"""

new_save = """  window.saveListeningAnswer = function(qid, val) {
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
  };"""

content = content.replace(old_save, new_save)

# 5. Update grading to check acceptable answers and persist history
old_grade_mcq = """        let isCorrect = false;
        if (q.type === "mcq") {
          isCorrect = userAns.toUpperCase() === q.answer.trim().toUpperCase();
        } else {"""

new_grade_mcq = """        let isCorrect = false;
        if (q.type === "mcq") {
          const allowed = (q.acceptable && q.acceptable.length > 0 ? q.acceptable : [q.answer]).map(a => String(a).trim().toUpperCase());
          isCorrect = allowed.includes(userAns.toUpperCase());
        } else {"""

content = content.replace(old_grade_mcq, new_grade_mcq)

old_grade_streak = """    const band = calcListeningBand(score);
    isGraded = true;
    if (typeof window.syncAndRenderStudyStreak === "function") {
      window.syncAndRenderStudyStreak(true);
    }"""

new_grade_streak = """    const band = calcListeningBand(score);
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
    }"""

content = content.replace(old_grade_streak, new_grade_streak)

# Also ensure initListeningHub loads saved answers for initial exam
old_init_load = """    const exam = LISTENING_DATA[currentExamIdx];
    if (!exam) return;"""
if "userAnswers = exam ? loadSavedAnswersForExam(exam.id) : {};" not in content:
    content = content.replace(
        "renderListeningUI(container);",
        "const curEx = LISTENING_DATA[currentExamIdx]; if (curEx && Object.keys(userAnswers).length === 0) userAnswers = loadSavedAnswersForExam(curEx.id);\n    renderListeningUI(container);",
        1
    )

with open('js/listening-hub.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("✓ Patched js/listening-hub.js")

if os.path.exists('.vercel/output/static/js/listening-hub.js'):
    with open('.vercel/output/static/js/listening-hub.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✓ Patched .vercel/output/static/js/listening-hub.js")
