/**
 * IELTS Prep Studio - CEFR 20-Question Diagnostic Placement Test
 * Tests B1, B2, C1, and C2 English proficiency with instant Band score calculation
 * and bilingual English/Burmese rationales.
 */

(function(window) {
  'use strict';

  let CEFR_DATA = [];
  let userAnswers = {};
  let isSubmitted = false;

  window.initCefrDiagnosticTest = async function(containerId) {
    const targetId = containerId || 'cefrDiagnosticMount';
    const container = document.getElementById(targetId);
    if (!container) return;

    if (!CEFR_DATA || CEFR_DATA.length === 0) {
      try {
        const res = await fetch('data/cefr-diagnostic.json');
        if (res.ok) {
          CEFR_DATA = await res.json();
        }
      } catch (e) {
        console.warn('[CEFR] fetch fallback error:', e);
      }
    }

    window.renderCefrDiagnosticUI(targetId);
  };

  window.selectCefrOption = function(qId, optionVal, containerId) {
    if (isSubmitted) return;
    userAnswers[qId] = optionVal;
    window.renderCefrDiagnosticUI(containerId);
  };

  window.submitCefrTest = function(containerId) {
    isSubmitted = true;
    window.renderCefrDiagnosticUI(containerId);
    const resultBox = document.getElementById('cefrResultSummary');
    if (resultBox) {
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  window.resetCefrTest = function(containerId) {
    userAnswers = {};
    isSubmitted = false;
    window.renderCefrDiagnosticUI(containerId);
  };

  window.renderCefrDiagnosticUI = function(containerId) {
    const targetId = containerId || 'cefrDiagnosticMount';
    const container = document.getElementById(targetId);
    if (!container) return;

    const answeredCount = Object.keys(userAnswers).length;
    const totalQ = CEFR_DATA.length || 20;

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
    let diagnosedLevel = 'B1 Competent';
    let projectedBand = 'Band 5.0 - 5.5';
    let levelBadgeColor = '#0284C7';

    if (score >= 18) {
      diagnosedLevel = 'C2 Mastery (Expert Speaker)';
      projectedBand = 'Band 8.5 - 9.0';
      levelBadgeColor = '#F59E0B';
    } else if (score >= 14) {
      diagnosedLevel = 'C1 Advanced (Effective Operational)';
      projectedBand = 'Band 7.0 - 8.0';
      levelBadgeColor = '#10B981';
    } else if (score >= 9) {
      diagnosedLevel = 'B2 Independent (Upper-Intermediate)';
      projectedBand = 'Band 6.0 - 6.5';
      levelBadgeColor = '#0284C7';
    } else {
      diagnosedLevel = 'B1 Threshold (Intermediate)';
      projectedBand = 'Band 4.5 - 5.0';
      levelBadgeColor = '#94A3B8';
    }

    container.innerHTML = `
      <div class="occ-card" style="padding:22px; border-radius:12px; background:var(--bg-card); border:1.5px solid var(--border); box-shadow:0 6px 24px rgba(0,0,0,0.15);">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="occ-ver-pill" style="background:#0284C7; color:#FFF; font-weight:800; font-size:0.72rem; padding:3px 8px; border-radius:4px;">CEFR PLACEMENT</span>
              <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:600;">2-Minute English Level Diagnostic</span>
            </div>
            <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:var(--text);">Cambridge Diagnostic Level Placement Test</h3>
            <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">
              20 questions testing key vocabulary and grammatical precision across B1, B2, C1, and C2 levels.
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.75rem; color:var(--text-secondary); font-weight:700;">COMPLETED</div>
            <div style="font-size:1.2rem; font-weight:900; color:var(--accent); font-family:monospace;">${answeredCount} / ${totalQ}</div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div style="width:100%; height:6px; background:var(--border); border-radius:3px; overflow:hidden; margin-bottom:20px;">
          <div style="width:${(answeredCount/totalQ)*100}%; height:100%; background:var(--accent); transition:width 0.3s ease;"></div>
        </div>

        <!-- Result Summary Box (Shown after submission) -->
        ${isSubmitted ? `
          <div id="cefrResultSummary" style="padding:18px; background:var(--bg); border:2px solid ${levelBadgeColor}; border-radius:10px; margin-bottom:22px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <div>
                <span class="occ-ver-pill" style="background:${levelBadgeColor}; color:#FFF; font-weight:900; font-size:0.75rem; padding:4px 10px; border-radius:6px;">DIAGNOSED LEVEL: ${diagnosedLevel}</span>
                <h4 style="margin:8px 0 4px 0; font-size:1.1rem; font-weight:800; color:var(--text);">Projected IELTS Score: ${projectedBand}</h4>
                <div class="burmese" style="font-size:0.84rem; color:var(--text-secondary);">
                  သင့်အဆင့်မှာ ${diagnosedLevel} ဖြစ်ပြီး အောင်မြင်နိုင်သော IELTS ရမှတ်မှာ ${projectedBand} ဖြစ်ပါသည်။
                </div>
              </div>
              <div style="text-align:center; padding:10px 18px; background:var(--bg-card); border:1px solid var(--border); border-radius:8px;">
                <div style="font-size:0.7rem; color:var(--text-secondary); font-weight:700;">OVERALL SCORE</div>
                <div style="font-size:1.8rem; font-weight:900; color:${levelBadgeColor}; font-family:monospace;">${score} / ${totalQ}</div>
                <div style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">${Math.round((score/totalQ)*100)}% Accuracy</div>
              </div>
            </div>

            <!-- Tier breakdown -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; margin-top:14px; padding-top:12px; border-top:1px dashed var(--border);">
              <div style="text-align:center; font-size:0.78rem;">
                <div style="color:var(--text-secondary);">B1 Level (1–5)</div>
                <strong style="color:${b1Correct >= 4 ? '#10B981' : '#EF4444'};">${b1Correct} / 5</strong>
              </div>
              <div style="text-align:center; font-size:0.78rem;">
                <div style="color:var(--text-secondary);">B2 Level (6–10)</div>
                <strong style="color:${b2Correct >= 4 ? '#10B981' : '#EF4444'};">${b2Correct} / 5</strong>
              </div>
              <div style="text-align:center; font-size:0.78rem;">
                <div style="color:var(--text-secondary);">C1 Level (11–15)</div>
                <strong style="color:${c1Correct >= 4 ? '#10B981' : '#EF4444'};">${c1Correct} / 5</strong>
              </div>
              <div style="text-align:center; font-size:0.78rem;">
                <div style="color:var(--text-secondary);">C2 Level (16–20)</div>
                <strong style="color:${c2Correct >= 4 ? '#10B981' : '#EF4444'};">${c2Correct} / 5</strong>
              </div>
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
              <div style="padding:14px 16px; background:var(--bg); border:${cardBorder}; border-radius:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:0.72rem; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">
                    Question ${idx + 1} of ${totalQ} · <span style="color:var(--accent);">${q.level} Level</span>
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
            ${isSubmitted ? `Test completed! Score: ${score}/20` : `Answer all questions to compute your CEFR placement.`}
          </div>
          <div style="display:flex; gap:8px;">
            ${isSubmitted ? `
              <button class="btn-outlined" onclick="window.resetCefrTest('${targetId}')" style="padding:8px 16px; font-size:0.82rem; font-weight:700;">
                <svg class="ui-icon ui-icon-xs"><use href="#lucide-refresh-cw"/></svg> Retake Test
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
