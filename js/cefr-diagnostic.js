/**
 * IELTS Prep Studio - Cambridge CEFR 50-Question Diagnostic Placement Engine
 * 5 Independent Batches (250 Calibrated Questions Total)
 * Multi-tier assessment (B1, B2, C1, C2) with bilingual English/Burmese examiner rationales,
 * account persistence, and personalized study pathway integration.
 */

(function(window) {
  'use strict';

  let RAW_BATCHES = [];
  let activeBatchId = 'batch_1';
  let CEFR_DATA = [];
  let userAnswers = {};
  let isSubmitted = false;

  window.initCefrDiagnosticTest = async function(containerId) {
    const targetId = containerId || 'cefrDiagnosticMount';
    const container = document.getElementById(targetId);
    if (!container) return;

    if (!RAW_BATCHES || RAW_BATCHES.length === 0) {
      try {
        const res = await fetch('data/cefr-diagnostic.json');
        if (res.ok) {
          const payload = await res.json();
          if (payload && Array.isArray(payload.batches)) {
            RAW_BATCHES = payload.batches;
          } else if (Array.isArray(payload)) {
            // Backward compatibility
            RAW_BATCHES = [{ id: 'batch_1', name: 'Standard Diagnostic Form', questions: payload }];
          }
        }
      } catch (e) {
        console.warn('[CEFR] fetch fallback error:', e);
      }
    }

    // Determine active batch from profile or storage
    if (typeof appState !== "undefined" && appState && appState.userProfile && appState.userProfile.cefrAssessment) {
      const lastBatch = appState.userProfile.cefrAssessment.batchId;
      if (lastBatch && RAW_BATCHES.some(b => b.id === lastBatch)) {
        activeBatchId = lastBatch;
      }
    }

    syncActiveBatchQuestions();
    window.renderCefrDiagnosticUI(targetId);
  };

  function syncActiveBatchQuestions() {
    const batchObj = RAW_BATCHES.find(b => b.id === activeBatchId) || RAW_BATCHES[0];
    if (batchObj) {
      CEFR_DATA = batchObj.questions || [];
    } else {
      CEFR_DATA = [];
    }
  }

  window.switchCefrBatch = function(batchId, containerId) {
    activeBatchId = batchId;
    userAnswers = {};
    isSubmitted = false;
    syncActiveBatchQuestions();
    window.renderCefrDiagnosticUI(containerId);
  };

  window.selectCefrOption = function(qId, optionVal, containerId) {
    if (isSubmitted) return;
    userAnswers[qId] = optionVal;
    window.renderCefrDiagnosticUI(containerId);
  };

  window.submitCefrTest = function(containerId) {
    isSubmitted = true;
    const answeredCount = Object.keys(userAnswers).length;
    const totalQ = CEFR_DATA.length || 50;

    let score = 0;
    let b1Correct = 0, b2Correct = 0, c1Correct = 0, c2Correct = 0;

    CEFR_DATA.forEach(q => {
      if (userAnswers[q.id] === q.answer) {
        score++;
        if (q.level === 'B1') b1Correct++;
        else if (q.level === 'B2') b2Correct++;
        else if (q.level === 'C1') c1Correct++;
        else if (q.level === 'C2') c2Correct++;
      }
    });

    // Diagnosed Level & IELTS Mapping for 50 questions
    let diagnosedLevel = 'B1 Threshold (Intermediate)';
    let cefrCode = 'B1';
    let projectedBand = 'Band 4.5 - 5.0';
    let levelBadgeColor = '#94A3B8';

    if (score >= 46) {
      diagnosedLevel = 'C2 Mastery (Expert Speaker)';
      cefrCode = 'C2';
      projectedBand = 'Band 8.5 - 9.0';
      levelBadgeColor = '#F59E0B';
    } else if (score >= 36) {
      diagnosedLevel = 'C1 Advanced (Effective Operational)';
      cefrCode = 'C1';
      projectedBand = 'Band 7.0 - 8.0';
      levelBadgeColor = '#10B981';
    } else if (score >= 24) {
      diagnosedLevel = 'B2 Independent (Upper-Intermediate)';
      cefrCode = 'B2';
      projectedBand = 'Band 6.0 - 6.5';
      levelBadgeColor = '#0284C7';
    } else {
      diagnosedLevel = 'B1 Threshold (Intermediate)';
      cefrCode = 'B1';
      projectedBand = 'Band 4.5 - 5.0';
      levelBadgeColor = '#64748B';
    }

    const currentBatchObj = RAW_BATCHES.find(b => b.id === activeBatchId) || { name: 'Diagnostic Batch' };

    const cefrResult = {
      batchId: activeBatchId,
      batchName: currentBatchObj.name,
      score: score,
      total: totalQ,
      accuracy: Math.round((score / totalQ) * 100),
      diagnosedLevel: diagnosedLevel,
      cefrCode: cefrCode,
      projectedBand: projectedBand,
      breakdown: {
        b1: { correct: b1Correct, total: 10 },
        b2: { correct: b2Correct, total: 15 },
        c1: { correct: c1Correct, total: 15 },
        c2: { correct: c2Correct, total: 10 }
      },
      completedAt: new Date().toISOString()
    };

    // Save to appState and userProfile
    if (typeof appState !== "undefined" && appState) {
      if (typeof ensureUserProfileInitialized === "function") {
        ensureUserProfileInitialized();
      }
      if (!appState.userProfile) appState.userProfile = {};
      appState.userProfile.cefrAssessment = cefrResult;

      if (!Array.isArray(appState.userProfile.cefrHistory)) {
        appState.userProfile.cefrHistory = [];
      }
      appState.userProfile.cefrHistory.push(cefrResult);

      if (typeof saveAppState === "function") {
        saveAppState();
      }
      if (typeof window.syncUserDataToCloud === "function") {
        window.syncUserDataToCloud();
      }
    }

    try {
      localStorage.setItem('ips_latest_cefr_assessment', JSON.stringify(cefrResult));
    } catch (e) {}

    // Dispatch global event for live tab updates
    window.dispatchEvent(new CustomEvent('cefrAssessmentUpdated', { detail: cefrResult }));

    window.renderCefrDiagnosticUI(containerId);
    const resultBox = document.getElementById('cefrResultSummary');
    if (resultBox) {
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  window.resetCefrTest = function(containerId) {
    userAnswers = {};
    isSubmitted = false;
    // Auto-advance to next batch for fresh retake
    if (RAW_BATCHES.length > 1) {
      const currentIdx = RAW_BATCHES.findIndex(b => b.id === activeBatchId);
      const nextIdx = (currentIdx + 1) % RAW_BATCHES.length;
      activeBatchId = RAW_BATCHES[nextIdx].id;
      syncActiveBatchQuestions();
    }
    window.renderCefrDiagnosticUI(containerId);
  };

  window.renderCefrDiagnosticUI = function(containerId) {
    const targetId = containerId || 'cefrDiagnosticMount';
    const container = document.getElementById(targetId);
    if (!container) return;

    const answeredCount = Object.keys(userAnswers).length;
    const totalQ = CEFR_DATA.length || 50;
    const currentBatchObj = RAW_BATCHES.find(b => b.id === activeBatchId) || { name: 'Batch 1 (Form Alpha)' };

    let score = 0;
    let b1Correct = 0, b2Correct = 0, c1Correct = 0, c2Correct = 0;

    if (isSubmitted) {
      CEFR_DATA.forEach(q => {
        if (userAnswers[q.id] === q.answer) {
          score++;
          if (q.level === 'B1') b1Correct++;
          else if (q.level === 'B2') b2Correct++;
          else if (q.level === 'C1') c1Correct++;
          else if (q.level === 'C2') c2Correct++;
        }
      });
    }

    // Determine diagnosed level
    let diagnosedLevel = 'B1 Threshold (Intermediate)';
    let cefrCode = 'B1';
    let projectedBand = 'Band 4.5 - 5.0';
    let levelBadgeColor = '#64748B';
    let burmeseAdvice = 'သင့်အဆင့်မှာ B1 Threshold ဖြစ်ပြီး Cambridge IELTS တွင် Band 4.5 - 5.0 ရရှိနိုင်ပါသည်။ အခြေခံသဒ္ဒါ၊ ဝေါဟာရနှင့် Tense များကို ဦးစားပေး လေ့ကျင့်သင့်ပါသည်။';

    if (score >= 46) {
      diagnosedLevel = 'C2 Mastery (Expert Speaker)';
      cefrCode = 'C2';
      projectedBand = 'Band 8.5 - 9.0';
      levelBadgeColor = '#F59E0B';
      burmeseAdvice = 'သင့်အဆင့်မှာ C2 Mastery (Expert Speaker) ဖြစ်ပြီး Cambridge IELTS တွင် Band 8.5 - 9.0 အထိ အမြင့်ဆုံး ရရှိနိုင်ပါသည်။ ပညာရပ်ဆိုင်ရာ သုတေသန ဝေါဟာရများကို ဆက်လက်ထိန်းသိမ်းပါ။';
    } else if (score >= 36) {
      diagnosedLevel = 'C1 Advanced (Effective Operational)';
      cefrCode = 'C1';
      projectedBand = 'Band 7.0 - 8.0';
      levelBadgeColor = '#10B981';
      burmeseAdvice = 'သင့်အဆင့်မှာ C1 Advanced ဖြစ်ပြီး Cambridge IELTS တွင် Band 7.0 - 8.0 ရရှိနိုင်ပါသည်။ C2 ဝေါဟာရများနှင့် အဆင့်မြင့် Inversion များကို လေ့ကျင့်ပါက Band 8.5+ သို့ အလွယ်တကူ တက်လှမ်းနိုင်ပါသည်။';
    } else if (score >= 24) {
      diagnosedLevel = 'B2 Independent (Upper-Intermediate)';
      cefrCode = 'B2';
      projectedBand = 'Band 6.0 - 6.5';
      levelBadgeColor = '#0284C7';
      burmeseAdvice = 'သင့်အဆင့်မှာ B2 Independent ဖြစ်ပြီး Cambridge IELTS တွင် Band 6.0 - 6.5 ရရှိနိုင်ပါသည်။ C1 Academic Collocations နှင့် Conditionals များကို အဓိကထား လေ့ကျင့်ရန် လိုအပ်ပါသည်။';
    }

    container.innerHTML = `
      <div class="occ-card" style="padding:22px; border-radius:12px; background:var(--bg-card); border:1.5px solid var(--border); box-shadow:0 6px 24px rgba(0,0,0,0.15);">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
              <span class="occ-ver-pill" style="background:#0284C7; color:#FFF; font-weight:800; font-size:0.72rem; padding:3px 8px; border-radius:4px;">CAMBRIDGE CEFR ASSESSMENT</span>
              <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:600;">50-Question Calibrated Diagnostic</span>
            </div>
            <h3 style="margin:0; font-size:1.25rem; font-weight:800; color:var(--text);">Cambridge Diagnostic Level Placement Test</h3>
            <div style="font-size:0.82rem; color:var(--text-secondary); margin-top:4px;">
              50 questions testing grammatical precision, advanced inversion, and academic collocation across B1, B2, C1, and C2 levels.
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.75rem; color:var(--text-secondary); font-weight:700;">COMPLETED</div>
            <div style="font-size:1.35rem; font-weight:900; color:var(--accent); font-family:monospace;">${answeredCount} / ${totalQ}</div>
          </div>
        </div>

        <!-- Batch Selector Bar -->
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:10px 14px; background:var(--bg); border:1px solid var(--border); border-radius:8px; margin-bottom:16px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.78rem; font-weight:700; color:var(--text-secondary);">TEST FORM:</span>
            <select onchange="window.switchCefrBatch(this.value, '${targetId}')" style="background:var(--bg-card); color:var(--text); border:1px solid var(--border); border-radius:6px; padding:4px 10px; font-size:0.8rem; font-weight:700; cursor:pointer;" ${isSubmitted ? 'disabled' : ''}>
              ${RAW_BATCHES.map((b, idx) => `
                <option value="${b.id}" ${b.id === activeBatchId ? 'selected' : ''}>Batch ${idx + 1}: ${b.name}</option>
              `).join('')}
            </select>
          </div>
          <div style="font-size:0.76rem; color:var(--text-secondary); font-weight:600;">
            Stratified: 10 B1 · 15 B2 · 15 C1 · 10 C2
          </div>
        </div>

        <!-- Progress Bar -->
        <div style="width:100%; height:6px; background:var(--border); border-radius:3px; overflow:hidden; margin-bottom:20px;">
          <div style="width:${(answeredCount/totalQ)*100}%; height:100%; background:var(--accent); transition:width 0.3s ease;"></div>
        </div>

        <!-- Result Summary Box (Shown after submission) -->
        ${isSubmitted ? `
          <div id="cefrResultSummary" style="padding:20px; background:var(--bg); border:2px solid ${levelBadgeColor}; border-radius:12px; margin-bottom:24px; box-shadow:0 4px 16px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
              <div>
                <span class="occ-ver-pill" style="background:${levelBadgeColor}; color:#FFF; font-weight:900; font-size:0.75rem; padding:5px 12px; border-radius:6px;">DIAGNOSED LEVEL: ${diagnosedLevel}</span>
                <h4 style="margin:10px 0 6px 0; font-size:1.25rem; font-weight:800; color:var(--text);">Projected IELTS Score: ${projectedBand}</h4>
                <div class="burmese" style="font-size:0.86rem; color:var(--text-secondary); line-height:1.5;">
                  ${burmeseAdvice}
                </div>
              </div>
              <div style="text-align:center; padding:12px 22px; background:var(--bg-card); border:1px solid var(--border); border-radius:10px; min-width:140px;">
                <div style="font-size:0.72rem; color:var(--text-secondary); font-weight:700;">OVERALL SCORE</div>
                <div style="font-size:2rem; font-weight:900; color:${levelBadgeColor}; font-family:monospace;">${score} / ${totalQ}</div>
                <div style="font-size:0.78rem; font-weight:700; color:var(--text-secondary);">${Math.round((score/totalQ)*100)}% Accuracy</div>
              </div>
            </div>

            <!-- Tier breakdown -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-top:16px; padding-top:14px; border-top:1px dashed var(--border);">
              <div style="text-align:center; font-size:0.8rem; background:var(--bg-card); padding:8px; border-radius:6px; border:1px solid var(--border);">
                <div style="color:var(--text-secondary);">B1 Level (1–10)</div>
                <strong style="color:${b1Correct >= 8 ? '#10B981' : '#EF4444'}; font-size:1rem;">${b1Correct} / 10</strong>
              </div>
              <div style="text-align:center; font-size:0.8rem; background:var(--bg-card); padding:8px; border-radius:6px; border:1px solid var(--border);">
                <div style="color:var(--text-secondary);">B2 Level (11–25)</div>
                <strong style="color:${b2Correct >= 12 ? '#10B981' : '#EF4444'}; font-size:1rem;">${b2Correct} / 15</strong>
              </div>
              <div style="text-align:center; font-size:0.8rem; background:var(--bg-card); padding:8px; border-radius:6px; border:1px solid var(--border);">
                <div style="color:var(--text-secondary);">C1 Level (26–40)</div>
                <strong style="color:${c1Correct >= 12 ? '#10B981' : '#EF4444'}; font-size:1rem;">${c1Correct} / 15</strong>
              </div>
              <div style="text-align:center; font-size:0.8rem; background:var(--bg-card); padding:8px; border-radius:6px; border:1px solid var(--border);">
                <div style="color:var(--text-secondary);">C2 Level (41–50)</div>
                <strong style="color:${c2Correct >= 8 ? '#10B981' : '#EF4444'}; font-size:1rem;">${c2Correct} / 10</strong>
              </div>
            </div>

            <!-- Action shortcuts to Home and Lexicon -->
            <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:16px; padding-top:14px; border-top:1px solid var(--border);">
              <button class="btn-accent-solid" onclick="switchView('lexicon'); if (typeof window.filterLexiconByCefrLevel === 'function') window.filterLexiconByCefrLevel('${cefrCode}');" style="padding:8px 16px; font-size:0.82rem; font-weight:800; border-radius:6px;">
                🎯 View Personalized ${cefrCode} Lexicons →
              </button>
              <button class="btn-outlined" onclick="switchView('overview');" style="padding:8px 16px; font-size:0.82rem; font-weight:700; border-radius:6px;">
                🏠 Back to Home Dashboard
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Question Grid -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          ${CEFR_DATA.map((q, idx) => {
            const isAnswered = !!userAnswers[q.id];
            const chosen = userAnswers[q.id];
            const isCorrect = isSubmitted && chosen === q.answer;
            const isIncorrect = isSubmitted && chosen && chosen !== q.answer;

            let cardBorder = '1px solid var(--border)';
            if (isSubmitted) {
              cardBorder = isCorrect ? '1.5px solid #10B981' : '1.5px solid #EF4444';
            }

            return `
              <div style="padding:16px; background:var(--bg); border:${cardBorder}; border-radius:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:0.72rem; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">
                    Question ${idx + 1} of ${totalQ} · <span style="color:var(--accent); font-weight:900;">${q.level} Level</span> · <span style="color:var(--text-muted);">${q.category || ''}</span>
                  </span>
                  ${isSubmitted ? `
                    <span style="font-size:0.75rem; font-weight:800; color:${isCorrect ? '#10B981' : '#EF4444'};">
                      ${isCorrect ? '<svg class="ui-icon ui-icon-xs" style="color:#10B981; display:inline-block; vertical-align:-2px;"><use href="#lucide-check"/></svg> CORRECT' : '<svg class="ui-icon ui-icon-xs" style="color:#EF4444; display:inline-block; vertical-align:-2px;"><use href="#lucide-x"/></svg> INCORRECT'}
                    </span>
                  ` : ''}
                </div>

                <div style="font-size:0.95rem; font-weight:700; color:var(--text); line-height:1.45; margin-bottom:12px;">
                  ${q.question}
                </div>

                <!-- Options -->
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px;">
                  ${q.options.map(opt => {
                    const isSelected = chosen === opt;
                    let optBg = 'var(--bg-card)';
                    let optBorder = '1px solid var(--border)';
                    let optColor = 'var(--text)';

                    if (isSelected) {
                      optBg = 'rgba(224, 108, 53, 0.12)';
                      optBorder = '1.5px solid var(--accent)';
                      optColor = 'var(--accent)';
                    }
                    if (isSubmitted) {
                      if (opt === q.answer) {
                        optBg = 'rgba(16, 185, 129, 0.15)';
                        optBorder = '1.5px solid #10B981';
                        optColor = '#10B981';
                      } else if (isSelected && opt !== q.answer) {
                        optBg = 'rgba(239, 68, 68, 0.15)';
                        optBorder = '1.5px solid #EF4444';
                        optColor = '#EF4444';
                      }
                    }

                    return `
                      <button type="button" 
                        onclick="window.selectCefrOption('${q.id}', '${opt.replace(/'/g, "\\'")}', '${targetId}')"
                        style="padding:10px 14px; text-align:left; background:${optBg}; border:${optBorder}; border-radius:6px; font-size:0.88rem; font-weight:700; color:${optColor}; cursor:${isSubmitted ? 'default' : 'pointer'}; display:flex; align-items:center; justify-content:space-between; transition:all 0.15s ease;"
                        ${isSubmitted ? 'disabled' : ''}>
                        <span>${opt}</span>
                        ${isSelected ? '<span style="font-size:0.8rem;">●</span>' : '<span style="opacity:0.3; font-size:0.8rem;">○</span>'}
                      </button>
                    `;
                  }).join('')}
                </div>

                <!-- Explanation (Shown after submit) -->
                ${isSubmitted ? `
                  <div style="margin-top:12px; padding:10px 12px; background:rgba(0,0,0,0.03); border-radius:6px; border-left:3px solid ${isCorrect ? '#10B981' : '#EF4444'};">
                    <div style="font-size:0.75rem; font-weight:800; color:var(--text-secondary); margin-bottom:2px;">EXAMINER RATIONALE // သုံးသပ်ချက်:</div>
                    <div style="font-size:0.82rem; color:var(--text); line-height:1.5;">${q.rationale}</div>
                    <div class="burmese" style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">${q.rationaleMm}</div>
                  </div>
                ` : ''}

              </div>
            `;
          }).join('')}
        </div>

        <!-- Action Controls -->
        <div style="margin-top:22px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding-top:16px; border-top:1px solid var(--border);">
          <div style="font-size:0.8rem; color:var(--text-secondary);">
            ${isSubmitted ? `Test completed! Score: ${score}/${totalQ}` : `Answer all questions to compute your CEFR placement.`}
          </div>
          <div style="display:flex; gap:8px;">
            ${isSubmitted ? `
              <button class="btn-outlined" onclick="window.resetCefrTest('${targetId}')" style="padding:8px 16px; font-size:0.82rem; font-weight:700;">
                <svg class="ui-icon ui-icon-xs"><use href="#lucide-refresh-cw"/></svg> Retake with Next Batch
              </button>
            ` : `
              <button class="btn-accent-solid" onclick="window.submitCefrTest('${targetId}')" style="padding:10px 24px; font-size:0.88rem; font-weight:800;" ${answeredCount < totalQ ? 'title="You can submit now, or answer remaining questions"' : ''}>
                <svg class="ui-icon ui-icon-xs"><use href="#lucide-check-circle"/></svg> Submit &amp; Diagnose Level
              </button>
            `}
          </div>
        </div>

      </div>
    `;
  };

})(window);
