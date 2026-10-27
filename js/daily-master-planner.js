/**
 * Band 8.0+ Daily Master Planner Engine
 * IELTS Prep Studio - Academic VIP Suite
 * Hourly Timeboxed Discipline Schedule & Focus Tracker
 */

(function(window) {
  'use strict';

  const PLANNER_SCHEDULE = [
    {
      id: "slot_0600",
      time: "6:00 – 7:00 AM",
      title: "Wake Up, Hydration & Light Morning Routine",
      titleBurmese: "မနက်ခင်း နိုးထခြင်း၊ ရေဓာတ်ဖြည့်တင်းခြင်းနှင့် အာဟာရပြည့် နံနက်စာ",
      category: "ROUTINE",
      color: "#64748B",
      desc: "Awaken early, drink 500ml water, light stretching, and healthy brain breakfast. Prepare study desk.",
      actionLabel: null,
      actionFn: null
    },
    {
      id: "slot_0700",
      time: "7:00 – 8:00 AM",
      title: "1-Hour Academic Podcast & Active Lexical Extraction",
      titleBurmese: "ပေါ့တ်ကတ်စ် နားထောင်ခြင်းနှင့် အသစ်တွေ့ ဝေါဟာရ မှတ်သားခြင်း",
      category: "LISTENING",
      color: "#0284C7",
      desc: "Listen to BBC 6-Minute English, The Guardian Long Read, or NPR Science. Jot down 10 precise idiomatic phrases.",
      actionLabel: "Open Listening Hub",
      actionFn: "activateStudioTab('listening')"
    },
    {
      id: "slot_0800",
      time: "8:00 – 9:00 AM",
      title: "Full Cambridge Academic Listening Mock Test (Sections 1–4)",
      titleBurmese: "ကင်းဘရစ်ဂျ် နားထောင်မှု စာမေးပွဲ အစစ်အမှန် အချိန်ကိုက် ဖြေဆိုခြင်း",
      category: "LISTENING",
      color: "#0284C7",
      desc: "Complete 40 questions under strict exam conditions (30 mins audio + 10 mins transfer). No pauses.",
      actionLabel: "Start Listening Test",
      actionFn: "activateStudioTab('listening')"
    },
    {
      id: "slot_0900",
      time: "9:00 – 10:00 AM",
      title: "Listening Error Audit & Audio Script Dissection",
      titleBurmese: "နားထောင်မှု အမှား ဆန်းစစ်ချက်နှင့် အသံဖိုင် စာသား ပြန်လည်လေ့လာခြင်း",
      category: "ANALYSIS",
      color: "#D97706",
      desc: "Cross-examine missed items against the audioscript. Pinpoint trap distractors, connected speech, or spelling errors.",
      actionLabel: "Review Error Vault",
      actionFn: "switchAcademicToolsTab('vault')"
    },
    {
      id: "slot_1000",
      time: "10:00 – 11:00 AM",
      title: "Mental Recovery, Active Rest & Outdoor Walk",
      titleBurmese: "စိတ်လက် အပန်းဖြေခြင်း၊ လမ်းလျှောက်ခြင်းနှင့် ဦးနှောက် အနားပေးခြင်း",
      category: "REST",
      color: "#10B981",
      desc: "Step away from all screens. 20-minute walk, green tea, light physical movement to reset mental stamina.",
      actionLabel: null,
      actionFn: null
    },
    {
      id: "slot_1100",
      time: "11:00 AM – 12:00 PM",
      title: "1-Page Academic Journal Article Reading & Syntax Analysis",
      titleBurmese: "ပညာရပ်ဆိုင်ရာ ဆောင်းပါး ဖတ်ရှုခြင်းနှင့် သဒ္ဒါဖွဲ့စည်းပုံ ခွဲခြမ်းလေ့လာခြင်း",
      category: "READING",
      color: "#8B5CF6",
      desc: "Read one article from The Economist or National Geographic. Map subject-verb inversion and complex periodic clauses.",
      actionLabel: "Open Reading Hub",
      actionFn: "activateStudioTab('reading')"
    },
    {
      id: "slot_1200",
      time: "12:00 – 1:00 PM",
      title: "Nutritious Lunch & Cognitive Reset",
      titleBurmese: "နေ့လယ်စာ သုံးဆောင်ခြင်းနှင့် စိတ်ကြည်လင်စေရန် အနားယူခြင်း",
      category: "REST",
      color: "#10B981",
      desc: "High-protein, moderate carbohydrate lunch. Avoid heavy sluggish meals to sustain afternoon focus.",
      actionLabel: null,
      actionFn: null
    },
    {
      id: "slot_1300",
      time: "1:00 – 2:00 PM",
      title: "Midday Leisure & Power Nap (20 mins max)",
      titleBurmese: "ကိုယ်ပိုင် အနားယူချိန်နှင့် ဦးနှောက် အားဖြည့် ခဏတာ အိပ်စက်ခြင်း",
      category: "REST",
      color: "#10B981",
      desc: "Deep restoration. 20-min power nap restores prefrontal cortex capacity for intense afternoon testing.",
      actionLabel: null,
      actionFn: null
    },
    {
      id: "slot_1400",
      time: "2:00 – 3:00 PM",
      title: "Full Cambridge Academic Reading Mock Test (Passages 1–3)",
      titleBurmese: "ကင်းဘရစ်ဂျ် ဖတ်ရှုမှု စာမေးပွဲ အစစ်အမှန် အချိန်ကိုက် ဖြေဆိုခြင်း (မိနစ် ၆၀)",
      category: "READING",
      color: "#8B5CF6",
      desc: "Strict 60-minute countdown: 13-13-14 question distribution. Practice rapid scanning, True/False/Not Given traps.",
      actionLabel: "Launch Reading Test",
      actionFn: "activateStudioTab('reading')"
    },
    {
      id: "slot_1500",
      time: "3:00 – 4:00 PM",
      title: "Reading Deep Error Journaling & Keyword Concordance",
      titleBurmese: "ဖတ်ရှုမှု အမှားခွဲခြမ်းစိတ်ဖြာခြင်းနှင့် စာသား သော့ချက်စကားလုံး မှတ်သားခြင်း",
      category: "ANALYSIS",
      color: "#D97706",
      desc: "Record every incorrect question in the Error Vault. Map question stems directly to passage paraphrases.",
      actionLabel: "Log to Error Vault",
      actionFn: "switchAcademicToolsTab('vault')"
    },
    {
      id: "slot_1600",
      time: "4:00 – 5:00 PM",
      title: "500 Academic Words & Collocations Memorization",
      titleBurmese: "အဆင့်မြင့် ပညာရပ် ဝေါဟာရ ၅၀၀ နှင့် တွဲလုံးစကားများ အလွတ်ကျက်မှတ်ခြင်း",
      category: "VOCABULARY",
      color: "#EC4899",
      desc: "Review 25 advanced academic vocabulary entries and 15 collocations. Test retrieval without looking at Burmese gloss.",
      actionLabel: "Open Collocations Bank",
      actionFn: "switchAcademicToolsTab('collocations')"
    },
    {
      id: "slot_1700",
      time: "5:00 – 6:00 PM",
      title: "Band 8.0+ Model Essay Deconstruction (Task 1 & Task 2)",
      titleBurmese: "Band 8.0+ စံပြအက်ဆေး ဖွဲ့စည်းပုံနှင့် သဒ္ဒါအလှည့်အပြောင်း လေ့လာခြင်း",
      category: "WRITING",
      color: "#F59E0B",
      desc: "Deconstruct introduction hooks, body paragraph topic sentences, counterarguments, and cohesive device variety.",
      actionLabel: "Open Writing Models",
      actionFn: "activateStudioTab('writing')"
    },
    {
      id: "slot_1800",
      time: "6:00 – 7:00 PM",
      title: "Full Timed Writing Session (Task 1: 20m + Task 2: 40m)",
      titleBurmese: "အချိန်ကိုက် အက်ဆေး အပြည့်အစုံ ရေးသားလေ့ကျင့်ခြင်း (Task 1 & Task 2)",
      category: "WRITING",
      color: "#F59E0B",
      desc: "Complete 150 words (Task 1 visual overview) and 250+ words (Task 2 argumentative). Run through Band Surgery afterwards.",
      actionLabel: "Open Writing Lab",
      actionFn: "activateStudioTab('writing')"
    },
    {
      id: "slot_1900",
      time: "7:00 – 8:00 PM",
      title: "Speaking Interview Study & Cambridge AI Simulation",
      titleBurmese: "စကားပြော စံပြအင်တာဗျူး လေ့လာခြင်းနှင့် AI ဖြင့် စကားပြော လေ့ကျင့်ခြင်း",
      category: "SPEAKING",
      color: "#06B6D4",
      desc: "Watch 1 high-scoring native/non-native interview. Practice speaking 3 Part 1 topics & 1 Part 2 cue card aloud with timer.",
      actionLabel: "Open Speaking Lab",
      actionFn: "activateStudioTab('speaking')"
    },
    {
      id: "slot_2000",
      time: "8:00 – 9:00 PM",
      title: "Digital Sunset, Error Review & Restorative Sleep Protocol",
      titleBurmese: "ဖုန်း/စခရင် ပိတ်ခြင်း၊ တစ်နေ့တာ အမှားများ ပြန်လည်သုံးသပ်ခြင်းနှင့် အိပ်ရာဝင်ခြင်း",
      category: "ROUTINE",
      color: "#64748B",
      desc: "Review day's flashcards on paper. Screens completely off by 8:45 PM. Prepare bedroom darkness and fresh airflow.",
      actionLabel: null,
      actionFn: null
    }
  ];

  function getTodayKey() {
    const d = new Date();
    return `ips_planner_${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}_${String(d.getDate()).padStart(2, '0')}`;
  }

  function getStoredState() {
    try {
      const raw = localStorage.getItem(getTodayKey());
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse planner state:', e);
    }
    return {
      completedSlots: [],
      goal: "Achieve overall Band 8.0+ by maintaining 100% daily schedule discipline.",
      p1: "Complete Cambridge Reading Mock Test with zero off-task pauses",
      p2: "Write 1 Task 2 Essay using Band 8.5+ Lexical Collocations",
      p3: "Record 1 Full Speaking Part 2 Cue Card under 2-minute timer"
    };
  }

  function saveStoredState(state) {
    try {
      localStorage.setItem(getTodayKey(), JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save planner state:', e);
    }
  }

  window.initDailyMasterPlanner = function(mountId) {
    const mount = document.getElementById(mountId || 'atPlannerMount');
    if (!mount) return;

    const state = getStoredState();
    const completedCount = (state.completedSlots || []).length;
    const totalCount = PLANNER_SCHEDULE.length;
    const pct = Math.round((completedCount / totalCount) * 100);

    mount.innerHTML = `
      <div class="planner-master-card" style="padding:22px; background:var(--bg-card); border:1.5px solid var(--border); border-radius:12px; box-shadow:0 6px 24px rgba(0,0,0,0.06); position:relative;">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
              <span class="occ-ver-pill" style="background:linear-gradient(135deg, #10B981, #059669); color:#FFF; font-weight:900; font-size:0.72rem; padding:3px 8px; border-radius:6px;">CAMBRIDGE DISCIPLINE PROTOCOL</span>
              <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:700;">6:00 AM – 9:00 PM Timeboxed Blueprint</span>
            </div>
            <h3 style="margin:0; font-size:1.25rem; font-weight:800; color:var(--text); line-height:1.3;">
              <svg class="ui-icon" style="color:#10B981;"><use href="#lucide-calendar"/></svg> Band 8.0+ Daily Master Planner
            </h3>
            <p style="margin:4px 0 0 0; font-size:0.82rem; color:var(--text-secondary); line-height:1.5;">
              &ldquo;There is only one road to Band 8.0+ — and that is relentless consistency.&rdquo; (Band 8.0+ သို့ ရောက်ရှိရန် တစ်ခုတည်းသော လမ်းစဉ်မှာ နေ့စဉ်မပြတ် လေ့ကျင့်အားထုတ်ခြင်းသာ ဖြစ်သည်။)
            </p>
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-outlined" style="padding:6px 12px; font-size:0.78rem; font-weight:700;" onclick="window.resetDailyPlannerProgress('${mountId}')">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-rotate-ccw"/></svg> Reset Today
            </button>
            <button class="btn-accent-solid" style="padding:6px 12px; font-size:0.78rem; font-weight:700;" onclick="window.markAllPlannerDone('${mountId}')">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-check-circle"/></svg> Mark All Done
            </button>
          </div>
        </div>

        <!-- Progress Bar -->
        <div style="background:var(--bg); border:1px solid var(--border); border-radius:10px; padding:14px 18px; margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:0.8rem; font-weight:800; color:var(--text); text-transform:uppercase; letter-spacing:0.04em;">Today's Schedule Execution:</span>
            <span id="plannerProgressBadge" style="font-size:0.95rem; font-weight:900; color:${pct === 100 ? '#10B981' : 'var(--accent)'}; font-family:monospace;">
              ${completedCount} / ${totalCount} Blocks (${pct}%)
            </span>
          </div>
          <div style="height:10px; background:rgba(0,0,0,0.08); border-radius:5px; overflow:hidden;">
            <div id="plannerProgressBar" style="width:${pct}%; height:100%; background:linear-gradient(90deg, #10B981, #059669); transition:width 0.3s ease;"></div>
          </div>
        </div>

        <!-- Priorities & Daily Goal Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px; margin-bottom:22px;">
          
          <!-- Daily Goal -->
          <div style="padding:14px 16px; background:var(--bg); border:1px solid var(--border); border-radius:10px;">
            <div style="font-size:0.75rem; font-weight:800; color:#0284C7; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-target"/></svg> TODAY'S MASTER GOAL
            </div>
            <input type="text" id="plannerGoalInput" class="at-input-box" style="font-size:0.82rem; padding:8px 10px;" value="${escapeHtml(state.goal || '')}" placeholder="Set today's primary achievement..." onchange="window.savePlannerHeaderFields()">
          </div>

          <!-- Top 3 Priorities -->
          <div style="padding:14px 16px; background:var(--bg); border:1px solid var(--border); border-radius:10px;">
            <div style="font-size:0.75rem; font-weight:800; color:#D97706; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-zap"/></svg> TOP 3 NON-NEGOTIABLE PRIORITIES
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              <input type="text" id="plannerP1Input" class="at-input-box" style="font-size:0.8rem; padding:6px 8px;" value="${escapeHtml(state.p1 || '')}" placeholder="1. Priority One" onchange="window.savePlannerHeaderFields()">
              <input type="text" id="plannerP2Input" class="at-input-box" style="font-size:0.8rem; padding:6px 8px;" value="${escapeHtml(state.p2 || '')}" placeholder="2. Priority Two" onchange="window.savePlannerHeaderFields()">
              <input type="text" id="plannerP3Input" class="at-input-box" style="font-size:0.8rem; padding:6px 8px;" value="${escapeHtml(state.p3 || '')}" placeholder="3. Priority Three" onchange="window.savePlannerHeaderFields()">
            </div>
          </div>

        </div>

        <!-- Hourly Schedule List -->
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${PLANNER_SCHEDULE.map(slot => {
            const isDone = (state.completedSlots || []).includes(slot.id);
            return `
              <div class="planner-slot-row" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; background:var(--bg); border:1px solid ${isDone ? 'rgba(16,185,129,0.3)' : 'var(--border)'}; border-left:4px solid ${slot.color}; border-radius:8px; transition:all 0.2s ease; opacity:${isDone ? '0.75' : '1'};">
                <div style="display:flex; align-items:center; gap:14px; flex:1; min-width:0;">
                  <input type="checkbox" id="chk_${slot.id}" style="width:18px; height:18px; cursor:pointer; accent-color:#10B981; flex-shrink:0;" ${isDone ? 'checked' : ''} onchange="window.togglePlannerSlot('${slot.id}', '${mountId}')">
                  <div style="min-width:0; flex:1;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                      <span style="font-size:0.75rem; font-weight:900; font-family:monospace; color:${slot.color}; background:rgba(0,0,0,0.04); padding:2px 6px; border-radius:4px;">
                        ${slot.time}
                      </span>
                      <strong style="font-size:0.88rem; color:var(--text); text-decoration:${isDone ? 'line-through' : 'none'};">
                        ${escapeHtml(slot.title)}
                      </strong>
                    </div>
                    <div class="burmese" style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px; text-decoration:${isDone ? 'line-through' : 'none'};">
                      ${escapeHtml(slot.titleBurmese)}
                    </div>
                    <div style="font-size:0.74rem; color:var(--text-secondary); margin-top:2px; line-height:1.4;">
                      ${escapeHtml(slot.desc)}
                    </div>
                  </div>
                </div>

                ${slot.actionFn ? `
                  <div style="flex-shrink:0;">
                    <button class="btn-outlined" style="padding:5px 10px; font-size:0.74rem; font-weight:700; white-space:nowrap;" onclick="${slot.actionFn}">
                      ${slot.actionLabel} &rarr;
                    </button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  };

  window.togglePlannerSlot = function(slotId, mountId) {
    const state = getStoredState();
    let slots = state.completedSlots || [];
    if (slots.includes(slotId)) {
      slots = slots.filter(id => id !== slotId);
    } else {
      slots.push(slotId);
    }
    state.completedSlots = slots;
    saveStoredState(state);
    window.initDailyMasterPlanner(mountId);
  };

  window.savePlannerHeaderFields = function() {
    const state = getStoredState();
    const g = document.getElementById('plannerGoalInput');
    const p1 = document.getElementById('plannerP1Input');
    const p2 = document.getElementById('plannerP2Input');
    const p3 = document.getElementById('plannerP3Input');
    if (g) state.goal = g.value.trim();
    if (p1) state.p1 = p1.value.trim();
    if (p2) state.p2 = p2.value.trim();
    if (p3) state.p3 = p3.value.trim();
    saveStoredState(state);
  };

  window.resetDailyPlannerProgress = function(mountId) {
    if (!confirm("Are you sure you want to reset all checked blocks for today's schedule?")) return;
    const state = getStoredState();
    state.completedSlots = [];
    saveStoredState(state);
    window.initDailyMasterPlanner(mountId);
    if (window.showAppToast) window.showAppToast("Today's planner progress reset to 0%.", "info");
  };

  window.markAllPlannerDone = function(mountId) {
    const state = getStoredState();
    state.completedSlots = PLANNER_SCHEDULE.map(s => s.id);
    saveStoredState(state);
    window.initDailyMasterPlanner(mountId);
    if (window.showAppToast) window.showAppToast("Spectacular work! 100% daily discipline achieved!", "success");
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
