import os
import sys

def patch_index():
    path = r'c:\Users\lyan1\Documents\antigravity\ielts-prep-studio\index.html'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update isVipActive to check window.radarData.isVip
    target_is_vip = '''  if (window.isVipUser) return true;

  try {
    if (typeof localStorage !== "undefined" && (localStorage.getItem("ips_vip_active") === "true" || localStorage.getItem("occ_vip_voucher"))) {'''
    replacement_is_vip = '''  if (window.isVipUser) return true;

  if (typeof window !== "undefined" && window.radarData && window.radarData.isVip) {
    window.isVipUser = true;
    return true;
  }

  try {
    if (typeof localStorage !== "undefined" && (localStorage.getItem("ips_vip_active") === "true" || localStorage.getItem("occ_vip_voucher"))) {'''

    if target_is_vip in content:
        content = content.replace(target_is_vip, replacement_is_vip, 1)
        print("SUCCESS: Patched isVipActive in index.html")
    else:
        print("WARNING: target_is_vip not found in index.html")

    # 2. Update Telegram init in DOMContentLoaded for instant syncServerless
    target_tg_init = '''          if (String(tg.initDataUnsafe.user.id) === String(window.ADMIN_TG_ID || "7468650530")) {
            window.isVipUser = true;
            try {
              localStorage.setItem("ips_vip_active", "true");
              
            } catch (e) {}
          }
          if (typeof updateAuthUI === 'function') updateAuthUI();'''

    replacement_tg_init = '''          if (String(tg.initDataUnsafe.user.id) === String(window.ADMIN_TG_ID || "7468650530")) {
            window.isVipUser = true;
            try {
              localStorage.setItem("ips_vip_active", "true");
            } catch (e) {}
          }
          // Universal Instant Cloud VIP Check for ALL users on launch
          if (window.StorageManager && typeof window.StorageManager.syncServerless === "function") {
            window.StorageManager.syncServerless(window.appState).then(res => {
              if (res && res.isVip) {
                window.isVipUser = true;
                try { localStorage.setItem("ips_vip_active", "true"); } catch (e) {}
                if (typeof updateAuthUI === 'function') updateAuthUI();
                if (typeof refreshAllVipViews === 'function') refreshAllVipViews();
              }
            }).catch(() => {});
          }
          if (typeof updateAuthUI === 'function') updateAuthUI();'''

    if target_tg_init in content:
        content = content.replace(target_tg_init, replacement_tg_init, 1)
        print("SUCCESS: Patched Telegram DOMContentLoaded in index.html")
    else:
        print("WARNING: target_tg_init not found in index.html")

    # 3. Update the Radar Script section
    radar_start = '// Central Feed Loader\nasync function fetchRadarData() {'
    if radar_start not in content:
        radar_start = 'async function fetchRadarData() {'
    
    radar_end = '</script>\n\n</body>\n</html>'

    s_idx = content.find(radar_start)
    e_idx = content.find(radar_end)

    if s_idx == -1 or e_idx == -1:
        print("ERROR: Could not find radar script section in index.html")
        return False

    new_radar_script = '''async function fetchRadarData() {
  if (window.radarData) return window.radarData;

  const cached = localStorage.getItem('ips_radar_cache');
  if (cached) {
    try {
      window.radarData = JSON.parse(cached);
      if (window.radarData && window.radarData.isVip) {
        window.isVipUser = true;
        try { localStorage.setItem('ips_vip_active', 'true'); } catch(e){}
      }
    } catch(e){}
  }

  try {
    let userId = '';
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
      userId = String(window.Telegram.WebApp.initDataUnsafe.user.id);
    } else if (window.telegramUser && window.telegramUser.id) {
      userId = String(window.telegramUser.id);
    } else if (window.scholarUser && window.scholarUser.userId) {
      userId = String(window.scholarUser.userId);
    } else {
      userId = localStorage.getItem('ips_telegram_uid') || localStorage.getItem('ips_user_id') || '';
      if (!userId) {
        try {
          const auth = localStorage.getItem('ips_scholar_auth');
          if (auth) userId = String(JSON.parse(auth).userId || '');
        } catch(e){}
      }
    }

    const voucher = localStorage.getItem('occ_vip_voucher') || localStorage.getItem('ips_vip_voucher') || localStorage.getItem('ips_session_token') || '';
    const isClientVip = (typeof isVipActive === 'function' && isVipActive()) ? '1' : '0';

    const query = new URLSearchParams();
    if (userId) query.set('userId', userId);
    if (voucher) query.set('voucher', voucher);
    query.set('clientVip', isClientVip);

    const res = await fetch('/api/radar/feed?' + query.toString());
    if (res.ok) {
      const data = await res.json();
      window.radarData = data;
      localStorage.setItem('ips_radar_cache', JSON.stringify(data));

      // UNIVERSAL VIP AUTO-PROMOTION: If server confirms user is VIP from D1/vouchers/KV, promote client instantly!
      if (data && data.isVip) {
        window.isVipUser = true;
        try {
          localStorage.setItem('ips_vip_active', 'true');
        } catch(e){}
        if (typeof activateVipPass === 'function') {
          activateVipPass('lifetime', voucher || 'SERVER_VERIFIED_VIP', false);
        }
        if (typeof refreshAllVipViews === 'function') {
          refreshAllVipViews();
        }
      }
      return data;
    }
  } catch(err) {
    console.warn('[Radar Fetch Error]', err);
  }
  return window.radarData;
}

// =========================================================================
// 1. LIVE EXAM LEXICONS SUB-TAB (In #view-lexicon ONLY)
// =========================================================================
async function initLiveExamLexicons() {
  const mount = document.getElementById('liveLexiconMount');
  const vipMount = document.getElementById('lexiconRadarVipMount');
  if (!mount) return;

  const data = await fetchRadarData();
  const isVip = (typeof isVipActive === 'function' ? isVipActive() : false) || (data && data.isVip === true);

  if (vipMount) {
    vipMount.innerHTML = isVip
      ? `<div style="background:linear-gradient(135deg, #F59E0B, #D97706); color:#000; font-weight:800; font-size:0.74rem; padding:4px 12px; border-radius:20px; display:inline-flex; align-items:center; gap:5px; box-shadow:0 2px 6px rgba(245,158,11,0.25);">
           <svg class="ui-icon" style="color:#000; width:13px; height:13px;"><use href="#lucide-crown"/></svg> VIP UNLIMITED PASS ACTIVE
         </div>`
      : `<div style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.05); border:1px solid var(--border-mid); padding:4px 10px; border-radius:8px;">
           <span style="font-size:0.75rem; color:var(--text-secondary);">Free Scholar: Top 10 Words Unlocked</span>
           <button class="btn-accent-solid" onclick="openVipPassModal()" style="font-size:0.72rem; font-weight:800; padding:3px 9px; border-radius:4px; cursor:pointer;">Upgrade VIP</button>
         </div>`;
  }

  if (!data || !data.lexicon) {
    mount.innerHTML = `<div style="padding:24px; text-align:center; color:var(--text-muted); font-size:0.85rem;">Retrieving live exam vocabulary...</div>`;
    return;
  }

  renderLiveLexiconCards();
}

function filterLiveLexiconTab(filterName) {
  window.radarLexiconFilter = filterName || 'ALL';
  ['all', 'free', 'colloc', 'traps'].forEach(k => {
    const btn = document.getElementById('btn-lex-radar-' + k);
    if (btn) btn.classList.toggle('is-active', k.toUpperCase() === window.radarLexiconFilter);
  });
  renderLiveLexiconCards();
}

function handleLiveLexiconSearch(val) {
  window.radarLexiconSearch = (val || '').toLowerCase().trim();
  renderLiveLexiconCards();
}

function renderLiveLexiconCards() {
  const mount = document.getElementById('liveLexiconMount');
  if (!mount || !window.radarData) return;

  const isVip = (typeof isVipActive === 'function' ? isVipActive() : false) || (window.radarData && window.radarData.isVip === true);
  const filter = window.radarLexiconFilter;
  const q = window.radarLexiconSearch;

  const list = (window.radarData.lexicon || []).filter(item => {
    if (filter === 'FREE' && !item.is_free_sample) return false;
    if (filter === 'COLLOC' && (!item.collocations || !item.collocations.length)) return false;
    if (filter === 'TRAPS' && (!item.trap_notes || !item.trap_notes.length)) return false;

    if (q) {
      const matchWord = (item.word || '').toLowerCase().includes(q);
      const matchCat = (item.topic_category || '').toLowerCase().includes(q);
      const matchDef = (item.definition_en || '').toLowerCase().includes(q);
      const matchMm = (item.definition_mm || '').includes(q);
      return matchWord || matchCat || matchDef || matchMm;
    }
    return true;
  });

  if (list.length === 0) {
    mount.innerHTML = `<div style="padding:30px; text-align:center; color:var(--text-muted); font-size:0.86rem; border:1px dashed var(--border-mid); border-radius:8px;">No matching exam vocabulary found for this filter.</div>`;
    return;
  }

  let html = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:14px;">`;

  list.forEach(item => {
    const isLocked = item.locked && !isVip;

    if (isLocked) {
      html += `
        <div style="background:var(--bg-card); border:1px dashed var(--border-mid); border-radius:10px; padding:16px; box-sizing:border-box;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="display:flex; gap:6px; align-items:center;">
              <span class="occ-ver-pill" style="background:rgba(245,158,11,0.12); color:#F59E0B; border:none; font-size:0.65rem; font-weight:800; padding:1px 6px; border-radius:4px;">${escapeHtml(item.band_tier || 'BAND 8.0')}</span>
              <span style="font-size:0.7rem; color:var(--text-muted);">${escapeHtml(item.pos || 'n.')}</span>
            </div>
            <span style="font-size:0.7rem; color:#F59E0B; font-weight:800;">🔒 VIP LOCK</span>
          </div>

          <h3 style="font-size:1.1rem; font-weight:800; color:var(--text); margin:0 0 4px 0;">${escapeHtml(item.word)}</h3>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:8px;">${escapeHtml(item.phonetic || '')} &bull; ${escapeHtml(item.topic_category || '')}</div>

          <div style="font-size:0.83rem; color:var(--text); margin-bottom:4px; font-weight:600;">${escapeHtml(item.definition_en || '')}</div>
          <div style="font-size:0.82rem; color:var(--accent); margin-bottom:10px; font-weight:600;">${escapeHtml(item.definition_mm || '')}</div>

          <div style="background:rgba(0,0,0,0.25); border:1px solid var(--border-subtle); border-radius:6px; padding:10px; text-align:center;">
            <div style="font-size:0.74rem; color:var(--text-secondary); margin-bottom:6px;">Paraphrase bridges, academic collocations &amp; exam trap alerts locked</div>
            <button class="btn-accent-solid" onclick="openVipPassModal()" style="font-size:0.74rem; font-weight:800; padding:6px 12px; border-radius:5px; width:100%; box-sizing:border-box;">
              <svg class="ui-icon" style="color:var(--accent-gold);"><use href="#lucide-crown"/></svg> Unlock with VIP Pass
            </button>
          </div>
        </div>
      `;
      return;
    }

    // Unlocked Card (Universal VIP & Free Samples)
    const par = item.paraphrase || {};
    const collocList = item.collocations || [];

    html += `
      <div style="background:var(--bg-card); border:1px solid var(--border-mid); border-radius:10px; padding:16px; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="display:flex; gap:6px; align-items:center;">
              <span class="occ-ver-pill" style="background:rgba(245,158,11,0.12); color:#F59E0B; border:none; font-size:0.65rem; font-weight:800; padding:1px 6px; border-radius:4px;">${escapeHtml(item.band_tier || 'BAND 8.0')}</span>
              <span style="font-size:0.7rem; color:var(--text-muted);">${escapeHtml(item.pos || 'n.')}</span>
            </div>
            ${item.is_free_sample ? `<span style="font-size:0.68rem; color:#10B981; font-weight:800;">FREE SAMPLE</span>` : `<span style="font-size:0.68rem; color:#F59E0B; font-weight:800;">👑 VIP ACTIVE</span>`}
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
            <h3 style="font-size:1.15rem; font-weight:800; color:var(--text); margin:0;">${escapeHtml(item.word)}</h3>
            <button class="btn-icon" onclick="pronounceRadarWord('${escapeHtml(item.word)}')" title="Pronounce" style="padding:4px; border-radius:50%; background:rgba(255,255,255,0.06);">
              🔊
            </button>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:8px;">${escapeHtml(item.phonetic || '')} &bull; ${escapeHtml(item.topic_category || '')}</div>

          <div style="font-size:0.84rem; color:var(--text); margin-bottom:4px; font-weight:600; line-height:1.4;">${escapeHtml(item.definition_en || '')}</div>
          <div style="font-size:0.83rem; color:var(--accent); margin-bottom:10px; font-weight:600; line-height:1.4;">${escapeHtml(item.definition_mm || '')}</div>

          ${item.real_exam_sentence ? `
            <div style="background:rgba(255,255,255,0.03); border-left:2px solid var(--accent); padding:8px 10px; margin-bottom:10px; font-size:0.78rem; color:var(--text); line-height:1.45;">
              <span style="color:var(--text-muted); font-size:0.7rem; display:block; margin-bottom:2px;">Real Exam Context:</span>
              "${escapeHtml(item.real_exam_sentence)}"
            </div>
          ` : ''}

          ${collocList.length ? `
            <div style="margin-bottom:10px;">
              <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700; margin-bottom:4px; text-transform:uppercase;">Academic Collocations:</div>
              <div style="display:flex; flex-wrap:wrap; gap:4px;">
                ${collocList.map(c => `<span style="background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px; font-size:0.73rem; color:var(--text);">${escapeHtml(c)}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${(par.band6_5 || par.band9_0) ? `
            <div style="background:rgba(37,99,235,0.08); border:1px solid rgba(37,99,235,0.25); border-radius:6px; padding:8px 10px; margin-bottom:10px; font-size:0.76rem;">
              <div style="color:#60A5FA; font-weight:800; font-size:0.68rem; margin-bottom:2px;">BAND 6.5 &rarr; 8.5+ PARAPHRASE BRIDGE:</div>
              <div style="color:var(--text-muted);">Common: <span style="text-decoration:line-through;">${escapeHtml(par.band6_5 || '')}</span></div>
              <div style="color:var(--text); font-weight:700;">Band 8.5+: <span>${escapeHtml(par.band9_0 || '')}</span></div>
            </div>
          ` : ''}

          ${item.trap_notes ? `
            <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:6px; padding:6px 10px; margin-bottom:10px; font-size:0.74rem; color:#FCA5A5;">
              ⚠️ <strong>Exam Trap:</strong> ${escapeHtml(item.trap_notes)}
            </div>
          ` : ''}
        </div>

        <button class="btn-accent-solid" onclick="addRadarWordToSRS('${escapeHtml(item.word)}', '${escapeHtml(item.phonetic || '')}', '${escapeHtml(item.pos || '')}', '${escapeHtml(item.definition_en || '')}', '${escapeHtml(item.definition_mm || '')}')" style="font-size:0.75rem; padding:6px 10px; font-weight:800; border-radius:6px; width:100%; box-sizing:border-box; margin-top:8px;">
          + Add to 1-3-7 SRS Review
        </button>
      </div>
    `;
  });

  html += `</div>`;
  mount.innerHTML = html;
}

// =========================================================================
// 2. LIVE EXAM WRITING RECALLS SUB-TAB (In #view-writing ONLY)
// =========================================================================
async function initLiveExamWriting() {
  const mount = document.getElementById('liveWritingMount');
  const vipMount = document.getElementById('writingRadarVipMount');
  if (!mount) return;

  const data = await fetchRadarData();
  const isVip = (typeof isVipActive === 'function' ? isVipActive() : false) || (data && data.isVip === true);

  if (vipMount) {
    vipMount.innerHTML = isVip
      ? `<span style="background:linear-gradient(135deg, #F59E0B, #D97706); color:#000; font-weight:800; font-size:0.74rem; padding:4px 12px; border-radius:20px; display:inline-flex; align-items:center; gap:5px;">
           <svg class="ui-icon" style="color:#000; width:13px; height:13px;"><use href="#lucide-crown"/></svg> VIP ALL PROMPTS &amp; MODELS UNLOCKED
         </span>`
      : `<span style="font-size:0.75rem; color:var(--text-secondary);">Free Tier: Top 3 Prompts Unlocked &bull; <a href="javascript:void(0)" onclick="openVipPassModal()" style="color:var(--accent); font-weight:800;">Unlock All Models</a></span>`;
  }

  if (!data || !data.writing) {
    mount.innerHTML = `<div style="padding:24px; text-align:center; color:var(--text-muted); font-size:0.85rem;">Retrieving live writing exam recalls...</div>`;
    return;
  }

  let html = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:14px;">`;

  data.writing.forEach((w, idx) => {
    const isLocked = w.locked && !isVip;

    html += `
      <div style="background:var(--bg-card); border:1px solid var(--border-mid); border-radius:10px; padding:18px; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:8px; flex-wrap:wrap;">
            <div style="display:flex; gap:6px; align-items:center;">
              <span class="occ-ver-pill" style="background:#2563EB; color:#fff; border:none; font-size:0.65rem; font-weight:800; padding:1px 6px; border-radius:4px;">${escapeHtml(w.task_type || 'TASK 2')}</span>
              <span class="occ-ver-pill" style="background:rgba(245,158,11,0.12); color:#F59E0B; border:none; font-size:0.65rem; font-weight:800; padding:1px 6px; border-radius:4px;">Band ${w.band_score || 8.5} Model</span>
              <span style="font-size:0.7rem; color:var(--text-muted);">${escapeHtml(w.exam_date || '')}</span>
            </div>
            ${w.is_free_sample ? `<span style="font-size:0.68rem; color:#10B981; font-weight:800;">FREE SAMPLE</span>` : (isVip ? `<span style="font-size:0.68rem; color:#F59E0B; font-weight:800;">👑 VIP ACTIVE</span>` : `<span style="font-size:0.68rem; color:#F59E0B; font-weight:800;">🔒 VIP RECALL</span>`)}
          </div>

          <h3 style="font-size:1.05rem; font-weight:800; color:var(--text); margin:0 0 6px 0; line-height:1.4;">${escapeHtml(w.title)}</h3>
          <div style="font-size:0.76rem; color:var(--text-muted); margin-bottom:10px; font-weight:600;">Category: ${escapeHtml(w.topic_category || '')}</div>

          <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:6px; padding:12px; margin-bottom:12px; font-size:0.84rem; color:var(--text); line-height:1.55;">
            ${escapeHtml(w.prompt)}
          </div>
        </div>

        ${isLocked ? `
          <div style="background:rgba(0,0,0,0.25); border:1px solid var(--border-subtle); border-radius:6px; padding:12px; text-align:center;">
            <div style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:8px;">Band 8.5+ model essay &amp; criteria breakdown locked</div>
            <button class="btn-accent-solid" onclick="openVipPassModal()" style="font-size:0.78rem; font-weight:800; padding:8px 12px; border-radius:6px; width:100%; box-sizing:border-box;">
              <svg class="ui-icon" style="color:var(--accent-gold);"><use href="#lucide-crown"/></svg> Unlock Model Essay with VIP
            </button>
          </div>
        ` : `
          <div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
              <button class="btn-outlined" onclick="toggleRadarModelEssay('writing_essay_${idx}')" style="font-size:0.76rem; padding:5px 10px; font-weight:700;">
                👁 Toggle Band 8.5 Model Essay
              </button>
              <button class="btn-accent-solid" onclick="loadRadarWritingToDesk('${escapeHtml(w.id)}')" style="font-size:0.76rem; padding:5px 12px; font-weight:800; border-radius:5px;">
                ✍️ Practice in Writing Desk &rarr;
              </button>
            </div>

            <div id="writing_essay_${idx}" style="display:none; background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:12px; font-size:0.82rem; line-height:1.65; color:var(--text); white-space:pre-line; margin-top:8px;">
              ${escapeHtml(w.model_essay || '')}
            </div>
          </div>
        `}
      </div>
    `;
  });

  html += `</div>`;
  mount.innerHTML = html;
}

// =========================================================================
// 3. LIVE EXAM READING CBT RECALLS SUB-TAB (In #view-reading ONLY)
// =========================================================================
async function initLiveExamReading() {
  const mount = document.getElementById('liveReadingMount');
  const vipMount = document.getElementById('readingRadarVipMount');
  if (!mount) return;

  const data = await fetchRadarData();
  const isVip = (typeof isVipActive === 'function' ? isVipActive() : false) || (data && data.isVip === true);

  if (vipMount) {
    vipMount.innerHTML = isVip
      ? `<span style="background:linear-gradient(135deg, #F59E0B, #D97706); color:#000; font-weight:800; font-size:0.74rem; padding:4px 12px; border-radius:20px; display:inline-flex; align-items:center; gap:5px;">
           <svg class="ui-icon" style="color:#000; width:13px; height:13px;"><use href="#lucide-crown"/></svg> VIP ALL CBT PASSAGES UNLOCKED
         </span>`
      : `<span style="font-size:0.75rem; color:var(--text-secondary);">Free Tier: Top 2 Passages Unlocked &bull; <a href="javascript:void(0)" onclick="openVipPassModal()" style="color:var(--accent); font-weight:800;">Unlock All Passages</a></span>`;
  }

  if (!data || !data.reading) {
    mount.innerHTML = `<div style="padding:24px; text-align:center; color:var(--text-muted); font-size:0.85rem;">Retrieving live reading exam recalls...</div>`;
    return;
  }

  let html = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:14px;">`;

  data.reading.forEach(r => {
    const isLocked = r.locked && !isVip;

    html += `
      <div style="background:var(--bg-card); border:1px solid var(--border-mid); border-radius:10px; padding:18px; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:8px; flex-wrap:wrap;">
            <div style="display:flex; gap:6px; align-items:center;">
              <span class="occ-ver-pill" style="background:#10B981; color:#fff; border:none; font-size:0.65rem; font-weight:800; padding:1px 6px; border-radius:4px;">READING P${r.passage_number || 1}</span>
              <span class="occ-ver-pill" style="background:rgba(245,158,11,0.12); color:#F59E0B; border:none; font-size:0.65rem; font-weight:800; padding:1px 6px; border-radius:4px;">${escapeHtml(r.difficulty || 'Band 7.5')}</span>
              <span style="font-size:0.7rem; color:var(--text-muted);">${escapeHtml(r.exam_date || '')}</span>
            </div>
            ${r.is_free_sample ? `<span style="font-size:0.68rem; color:#10B981; font-weight:800;">FREE FULL TEST</span>` : (isVip ? `<span style="font-size:0.68rem; color:#F59E0B; font-weight:800;">👑 VIP ACTIVE</span>` : `<span style="font-size:0.68rem; color:#F59E0B; font-weight:800;">🔒 VIP TEST</span>`)}
          </div>

          <h3 style="font-size:1.05rem; font-weight:800; color:var(--text); margin:0 0 6px 0; line-height:1.4;">${escapeHtml(r.title)}</h3>
          <div style="font-size:0.76rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Category: ${escapeHtml(r.category || '')} &bull; Types: ${escapeHtml(r.question_types || '')}</div>
        </div>

        ${isLocked ? `
          <div style="background:rgba(0,0,0,0.25); border:1px solid var(--border-subtle); border-radius:6px; padding:14px; text-align:center; margin-top:8px;">
            <div style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:8px;">Passage paragraphs, question battery &amp; bilingual answers locked</div>
            <button class="btn-accent-solid" onclick="openVipPassModal()" style="font-size:0.78rem; font-weight:800; padding:8px 12px; border-radius:6px; width:100%; box-sizing:border-box;">
              <svg class="ui-icon" style="color:var(--accent-gold);"><use href="#lucide-crown"/></svg> Unlock All CBT Recalls with VIP
            </button>
          </div>
        ` : `
          <div style="margin-top:8px;">
            <div style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:12px; line-height:1.5;">
              Includes ${(r.paragraphs||[]).length} sections with complete paragraph summaries in Burmese and ${(r.questions||[]).length} interactive CBT questions with explanation citations.
            </div>
            <button class="btn-accent-solid" onclick="launchRadarReadingCbt('${escapeHtml(r.id)}')" style="font-size:0.78rem; padding:8px 14px; font-weight:800; border-radius:6px; width:100%; box-sizing:border-box;">
              📖 Start CBT Simulation Practice &rarr;
            </button>
          </div>
        `}
      </div>
    `;
  });

  html += `</div>`;
  mount.innerHTML = html;
}

// Utility Helpers
function toggleRadarModelEssay(divId) {
  const el = document.getElementById(divId);
  if (el) el.style.display = (el.style.display === 'none') ? 'block' : 'none';
}

function pronounceRadarWord(word) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-GB';
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}

function addRadarWordToSRS(word, phonetic, pos, defEn, defMm) {
  try {
    let srs = JSON.parse(localStorage.getItem('vocabSRS') || '{}');
    const now = Date.now();
    srs[word] = {
      word: word,
      phonetic: phonetic || '',
      pos: pos || 'n.',
      definition: defEn || '',
      burmese: defMm || '',
      interval: 1,
      nextReview: now + 86400000,
      history: [{ date: now, rating: 'good' }]
    };
    localStorage.setItem('vocabSRS', JSON.stringify(srs));
    if (typeof showToast === 'function') {
      showToast(`⚡ Added "${word}" to your 1-3-7 Spaced Repetition deck!`);
    } else {
      alert(`⚡ Added "${word}" to your 1-3-7 Spaced Repetition deck!`);
    }
  } catch(e) {
    console.warn('[SRS Add Error]', e);
  }
}

function loadRadarWritingToDesk(id) {
  if (!window.radarData || !window.radarData.writing) return;
  const item = window.radarData.writing.find(w => w.id === id);
  if (!item) return;

  if (typeof switchView === 'function') switchView('writing');
  if (typeof switchSubTab === 'function') switchSubTab('writing', 'desk');

  setTimeout(() => {
    const promptInput = document.getElementById('wCustomPrompt') || document.getElementById('wPromptInput') || document.getElementById('wPromptArea');
    if (promptInput) {
      promptInput.value = item.prompt;
    }
    const select = document.getElementById('wSelect');
    if (select) {
      let opt = Array.from(select.options).find(o => o.value === item.id);
      if (!opt) {
        opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `[Live Recall] ${item.title}`;
        select.prepend(opt);
      }
      select.value = item.id;
    }

    if (typeof showToast === 'function') {
      showToast(`✍️ Loaded "${item.title}" into Writing Desk!`);
    }
  }, 100);
}

function launchRadarReadingCbt(id) {
  if (!window.radarData || !window.radarData.reading) return;
  const item = window.radarData.reading.find(r => r.id === id);
  if (!item) return;

  if (typeof switchView === 'function') switchView('reading');
  if (typeof switchSubTab === 'function') switchSubTab('reading', 'reading');

  setTimeout(() => {
    if (typeof window.loadCustomReadingPassage === 'function') {
      window.loadCustomReadingPassage(item);
    } else if (typeof READING_DATA !== 'undefined' && Array.isArray(READING_DATA)) {
      const existing = READING_DATA.find(p => p.id === item.id);
      if (!existing) {
        READING_DATA.unshift({
          id: item.id,
          code: `RECALL ${item.passage_number || 1}`,
          title: item.title,
          category: item.category,
          difficulty: item.difficulty,
          questionTypes: item.question_types,
          paragraphs: item.paragraphs || [],
          questions: item.questions || []
        });
      }
      if (typeof renderReadingSelector === 'function') renderReadingSelector();
      if (typeof loadReadingPassage === 'function') loadReadingPassage(item.id);
    }

    if (typeof showToast === 'function') {
      showToast(`📖 Loaded "${item.title}" into Reading CBT Simulator!`);
    }
  }, 100);
}
'''

    new_content = content[:s_idx] + new_radar_script + content[e_idx:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS: Updated index.html with universal client VIP recognition.")
    return True

if __name__ == '__main__':
    patch_index()
