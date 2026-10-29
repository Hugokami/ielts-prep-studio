/**
 * IELTS Prep Studio - Academic Collocations & Idioms Master Bank
 * Integrates:
 * - 500 Advanced Academic Words (Reading C1/C2)
 * - 200 Speaking Idioms (with spoken examples)
 * - 200 Writing/Speaking Collocations (with academic sentences)
 * - 195 Topic Collocations (7 academic domains)
 */

(function(window) {
  'use strict';

  let ADVANCED_WORDS = [];
  let IDIOMS_BANK = [];
  let COLLOCATIONS_BANK = [];
  let TOPIC_COLLOCATIONS = {};
  let currentFilter = 'all'; // 'all', 'reading500', 'idioms', 'collocations', 'topics'
  let activeSearchTerm = '';

  window.initCollocationsMasterBank = async function(mountId) {
    const targetId = mountId || 'atCollocationsMount';
    const container = document.getElementById(targetId);
    if (!container) return;

    try {
      const [wRes, icRes, topRes] = await Promise.all([
        fetch('data/advanced-reading-words.json'),
        fetch('data/idioms-collocations.json'),
        fetch('data/topic-collocations.json')
      ]);
      if (wRes.ok) ADVANCED_WORDS = await wRes.json();
      if (icRes.ok) {
        const icData = await icRes.json();
        IDIOMS_BANK = icData.idioms || [];
        COLLOCATIONS_BANK = icData.collocations || [];
      }
      if (topRes.ok) TOPIC_COLLOCATIONS = await topRes.json();
    } catch(e) {
      console.warn('[Collocations Bank] Data fetch error:', e);
    }

    window.renderCollocationsMasterUI(targetId);
  };

  window.filterCollocationsBank = function(filterName, mountId) {
    currentFilter = filterName;
    window.renderCollocationsMasterUI(mountId);
  };

  window.searchCollocationsBank = function(query, mountId) {
    activeSearchTerm = (query || '').trim().toLowerCase();
    window.renderCollocationsMasterUI(mountId);
  };

  window.renderCollocationsMasterUI = function(mountId) {
    const targetId = mountId || 'atCollocationsMount';
    const container = document.getElementById(targetId);
    if (!container) return;

    // Filter items based on currentFilter and activeSearchTerm
    let itemsToDisplay = [];

    // Helper to test search
    const matchesSearch = (text) => {
      if (!activeSearchTerm) return true;
      return (text || '').toLowerCase().includes(activeSearchTerm);
    };

    // 1. Reading 500 words
    if (currentFilter === 'all' || currentFilter === 'reading500') {
      ADVANCED_WORDS.forEach(w => {
        if (matchesSearch(w.word) || matchesSearch(w.definition) || matchesSearch(w.example)) {
          itemsToDisplay.push({
            type: 'Reading C1/C2 Word',
            typeColor: '#8B5CF6',
            title: `${w.word} (${w.pos})`,
            category: 'Academic Reading 500',
            meaning: w.definition,
            example: w.example,
            payload: w.word
          });
        }
      });
    }

    // 2. Idioms
    if (currentFilter === 'all' || currentFilter === 'idioms') {
      IDIOMS_BANK.forEach(item => {
        if (matchesSearch(item.phrase) || matchesSearch(item.meaning) || matchesSearch(item.example)) {
          itemsToDisplay.push({
            type: 'Speaking Idiom',
            typeColor: '#10B981',
            title: item.phrase,
            category: item.theme || 'Natural Speaking',
            meaning: item.meaning,
            example: item.example,
            payload: item.phrase
          });
        }
      });
    }

    // 3. Collocations
    if (currentFilter === 'all' || currentFilter === 'collocations') {
      COLLOCATIONS_BANK.forEach(item => {
        if (matchesSearch(item.phrase) || matchesSearch(item.meaning) || matchesSearch(item.example)) {
          itemsToDisplay.push({
            type: 'Writing & Speaking Collocation',
            typeColor: '#0284C7',
            title: item.phrase,
            category: item.theme || 'High-Band Collocation',
            meaning: item.meaning,
            example: item.example,
            payload: item.phrase
          });
        }
      });
    }

    // 4. Topic Collocations
    if (currentFilter === 'all' || currentFilter === 'topics') {
      Object.entries(TOPIC_COLLOCATIONS).forEach(([topic, list]) => {
        list.forEach(item => {
          if (matchesSearch(item.collocation) || matchesSearch(item.meaning) || matchesSearch(item.example) || matchesSearch(topic)) {
            itemsToDisplay.push({
              type: 'Topic Collocation',
              typeColor: '#D97706',
              title: item.collocation,
              category: topic,
              meaning: item.meaning,
              example: item.example,
              payload: item.collocation
            });
          }
        });
      });
    }

    const totalBankCount = ADVANCED_WORDS.length + IDIOMS_BANK.length + COLLOCATIONS_BANK.length + Object.values(TOPIC_COLLOCATIONS).reduce((acc, v) => acc + v.length, 0);

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        
        <!-- Filter Pills Bar -->
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:800; text-transform:uppercase;">Curated Banks:</span>
          
          <button class="speak-pill-btn ${currentFilter === 'all' ? 'active' : ''}" 
            onclick="window.filterCollocationsBank('all', '${targetId}')" style="font-size:0.75rem; padding:4px 10px;">
            All Entries (${totalBankCount})
          </button>
          
          <button class="speak-pill-btn ${currentFilter === 'reading500' ? 'active' : ''}" 
            onclick="window.filterCollocationsBank('reading500', '${targetId}')" style="font-size:0.75rem; padding:4px 10px;">
            500 Reading Words (${ADVANCED_WORDS.length})
          </button>
          
          <button class="speak-pill-btn ${currentFilter === 'idioms' ? 'active' : ''}" 
            onclick="window.filterCollocationsBank('idioms', '${targetId}')" style="font-size:0.75rem; padding:4px 10px;">
            200 Speaking Idioms (${IDIOMS_BANK.length})
          </button>
          
          <button class="speak-pill-btn ${currentFilter === 'collocations' ? 'active' : ''}" 
            onclick="window.filterCollocationsBank('collocations', '${targetId}')" style="font-size:0.75rem; padding:4px 10px;">
            200 Academic Collocations (${COLLOCATIONS_BANK.length})
          </button>
          
          <button class="speak-pill-btn ${currentFilter === 'topics' ? 'active' : ''}" 
            onclick="window.filterCollocationsBank('topics', '${targetId}')" style="font-size:0.75rem; padding:4px 10px;">
            Topic Domains (${Object.values(TOPIC_COLLOCATIONS).reduce((acc, v) => acc + v.length, 0)})
          </button>
        </div>

        <!-- Search Bar with Live Filter -->
        <div class="at-search-bar-wrap" style="display:flex; gap:8px;">
          <input type="text" class="at-input-box" 
            value="${activeSearchTerm}" 
            placeholder="Search across 1,000+ collocations, idioms, definitions, or examples..." 
            oninput="window.searchCollocationsBank(this.value, '${targetId}')"
            style="flex:1;">
          ${activeSearchTerm ? `
            <button class="btn-outlined" onclick="window.searchCollocationsBank('', '${targetId}')" style="padding:8px 12px; font-size:0.8rem;">
              Clear
            </button>
          ` : ''}
        </div>

        <!-- Results Counter -->
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; color:var(--text-secondary); flex-wrap:wrap; gap:6px; margin-bottom:4px;">
          <span>Showing <strong>${Math.min(itemsToDisplay.length, 100)}</strong> of <strong>${itemsToDisplay.length}</strong> matching phrases</span>
          <span>Instant Client-Side Cache · 0ms Latency</span>
        </div>

        <!-- Collocations Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap:12px; max-height:650px; overflow-y:auto; padding-right:4px;">
          ${itemsToDisplay.slice(0, 100).map(item => `
            <div style="padding:14px; background:var(--bg); border:1px solid var(--border); border-radius:8px; display:flex; flex-direction:column; justify-content:space-between; gap:10px; transition:border-color 0.2s ease;">
              
              <div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; gap:8px;">
                  <span style="background:${item.typeColor}; color:#FFF; font-weight:800; font-size:0.68rem; padding:2px 7px; border-radius:4px; text-transform:uppercase; white-space:nowrap;">
                    ${item.type}
                  </span>
                  <span style="font-size:0.72rem; color:var(--text-secondary); font-weight:600; text-align:right;">
                    ${item.category}
                  </span>
                </div>

                <h4 style="margin:0 0 6px 0; font-size:1.05rem; font-weight:800; color:var(--text); line-height:1.35;">
                  ${item.title}
                </h4>

                <div style="font-size:0.82rem; color:var(--text); line-height:1.5; margin-bottom:8px;">
                  <strong>Meaning:</strong> ${item.meaning}
                </div>

                ${item.example ? `
                  <div style="font-size:0.8rem; color:var(--text-secondary); line-height:1.5; font-style:italic; padding-left:8px; border-left:2px solid ${item.typeColor};">
                    &ldquo;${item.example}&rdquo;
                  </div>
                ` : ''}
              </div>

              <div style="display:flex; justify-content:flex-end; gap:6px; padding-top:8px; border-top:1px dashed var(--border);">
                <button class="btn-outlined" style="padding:4px 10px; font-size:0.72rem;" onclick="window.copyTransformationText('${item.payload.replace(/'/g, "\\'")}')">
                  <svg class="ui-icon ui-icon-xs"><use href="#lucide-copy"/></svg> Copy
                </button>
                <button class="btn-accent-solid" style="padding:4px 10px; font-size:0.72rem; font-weight:700;" onclick="window.sendTransformationToWritingLab('${item.payload.replace(/'/g, "\\'")}')">
                  <svg class="ui-icon ui-icon-xs"><use href="#lucide-pen-tool"/></svg> Insert in Writing
                </button>
              </div>

            </div>
          `).join('')}
        </div>

      </div>
    `;
  };

})(window);
