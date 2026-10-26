/**
 * Category 2: Panic-Proof Speaking & CBT Weapons
 * IELTS Prep Studio - Academic VIP Suite
 * Pure Client-Side Zero-Latency Offline Simulation
 */

(function(window) {
  'use strict';

  // ==========================================
  // 2.1: 60-SECOND CUE CARD LIFELINE (PPF + STORY MIND-MAP)
  // ==========================================
  const CUE_CARD_ARCHETYPES = [
    {
      archetype: "Object / Technological Device",
      triggers: ["device", "technology", "phone", "computer", "machine", "object", "item", "gadget", "equipment"],
      pastHook: "If my memory serves me correctly, it was approximately three years ago when I first acquired this...",
      pastEvidence: "At that juncture in my life, I was wrestling with immense academic pressure and desperately needed a reliable tool to streamline my daily schedule.",
      presentClimax: "What truly sets this device apart is its seamless integration into my morning and professional routine...",
      presentEvidence: "On a day-to-day basis, I rely on it almost incessantly, whether for cross-referencing research papers or orchestrating collaborative projects.",
      futureReflection: "Looking ahead, I cannot fathom navigating my prospective academic career without it...",
      closingLine: "In the final analysis, it has not merely made my life more convenient, but fundamentally reshaped my personal productivity.",
      idioms: [
        { idiom: "an indispensable asset", burmese: "မရှိမဖြစ် တန်ဖိုးရှိသော အရာ", example: "It has evolved into an indispensable asset in my daily studies." },
        { idiom: "streamline my workflow", burmese: "လုပ်ငန်းစဉ်များကို ချောမွေ့လွယ်ကူစေသည်", example: "I utilize modern software to streamline my workflow." },
        { idiom: "state-of-the-art", burmese: "ခေတ်အမီဆုံး နည်းပညာဖြစ်သော", example: "It features state-of-the-art computational capabilities." },
        { idiom: "catch someone off guard", burmese: "ရုတ်တရက် အံ့အားသင့်သွားစေသည်", example: "Its intuitive responsiveness caught me off guard at first." },
        { idiom: "stand the test of time", burmese: "ကာလရှည်ကြာ ခိုင်ခံ့မှုရှိသည်", example: "Its durable build quality has truly stood the test of time." }
      ],
      burmeseCoaching: "Past (စတင်ရရှိပုံနှင့် အခြေအနေ) -> Present (လက်ရှိအသုံးပြုပုံနှင့် ထူးခြားချက်) -> Future (နောင်အနာဂတ်အပေါ် သက်ရောက်မှု) ဟူသော PPF ဖွဲ့စည်းပုံဖြင့် ပြောပါက စကားရပ်တန့်မသွားဘဲ ၂ မိနစ် အပြည့် အလွယ်တကူ ပြောဆိုနိုင်ပါသည်။"
    },
    {
      archetype: "Person / Role Model / Mentor",
      triggers: ["person", "someone", "friend", "teacher", "leader", "family", "admire", "mentor", "celebrity", "parent"],
      pastHook: "The person who immediately springs to mind is someone I have looked up to since my formative adolescent years...",
      pastEvidence: "I vividly recall an instance during secondary school when I was on the verge of abandoning my academic ambitions due to self-doubt.",
      presentClimax: "What strikes me most about their character is an extraordinary synthesis of unwavering perseverance and deep empathy...",
      presentEvidence: "Whenever I encounter formidable professional dilemmas today, their pragmatic wisdom serves as an unshakeable moral compass.",
      futureReflection: "In the foreseeable future, as I pursue my own vocational aspirations overseas, I strive to emulate their leadership style...",
      closingLine: "All in all, their guidance has left an indelible mark upon my character that time will never erode.",
      idioms: [
        { idiom: "leave an indelible mark", burmese: "ဘဝတွင် ဖျောက်ဖျက်မရသော အမှတ်အသား ချန်ရစ်ခဲ့သည်", example: "Her selfless mentorship left an indelible mark on my worldview." },
        { idiom: "a pillar of strength", burmese: "အားကိုးအားထားပြုရသော ပုဂ္ဂိုလ်", example: "During turbulent seasons, my mentor stood as a pillar of strength." },
        { idiom: "look up to someone", burmese: "ကြည်ညိုလေးစား အတုယူသည်", example: "I have always looked up to my grandfather's tireless work ethic." },
        { idiom: "epitome of resilience", burmese: "ကြံ့ကြံ့ခံနိုင်မှု၏ အပြည့်စုံဆုံး စံပြ", example: "She personifies the very epitome of intellectual resilience." },
        { idiom: "set a sterling example", burmese: "အလွန်ကောင်းမွန်သော စံနမူနာပြသည်", example: "He consistently sets a sterling example for junior colleagues." }
      ],
      burmeseCoaching: "လူတစ်ယောက်အကြောင်း ပြောရာတွင် ရုပ်သွင်ပြင်သာမက ၎င်းနှင့်ကြုံခဲ့ဖူးသော အတိတ်အမှတ်တရ (Past)၊ ယခုလက်ရှိ သူ၏စံပြအရည်အသွေး (Present) နှင့် သင့်ဘဝရှေ့ဆက်ရမည့်ပုံ (Future) ကို ချိတ်ဆက်ပြောပါ။"
    },
    {
      archetype: "Place / Destination / City",
      triggers: ["place", "city", "country", "town", "destination", "building", "visit", "travel", "historical", "park"],
      pastHook: "I would like to talk about a captivating destination that made an unforgettable impression on me when I journeyed there...",
      pastEvidence: "It was during a much-needed semester break when I decided to escape the hustle and bustle of metropolitan city life.",
      presentClimax: "Upon arriving, I was instantly spellbound by the striking juxtaposition of ancient architecture and breathtaking natural scenery...",
      presentEvidence: "The vibrant local markets and warm hospitality of the indigenous community created an ambiance of profound serenity.",
      futureReflection: "Given the opportunity, I would leap at the chance to revisit this tranquil haven in the years ahead...",
      closingLine: "To put it into perspective, it remains the most spiritually rejuvenating retreat I have ever had the privilege to experience.",
      idioms: [
        { idiom: "hustle and bustle", burmese: "မြို့ပြ၏ ရှုပ်ထွေးဆူညံလှုပ်ရှားမှုများ", example: "I longed to escape the hustle and bustle of downtown Yangon." },
        { idiom: "off the beaten track", burmese: "လူသူအရောက်အပေါက်နည်းသော နေရာ", example: "The mountain sanctuary is situated well off the beaten track." },
        { idiom: "striking juxtaposition", burmese: "ထင်ရှားစွာ ယှဉ်တွဲတည်ရှိနေသော ဆန့်ကျင်ဘက် အလှတရား", example: "The city exhibits a striking juxtaposition of ancient pagodas and modern towers." },
        { idiom: "take one's breath away", burmese: "ရင်သပ်ရှုမော အံ့အားသင့်စေသည်", example: "The panoramic sunrise over the mist truly took my breath away." },
        { idiom: "feast for the eyes", burmese: "မျက်စိပသာဒဖြစ်ဖွယ် ရှုခင်း", example: "The blooming orchid terraces were an absolute feast for the eyes." }
      ],
      burmeseCoaching: "နေရာတစ်ခုကို ဖော်ပြရာတွင် ကွက်တိမြင်သာသော မျက်စိမြင်ခံစားမှု (Sensory details: sights, sounds, atmosphere) နှင့် အချိန်အပိုင်းအခြား (PPF) ကို ထည့်သွင်းပြောဆိုပါ။"
    },
    {
      archetype: "Experience / Challenge / Event",
      triggers: ["experience", "challenge", "event", "difficult", "occasion", "activity", "success", "celebration", "speech"],
      pastHook: "A particularly demanding yet transformative episode that stands out vividly in my memory took place when I had to...",
      pastEvidence: "At the outset, the sheer magnitude of the task seemed utterly overwhelming, and I felt completely out of my depth.",
      presentClimax: "However, by breaking down the challenge into methodical steps and burning the midnight oil, a breakthrough emerged...",
      presentEvidence: "The moment of culmination was an electrifying blend of nervous anticipation and intense relief when our presentation concluded successfully.",
      futureReflection: "Reflecting on that trial today, I realize it instilled in me an unshakable reservoir of resilience and self-belief...",
      closingLine: "Ultimately, it served as a defining milestone that fundamentally fortified my capacity to thrive under extreme pressure.",
      idioms: [
        { idiom: "out of one's depth", burmese: "မိမိစွမ်းရည်ထက် ကျော်လွန်ခက်ခဲနေသည်ဟု ခံစားရသည်", example: "During the initial phase, I felt completely out of my depth." },
        { idiom: "burn the midnight oil", burmese: "ညဉ့်နက်သန်းခေါင်တိုင်အောင် ကြိုးစားသည်", example: "Our team burned the midnight oil to meet the critical deadline." },
        { idiom: "a blessing in disguise", burmese: "အစပိုင်းတွင် အခက်အခဲထင်ရသော်လည်း နောင်တွင် အကျိုးဖြစ်ထွန်းစေသော အရာ", example: "That early setback turned out to be a blessing in disguise." },
        { idiom: "rise to the occasion", burmese: "အရေးကြုံလာသောအခါ စွမ်းစွမ်းတမံ ရင်ဆိုင်ဖြေရှင်းသည်", example: "When the leader fell ill, she rose to the occasion masterfully." },
        { idiom: "a steep learning curve", burmese: "အချိန်တိုအတွင်း များစွာသင်ယူရသော စိန်ခေါ်မှု", example: "Mastering the statistical software proved to be a steep learning curve." }
      ],
      burmeseCoaching: "အတွေ့အကြုံ သို့မဟုတ် စိန်ခေါ်မှုအကြောင်း ပြောရာတွင် 'Problem -> Struggle -> Climax Breakthrough -> Long-term Moral Lesson' ပုံစံဖြင့် ဇာတ်လမ်းဆင်ပြောပါက Band 8.5 Fluency အပြည့် ရရှိစေပါသည်။"
    }
  ];

  let lifelineTimerInterval = null;
  let lifelineTimerSeconds = 60;

  window.generateCueCardLifeline = function() {
    const topicEl = document.getElementById('spkCueTopic');
    const promptsEl = document.getElementById('spkCuePromptsList');
    const topicText = topicEl ? topicEl.textContent.trim() : 'A memorable experience';

    // Find best matching archetype
    const lower = topicText.toLowerCase();
    let matched = CUE_CARD_ARCHETYPES[0];
    for (const arch of CUE_CARD_ARCHETYPES) {
      if (arch.triggers.some(t => lower.includes(t))) {
        matched = arch;
        break;
      }
    }

    return {
      topic: topicText,
      archetype: matched.archetype,
      pastHook: matched.pastHook,
      pastEvidence: matched.pastEvidence,
      presentClimax: matched.presentClimax,
      presentEvidence: matched.presentEvidence,
      futureReflection: matched.futureReflection,
      closingLine: matched.closingLine,
      idioms: matched.idioms,
      burmeseCoaching: matched.burmeseCoaching
    };
  };

  window.toggleCueCardLifeline = function() {
    let drawer = document.getElementById('cueCardLifelineDrawer');
    if (!drawer) {
      const cueBox = document.getElementById('spkCueCardBox');
      if (!cueBox) return;
      drawer = document.createElement('div');
      drawer.id = 'cueCardLifelineDrawer';
      drawer.style.marginTop = '12px';
      cueBox.parentNode.insertBefore(drawer, cueBox.nextSibling);
    }

    if (drawer.style.display === 'block') {
      drawer.style.display = 'none';
      if (lifelineTimerInterval) { clearInterval(lifelineTimerInterval); lifelineTimerInterval = null; }
      return;
    }

    drawer.style.display = 'block';
    const lifeline = window.generateCueCardLifeline();

    drawer.innerHTML = `
      <div class="occ-card" style="padding:18px; border:1px solid #D97706; background:linear-gradient(180deg, rgba(217,119,6,0.06) 0%, var(--bg-card) 100%); border-radius:12px; box-shadow:0 6px 24px rgba(217,119,6,0.12);">
        
        <!-- Lifeline Header & 60s Countdown -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px; border-bottom:1px solid var(--border); padding-bottom:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="occ-ver-pill" style="background:#D97706; color:#FFF; font-weight:800; font-size:0.72rem;">60-SECOND CUE CARD LIFELINE</span>
              <strong style="color:var(--text); font-size:0.95rem;">PPF + STORY Mind-Map Blueprint</strong>
            </div>
            <p style="margin:4px 0 0 0; font-size:0.78rem; color:var(--text-secondary);">
              Archetype: <strong>${escapeHtml(lifeline.archetype)}</strong> &middot; Speaking Part 2 Rapid 2-Minute Flow
            </p>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <div id="lifelineTimerBadge" style="font-weight:900; font-size:1.1rem; color:#D97706; font-family:monospace; background:rgba(217,119,6,0.1); padding:4px 10px; border-radius:6px; border:1px solid rgba(217,119,6,0.3);">
              01:00
            </div>
            <button class="btn-accent-solid" id="btnStartLifelineTimer" onclick="window.start60sLifelineTimer()" style="padding:6px 14px; font-size:0.8rem; font-weight:800; background:#D97706; border:none;">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-timer"/></svg> Start 60s Prep
            </button>
            <button class="btn-outlined" style="padding:6px 10px; font-size:0.8rem;" onclick="window.toggleCueCardLifeline()">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-x"/></svg>
            </button>
          </div>
        </div>

        <!-- 3-Phase Guided Prep Progress Bar -->
        <div style="margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; font-size:0.72rem; font-weight:700; color:var(--text-secondary); margin-bottom:4px;">
            <span id="lifelinePhase1" style="color:#D97706;">Phase 1 (0-20s): Past Hook &amp; Scene</span>
            <span id="lifelinePhase2">Phase 2 (20-40s): Present Climax</span>
            <span id="lifelinePhase3">Phase 3 (40-60s): Future Moral &amp; Idioms</span>
          </div>
          <div style="height:6px; background:rgba(0,0,0,0.08); border-radius:3px; overflow:hidden;">
            <div id="lifelineProgressBar" style="width:0%; height:100%; background:#D97706; transition:width 1s linear;"></div>
          </div>
        </div>

        <!-- The 3 PPF Pillars Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; margin-bottom:16px;">
          
          <!-- Pillar 1: Past Hook -->
          <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:12px 14px;">
            <div style="font-weight:800; font-size:0.82rem; color:#D97706; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.04em;">
              1. Past Hook &amp; Background (0 &ndash; 40s)
            </div>
            <div style="font-size:0.85rem; font-weight:600; color:var(--text); margin-bottom:6px; font-style:italic;">
              &ldquo;${escapeHtml(lifeline.pastHook)}&rdquo;
            </div>
            <div style="font-size:0.8rem; color:var(--text-secondary); line-height:1.45;">
              ${escapeHtml(lifeline.pastEvidence)}
            </div>
          </div>

          <!-- Pillar 2: Present Climax -->
          <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:12px 14px;">
            <div style="font-weight:800; font-size:0.82rem; color:#10B981; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.04em;">
              2. Present Turning Point (40 &ndash; 80s)
            </div>
            <div style="font-size:0.85rem; font-weight:600; color:var(--text); margin-bottom:6px; font-style:italic;">
              &ldquo;${escapeHtml(lifeline.presentClimax)}&rdquo;
            </div>
            <div style="font-size:0.8rem; color:var(--text-secondary); line-height:1.45;">
              ${escapeHtml(lifeline.presentEvidence)}
            </div>
          </div>

          <!-- Pillar 3: Future Significance -->
          <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:12px 14px;">
            <div style="font-weight:800; font-size:0.82rem; color:#6366F1; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.04em;">
              3. Future Reflection &amp; Moral (80 &ndash; 120s)
            </div>
            <div style="font-size:0.85rem; font-weight:600; color:var(--text); margin-bottom:6px; font-style:italic;">
              &ldquo;${escapeHtml(lifeline.futureReflection)}&rdquo;
            </div>
            <div style="font-size:0.8rem; color:var(--text-secondary); line-height:1.45;">
              ${escapeHtml(lifeline.closingLine)}
            </div>
          </div>

        </div>

        <!-- 5 High-Band Idioms specifically for this Cue Card -->
        <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:12px 14px; margin-bottom:14px;">
          <div style="font-weight:800; font-size:0.84rem; color:var(--text); margin-bottom:8px; display:inline-flex; align-items:center; gap:6px;">
            <svg class="ui-icon ui-icon-xs" style="color:#D97706;"><use href="#lucide-gem"/></svg> 5 Band 8.5+ Idioms &amp; Collocations to Drop into Your Talk:
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:8px;">
            ${lifeline.idioms.map(item => `
              <div style="padding:6px 10px; background:rgba(217,119,6,0.06); border:1px solid rgba(217,119,6,0.2); border-radius:6px; font-size:0.78rem;">
                <strong style="color:#D97706;">${escapeHtml(item.idiom)}</strong>
                <span class="burmese" style="color:var(--text-secondary); margin-left:4px;">(${escapeHtml(item.burmese)})</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Burmese Examiner Coaching Note -->
        <div style="padding:10px 12px; background:rgba(0,0,0,0.02); border-left:3px solid #D97706; border-radius:0 6px 6px 0; font-size:0.8rem; line-height:1.5; color:var(--text-secondary); margin-bottom:14px;">
          <strong style="color:var(--text);">Examiner Coaching (Burmese):</strong>
          <span class="burmese" style="font-family:'Pyidaungsu', 'Myanmar3', sans-serif; display:block; margin-top:2px;">
            ${escapeHtml(lifeline.burmeseCoaching)}
          </span>
        </div>

        <!-- Action Row -->
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn-outlined" style="padding:6px 14px; font-size:0.78rem; font-weight:700;" onclick="window.copyLifelineMindMap()">
            <svg class="ui-icon ui-icon-xs"><use href="#lucide-copy"/></svg> Copy Mind-Map Notes
          </button>
          <button class="btn-accent-solid" style="padding:6px 14px; font-size:0.78rem; font-weight:800; background:#10B981; border:none;" onclick="document.getElementById('micRecBtn')?.click(); window.toggleCueCardLifeline();">
            <svg class="ui-icon ui-icon-xs"><use href="#lucide-mic"/></svg> Start Recording Voice Now
          </button>
        </div>

      </div>
    `;

    drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  window.start60sLifelineTimer = function() {
    if (lifelineTimerInterval) {
      clearInterval(lifelineTimerInterval);
      lifelineTimerInterval = null;
    }

    lifelineTimerSeconds = 60;
    const badge = document.getElementById('lifelineTimerBadge');
    const bar = document.getElementById('lifelineProgressBar');
    const p1 = document.getElementById('lifelinePhase1');
    const p2 = document.getElementById('lifelinePhase2');
    const p3 = document.getElementById('lifelinePhase3');

    lifelineTimerInterval = setInterval(() => {
      lifelineTimerSeconds--;
      if (lifelineTimerSeconds <= 0) {
        clearInterval(lifelineTimerInterval);
        lifelineTimerInterval = null;
        if (badge) {
          badge.textContent = "00:00 (Time Up!)";
          badge.style.color = "#EF4444";
        }
        if (window.showAppToast) {
          window.showAppToast('60s prep time completed! Deliver your 2-minute response now.', 'info');
        }
        return;
      }

      const elapsed = 60 - lifelineTimerSeconds;
      const mins = Math.floor(lifelineTimerSeconds / 60);
      const secs = lifelineTimerSeconds % 60;
      if (badge) {
        badge.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      if (bar) {
        bar.style.width = `${Math.round((elapsed / 60) * 100)}%`;
      }

      // Update Phase highlighting
      if (elapsed < 20) {
        if (p1) p1.style.color = '#D97706';
        if (p2) p2.style.color = 'var(--text-secondary)';
        if (p3) p3.style.color = 'var(--text-secondary)';
      } else if (elapsed < 40) {
        if (p1) p1.style.color = 'var(--text-secondary)';
        if (p2) p2.style.color = '#10B981';
        if (p3) p3.style.color = 'var(--text-secondary)';
      } else {
        if (p1) p1.style.color = 'var(--text-secondary)';
        if (p2) p2.style.color = 'var(--text-secondary)';
        if (p3) p3.style.color = '#6366F1';
      }
    }, 1000);
  };

  window.copyLifelineMindMap = function() {
    const lifeline = window.generateCueCardLifeline();
    const text = `IELTS Speaking Part 2 Lifeline Mind-Map (${lifeline.archetype})\nTopic: ${lifeline.topic}\n\n1. PAST (0-40s):\n${lifeline.pastHook}\n${lifeline.pastEvidence}\n\n2. PRESENT (40-80s):\n${lifeline.presentClimax}\n${lifeline.presentEvidence}\n\n3. FUTURE (80-120s):\n${lifeline.futureReflection}\n${lifeline.closingLine}\n\n5 Key Idioms:\n${lifeline.idioms.map(i => `- ${i.idiom} (${i.burmese}): "${i.example}"`).join('\n')}`;

    navigator.clipboard.writeText(text).then(() => {
      if (window.showAppToast) window.showAppToast('Lifeline Mind-Map notes copied to clipboard!', 'success');
    });
  };

  // ==========================================
  // 2.2: SPEECH DIAGNOSTICS 2.0 (WPM SWEET SPOT + FILLER RADAR)
  // ==========================================
  const STUTTER_REGEX = /\b([a-zA-Z]{2,})\s+\1\b/gi;

  window.computeSpeechDiagnostics2 = function(transcriptText, elapsedMinutes = 1.0) {
    if (!transcriptText || !transcriptText.trim()) {
      return {
        wpm: 0,
        wpmZone: 'Idle',
        fillerCount: 0,
        stutterCount: 0,
        fluencyScore: 100,
        estimatedBand: 'N/A'
      };
    }

    const words = transcriptText.trim().split(/\s+/).filter(Boolean);
    const safeMinutes = Math.max(elapsedMinutes, 0.1);
    const wpm = Math.round(words.length / safeMinutes);

    // Stutters & Repetitions
    const stutterMatches = transcriptText.match(STUTTER_REGEX) || [];

    // Filler regex
    const fillerRegex = /\b(um+|uh+|er+|ah+|hmm+|like|you know|basically|actually|sort of|kind of|literally)\b/gi;
    const fillerMatches = transcriptText.match(fillerRegex) || [];

    const totalHesitations = fillerMatches.length + stutterMatches.length;
    const hesitationPer100Words = words.length > 0 ? (totalHesitations / words.length) * 100 : 0;

    // Determine WPM Zone
    let wpmZone = 'Sweet Spot (Band 8.0-9.0)';
    let wpmColor = '#10B981';
    if (wpm < 115) {
      wpmZone = 'Sluggish / Hesitant (Band 5.5-6.0)';
      wpmColor = '#F59E0B';
    } else if (wpm <= 129) {
      wpmZone = 'Deliberate Flow (Band 6.5-7.0)';
      wpmColor = '#38BDF8';
    } else if (wpm <= 155) {
      wpmZone = 'Examiner Golden Sweet Spot (Band 8.0-9.0)';
      wpmColor = '#10B981';
    } else if (wpm <= 170) {
      wpmZone = 'Brisk Delivery (Band 7.0-7.5)';
      wpmColor = '#F97316';
    } else {
      wpmZone = 'Frantic / Slur Risk (>170 WPM)';
      wpmColor = '#EF4444';
    }

    // Determine Fluency & Coherence Band Estimate
    let estBand = 'Band 8.5';
    let fluencyScore = Math.max(40, Math.min(100, Math.round(100 - (hesitationPer100Words * 6))));
    if (hesitationPer100Words <= 1.5 && wpm >= 125 && wpm <= 160) {
      estBand = 'Band 8.5 - 9.0 (Native Academic Fluency)';
    } else if (hesitationPer100Words <= 3.5 && wpm >= 115 && wpm <= 168) {
      estBand = 'Band 7.5 - 8.0 (Effortless Flow with Rare Self-Correction)';
    } else if (hesitationPer100Words <= 6.0) {
      estBand = 'Band 6.5 - 7.0 (Slight Vocal Hesitations)';
    } else {
      estBand = 'Band 5.5 - 6.0 (Noticeable Hesitation Penalty)';
    }

    return {
      wordCount: words.length,
      wpm: wpm,
      wpmZone: wpmZone,
      wpmColor: wpmColor,
      fillerCount: fillerMatches.length,
      stutterCount: stutterMatches.length,
      totalHesitations: totalHesitations,
      fluencyScore: fluencyScore,
      estimatedBand: estBand
    };
  };

  // ==========================================
  // 2.3: READING CBT "FALSE VS NOT GIVEN" DECISIVE ARBITER
  // ==========================================
  const TFNG_SCENARIOS = [
  {
    "id": "tfng_1",
    "theme": "Extreme Quantifiers (All vs Most)",
    "passage": "A vast majority of archaeological researchers now accept that the ancient settlement was abandoned primarily due to catastrophic prolonged droughts rather than foreign military conquest.",
    "statement": "All modern archaeologists believe that drought was the sole reason for the city's abandonment.",
    "answer": "FALSE",
    "trapType": "Absolute Qualifier Trap ('All' / 'Sole')",
    "analysis": "The passage says 'A vast majority' (not all) and 'primarily due to' (not sole reason). Since 'all' directly contradicts 'vast majority', this statement is directly refuted by the text.",
    "burmese": "စာပိုဒ်တွင် 'A vast majority' (အများစု) ဟုသာ ပါရှိပြီး မေးခွန်းတွင် 'All' (အားလုံး) ဟု အစွန်းရောက် သုံးထားသောကြောင့် ဆန့်ကျင်ဘက်ဖြစ်ကာ FALSE ဖြစ်ပါသည်။ NOT GIVEN မဟုတ်ပါ။"
  },
  {
    "id": "tfng_2",
    "theme": "Speculation vs Fact (Hypothesized vs Proved)",
    "passage": "Scientists hypothesize that deep-sea hydrothermal vents may have provided the prebiotic chemical conditions necessary for the genesis of early cellular life on Earth.",
    "statement": "Experiments have confirmed that life on Earth definitely originated in hydrothermal vents.",
    "answer": "FALSE",
    "trapType": "Epistemic Status Contradiction ('Hypothesize' vs 'Confirmed')",
    "analysis": "The text explicitly states scientists 'hypothesize' (a provisional theory). The statement claims experiments have 'confirmed' (proven fact). A hypothesis contradicts confirmed proof.",
    "burmese": "စာပိုဒ်တွင် 'hypothesize' (ယူဆချက်သာ ရှိသေးသည်) ဟု ဆိုထားပြီး မေးခွန်းတွင် 'confirmed' (အတည်ပြုပြီးဖြစ်သည်) ဟု ဆိုထားသဖြင့် အချက်အလက်ချင်း တိုက်ရိုက်ဆန့်ကျင်နေ၍ FALSE ဖြစ်ပါသည်။"
  },
  {
    "id": "tfng_3",
    "theme": "Missing Causal Connection (Post Hoc Fallacy)",
    "passage": "Following the introduction of the new high-speed rail corridor in 2018, tourism revenues in the provincial capital increased by 34% over the subsequent three-year period.",
    "statement": "The provincial capital's tourism revenue increased because foreign visitors preferred traveling by train rather than airplane.",
    "answer": "NOT GIVEN",
    "trapType": "Unsubstantiated Causality Assumption",
    "analysis": "The text confirms that tourism revenue increased following the rail corridor. However, it NEVER mentions whether visitors were 'foreign', nor their preference for trains over airplanes. Do not assume real-world logic!",
    "burmese": "ခရီးသွားဝင်ငွေ တိုးတက်လာသည်မှာ မှန်သော်လည်း နိုင်ငံခြားသားများက လေယာဉ်ထက် ရထားကို ပိုကြိုက်၍ဖြစ်သည်ဟူသော အကြောင်းရင်းကို စာပိုဒ်တွင် လုံးဝမဖော်ပြထားသဖြင့် NOT GIVEN ဖြစ်ပါသည်။"
  },
  {
    "id": "tfng_4",
    "theme": "Chronological Inversion (Before vs After)",
    "passage": "Before patenting the steam condenser in 1769, James Watt had spent several years repairing delicate astronomical instruments at the University of Glasgow.",
    "statement": "James Watt repaired astronomical equipment at the university only after he patented his steam engine design.",
    "answer": "FALSE",
    "trapType": "Temporal Inversion ('Before' vs 'After')",
    "analysis": "The passage clearly establishes that the repair work took place 'Before patenting'. The statement says 'only after'. Chronological contradiction = FALSE.",
    "burmese": "စာပိုဒ်တွင် မူပိုင်ခွင့်မတင်မီ (Before) တက္ကသိုလ်တွင် ကိရိယာများ ပြင်ဆင်ခဲ့သည်ဟု ဆိုထားပြီး၊ မေးခွန်းတွင် မူပိုင်ခွင့်တင်ပြီးမှ (After) ပြင်ဆင်ခဲ့သည်ဟု အချိန်ပြောင်းထားသဖြင့် FALSE ဖြစ်ပါသည်။"
  },
  {
    "id": "tfng_5",
    "theme": "Subject Comparison Missing",
    "passage": "Renewable wind turbine installations reached record levels across northern Europe last year, generating over 45 gigawatts of clean electrical capacity.",
    "statement": "Northern Europe produced more electricity from wind turbines than from hydroelectric dams last year.",
    "answer": "NOT GIVEN",
    "trapType": "Missing Comparative Target",
    "analysis": "The passage provides data about wind turbines reaching record levels, but makes ZERO mention of hydroelectric dams or any comparative output between the two.",
    "burmese": "လေရဟတ်စွမ်းအင် ထုတ်လုပ်မှု စံချိန်တင်ခဲ့သည်မှာ မှန်သော်လည်း ရေအားလျှပ်စစ်နှင့် နှိုင်းယှဉ်ချက် စာပိုဒ်ထဲတွင် လုံးဝမပါရှိသောကြောင့် NOT GIVEN ဖြစ်ပါသည်။"
  },
  {
    "id": "tfng_6",
    "theme": "Singular vs Universal Exclusive ('Only')",
    "passage": "Polar bears rely heavily on offshore pack ice as a hunting platform to capture ringed seals, their primary source of caloric nutrition during winter months.",
    "statement": "Ringed seals are the only food source that polar bears consume throughout the entire year.",
    "answer": "FALSE",
    "trapType": "Exclusive Limiter Trap ('Only' / 'Entire Year')",
    "analysis": "The text states seals are their 'primary source' (not only) and specifies 'during winter months' (not entire year). The presence of 'only' and 'entire year' directly contradicts the text.",
    "burmese": "စာပိုဒ်တွင် 'primary source' (အဓိက အစားအစာ) နှင့် ဆောင်းရာသီတွင်သာဟု ကန့်သတ်ထားပြီး၊ မေးခွန်းတွင် 'only' (တစ်မျိုးတည်း) နှင့် 'entire year' (တစ်နှစ်ပတ်လုံး) ဟု အစွန်းရောက်ထားသဖြင့် FALSE ဖြစ်ပါသည်။"
  },
  {
    "id": "tfng_7",
    "theme": "Author Stance vs Quoted Counter-Claim",
    "passage": "While industrial lobbies claim that microplastic runoff poses negligible threats to human endocrinology, recent peer-reviewed longitudinal studies indicate severe bioaccumulation in vascular tissue.",
    "statement": "Scientific research confirms that microplastics have virtually no negative effect on human health.",
    "answer": "FALSE",
    "trapType": "Attribution Attribution Trap (Lobby claim vs Peer-reviewed studies)",
    "analysis": "The claim of 'negligible threats' belongs to 'industrial lobbies'. The actual scientific research ('peer-reviewed studies') indicates severe bioaccumulation. Contradiction = FALSE.",
    "burmese": "မေးခွန်းပါ အချက်မှာ စက်မှုလုပ်ငန်းရှင်များ၏ အခိုင်အမာပြောဆိုချက် (lobby claim) သာဖြစ်ပြီး သိပ္ပံသုတေသနများ (scientific research) ကမူ ဆိုးရွားသော အန္တရာယ်ရှိကြောင်း သက်သေပြထားသဖြင့် FALSE ဖြစ်ပါသည်။"
  },
  {
    "id": "tfng_8",
    "theme": "Possibility vs Certainty ('May' vs 'Will')",
    "passage": "Astronomers suggest that atmospheric signatures detected on exoplanet K2-18b could potentially indicate the presence of dimethyl sulfide, an organic compound commonly produced by marine phytoplankton.",
    "statement": "Scientists will definitely find living organisms in the oceans of exoplanet K2-18b within the next decade.",
    "answer": "NOT GIVEN",
    "trapType": "Timeframe and Certainty Unmentioned",
    "analysis": "The text discusses potential chemical markers ('could potentially indicate'). It never promises definite discoveries, nor does it establish a timeframe of 'within the next decade'.",
    "burmese": "ဖြစ်နိုင်ခြေရှိသော ဓာတုလက္ခဏာများအကြောင်းသာ ယူဆထားပြီး လာမည့်ဆယ်စုနှစ်အတွင်း သက်ရှိများ သေချာပေါက် တွေ့ရှိမည်ဟူသော အချိန်ကာလနှင့် သေချာမှုအဆင့်ကို လုံးဝမဖော်ပြထားသဖြင့် NOT GIVEN ဖြစ်ပါသည်။"
  },
  {
    "id": "tfng_9",
    "theme": "Geographic Restriction Mismatch",
    "passage": "The conservation program succeeded in doubling the local black rhino population in Namibia's Kunene Region over the past fifteen years.",
    "statement": "Black rhino populations have doubled across the entire continent of Africa.",
    "answer": "FALSE",
    "trapType": "Geographical Scope Distortion (Local Region vs Entire Continent)",
    "analysis": "The passage restricts the doubling explicitly to 'Namibia's Kunene Region'. The statement asserts it occurred across 'the entire continent of Africa'. Geographic overextension = FALSE.",
    "burmese": "စာပိုဒ်တွင် နမီးဘီးယားနိုင်ငံ ကူနင်းဒေသတစ်ခုတည်း (Local Region) အတွက်သာ ဖော်ပြထားပြီး၊ မေးခွန်းတွင် အာဖရိကတိုက်တစ်ခုလုံး (Entire Continent) ဟု ချဲ့ကားထားသဖြင့် FALSE ဖြစ်ပါသည်။"
  },
  {
    "id": "tfng_10",
    "theme": "Absence of Information on Future Intentions",
    "passage": "The Louvre museum implemented strict digital ticketing quotas in 2019 to curb overwhelming tourist overcrowding in the central galleries.",
    "statement": "The Louvre plans to abolish all digital ticketing requirements in the coming years.",
    "answer": "NOT GIVEN",
    "trapType": "Unrecorded Future Plan",
    "analysis": "The text explains why the museum implemented digital quotas in 2019. It gives zero information regarding future plans to abolish or keep them.",
    "burmese": "၂၀၁၉ တွင် စနစ်စတင်ခဲ့သည့် အကြောင်းအရင်းသာ ပါရှိပြီး နောင်လာမည့်နှစ်များတွင် အဆိုပါစနစ်ကို ဖျက်သိမ်းမည် သို့မဟုတ် ဆက်သုံးမည်ဟူသော အနာဂတ်အစီအစဉ် မပါရှိသဖြင့် NOT GIVEN ဖြစ်ပါသည်။"
  }
];

  window.TFNG_SCENARIOS = TFNG_SCENARIOS;
  let currentTfngIndex = 0;
  let tfngUserScores = {};

  window.renderTfngArbiterPanel = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const s = TFNG_SCENARIOS[currentTfngIndex] || TFNG_SCENARIOS[0];
    const userChoice = tfngUserScores[s.id];

    let feedbackHtml = '';
    if (userChoice) {
      const isCorrect = userChoice === s.answer;
      feedbackHtml = `
        <div style="margin-top:14px; padding:14px 16px; border-radius:8px; background:${isCorrect ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)'}; border:1px solid ${isCorrect ? '#10B981' : '#EF4444'};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
            <span style="font-weight:900; font-size:0.95rem; color:${isCorrect ? '#10B981' : '#EF4444'}; display:inline-flex; align-items:center; gap:6px;">
              <svg class="ui-icon ui-icon-xs" style="color:${isCorrect ? '#10B981' : '#EF4444'};"><use href="#${isCorrect ? 'lucide-check' : 'lucide-x'}"/></svg>
              ${isCorrect ? 'Correct Decision!' : 'Incorrect Choice'} &mdash; Official Answer: ${s.answer}
            </span>
            <span class="occ-ver-pill" style="font-size:0.72rem; background:rgba(0,0,0,0.05); color:var(--text-secondary); border:1px solid var(--border);">
              Trap: ${escapeHtml(s.trapType)}
            </span>
          </div>

          <div style="font-size:0.86rem; color:var(--text); line-height:1.55; margin-bottom:8px;">
            ${escapeHtml(s.analysis)}
          </div>

          <div style="font-size:0.82rem; color:var(--text-secondary); font-family:'Pyidaungsu', 'Myanmar3', sans-serif; background:rgba(0,0,0,0.02); padding:6px 10px; border-radius:6px; border-left:3px solid var(--accent);">
            <strong>Examiner Analysis (Burmese):</strong> ${escapeHtml(s.burmese)}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="occ-card" style="padding:22px; border:1px solid var(--border-accent); background:var(--bg-card); border-radius:12px;">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px; border-bottom:1px solid var(--border); padding-bottom:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="occ-ver-pill" style="background:#6366F1; color:#FFF; font-weight:800; font-size:0.72rem;">DECISIVE ARBITER</span>
              <h3 style="margin:0; font-size:1.15rem; font-weight:900; color:var(--text);">Cambridge "False vs Not Given" Decisive Arbiter</h3>
            </div>
            <p style="margin:4px 0 0 0; font-size:0.82rem; color:var(--text-secondary);">
              Scenario ${currentTfngIndex + 1} of ${TFNG_SCENARIOS.length} &middot; Theme: <strong>${escapeHtml(s.theme)}</strong>
            </p>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-outlined" style="padding:4px 10px; font-size:0.75rem;" onclick="window.prevTfngScenario('${containerId}')" ${currentTfngIndex === 0 ? 'disabled' : ''}>&larr; Prev</button>
            <button class="btn-outlined" style="padding:4px 10px; font-size:0.75rem;" onclick="window.nextTfngScenario('${containerId}')" ${currentTfngIndex === TFNG_SCENARIOS.length - 1 ? 'disabled' : ''}>Next &rarr;</button>
          </div>
        </div>

        <!-- 3-Step Decisive Logic Banner -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px; margin-bottom:16px;">
          <div style="padding:8px 10px; background:var(--bg); border:1px solid var(--border); border-radius:6px; font-size:0.75rem;">
            <strong style="color:var(--accent);">Step 1: Anchor</strong>
            <p style="margin:2px 0 0 0; color:var(--text-secondary);">Can you locate both subject &amp; action in text?</p>
          </div>
          <div style="padding:8px 10px; background:var(--bg); border:1px solid var(--border); border-radius:6px; font-size:0.75rem;">
            <strong style="color:#EF4444;">Step 2: Negation Test</strong>
            <p style="margin:2px 0 0 0; color:var(--text-secondary);">Does the text say the OPPOSITE? &rarr; FALSE</p>
          </div>
          <div style="padding:8px 10px; background:var(--bg); border:1px solid var(--border); border-radius:6px; font-size:0.75rem;">
            <strong style="color:#F59E0B;">Step 3: Zero Assumption</strong>
            <p style="margin:2px 0 0 0; color:var(--text-secondary);">Is it missing or unmentioned? &rarr; NOT GIVEN</p>
          </div>
        </div>

        <!-- Passage Excerpt -->
        <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:14px; margin-bottom:14px;">
          <div style="font-size:0.72rem; font-weight:800; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px;">
            Authentic Cambridge Passage Excerpt:
          </div>
          <div style="font-size:0.92rem; line-height:1.65; color:var(--text); font-family:Georgia, serif;">
            &ldquo;${escapeHtml(s.passage)}&rdquo;
          </div>
        </div>

        <!-- Question Statement -->
        <div style="background:rgba(99,102,241,0.05); border:1px solid rgba(99,102,241,0.25); border-radius:8px; padding:12px 14px; margin-bottom:16px;">
          <div style="font-size:0.72rem; font-weight:800; color:#6366F1; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:4px;">
            Candidate Evaluation Statement:
          </div>
          <div style="font-size:0.95rem; font-weight:700; color:var(--text); line-height:1.5;">
            ${escapeHtml(s.statement)}
          </div>
        </div>

        <!-- Decision Buttons -->
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <button class="btn-accent-solid" style="padding:10px 22px; font-weight:800; font-size:0.88rem; background:${userChoice === 'TRUE' ? '#10B981' : 'var(--bg-elevated)'}; color:${userChoice === 'TRUE' ? '#FFF' : 'var(--text)'}; border:1px solid var(--border);" onclick="window.submitTfngAnswer('${s.id}', 'TRUE', '${containerId}')">
            TRUE
          </button>
          <button class="btn-accent-solid" style="padding:10px 22px; font-weight:800; font-size:0.88rem; background:${userChoice === 'FALSE' ? '#EF4444' : 'var(--bg-elevated)'}; color:${userChoice === 'FALSE' ? '#FFF' : 'var(--text)'}; border:1px solid var(--border);" onclick="window.submitTfngAnswer('${s.id}', 'FALSE', '${containerId}')">
            FALSE
          </button>
          <button class="btn-accent-solid" style="padding:10px 22px; font-weight:800; font-size:0.88rem; background:${userChoice === 'NOT GIVEN' ? '#F59E0B' : 'var(--bg-elevated)'}; color:${userChoice === 'NOT GIVEN' ? '#FFF' : 'var(--text)'}; border:1px solid var(--border);" onclick="window.submitTfngAnswer('${s.id}', 'NOT GIVEN', '${containerId}')">
            NOT GIVEN
          </button>
        </div>

        ${feedbackHtml}

      </div>
    `;
  };

  window.submitTfngAnswer = function(scenarioId, answer, containerId) {
    tfngUserScores[scenarioId] = answer;
    window.renderTfngArbiterPanel(containerId);
  };

  window.nextTfngScenario = function(containerId) {
    if (currentTfngIndex < TFNG_SCENARIOS.length - 1) {
      currentTfngIndex++;
      window.renderTfngArbiterPanel(containerId);
    }
  };

  window.prevTfngScenario = function(containerId) {
    if (currentTfngIndex > 0) {
      currentTfngIndex--;
      window.renderTfngArbiterPanel(containerId);
    }
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
