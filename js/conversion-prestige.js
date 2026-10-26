/**
 * Category 4: Conversion & Prestige Perks Engine
 * IELTS Prep Studio - Academic VIP Suite
 * Pure Client-Side Zero-Latency Offline Simulation
 */

(function(window) {
  'use strict';

  // ==========================================
  // 4.1: INTERACTIVE BAND 6.0 -> 8.5+ TRANSFORMATION SLIDER
  // ==========================================

  const TRANSFORMATION_SCENARIOS = [
    {
      id: "env_pollution",
      category: "Environment & Urban Ecology",
      topic: "Automobile Emissions & Public Health",
      bands: {
        6.0: {
          band: "6.0",
          text: "Pollution is bad because cars make smoke and it hurts people in cities.",
          html: "<span class=\"token-base\">Pollution is bad</span> because <span class=\"token-base\">cars make smoke</span> and it <span class=\"token-base\">hurts people</span> in cities.",
          ta: 6.0, cc: 6.0, lr: 5.5, gra: 5.5,
          burmese: "ဝေါဟာရ အားနည်းပြီး 'bad', 'smoke', 'hurts people' စသည့် စကားပြောအသုံးများသာ ပါဝင်သည်။ ရိုးရှင်းလွန်းသော Compound sentence သာ ဖြစ်သည်။"
        },
        7.0: {
          band: "7.0",
          text: "Car pollution has become a serious problem in modern cities, damaging the environment and public health.",
          html: "<span class=\"token-lr\">Car pollution</span> has become a <span class=\"token-lr\">serious problem</span> in modern cities, <span class=\"token-gra\">damaging the environment</span> and <span class=\"token-lr\">public health</span>.",
          ta: 7.0, cc: 7.0, lr: 7.0, gra: 6.5,
          burmese: "Participle clause ('damaging the environment') သုံးထား၍ Band 7.0 ရသော်လည်း Academic Collocation များ C1/C2 အဆင့်အထိ ကြွယ်ဝမှု မရှိသေးပါ။"
        },
        8.5: {
          band: "8.5",
          text: "Automobile emissions precipitate severe ecological degradation, thereby exacerbating urban pulmonary ailments amongst vulnerable demographics.",
          html: "<span class=\"token-lr\">Automobile emissions</span> <span class=\"token-lr\">precipitate severe ecological degradation</span>, <span class=\"token-cc\">thereby exacerbating</span> <span class=\"token-lr\">urban pulmonary ailments</span> amongst <span class=\"token-lr\">vulnerable demographics</span>.",
          ta: 8.5, cc: 8.5, lr: 8.5, gra: 8.5,
          burmese: "C2 Academic Collocations ('precipitate ecological degradation', 'pulmonary ailments') နှင့် Adverbial Consequence ('thereby exacerbating') တို့ဖြင့် Band 8.5 သို့ အဆင့်မြင့်တက်လာသည်။"
        },
        9.0: {
          band: "9.0",
          text: "Seldom can the ramifications of anthropogenic vehicle emissions be overstated, given their propensity to precipitate irreparable environmental degradation whilst compromising civic health.",
          html: "<span class=\"token-gra\">Seldom can the ramifications</span> of <span class=\"token-lr\">anthropogenic vehicle emissions</span> <span class=\"token-gra\">be overstated</span>, <span class=\"token-cc\">given their propensity</span> to <span class=\"token-lr\">precipitate irreparable environmental degradation</span> <span class=\"token-gra\">whilst compromising</span> <span class=\"token-lr\">civic health</span>.",
          ta: 9.0, cc: 9.0, lr: 9.0, gra: 9.0,
          burmese: "Negative Inversion ('Seldom can... be overstated') နှင့် Formal Complex Subordination ('given their propensity to... whilst compromising...') ဖြင့် Band 9.0 Syntactic Mastery ကို ပြသထားသည်။"
        }
      }
    },
    {
      id: "tech_ai",
      category: "Technology & The Workplace",
      topic: "Artificial Intelligence & Automation",
      bands: {
        6.0: {
          band: "6.0",
          text: "Robots and AI will take human jobs so many people will be unemployed in the future.",
          html: "<span class=\"token-base\">Robots and AI</span> will <span class=\"token-base\">take human jobs</span> so many people will be <span class=\"token-base\">unemployed</span> in the future.",
          ta: 6.0, cc: 5.5, lr: 6.0, gra: 5.5,
          burmese: "'take human jobs', 'many people' စသည့် generic စကားလုံးများသုံးထားပြီး ချိတ်ဆက်စကားလုံးမှာ 'so' တစ်လုံးတည်းသာ ရှိသည်။"
        },
        7.0: {
          band: "7.0",
          text: "The rapid development of artificial intelligence is likely to replace many traditional jobs, creating high unemployment.",
          html: "The <span class=\"token-lr\">rapid development</span> of artificial intelligence is <span class=\"token-gra\">likely to replace</span> many traditional jobs, <span class=\"token-gra\">creating high unemployment</span>.",
          ta: 7.0, cc: 7.0, lr: 7.0, gra: 7.0,
          burmese: "Likely to infinitive နှင့် participle clause သုံးထား၍ ဖွဲ့စည်းပုံကောင်းသော်လည်း စိတ်လှုပ်ရှားဖွယ် Lexical Resource မပါသေးပါ။"
        },
        8.5: {
          band: "8.5",
          text: "The relentless proliferation of automated intelligence threatens to displace substantial segments of the conventional workforce, thereby necessitating radical socioeconomic re-skilling.",
          html: "The <span class=\"token-lr\">relentless proliferation</span> of <span class=\"token-lr\">automated intelligence</span> <span class=\"token-lr\">threatens to displace</span> <span class=\"token-lr\">substantial segments</span> of the <span class=\"token-lr\">conventional workforce</span>, <span class=\"token-cc\">thereby necessitating</span> <span class=\"token-lr\">radical socioeconomic re-skilling</span>.",
          ta: 8.5, cc: 8.5, lr: 9.0, gra: 8.5,
          burmese: "C2 Nominalisations ('relentless proliferation', 'conventional workforce', 'socioeconomic re-skilling') ဖြင့် Examiner အား ချက်ချင်း အထင်ကြီးစေသည်။"
        },
        9.0: {
          band: "9.0",
          text: "Not only does the unchecked proliferation of generative algorithms threaten conventional vocations, but it also mandates an unprecedented paradigm shift across global labour infrastructure.",
          html: "<span class=\"token-gra\">Not only does the unchecked proliferation</span> of <span class=\"token-lr\">generative algorithms</span> threaten <span class=\"token-lr\">conventional vocations</span>, <span class=\"token-gra\">but it also mandates</span> an <span class=\"token-lr\">unprecedented paradigm shift</span> across <span class=\"token-lr\">global labour infrastructure</span>.",
          ta: 9.0, cc: 9.0, lr: 9.0, gra: 9.0,
          burmese: "Correlative Inversion ('Not only does X threaten... but it also mandates Y') ဖြင့် Topic Sentence ၏ အာနိသင်ကို အမြင့်မားဆုံး Band 9.0 အဆင့်သို့ တင်ပို့ပေးသည်။"
        }
      }
    },
    {
      id: "edu_fees",
      category: "Education & Public Policy",
      topic: "State Subsidisation of University Tuition",
      bands: {
        6.0: {
          band: "6.0",
          text: "University should be free because poor students cannot pay high fees to study.",
          html: "<span class=\"token-base\">University should be free</span> because <span class=\"token-base\">poor students</span> cannot <span class=\"token-base\">pay high fees</span> to study.",
          ta: 6.0, cc: 6.0, lr: 5.5, gra: 6.0,
          burmese: "အလွန်ရိုးစင်းသော အဆင့်ဖြစ်ပြီး 'poor students', 'pay high fees' ဟူသော စကားပြောဟန် ဝေါဟာရများ ဖြစ်သည်။"
        },
        7.0: {
          band: "7.0",
          text: "Tertiary education should be subsidised by governments to ensure equal opportunities for underprivileged students.",
          html: "<span class=\"token-lr\">Tertiary education</span> should be <span class=\"token-lr\">subsidised by governments</span> to ensure <span class=\"token-lr\">equal opportunities</span> for <span class=\"token-lr\">underprivileged students</span>.",
          ta: 7.0, cc: 7.0, lr: 7.5, gra: 7.0,
          burmese: "Passive voice နှင့် 'tertiary education', 'subsidised', 'underprivileged' စသည့် ပညာရပ်ဆန်သော စကားလုံးများ ပါဝင်လာသည်။"
        },
        8.5: {
          band: "8.5",
          text: "State-sponsored tertiary subsidisation is imperative to democratise academic accession and mitigate systemic socioeconomic disparities.",
          html: "<span class=\"token-lr\">State-sponsored tertiary subsidisation</span> is <span class=\"token-lr\">imperative</span> to <span class=\"token-lr\">democratise academic accession</span> and <span class=\"token-lr\">mitigate systemic socioeconomic disparities</span>.",
          ta: 8.5, cc: 8.5, lr: 9.0, gra: 8.5,
          burmese: "High-level Academic Collocations ('democratise academic accession', 'mitigate systemic disparities') ဖြင့် Band 8.5 Lexical Resource အမှတ်ပြည့် ရရှိသည်။"
        },
        9.0: {
          band: "9.0",
          text: "It is through the comprehensive subsidisation of higher education that nation-states can dismantle entrenched class barriers and cultivate meritocratic socioeconomic mobility.",
          html: "<span class=\"token-gra\">It is through</span> the <span class=\"token-lr\">comprehensive subsidisation</span> of higher education <span class=\"token-gra\">that nation-states can</span> <span class=\"token-lr\">dismantle entrenched class barriers</span> and <span class=\"token-lr\">cultivate meritocratic socioeconomic mobility</span>.",
          ta: 9.0, cc: 9.0, lr: 9.0, gra: 9.0,
          burmese: "Cleft Focus Construction ('It is through X that Y can...') နှင့် C2 Collocations ('dismantle entrenched class barriers', 'cultivate meritocratic mobility') ပေါင်းစပ်ထားသည်။"
        }
      }
    },
    {
      id: "urban_traffic",
      category: "Urban Planning & Transport",
      topic: "Traffic Congestion & Transit Networks",
      bands: {
        6.0: {
          band: "6.0",
          text: "There are too many cars on the road, which causes big traffic jams every day.",
          html: "There are <span class=\"token-base\">too many cars</span> on the road, which causes <span class=\"token-base\">big traffic jams</span> every day.",
          ta: 6.0, cc: 6.0, lr: 5.5, gra: 6.0,
          burmese: "'big traffic jams', 'too many cars' စသည့် အခြေခံဝေါဟာရများ ဖြစ်ပြီး သာမန် Relative clause သာ ရှိသည်။"
        },
        7.0: {
          band: "7.0",
          text: "Excessive vehicular density leads to severe traffic congestion in metropolitan centers during peak hours.",
          html: "<span class=\"token-lr\">Excessive vehicular density</span> leads to <span class=\"token-lr\">severe traffic congestion</span> in <span class=\"token-lr\">metropolitan centers</span> during peak hours.",
          ta: 7.0, cc: 7.0, lr: 7.5, gra: 7.0,
          burmese: "'vehicular density', 'metropolitan centers' ကဲ့သို့သော Band 7+ Topic-specific vocabulary သုံးထားသည်။"
        },
        8.5: {
          band: "8.5",
          text: "Chronic gridlock in metropolitan epicentres stems predominantly from inadequate public transit infrastructure coupled with exponential commuter density.",
          html: "<span class=\"token-lr\">Chronic gridlock</span> in <span class=\"token-lr\">metropolitan epicentres</span> stems predominantly from <span class=\"token-lr\">inadequate public transit infrastructure</span> <span class=\"token-cc\">coupled with</span> <span class=\"token-lr\">exponential commuter density</span>.",
          ta: 8.5, cc: 8.5, lr: 9.0, gra: 8.5,
          burmese: "Precise Academic Verb & Collocations ('chronic gridlock', 'metropolitan epicentres', 'coupled with exponential density') ဖြင့် အဆင့်မြင့်တင်ထားသည်။"
        },
        9.0: {
          band: "9.0",
          text: "Were municipal administrations to implement stringent congestion tariffs in tandem with rapid-transit expansion, the chronic paralysis of urban commuter arteries would be significantly alleviated.",
          html: "<span class=\"token-gra\">Were municipal administrations to implement</span> <span class=\"token-lr\">stringent congestion tariffs</span> <span class=\"token-cc\">in tandem with</span> rapid-transit expansion, the <span class=\"token-lr\">chronic paralysis</span> of <span class=\"token-lr\">urban commuter arteries</span> <span class=\"token-gra\">would be significantly alleviated</span>.",
          ta: 9.0, cc: 9.0, lr: 9.0, gra: 9.0,
          burmese: "Second Conditional Inversion ('Were administrations to implement...') နှင့် Metaphorical Academic Lexicon ('chronic paralysis of urban commuter arteries') ဖြင့် ပြီးပြည့်စုံသော Band 9.0 ဖြစ်သည်။"
        }
      }
    },
    {
      id: "cult_global",
      category: "Culture & Globalisation",
      topic: "Westernization & Indigenous Heritage",
      bands: {
        6.0: {
          band: "6.0",
          text: "Western culture is spreading everywhere and young people forget their traditions.",
          html: "<span class=\"token-base\">Western culture</span> is <span class=\"token-base\">spreading everywhere</span> and <span class=\"token-base\">young people forget</span> their traditions.",
          ta: 6.0, cc: 5.5, lr: 5.5, gra: 5.5,
          burmese: "စကားပြောသံပေါက်နေပြီး 'spreading everywhere', 'young people forget' စသည့် မရေရာသော အသုံးများ ပါဝင်သည်။"
        },
        7.0: {
          band: "7.0",
          text: "Western media influences youth globally, leading to the gradual erosion of local cultural customs.",
          html: "Western media influences youth globally, <span class=\"token-gra\">leading to the gradual erosion</span> of <span class=\"token-lr\">local cultural customs</span>.",
          ta: 7.0, cc: 7.0, lr: 7.5, gra: 7.0,
          burmese: "'gradual erosion of cultural customs' ဟူသော collocation ပါဝင်လာပြီး Participle clause ချိတ်ဆက်မှု ကောင်းမွန်သည်။"
        },
        8.5: {
          band: "8.5",
          text: "The pervasive homogenisation of western cultural paradigms threatens to dilute indigenous linguistic and artistic heritage amongst impressionable youths.",
          html: "The <span class=\"token-lr\">pervasive homogenisation</span> of western <span class=\"token-lr\">cultural paradigms</span> <span class=\"token-lr\">threatens to dilute</span> <span class=\"token-lr\">indigenous linguistic and artistic heritage</span> amongst <span class=\"token-lr\">impressionable youths</span>.",
          ta: 8.5, cc: 8.5, lr: 9.0, gra: 8.5,
          burmese: "C2 Abstract Academic Lexicon ('pervasive homogenisation', 'cultural paradigms', 'threatens to dilute indigenous heritage') ဖြင့် ခြွင်းချက်မရှိ Band 8.5+ ရရှိစေသည်။"
        },
        9.0: {
          band: "9.0",
          text: "Scarcely can contemporary societies safeguard their ancestral heritage without proactively insulating domestic cultural traditions against the homogenising tide of western globalisation.",
          html: "<span class=\"token-gra\">Scarcely can contemporary societies</span> <span class=\"token-lr\">safeguard their ancestral heritage</span> without <span class=\"token-gra\">proactively insulating</span> <span class=\"token-lr\">domestic cultural traditions</span> against the <span class=\"token-lr\">homogenising tide of western globalisation</span>.",
          ta: 9.0, cc: 9.0, lr: 9.0, gra: 9.0,
          burmese: "Negative Inversion ('Scarcely can... safeguard') ဖြင့် စတင်ထားသော Complex Periodic Sentence ဖွဲ့စည်းပုံ ဖြစ်သည်။"
        }
      }
    }
  ];

  let currentScenarioIdx = 0;
  let currentBandStep = 8.5;

  window.initBandTransformationSlider = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    window.renderTransformationSliderWidget(containerId);
  };

  window.selectTransformationScenario = function(idx, containerId) {
    currentScenarioIdx = parseInt(idx, 10) || 0;
    window.renderTransformationSliderWidget(containerId || 'bandTransformationContainer');
  };

  window.setTransformationBandStep = function(step, containerId) {
    currentBandStep = parseFloat(step) || 8.5;
    window.renderTransformationSliderWidget(containerId || 'bandTransformationContainer');
  };

  window.renderTransformationSliderWidget = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const scenario = TRANSFORMATION_SCENARIOS[currentScenarioIdx] || TRANSFORMATION_SCENARIOS[0];
    const bandKey = currentBandStep >= 9.0 ? '9.0' : currentBandStep >= 8.5 ? '8.5' : currentBandStep >= 7.0 ? '7.0' : '6.0';
    const currentData = scenario.bands[bandKey] || scenario.bands['8.5'];

    // Band step colors
    const bandColors = {
      '6.0': '#94A3B8',
      '7.0': '#0284C7',
      '8.5': '#10B981',
      '9.0': '#F59E0B'
    };
    const activeColor = bandColors[bandKey] || '#10B981';

    container.innerHTML = `
      <div class="transformation-widget-card" style="padding:22px; background:var(--bg-card); border:1.5px solid ${activeColor}; border-radius:12px; box-shadow:0 6px 24px rgba(0,0,0,0.25); position:relative; overflow:hidden;">
        
        <!-- Header & Scenario Dropdown -->
        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
              <span class="occ-ver-pill" style="background:${activeColor}; color:#FFF; font-weight:900; font-size:0.72rem; padding:3px 8px; border-radius:6px; white-space:nowrap; display:inline-block; flex-shrink:0;">BAND MUTATION LAB</span>
              <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:600;">Interactive Band 6.0 &rarr; 8.5+</span>
            </div>
            <h3 style="margin:0; font-size:1.12rem; font-weight:800; color:var(--text); line-height:1.35;">Examiner Syntax &amp; Lexical Transformation</h3>
            <div style="font-size:0.78rem; color:var(--text-secondary); margin-top:4px; line-height:1.45;">
              Slide to observe how Cambridge criteria transform basic ideas into Band 8.5/9.0 mastery.
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; background:rgba(0,0,0,0.03); padding:8px 12px; border-radius:8px; border:1px solid var(--border);">
            <label style="font-size:0.75rem; color:var(--text-secondary); font-weight:800; white-space:nowrap;">TOPIC SELECTOR:</label>
            <select class="occ-select" style="font-size:0.8rem; padding:5px 10px; flex:1; min-width:200px; max-width:100%; border-radius:6px;" onchange="window.selectTransformationScenario(this.value, '${containerId}')">
              ${TRANSFORMATION_SCENARIOS.map((s, i) => `
                <option value="${i}" ${i === currentScenarioIdx ? 'selected' : ''}>${escapeHtml(s.category)}: ${escapeHtml(s.topic)}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Interactive Range Slider -->
        <div style="background:var(--bg); border:1px solid var(--border); border-radius:10px; padding:16px; margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:0.75rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.04em;">Target Band Slider</span>
            <span style="font-size:1.1rem; font-weight:900; color:${activeColor}; font-family:monospace;">BAND ${currentData.band} ${currentData.band === '9.0' ? 'C2 EXPERT' : currentData.band === '8.5' ? 'C2 MASTERY' : currentData.band === '7.0' ? 'C1 ADVANCED' : 'B2 COMPETENT'}</span>
          </div>

          <div style="position:relative; margin:14px 0 10px 0;">
            <input type="range" min="6.0" max="9.0" step="0.5" value="${currentBandStep}" 
              style="width:100%; height:8px; accent-color:${activeColor}; cursor:pointer;" 
              oninput="window.setTransformationBandStep(this.value, '${containerId}')" aria-label="Band score slider">
            <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-secondary); font-weight:800; font-family:monospace; margin-top:6px;">
              <span style="cursor:pointer; ${bandKey === '6.0' ? 'color:#94A3B8; font-weight:900;' : ''}" onclick="window.setTransformationBandStep(6.0, '${containerId}')">Band 6.0</span>
              <span style="cursor:pointer; ${bandKey === '7.0' ? 'color:#0284C7; font-weight:900;' : ''}" onclick="window.setTransformationBandStep(7.0, '${containerId}')">Band 7.0</span>
              <span style="cursor:pointer; ${bandKey === '8.5' ? 'color:#10B981; font-weight:900;' : ''}" onclick="window.setTransformationBandStep(8.5, '${containerId}')">Band 8.5</span>
              <span style="cursor:pointer; ${bandKey === '9.0' ? 'color:#F59E0B; font-weight:900;' : ''}" onclick="window.setTransformationBandStep(9.0, '${containerId}')">Band 9.0</span>
            </div>
          </div>
        </div>

        <!-- Live Sentence Display Box with Token Highlights -->
        <div style="margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:0.75rem; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">Mutated Cambridge Payload:</span>
            <div style="display:flex; gap:8px; font-size:0.7rem;">
              <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:2px; background:#10B981; display:inline-block;"></span> Lexical C1/C2</span>
              <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:2px; background:#8B5CF6; display:inline-block;"></span> Inversion/GRA</span>
              <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:2px; background:#0284C7; display:inline-block;"></span> Cohesion/CC</span>
            </div>
          </div>

          <div style="padding:18px 20px; background:var(--bg); border:1.5px solid var(--border-accent); border-radius:8px; font-size:1.02rem; line-height:1.75; color:var(--text); font-family:Georgia, serif; min-height:68px;">
            "${currentData.html}"
          </div>
        </div>

        <!-- 4-Axis Examiner Sub-Score Telemetry -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; margin-bottom:16px;">
          <div style="padding:8px 10px; background:var(--bg); border:1px solid var(--border); border-radius:6px; text-align:center;">
            <div style="font-size:0.68rem; color:var(--text-secondary); font-weight:700;">TASK RESPONSE</div>
            <div style="font-size:1.15rem; font-weight:900; color:${activeColor}; font-family:monospace;">${currentData.ta.toFixed(1)}</div>
          </div>
          <div style="padding:8px 10px; background:var(--bg); border:1px solid var(--border); border-radius:6px; text-align:center;">
            <div style="font-size:0.68rem; color:var(--text-secondary); font-weight:700;">COHESION &amp; COHERENCE</div>
            <div style="font-size:1.15rem; font-weight:900; color:${activeColor}; font-family:monospace;">${currentData.cc.toFixed(1)}</div>
          </div>
          <div style="padding:8px 10px; background:var(--bg); border:1px solid var(--border); border-radius:6px; text-align:center;">
            <div style="font-size:0.68rem; color:var(--text-secondary); font-weight:700;">LEXICAL RESOURCE</div>
            <div style="font-size:1.15rem; font-weight:900; color:${activeColor}; font-family:monospace;">${currentData.lr.toFixed(1)}</div>
          </div>
          <div style="padding:8px 10px; background:var(--bg); border:1px solid var(--border); border-radius:6px; text-align:center;">
            <div style="font-size:0.68rem; color:var(--text-secondary); font-weight:700;">GRAMMATICAL RANGE</div>
            <div style="font-size:1.15rem; font-weight:900; color:${activeColor}; font-family:monospace;">${currentData.gra.toFixed(1)}</div>
          </div>
        </div>

        <!-- Burmese Examiner Rationale -->
        <div style="padding:12px 14px; background:linear-gradient(135deg, rgba(217,119,6,0.06), rgba(217,119,6,0.02)); border:1px solid rgba(217,119,6,0.25); border-radius:8px; margin-bottom:14px;">
          <div style="font-size:0.75rem; font-weight:800; color:#D97706; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
            <svg class="ui-icon ui-icon-xs"><use href="#lucide-search"/></svg> EXAMINER DIAGNOSTIC SURGERY // မြန်မာသုံးသပ်ချက်:
          </div>
          <div class="burmese" style="font-size:0.84rem; color:var(--text); line-height:1.6;">
            ${escapeHtml(currentData.burmese)}
          </div>
        </div>

        <!-- Action Row -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <span style="font-size:0.75rem; color:var(--text-secondary);">
            Scenario ${currentScenarioIdx + 1} of ${TRANSFORMATION_SCENARIOS.length}
          </span>
          <div style="display:flex; gap:8px;">
            <button class="btn-outlined" style="padding:6px 12px; font-size:0.78rem;" onclick="window.copyTransformationText('${currentData.text.replace(/'/g, "\\'")}')">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-copy"/></svg> Copy Text
            </button>
            <button class="btn-accent-solid" style="padding:6px 14px; font-size:0.78rem; font-weight:700;" onclick="window.sendTransformationToWritingLab('${currentData.text.replace(/'/g, "\\'")}')">
              <svg class="ui-icon ui-icon-xs"><use href="#lucide-pen-tool"/></svg> Insert into Writing Lab &rarr;
            </button>
          </div>
        </div>

      </div>
    `;
  };

  window.copyTransformationText = function(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      if (typeof window.showToast === 'function') window.showToast('Copied transformed sentence to clipboard!');
    }
  };

  window.sendTransformationToWritingLab = function(text) {
    if (typeof window.switchView === 'function') {
      window.switchView('writing');
    }
    const editor = document.getElementById('we-input') || document.getElementById('writingEditorInput');
    if (editor) {
      editor.value = (editor.value ? editor.value + '\n\n' : '') + text;
      editor.dispatchEvent(new Event('input'));
      if (typeof window.showToast === 'function') window.showToast('Transformed sentence inserted into Writing Lab!');
    }
  };

  // ==========================================
  // 4.2: OBSIDIAN & GOLD FELLOW PRESTIGE THEME
  // ==========================================

  window.togglePrestigeTheme = function() {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'obsidian-gold') {
      window.setPrestigeTheme('dark');
      if (typeof window.showToast === 'function') window.showToast('Switched to Classic Dark mode.');
    } else {
      window.setPrestigeTheme('obsidian-gold');
      if (typeof window.showToast === 'function') window.showToast('Obsidian & Gold Fellow Prestige Theme Activated!');
    }
  };

  window.setPrestigeTheme = function(themeName) {
    if (window.appState) {
      window.appState.theme = themeName;
      if (typeof window.saveAppState === 'function') window.saveAppState();
    }
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('ips_theme', themeName);

    const lbl = document.getElementById('themeLabel');
    if (lbl) {
      if (themeName === 'obsidian-gold') lbl.textContent = 'Gold';
      else if (themeName === 'dark') lbl.textContent = 'Dark';
      else lbl.textContent = 'Light';
    }

    // Refresh radar or visual components if available
    if (typeof window.renderConstellation === 'function' && window.appState) {
      window.renderConstellation(window.appState.activeGraphWordId);
    }
  };

  // ==========================================
  // 4.3: INFINITE FOCUS HEARTS & 2X XP MULTIPLIER
  // ==========================================

  window.initFocusHeartsAndXpHud = function() {
    const mount = document.getElementById('duoTopHudMount');
    if (!mount) return;

    const isVip = typeof window.isVipActive === 'function' ? window.isVipActive() : false;
    
    // Hearts state
    let hearts = 5;
    try {
      const stored = localStorage.getItem('ips_focus_hearts');
      if (stored !== null) hearts = parseInt(stored, 10);
    } catch(e) {}

    // XP calculation
    let mastered = 0, reading = 0, writing = 0, drillBest = 0;
    try {
      if (window.appState) {
        mastered = window.appState.mastered ? window.appState.mastered.size : 0;
        reading = window.appState.completedReadingMocks ? window.appState.completedReadingMocks.size : 0;
        writing = window.appState.completedWritingMocks ? window.appState.completedWritingMocks.size : 0;
        drillBest = window.appState.drillBest || 0;
      }
    } catch(e) {}

    const baseScore = (mastered * 10) + (reading * 50) + (writing * 60) + (drillBest * 5);
    const multiplier = isVip ? 2 : 1;
    const totalXp = Math.max(120, baseScore * multiplier);

    mount.innerHTML = `
      <div style="display:inline-flex; align-items:center; gap:8px; margin-right:4px;">
        <!-- Focus Hearts Pill -->
        <div class="hud-hearts-pill" style="display:inline-flex; align-items:center; gap:4px; padding:3px 9px; background:var(--bg); border:1px solid ${isVip ? '#D97706' : 'var(--border)'}; border-radius:9999px; font-size:0.75rem; font-weight:800; cursor:pointer;" onclick="window.showHeartsInfoModal()" title="${isVip ? 'VIP Privilege: Infinite Focus Hearts Active' : 'Focus Hearts: ' + hearts + '/5. Wrong answers deduct 1 heart.'}">
          <svg class="ui-icon ui-icon-xs" style="color:#EF4444;"><use href="#lucide-heart"/></svg>
          <span style="color:${isVip ? '#D97706' : 'var(--text)'}; font-size:${isVip ? '0.95rem' : '0.78rem'}; font-weight:900;">
            ${isVip ? '&infin;' : hearts + '/5'}
          </span>
        </div>

        <!-- 2x XP Multiplier Pill -->
        <div class="hud-xp-pill" style="display:inline-flex; align-items:center; gap:5px; padding:3px 10px; background:${isVip ? 'linear-gradient(135deg, rgba(217,119,6,0.18), rgba(245,158,11,0.06))' : 'var(--bg)'}; border:1px solid ${isVip ? '#D97706' : 'var(--border)'}; border-radius:9999px; font-size:0.75rem; font-weight:800; cursor:pointer;" onclick="window.showXpMultiplierModal()" title="${isVip ? 'Cambridge Fellow: 2x XP Multiplier Active on All Mocks & Drills!' : 'Cambridge XP: ' + totalXp.toLocaleString()}">
          <svg class="ui-icon ui-icon-xs" style="color:#F59E0B;"><use href="#lucide-zap"/></svg>
          <span style="color:var(--text); font-family:monospace; font-weight:800;">${totalXp.toLocaleString()}</span>
          ${isVip ? '<span style="background:#D97706; color:#FFF; font-size:0.65rem; padding:1px 5px; border-radius:4px; font-weight:900;">2x VIP</span>' : '<span style="font-size:0.68rem; color:var(--text-secondary);">XP</span>'}
        </div>
      </div>
    `;
  };

  window.deductFocusHeart = function() {
    const isVip = typeof window.isVipActive === 'function' ? window.isVipActive() : false;
    if (isVip) {
      return true; // VIP has infinite hearts
    }
    let hearts = 5;
    try {
      const stored = localStorage.getItem('ips_focus_hearts');
      if (stored !== null) hearts = parseInt(stored, 10);
    } catch(e) {}

    hearts = Math.max(0, hearts - 1);
    localStorage.setItem('ips_focus_hearts', String(hearts));
    window.initFocusHeartsAndXpHud();

    if (hearts === 0) {
      if (typeof window.showToast === 'function') {
        window.showToast('You ran out of focus hearts! Unlock Infinite Hearts with VIP Pass.');
      }
    }
    return hearts > 0;
  };

  window.showHeartsInfoModal = function() {
    const isVip = typeof window.isVipActive === 'function' ? window.isVipActive() : false;
    if (isVip) {
      if (typeof window.showToast === 'function') {
        window.showToast('VIP Active: You have Infinite Focus Hearts and Streak Freeze protection!');
      }
    } else {
      if (typeof window.openVipPassModal === 'function') {
        window.openVipPassModal();
      }
    }
  };

  window.showXpMultiplierModal = function() {
    const isVip = typeof window.isVipActive === 'function' ? window.isVipActive() : false;
    if (isVip) {
      if (typeof window.showToast === 'function') {
        window.showToast('2x XP Multiplier Active! You earn double Cambridge XP for every drill & mock.');
      }
    } else {
      if (typeof window.openVipPassModal === 'function') {
        window.openVipPassModal();
      }
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
