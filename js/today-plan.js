/**
 * today-plan.js - IELTS Prep Studio Adaptive 25-Minute Daily Session Engine
 * Evaluates Cambridge 4-Axis radar, Spaced Repetition (SRS) dues, Mistake Notebook,
 * and exam countdown to prescribe a focused, high-ROI 25-minute daily study circuit.
 * OpenDesign / Bento Card architecture • Zero raw emojis • 100% Client-Side Reactive
 */

(function(window) {
  'use strict';

  function getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getTodayPlanState() {
    if (!window.appState) return { date: getTodayDateString(), completedTasks: [] };
    if (!window.appState.todayPlan || typeof window.appState.todayPlan !== 'object') {
      window.appState.todayPlan = { date: getTodayDateString(), completedTasks: [] };
    }
    const todayStr = getTodayDateString();
    if (window.appState.todayPlan.date !== todayStr) {
      // New day -> initialize clean plan state
      window.appState.todayPlan = {
        date: todayStr,
        completedTasks: []
      };
      if (typeof window.saveAppState === 'function') window.saveAppState();
    }
    return window.appState.todayPlan;
  }

  window.buildTodayPlan = function() {
    const todayStr = getTodayDateString();
    const planState = getTodayPlanState();
    const completed = new Set(planState.completedTasks || []);

    // 1. Telemetry: SRS Due Vocab
    const dueIds = typeof window.getDueSRSWordIds === 'function' ? window.getDueSRSWordIds() : [];
    const dueCount = dueIds.length;

    // 2. Telemetry: Cambridge 4-Axis Radar Weakest Link
    let lowestAxis = { key: 'gra', label: 'Grammar', fullTitle: 'Grammatical Range & Accuracy', band: 6.0 };
    if (typeof window.getCambridge4AxisScores === 'function') {
      const axes = window.getCambridge4AxisScores();
      if (Array.isArray(axes) && axes.length) {
        lowestAxis = axes.reduce((prev, curr) => (prev.band < curr.band ? prev : curr), axes[0]);
      }
    }

    // 3. Telemetry: Mistake Log
    const errorLogs = (window.appState && Array.isArray(window.appState.errorLog)) ? window.appState.errorLog : [];
    const errorCount = errorLogs.length;

    // 4. Telemetry: Exam Countdown
    let daysRemaining = 30;
    let targetBand = '7.5+';
    if (typeof window.getExamCountdownData === 'function') {
      const ed = window.getExamCountdownData();
      daysRemaining = ed.daysRemaining || 30;
      targetBand = ed.targetBand || '7.5+';
    }

    // Build Weak-Spot Drill Task by Lowest Cambridge Axis
    let weakSpotTask = {
      id: 'task_weakspot',
      category: 'weakspot',
      durationMinutes: 10,
      icon: 'lucide-sparkles',
      actionKey: 'surgery',
      badge: '10 MIN FOCUS',
      title: 'Grammar Surgery: Negative Inversions & Clefts',
      desc: `Your lowest Cambridge axis is ${lowestAxis.label} (Band ${lowestAxis.band}). Transform 3 simple clauses into Band 9 inverted structures.`
    };

    if (lowestAxis.key === 'lr') {
      weakSpotTask = {
        id: 'task_weakspot',
        category: 'weakspot',
        durationMinutes: 10,
        icon: 'lucide-sparkles',
        actionKey: 'collocations',
        badge: '10 MIN FOCUS',
        title: 'Lexical Resource: Band 8.5+ Academic Collocations',
        desc: `Targeting Lexical Resource (Band ${lowestAxis.band}). Master 5 topic-specific C1/C2 collocations to eradicate vague phrasing.`
      };
    } else if (lowestAxis.key === 'tacc') {
      weakSpotTask = {
        id: 'task_weakspot',
        category: 'weakspot',
        durationMinutes: 10,
        icon: 'lucide-sparkles',
        actionKey: 'matrix',
        badge: '10 MIN FOCUS',
        title: 'Task Achievement: 12-Theme Argument Matrix Thesis',
        desc: `Targeting Task Cohesion (Band ${lowestAxis.band}). Study high-scoring concession statements ('Notwithstanding...') across Core Themes.`
      };
    } else if (lowestAxis.key === 'receptive') {
      weakSpotTask = {
        id: 'task_weakspot',
        category: 'weakspot',
        durationMinutes: 10,
        icon: 'lucide-sparkles',
        actionKey: 'tfng',
        badge: '10 MIN FOCUS',
        title: 'Receptive Mastery: True / False / Not Given Arbiter',
        desc: `Targeting Reading & Listening accuracy (Band ${lowestAxis.band}). Apply the 3-step decision tree to resolve Cambridge trap scenarios.`
      };
    }

    // Build Task List (Total: 25 Minutes)
    const tasks = [
      {
        id: 'task_srs',
        category: 'srs',
        durationMinutes: 5,
        icon: 'lucide-refresh-cw',
        actionKey: 'srs',
        badge: '5 MIN DRILL',
        title: dueCount > 0 
          ? `SRS Review: ${dueCount} Vocab Cards Due Today` 
          : 'SRS Flash Review: 5 High-Yield Lexicon Cards',
        desc: dueCount > 0 
          ? `Spaced Repetition interval has matured for ${dueCount} words. Review now to lock them into active recall.` 
          : 'Zero overdue cards! Drill 5 advanced C1/C2 words to maintain long-term memory strength.'
      },
      weakSpotTask,
      {
        id: 'task_mistakes',
        category: 'mistakes',
        durationMinutes: 5,
        icon: 'lucide-triangle-alert',
        actionKey: 'mistakes',
        badge: '5 MIN AUTOPSY',
        title: errorCount > 0
          ? `Mistake Notebook: Review ${errorCount} Logged Traps`
          : 'Trap X-Ray: Band 6 Cliche & Penalty Scan',
        desc: errorCount > 0
          ? `Perform active error autopsies on your ${errorCount} missed questions to ensure you never repeat them on test day.`
          : 'No unresolved errors! Run Band-6 Trap X-Ray to check your writing drafts for informal traps and dead cliches.'
      },
      {
        id: 'task_velocity',
        category: 'velocity',
        durationMinutes: 5,
        icon: 'lucide-timer',
        actionKey: daysRemaining <= 14 ? 'countdown' : 'lifeline',
        badge: '5 MIN SPRINT',
        title: daysRemaining <= 14
          ? `High-Stakes Countdown (${daysRemaining}d to Exam): Timed Sprint`
          : 'Speaking Part 2: PPF Guided Mind-Map Drill',
        desc: daysRemaining <= 14
          ? `Exam is in ${daysRemaining} days! Run a 5-minute timed response sprint to lock in high pacing and fluency under pressure.`
          : 'Practice the 60-second Past-Present-Future structure to speak continuously without hesitation or silence.'
      }
    ];

    // Compute metrics
    const totalMinutes = tasks.reduce((sum, t) => sum + t.durationMinutes, 0);
    const completedCount = tasks.filter(t => completed.has(t.id)).length;
    const progressPct = Math.round((completedCount / tasks.length) * 100);
    const minutesRemaining = tasks
      .filter(t => !completed.has(t.id))
      .reduce((sum, t) => sum + t.durationMinutes, 0);

    return {
      date: todayStr,
      targetBand,
      daysRemaining,
      lowestAxis,
      totalMinutes,
      completedCount,
      totalCount: tasks.length,
      progressPct,
      minutesRemaining,
      isCompleted: completedCount === tasks.length,
      tasks: tasks.map(t => ({
        ...t,
        isDone: completed.has(t.id)
      }))
    };
  };

  window.toggleTodayPlanTask = function(taskId) {
    const planState = getTodayPlanState();
    const set = new Set(planState.completedTasks || []);
    if (set.has(taskId)) {
      set.delete(taskId);
    } else {
      set.add(taskId);
    }
    planState.completedTasks = Array.from(set);

    if (typeof window.saveAppState === 'function') {
      window.saveAppState();
    }

    // Refresh UI
    window.renderTodayPlanCard('todayPlanMount');

    // Trigger celebration if all tasks done
    if (set.size >= 4) {
      if (typeof window.triggerStudyCelebration === 'function') {
        window.triggerStudyCelebration();
      }
    }
  };

  window.launchTodayTask = function(category, actionKey, taskId) {
    // If taskId is provided, optionally mark it in progress or done
    if (taskId) {
      const planState = getTodayPlanState();
      const set = new Set(planState.completedTasks || []);
      if (!set.has(taskId)) {
        set.add(taskId);
        planState.completedTasks = Array.from(set);
        if (typeof window.saveAppState === 'function') window.saveAppState();
        window.renderTodayPlanCard('todayPlanMount');
      }
    }

    const navTo = function(view) {
      if (typeof window.switchView === 'function') window.switchView(view);
      else if (typeof window.switchTab === 'function') window.switchTab(view);
    };

    if (category === 'srs') {
      if (typeof window.jumpToDueSRS === 'function') {
        window.jumpToDueSRS();
      } else {
        navTo('lexicon');
      }
    } else if (category === 'weakspot') {
      if (actionKey === 'surgery') {
        navTo('tools');
        if (typeof window.switchAcademicToolsTab === 'function') window.switchAcademicToolsTab('surgery');
      } else if (actionKey === 'collocations') {
        navTo('tools');
        if (typeof window.switchAcademicToolsTab === 'function') window.switchAcademicToolsTab('collocations');
      } else if (actionKey === 'matrix') {
        navTo('tools');
        if (typeof window.switchAcademicToolsTab === 'function') window.switchAcademicToolsTab('matrix');
      } else if (actionKey === 'tfng') {
        navTo('reading');
        if (typeof window.switchSubTab === 'function') window.switchSubTab('reading', 'tfng');
        if (typeof window.renderTfngArbiterPanel === 'function') window.renderTfngArbiterPanel('tfngArbiterContainer');
      } else {
        navTo('tools');
      }
    } else if (category === 'mistakes') {
      if (actionKey === 'mistakes') {
        if (typeof window.openErrorLogModal === 'function') {
          window.openErrorLogModal();
        } else {
          navTo('home');
        }
      } else {
        navTo('tools');
        if (typeof window.switchAcademicToolsTab === 'function') window.switchAcademicToolsTab('trapxray');
      }
    } else if (category === 'velocity') {
      if (actionKey === 'countdown') {
        navTo('writing');
      } else {
        navTo('speaking');
        if (typeof window.toggleCueCardLifeline === 'function') window.toggleCueCardLifeline(true);
      }
    }
  };

  window.renderTodayPlanCard = function(containerId) {
    const container = document.getElementById(containerId || 'todayPlanMount');
    if (!container) return;

    const plan = window.buildTodayPlan();
    const isAllDone = plan.isCompleted;

    container.innerHTML = `
      <div class="today-plan-bento-card" style="background:var(--bg-card); border:1px solid ${isAllDone ? 'rgba(16,185,129,0.35)' : 'var(--border)'}; border-radius:14px; padding:18px 20px; margin-bottom:16px; box-shadow:0 4px 20px -2px rgba(0,0,0,0.04); position:relative; overflow:hidden;">
        <!-- Accent Top Bar -->
        <div style="position:absolute; top:0; left:0; right:0; height:4px; background:${isAllDone ? 'linear-gradient(90deg, #10B981, #059669)' : 'linear-gradient(90deg, #D97706, #2563EB)'};"></div>

        <!-- Header Row -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:12px; padding-top:4px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="occ-ver-pill" style="background:${isAllDone ? '#10B981' : '#D97706'}; color:#FFF; font-weight:800; font-size:0.68rem; letter-spacing:0.06em; padding:3px 8px; border-radius:4px;">
                ${isAllDone ? 'SESSION COMPLETE' : "TODAY'S 25-MIN SPRINT"}
              </span>
              <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:600;">
                ${escapeHtml(plan.date)} • Target Band ${escapeHtml(plan.targetBand)}
              </span>
            </div>
            <h3 style="margin:0; font-size:1.1rem; font-weight:800; color:var(--text); letter-spacing:-0.01em;">
              ${isAllDone ? 'All 4 Drills Conquered Today!' : 'Adaptive Daily Workout Circuit'}
            </h3>
          </div>

          <div style="text-align:right;">
            <div style="display:inline-flex; align-items:center; gap:6px; background:var(--well, rgba(0,0,0,0.03)); padding:4px 10px; border-radius:8px; border:1px solid var(--border);">
              <svg class="ui-icon ui-icon-xs" style="color:${isAllDone ? '#10B981' : 'var(--accent)'};"><use href="#${isAllDone ? 'lucide-trophy' : 'lucide-timer'}"/></svg>
              <strong style="font-size:0.82rem; color:var(--text);">
                ${isAllDone ? '25 mins banked' : `${plan.minutesRemaining} mins remaining`}
              </strong>
            </div>
          </div>
        </div>

        <!-- Progress Overview -->
        <div style="margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-secondary); margin-bottom:5px;">
            <span><strong>${plan.completedCount} of ${plan.totalCount} drills</strong> checked off</span>
            <span style="font-weight:700; color:${isAllDone ? '#10B981' : '#D97706'};">${plan.progressPct}%</span>
          </div>
          <div style="height:7px; background:rgba(0,0,0,0.06); border-radius:999px; overflow:hidden;">
            <div style="width:${plan.progressPct}%; height:100%; background:${isAllDone ? 'linear-gradient(90deg, #10B981, #059669)' : 'linear-gradient(90deg, #D97706, #10B981)'}; transition:width 0.4s ease;"></div>
          </div>
        </div>

        <!-- Task List -->
        <div style="display:grid; gap:8px;">
          ${plan.tasks.map((task, idx) => `
            <div class="today-task-row" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px; background:${task.isDone ? 'rgba(16,185,129,0.04)' : 'var(--bg)'}; border:1px solid ${task.isDone ? 'rgba(16,185,129,0.25)' : 'var(--border)'}; border-radius:8px; transition:all 0.2s ease;">
              <!-- Left: Checkbox & Info -->
              <div style="display:flex; align-items:flex-start; gap:10px; flex:1; min-width:0;">
                <button 
                  onclick="window.toggleTodayPlanTask('${task.id}')"
                  style="cursor:pointer; background:${task.isDone ? '#10B981' : 'transparent'}; border:2px solid ${task.isDone ? '#10B981' : 'var(--border)'}; border-radius:6px; width:22px; height:22px; min-width:22px; display:flex; align-items:center; justify-content:center; color:#FFF; margin-top:2px; padding:0;"
                  title="${task.isDone ? 'Mark as incomplete' : 'Mark as done'}"
                >
                  ${task.isDone ? '<svg class="ui-icon ui-icon-xs" style="stroke-width:3;"><use href="#lucide-check"/></svg>' : ''}
                </button>

                <div style="min-width:0; flex:1;">
                  <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:2px;">
                    <span class="occ-ver-pill" style="font-size:0.62rem; padding:1px 6px; font-weight:800; border-radius:4px; background:rgba(0,0,0,0.04); color:var(--text-secondary); border:1px solid var(--border);">
                      ${escapeHtml(task.badge)}
                    </span>
                    <strong style="font-size:0.84rem; color:${task.isDone ? 'var(--text-secondary)' : 'var(--text)'}; text-decoration:${task.isDone ? 'line-through' : 'none'};">
                      ${idx + 1}. ${escapeHtml(task.title)}
                    </strong>
                  </div>
                  <div style="font-size:0.75rem; color:var(--text-secondary); line-height:1.4; white-space:normal;">
                    ${escapeHtml(task.desc)}
                  </div>
                </div>
              </div>

              <!-- Right: 1-Tap Action Button -->
              <div style="flex-shrink:0;">
                <button 
                  class="${task.isDone ? 'btn-outlined' : 'btn-accent-solid'}" 
                  style="padding:5px 12px; font-size:0.74rem; font-weight:700; border-radius:6px; white-space:nowrap; display:inline-flex; align-items:center; gap:5px;"
                  onclick="window.launchTodayTask('${task.category}', '${task.actionKey}', '${task.id}')"
                >
                  <span>${task.isDone ? 'Review' : 'Start'}</span>
                  <svg class="ui-icon ui-icon-xs"><use href="#lucide-arrow-up-right"/></svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Footer / Encouragement -->
        <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; font-size:0.74rem; color:var(--text-secondary);">
          <div style="display:flex; align-items:center; gap:6px;">
            <svg class="ui-icon ui-icon-xs" style="color:#D97706;"><use href="#lucide-flame"/></svg>
            <span>Completing all 4 drills maintains your study streak and guarantees steady Cambridge score gains.</span>
          </div>
          <button 
            class="btn-text-subtle" 
            style="font-size:0.72rem; color:var(--text-secondary); padding:2px 6px; cursor:pointer;"
            onclick="window.renderTodayPlanCard('todayPlanMount')"
          >
            Refresh Telemetry
          </button>
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
