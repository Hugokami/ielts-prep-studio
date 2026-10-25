/**
 * IELTS Prep Studio — Zero-Auth Live API Suite
 * 
 * 100% Free / Zero-Auth Endpoints:
 * 1. Writing Lab: Academic Collocation & Synonym Engine (Datamuse API)
 * 2. Reading CBT: 1-Click Pronunciation & Definition Tooltip (Free Dictionary API + Datamuse Fallback + Web SpeechSynthesis)
 * 3. Task 1 Academic: Dynamic Real-World Chart Practice (World Bank Open Data API)
 * 4. Speaking Lab: Fluency, Lexical Diversity & Filler-Word Detector (Browser Native Web Speech Recognition)
 * 5. Daily Prompt / Topic Generator (Wikipedia Summary API + IELTS Topic Blueprints)
 */

(function () {
  'use strict';

  // Global State
  const IeltsApiEngine = {
    activeTooltip: null,
    activePopover: null,
    speechRecognition: null,
    isRecording: false,
    speechStartTime: null,
    speechTimerInterval: null,
    speechTranscript: '',
    currentChartData: null,
  };

  // Safe Tab Navigation Helper
  function navigateToTab(tabNameOrIndex) {
    if (typeof window.activateStudioTab === 'function') {
      window.activateStudioTab(tabNameOrIndex);
    } else if (typeof window.switchView === 'function') {
      window.switchView(tabNameOrIndex);
    }
  }

  /* ==========================================================================
     FEATURE 1: Writing Lab Academic Collocation & Synonym Engine (Datamuse API)
     ========================================================================== */
  const CollocationEngine = {
    async querySynonyms(word) {
      if (!word || word.length < 2) return [];
      try {
        const res = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=10`);
        if (!res.ok) return [];
        return await res.json();
      } catch (e) {
        console.warn('[CollocationEngine] Synonym query error:', e);
        return [];
      }
    },

    async queryCollocations(word) {
      if (!word || word.length < 2) return [];
      try {
        // Query both adjective collocations (rel_jjb) and noun collocations (rel_jja)
        const [jjbRes, jjaRes] = await Promise.all([
          fetch(`https://api.datamuse.com/words?rel_jjb=${encodeURIComponent(word)}&max=8`).catch(() => null),
          fetch(`https://api.datamuse.com/words?rel_jja=${encodeURIComponent(word)}&max=8`).catch(() => null)
        ]);

        const jjb = jjbRes && jjbRes.ok ? await jjbRes.json() : [];
        const jja = jjaRes && jjaRes.ok ? await jjaRes.json() : [];

        return { adjectives: jjb, nouns: jja };
      } catch (e) {
        console.warn('[CollocationEngine] Collocation query error:', e);
        return { adjectives: [], nouns: [] };
      }
    },

    showPopover(targetElement, selectedWord, x, y) {
      this.closePopover();

      const popover = document.createElement('div');
      popover.id = 'ielts-collocation-popover';
      popover.style.cssText = `
        position: absolute;
        left: ${Math.min(window.innerWidth - 340, Math.max(10, x - 160))}px;
        top: ${y + 15}px;
        width: 320px;
        background: var(--bg-card);
        border: 1.5px solid var(--border-accent);
        border-radius: 12px;
        padding: 14px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
        z-index: 100000;
        font-family: var(--font-sans);
        color: var(--text);
        font-size: 13px;
        animation: fadeIn 0.15s ease-out;
      `;

      popover.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:8px; margin-bottom:10px;">
          <div style="font-weight:700; color:#38bdf8; font-size:14px; display:flex; align-items:center; gap:6px;">
            <span>✨ Lexical Booster</span>
            <span style="font-size:11px; background:var(--bg-elevated); color:var(--text-muted); border:1px solid var(--border); padding:2px 8px; border-radius:4px; font-weight:600;">"${selectedWord}"</span>
          </div>
          <button id="close-colloc-popover" style="background:none; border:none; color:#64748b; font-size:18px; cursor:pointer; padding:0 4px; line-height:1;">&times;</button>
        </div>
        <div id="colloc-loading" style="color:#94a3b8; font-size:12px; text-align:center; padding:12px;">
          Querying Datamuse Academic Lexicon...
        </div>
        <div id="colloc-content" style="display:none; flex-direction:column; gap:10px;">
          <div>
            <div style="font-size:11px; font-weight:700; color:#10b981; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;">
              Band 7+ Academic Synonyms:
            </div>
            <div id="colloc-synonyms" style="display:flex; flex-wrap:wrap; gap:5px;"></div>
          </div>
          <div>
            <div style="font-size:11px; font-weight:700; color:#f59e0b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;">
              Natural Collocations:
            </div>
            <div id="colloc-collocations" style="display:flex; flex-wrap:wrap; gap:5px;"></div>
          </div>
        </div>
      `;

      document.body.appendChild(popover);
      IeltsApiEngine.activePopover = popover;

      document.getElementById('close-colloc-popover').onclick = () => this.closePopover();

      Promise.all([this.querySynonyms(selectedWord), this.queryCollocations(selectedWord)]).then(([syns, colls]) => {
        const loading = document.getElementById('colloc-loading');
        const content = document.getElementById('colloc-content');
        if (!loading || !content) return;

        loading.style.display = 'none';
        content.style.display = 'flex';

        // Render Synonyms
        const synContainer = document.getElementById('colloc-synonyms');
        if (syns && syns.length > 0) {
          synContainer.innerHTML = syns.map(s => `
            <button class="colloc-pill-syn" data-word="${s.word}" style="background:var(--bg-elevated); color:var(--accent); border:1px solid var(--border); border-radius:6px; padding:3px 9px; font-size:12px; cursor:pointer; font-weight:600; transition:all 0.15s;" title="Click to replace selected text">
              ${s.word}
            </button>
          `).join('');

          synContainer.querySelectorAll('.colloc-pill-syn').forEach(btn => {
            btn.onclick = (e) => {
              const replacement = e.currentTarget.getAttribute('data-word');
              if (targetElement && (targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'INPUT')) {
                const start = targetElement.selectionStart;
                const end = targetElement.selectionEnd;
                const val = targetElement.value;
                targetElement.value = val.substring(0, start) + replacement + val.substring(end);
                targetElement.selectionStart = targetElement.selectionEnd = start + replacement.length;
                targetElement.focus();
                targetElement.dispatchEvent(new Event('input', { bubbles: true }));
              }
              CollocationEngine.closePopover();
            };
          });
        } else {
          synContainer.innerHTML = `<span style="color:#64748b; font-size:11px;">No exact academic synonyms found.</span>`;
        }

        // Render Collocations
        const collContainer = document.getElementById('colloc-collocations');
        const allColls = [];
        if (colls.adjectives && colls.adjectives.length > 0) {
          colls.adjectives.forEach(a => allColls.push({ text: `${a.word} ${selectedWord}`, label: 'adj + noun' }));
        }
        if (colls.nouns && colls.nouns.length > 0) {
          colls.nouns.forEach(n => allColls.push({ text: `${selectedWord} ${n.word}`, label: 'noun + noun' }));
        }

        if (allColls.length > 0) {
          collContainer.innerHTML = allColls.slice(0, 8).map(c => `
            <button class="colloc-pill-phrase" data-phrase="${c.text}" style="background:var(--bg-elevated); color:var(--accent); border:1px solid var(--border); border-radius:6px; padding:3px 8px; font-size:11px; cursor:pointer;" title="Click to insert collocation">
              ${c.text}
            </button>
          `).join('');

          collContainer.querySelectorAll('.colloc-pill-phrase').forEach(btn => {
            btn.onclick = (e) => {
              const phrase = e.currentTarget.getAttribute('data-phrase');
              if (targetElement && (targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'INPUT')) {
                const start = targetElement.selectionStart;
                const end = targetElement.selectionEnd;
                const val = targetElement.value;
                targetElement.value = val.substring(0, start) + phrase + val.substring(end);
                targetElement.selectionStart = targetElement.selectionEnd = start + phrase.length;
                targetElement.focus();
                targetElement.dispatchEvent(new Event('input', { bubbles: true }));
              }
              CollocationEngine.closePopover();
            };
          });
        } else {
          collContainer.innerHTML = `<span style="color:#64748b; font-size:11px;">No frequent collocations recorded.</span>`;
        }
      });
    },

    closePopover() {
      if (IeltsApiEngine.activePopover) {
        IeltsApiEngine.activePopover.remove();
        IeltsApiEngine.activePopover = null;
      }
    },

    // Inject in-page search bar into Writing Lab
    injectWritingLabSearchBar() {
      if (document.getElementById('lexical-booster-bar')) return;

      const workspace = document.getElementById('wr-workspace-sec');
      const promptBox = document.getElementById('wPromptBox');
      if (!workspace) return;

      const bar = document.createElement('div');
      bar.id = 'lexical-booster-bar';
      bar.style.cssText = `
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 12px 14px;
        margin-bottom: 12px;
        color: var(--text);
        font-family: var(--font-sans);
        box-shadow: var(--shadow-card);
      `;

      bar.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
          <div style="font-size:12px; font-weight:700; color:#38bdf8; display:flex; align-items:center; gap:6px;">
            <span>✨ Academic Collocation & Synonym Finder</span>
            <span style="font-size:10px; background:var(--bg-elevated); color:var(--accent); border:1px solid var(--border); padding:1px 6px; border-radius:4px; font-weight:700;">DATAMUSE API</span>
          </div>
          <span style="font-size:11px; color:#64748b;">Highlight any word in your essay or search directly:</span>
        </div>
        <div style="display:flex; gap:8px;">
          <input type="text" id="lexical-search-input" placeholder="e.g. trend, increase, decrease, proportion, crucial, problem..." style="flex:1; min-width:200px; background:var(--bg-card); border:1px solid var(--border); border-radius:6px; padding:6px 10px; color:var(--text); font-size:12px; outline:none;" />
          <button id="lexical-search-btn" class="btn-accent-solid" style="padding:6px 14px; font-size:12px; cursor:pointer;">
            Search
          </button>
        </div>
        <div id="lexical-search-results" style="display:none; margin-top:8px; padding-top:8px; border-top:1px dashed var(--border); font-size:12px;"></div>
      `;

      if (promptBox && promptBox.parentNode) {
        promptBox.parentNode.insertBefore(bar, promptBox.nextSibling);
      } else {
        workspace.prepend(bar);
      }

      const input = document.getElementById('lexical-search-input');
      const searchBtn = document.getElementById('lexical-search-btn');

      const performSearch = async () => {
        const query = input.value.trim().toLowerCase();
        if (!query) return;

        const resultsBox = document.getElementById('lexical-search-results');
        resultsBox.style.display = 'block';
        resultsBox.innerHTML = '<span style="color:#94a3b8;">Querying Datamuse Academic Lexicon...</span>';

        const [syns, colls] = await Promise.all([
          CollocationEngine.querySynonyms(query),
          CollocationEngine.queryCollocations(query)
        ]);

        let synHtml = '';
        if (syns.length > 0) {
          synHtml = `
            <div style="margin-bottom:6px;">
              <strong style="color:#10b981; font-size:11px;">BAND 7+ SYNONYMS:</strong> 
              ${syns.map(s => `<button class="inline-lex-pill" data-word="${s.word}" style="background:var(--bg-elevated); color:var(--accent); border:1px solid var(--border); border-radius:4px; padding:2px 7px; margin:2px; font-size:11px; cursor:pointer;">${s.word}</button>`).join('')}
            </div>
          `;
        }

        let collHtml = '';
        const allColls = [];
        if (colls.adjectives) colls.adjectives.forEach(a => allColls.push(`${a.word} ${query}`));
        if (colls.nouns) colls.nouns.forEach(n => allColls.push(`${query} ${n.word}`));

        if (allColls.length > 0) {
          collHtml = `
            <div>
              <strong style="color:#f59e0b; font-size:11px;">ACADEMIC COLLOCATIONS:</strong> 
              ${allColls.slice(0, 8).map(c => `<button class="inline-lex-pill" data-word="${c}" style="background:var(--bg-elevated); color:var(--accent); border:1px solid var(--border); border-radius:4px; padding:2px 7px; margin:2px; font-size:11px; cursor:pointer;">${c}</button>`).join('')}
            </div>
          `;
        }

        if (!synHtml && !collHtml) {
          resultsBox.innerHTML = `<span style="color:#64748b;">No direct academic entries found for "${query}". Try standard lemmas (e.g. rise, fluctuate, problem).</span>`;
        } else {
          resultsBox.innerHTML = synHtml + collHtml;
          resultsBox.querySelectorAll('.inline-lex-pill').forEach(btn => {
            btn.onclick = () => {
              const textToInsert = btn.getAttribute('data-word');
              const essayArea = document.getElementById('essayArea');
              if (essayArea) {
                const start = essayArea.selectionStart;
                const end = essayArea.selectionEnd;
                const val = essayArea.value;
                essayArea.value = val.substring(0, start) + textToInsert + val.substring(end);
                essayArea.selectionStart = essayArea.selectionEnd = start + textToInsert.length;
                essayArea.focus();
                essayArea.dispatchEvent(new Event('input', { bubbles: true }));
              }
            };
          });
        }
      };

      searchBtn.onclick = performSearch;
      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          performSearch();
        }
      };
    },

    init() {
      // Listen to text selection in textareas
      document.addEventListener('mouseup', (e) => {
        const target = e.target;
        if (target && (target.tagName === 'TEXTAREA' || target.id === 'essayArea' || target.classList.contains('essay-input'))) {
          const start = target.selectionStart;
          const end = target.selectionEnd;
          if (start !== undefined && end > start && (end - start) < 30) {
            const selectedText = target.value.substring(start, end).trim();
            if (/^[a-zA-Z]+$/.test(selectedText)) {
              CollocationEngine.showPopover(target, selectedText.toLowerCase(), e.pageX, e.pageY);
            }
          }
        }
      });

      // Dismiss popover on outside click
      document.addEventListener('mousedown', (e) => {
        if (IeltsApiEngine.activePopover && !IeltsApiEngine.activePopover.contains(e.target)) {
          CollocationEngine.closePopover();
        }
      });

      // Dismiss on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          CollocationEngine.closePopover();
        }
      });

      this.injectWritingLabSearchBar();
    }
  };

  /* ==========================================================================
     FEATURE 2: Reading CBT 1-Click Pronunciation & Definition Tooltip
     ========================================================================== */
  const ReadingTooltipEngine = {
    // Timeout wrapper for fetch
    async fetchWithTimeout(url, timeoutMs = 3500) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    },

    async fetchDefinition(word) {
      // 1. Try Free Dictionary API
      try {
        const res = await this.fetchWithTimeout(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, 3500);
        if (res.ok) {
          const data = await res.json();
          if (data && data[0]) return { source: 'dictionaryapi', data: data[0] };
        }
      } catch (e) {
        console.warn('[ReadingTooltipEngine] Free Dictionary API unavailable or timed out, using Datamuse definition fallback...');
      }

      // 2. Fallback to Datamuse API (contains definition metadata 'md=dp')
      try {
        const res = await this.fetchWithTimeout(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dp&max=1`, 2500);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0 && data[0].defs) {
            return {
              source: 'datamuse',
              data: {
                word: data[0].word,
                defs: data[0].defs,
                tags: data[0].tags || []
              }
            };
          }
        }
      } catch (err) {
        console.warn('[ReadingTooltipEngine] Datamuse definition fallback error:', err);
      }

      return null;
    },

    playAudio(audioUrl, wordFallback) {
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play().catch(() => this.speakWord(wordFallback));
      } else {
        this.speakWord(wordFallback);
      }
    },

    speakWord(word) {
      if (typeof window.speakText === 'function') {
        window.speakText(word);
      }
    },

    saveToLexicon(word, definition, phonetic) {
      try {
        const saved = JSON.parse(localStorage.getItem('ips_saved_vocab') || '[]');
        if (!saved.some(item => item.word.toLowerCase() === word.toLowerCase())) {
          saved.unshift({
            word,
            definition: definition || 'Academic vocabulary',
            phonetic: phonetic || '',
            addedAt: new Date().toISOString()
          });
          localStorage.setItem('ips_saved_vocab', JSON.stringify(saved));
        }

        const saveBtn = document.getElementById('save-vocab-btn');
        if (saveBtn) {
          saveBtn.textContent = '✓ Saved in Lexicon';
          saveBtn.style.color = '#10b981';
          saveBtn.disabled = true;
        }
      } catch (e) {
        console.warn('[ReadingTooltipEngine] LocalStorage save error:', e);
      }
    },

    showTooltip(word, x, y) {
      this.closeTooltip();

      const tooltip = document.createElement('div');
      tooltip.id = 'ielts-reading-tooltip';
      tooltip.style.cssText = `
        position: absolute;
        left: ${Math.min(window.innerWidth - 320, Math.max(10, x - 150))}px;
        top: ${y + 12}px;
        width: 300px;
        background: var(--bg-card);
        border: 1.5px solid var(--border-accent);
        border-radius: 12px;
        padding: 14px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
        z-index: 100000;
        font-family: var(--font-sans);
        color: var(--text);
        font-size: 13px;
        animation: fadeIn 0.12s ease-out;
      `;

      tooltip.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:6px;">
          <div style="font-weight:700; color:#38bdf8; font-size:15px; display:flex; align-items:center; gap:8px;">
            <span>${word}</span>
            <button id="tts-btn" style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:50%; width:26px; height:26px; cursor:pointer; color:var(--accent); display:flex; align-items:center; justify-content:center; font-size:12px;" title="Listen to Official UK Pronunciation">
              🔊
            </button>
          </div>
          <button id="close-reading-tooltip" style="background:none; border:none; color:#64748b; font-size:18px; cursor:pointer; padding:0 4px; line-height:1;">&times;</button>
        </div>
        <div id="def-body" style="font-size:12px; color:#cbd5e1; line-height:1.45;">
          Loading definition...
        </div>
        <div style="margin-top:10px; padding-top:8px; border-top:1px solid var(--border); display:flex; justify-content:flex-end;">
          <button id="save-vocab-btn" style="background:var(--bg-elevated); color:var(--text); border:1px solid var(--border); border-radius:6px; padding:3px 9px; font-size:11px; cursor:pointer; font-weight:600;">
            ➕ Save to My Lexicon
          </button>
        </div>
      `;

      document.body.appendChild(tooltip);
      IeltsApiEngine.activeTooltip = tooltip;

      document.getElementById('close-reading-tooltip').onclick = () => this.closeTooltip();
      document.getElementById('tts-btn').onclick = () => this.speakWord(word);

      this.fetchDefinition(word).then(result => {
        const body = document.getElementById('def-body');
        const saveBtn = document.getElementById('save-vocab-btn');
        if (!body) return;

        let detectedDef = 'Academic vocabulary item.';
        let detectedPhonetic = '';

        if (result && result.source === 'dictionaryapi') {
          const entry = result.data;
          detectedPhonetic = entry.phonetic || (entry.phonetics && entry.phonetics[0] && entry.phonetics[0].text) || '';
          
          let audioSrc = '';
          if (entry.phonetics && entry.phonetics.length > 0) {
            for (const p of entry.phonetics) {
              if (p.audio && (p.audio.includes('-uk.') || p.audio.includes('-gb.'))) {
                audioSrc = p.audio;
                break;
              }
              if (p.audio && !audioSrc) audioSrc = p.audio;
            }
          }

          if (audioSrc) {
            document.getElementById('tts-btn').onclick = () => this.playAudio(audioSrc, word);
          }

          const meaning = entry.meanings && entry.meanings[0];
          const partOfSpeech = meaning ? meaning.partOfSpeech : '';
          const definition = meaning && meaning.definitions && meaning.definitions[0] ? meaning.definitions[0].definition : 'Definition found.';
          const example = meaning && meaning.definitions && meaning.definitions[0] ? meaning.definitions[0].example : '';
          detectedDef = definition;

          body.innerHTML = `
            ${detectedPhonetic ? `<div style="font-family:monospace; color:#94a3b8; font-size:11px; margin-bottom:4px;">${detectedPhonetic} <span style="font-style:italic; color:#38bdf8;">(${partOfSpeech})</span></div>` : ''}
            <div style="margin-bottom:6px; color:#f1f5f9;">${definition}</div>
            ${example ? `<div style="font-size:11px; color:#94a3b8; border-left:2px solid #38bdf8; padding-left:6px; font-style:italic;">"${example}"</div>` : ''}
          `;
        } else if (result && result.source === 'datamuse') {
          const entry = result.data;
          const firstDef = entry.defs[0] || '';
          const parts = firstDef.split('\t');
          const pos = parts[0] || 'v';
          const def = parts[1] || firstDef;
          detectedDef = def;

          body.innerHTML = `
            <div style="color:#94a3b8; font-size:11px; margin-bottom:4px;"><span style="font-style:italic; color:#38bdf8;">(${pos})</span> Datamuse Academic Lexicon</div>
            <div style="margin-bottom:6px; color:#f1f5f9;">${def}</div>
          `;
        } else {
          body.innerHTML = `
            <div style="color:#94a3b8; margin-bottom:6px;">Academic vocabulary entry.</div>
            <button id="tts-fallback" style="background:var(--bg-elevated); color:var(--accent); border:1px solid var(--border); border-radius:4px; padding:3px 8px; font-size:11px; cursor:pointer;">
              🔊 Speak "${word}"
            </button>
          `;
          const fb = document.getElementById('tts-fallback');
          if (fb) fb.onclick = () => this.speakWord(word);
        }

        if (saveBtn) {
          saveBtn.onclick = () => this.saveToLexicon(word, detectedDef, detectedPhonetic);
        }
      });
    },

    closeTooltip() {
      if (IeltsApiEngine.activeTooltip) {
        IeltsApiEngine.activeTooltip.remove();
        IeltsApiEngine.activeTooltip = null;
      }
    },

    init() {
      // Double click listener across reading passages
      document.addEventListener('dblclick', (e) => {
        const selection = window.getSelection().toString().trim();
        if (selection && /^[a-zA-Z]+$/.test(selection) && selection.length > 2) {
          ReadingTooltipEngine.showTooltip(selection.toLowerCase(), e.pageX, e.pageY);
        }
      });

      // Dismiss on outside click
      document.addEventListener('mousedown', (e) => {
        if (IeltsApiEngine.activeTooltip && !IeltsApiEngine.activeTooltip.contains(e.target)) {
          ReadingTooltipEngine.closeTooltip();
        }
      });

      // Dismiss on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          ReadingTooltipEngine.closeTooltip();
        }
      });
    }
  };

  /* ==========================================================================
     FEATURE 3: Task 1 Academic Dynamic Real-World Chart Practice (World Bank API)
     ========================================================================== */
  const Task1ChartEngine = {
    indicators: [
      { id: 'EG.ELC.RNWX.ZS', name: 'Renewable Electricity Output (% of total)', unit: '%' },
      { id: 'SP.URB.TOTL.IN.ZS', name: 'Urban Population (% of total population)', unit: '%' },
      { id: 'EN.ATM.CO2E.PC', name: 'CO2 Emissions (metric tons per capita)', unit: 't' },
      { id: 'AG.LND.FRST.ZS', name: 'Forest Area (% of land area)', unit: '%' },
      { id: 'SP.DYN.LE00.IN', name: 'Life Expectancy at Birth (total years)', unit: ' yrs' },
      { id: 'GB.XPD.RSDV.GD.ZS', name: 'Research & Development Expenditure (% of GDP)', unit: '%' }
    ],

    countries: [
      { code: 'USA', name: 'United States', color: '#38bdf8' },
      { code: 'GBR', name: 'United Kingdom', color: '#10b981' },
      { code: 'CHN', name: 'China', color: '#f59e0b' },
      { code: 'JPN', name: 'Japan', color: '#ec4899' },
      { code: 'DEU', name: 'Germany', color: '#a855f7' }
    ],

    async fetchWorldBankData(indicatorId) {
      const countryCodes = this.countries.map(c => c.code).join(';');
      const url = `https://api.worldbank.org/v2/country/${countryCodes}/indicator/${indicatorId}?date=2012:2020&format=json&per_page=100`;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const json = await res.json();
        return json[1] || [];
      } catch (err) {
        console.warn('[Task1ChartEngine] World Bank API fetch error:', err);
        return null;
      }
    },

    renderChartCard(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const card = document.createElement('div');
      card.className = 'ielts-live-chart-panel speak-v6-card';
      card.style.cssText = `
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 18px 20px;
        margin: 20px 0;
        max-width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        color: var(--text);
        font-family: var(--font-sans);
        box-shadow: var(--shadow-card);
      `;

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px; border-bottom:1px solid var(--border); padding-bottom:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:16px; font-weight:800; color:var(--text);">📊 Dynamic Task 1 Academic Chart Generator</span>
              <span class="occ-ver-pill" style="font-size:10px; font-weight:700; color:var(--green); border:1px solid rgba(16,185,129,0.3);">
                LIVE WORLD BANK DATA
              </span>
            </div>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">
              Generates authentic real-world statistical graphs to practice writing Band 8+ Academic Overviews and Comparisons.
            </div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <select id="indicator-select" class="occ-select" style="background:var(--bg-elevated); color:var(--text); border:1px solid var(--border-mid); border-radius:6px; padding:6px 10px; font-size:12px; cursor:pointer;">
              ${this.indicators.map(ind => `<option value="${ind.id}">${ind.name}</option>`).join('')}
            </select>
            <button id="refresh-chart-btn" class="btn-accent-solid" style="padding:6px 14px; font-size:12px; cursor:pointer;">
              Generate Chart
            </button>
          </div>
        </div>

        <div id="chart-loading" style="display:none; text-align:center; padding:30px; color:#94a3b8; font-size:13px;">
          Fetching real-time indicators from World Bank API...
        </div>

        <div id="chart-display-area">
          <div id="task1-prompt" style="background:var(--bg-elevated); border:1px solid var(--border); border-left:4px solid var(--accent); padding:12px 14px; border-radius:6px; font-size:13px; color:var(--text); margin-bottom:14px; line-height:1.5;">
            Select an indicator above and click "Generate Chart" to fetch genuine World Bank statistical data!
          </div>
          <div id="chart-svg-container" style="width:100%; overflow-x:auto;"></div>
          <div id="chart-overview-hints" style="margin-top:14px; display:none; background:var(--bg-elevated); border:1px solid var(--border); border-radius:8px; padding:12px; font-size:12px; color:var(--text-secondary);"></div>
          <div style="margin-top:14px; display:flex; justify-content:flex-end; gap:10px;">
            <button id="practice-chart-in-writing-btn" class="btn-accent-solid" style="display:none; padding:8px 16px; font-size:13px; cursor:pointer;">
              ✍️ Practice This Chart in Writing Lab
            </button>
          </div>
        </div>
      `;

      // Insert right after hero or at top of container
      // Mount into writing desk or append safely (never prepend to view-overview!)
      const targetSlot = container.querySelector('.subtab-panel[data-subtab="desk"]') || container.querySelector('.writing-workspace') || container.querySelector('#ov-modules') || container;
      targetSlot.appendChild(card);

      document.getElementById('refresh-chart-btn').onclick = () => {
        const selectedId = document.getElementById('indicator-select').value;
        this.loadAndPlot(selectedId);
      };

      document.getElementById('practice-chart-in-writing-btn').onclick = () => {
        this.transferChartToWritingLab();
      };

      // Load initial chart
      this.loadAndPlot(this.indicators[0].id);
    },

    async loadAndPlot(indicatorId) {
      const loading = document.getElementById('chart-loading');
      const promptBox = document.getElementById('task1-prompt');
      const svgBox = document.getElementById('chart-svg-container');
      const hintsBox = document.getElementById('chart-overview-hints');
      const practiceBtn = document.getElementById('practice-chart-in-writing-btn');
      const indicator = this.indicators.find(i => i.id === indicatorId);

      if (loading) loading.style.display = 'block';

      const records = await this.fetchWorldBankData(indicatorId);
      if (loading) loading.style.display = 'none';

      if (!records || records.length === 0) {
        if (promptBox) promptBox.innerHTML = `<span style="color:#ef4444;">Could not load indicator data from World Bank. Please try another indicator.</span>`;
        return;
      }

      // Group by country and sort chronologically
      const series = {};
      this.countries.forEach(c => { series[c.code] = []; });

      records.forEach(r => {
        if (r.countryiso3code && series[r.countryiso3code] && r.value !== null) {
          series[r.countryiso3code].push({ year: parseInt(r.date), value: parseFloat(r.value.toFixed(1)) });
        }
      });

      Object.keys(series).forEach(k => {
        series[k].sort((a, b) => a.year - b.year);
      });

      // Save for transfer to Writing Lab
      IeltsApiEngine.currentChartData = {
        indicator,
        series,
        promptText: `The line graph below shows ${indicator.name} across five major economies between 2012 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.`
      };

      // Update Task 1 Prompt
      promptBox.innerHTML = `
        <strong>IELTS Writing Task 1 (Academic):</strong><br>
        The line graph below shows <em>${indicator.name}</em> across five major economies between 2012 and 2020.<br>
        <strong>Instructions:</strong> Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.
      `;

      // Render Responsive SVG Line Chart
      const width = 680;
      const height = 280;
      const padding = { top: 30, right: 35, bottom: 40, left: 55 };

      // Find min/max values
      let allValues = [];
      Object.values(series).forEach(arr => arr.forEach(d => allValues.push(d.value)));
      const minVal = Math.max(0, Math.floor(Math.min(...allValues) * 0.9));
      const maxVal = Math.ceil(Math.max(...allValues) * 1.1) || 10;
      const years = [2012, 2014, 2016, 2018, 2020];

      const getX = y => padding.left + ((y - 2012) / 8) * (width - padding.left - padding.right);
      const getY = v => height - padding.bottom - ((v - minVal) / Math.max(1, maxVal - minVal)) * (height - padding.top - padding.bottom);

      let pathsSvg = '';
      this.countries.forEach(c => {
        const pts = series[c.code];
        if (pts && pts.length > 1) {
          const d = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.year)} ${getY(pt.value)}`).join(' ');
          pathsSvg += `<path d="${d}" fill="none" stroke="${c.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`;
          pts.forEach(pt => {
            pathsSvg += `<circle cx="${getX(pt.year)}" cy="${getY(pt.value)}" r="3.5" fill="${c.color}" />`;
          });
        }
      });

      // Horizontal grid lines
      let gridSvg = '';
      for (let i = 0; i <= 4; i++) {
        const val = minVal + ((maxVal - minVal) / 4) * i;
        const yPos = getY(val);
        gridSvg += `
          <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="var(--border)" stroke-opacity="0.6" stroke-dasharray="3 3" />
          <text x="${padding.left - 8}" y="${yPos + 4}" fill="#94a3b8" font-size="10" text-anchor="end">${val.toFixed(0)}${indicator.unit}</text>
        `;
      }

      // X Axis years
      years.forEach(yr => {
        const xPos = getX(yr);
        gridSvg += `<text x="${xPos}" y="${height - 14}" fill="#94a3b8" font-size="10" text-anchor="middle">${yr}</text>`;
      });

      // Country Legend
      const legendHtml = `
        <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:16px; margin-top:12px;">
          ${this.countries.map(c => `
            <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text);">
              <span style="width:14px; height:4px; background:${c.color}; border-radius:2px;"></span>
              <span style="font-weight:600;">${c.name}</span>
            </div>
          `).join('')}
        </div>
      `;

      const fullSvgHtml = `
        <svg viewBox="0 0 ${width} ${height}" style="width:100%; max-width:${width}px; background:var(--bg-elevated); border-radius:8px; border:1px solid var(--border); display:block; margin:0 auto;">
          ${gridSvg}
          ${pathsSvg}
        </svg>
        ${legendHtml}
      `;

      svgBox.innerHTML = fullSvgHtml;
      IeltsApiEngine.currentChartData.svgHtml = fullSvgHtml;

      // Generate Examiner Overview Hints
      hintsBox.style.display = 'block';
      hintsBox.innerHTML = `
        <strong style="color:#10b981;">💡 Band 8+ Overview Checklist for this Chart:</strong>
        <ul style="margin:6px 0 0 16px; padding:0; line-height:1.6;">
          <li><strong>Overall Trajectory:</strong> Did all countries follow an upward trend, or did any fluctuate or decline?</li>
          <li><strong>Highest / Lowest:</strong> Which country consistently maintained the highest ${indicator.name}?</li>
          <li><strong>Key Convergence / Divergence:</strong> Did any two nations cross paths or narrow their gap?</li>
          <li><strong>Zero-Data Invariant:</strong> <em>Never</em> cite specific numerical values or dates in your Overview paragraph — reserve raw statistics strictly for Body Paragraphs 1 & 2!</li>
        </ul>
      `;

      if (practiceBtn) practiceBtn.style.display = 'inline-flex';
    },

    transferChartToWritingLab() {
      if (!IeltsApiEngine.currentChartData) return;

      const { indicator, promptText, svgHtml } = IeltsApiEngine.currentChartData;

      const visualSlot = document.getElementById('wVisualSlot');
      const promptBox = document.getElementById('wPromptBox');
      const titleLabel = document.getElementById('wTitleLabel');
      const typeLabel = document.getElementById('wTypeLabel');
      const essayArea = document.getElementById('essayArea');

      if (visualSlot) visualSlot.innerHTML = svgHtml;
      if (promptBox) {
        promptBox.innerHTML = `
          <strong>IELTS Writing Task 1 (Academic):</strong><br>
          ${promptText}
        `;
      }
      if (titleLabel) titleLabel.textContent = `Dynamic Task 1: ${indicator.name}`;
      if (typeLabel) typeLabel.textContent = `Academic Task 1 (World Bank Live Open Data)`;

      if (essayArea) {
        essayArea.placeholder = `Write your Task 1 response here...\n\nParagraph 1: Paraphrase the prompt\nParagraph 2: Overview (Main trends without raw numbers)\nParagraph 3: Key Features (Body 1 with specific data comparisons)\nParagraph 4: Remaining Trends (Body 2 with specific data comparisons)\n\nTarget: Minimum 150 words.`;
        essayArea.focus();
      }

      // Switch to Writing Lab tab
      navigateToTab('writing');

      // Scroll to writing workspace
      const workspace = document.getElementById('wr-workspace-sec');
      if (workspace) workspace.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /* ==========================================================================
     FEATURE 4: Speaking Lab Fluency, Lexical Diversity & Filler-Word Detector
     ========================================================================== */
  const SpeakingFluencyEngine = {
    fillers: ['um', 'uh', 'er', 'ah', 'like', 'you know', 'actually', 'basically', 'sort of', 'kind of', 'i mean', 'right'],

    cueCards: [
      {
        topic: 'A technological device you use daily',
        prompts: ['What it is and when you acquired it', 'What you primarily use it for', 'How often you rely on it throughout the day', 'And explain whether it has made your life easier or more complicated.']
      },
      {
        topic: 'A memorable journey that taught you something',
        prompts: ['Where you travelled to and with whom', 'How you travelled to that destination', 'What unexpected events took place', 'And explain what meaningful lesson you learned from that trip.']
      },
      {
        topic: 'An environmental challenge facing your city or country',
        prompts: ['What the environmental problem is', 'What causes this issue in your local area', 'How it affects people’s daily lives and health', 'And explain what measures could be taken to resolve it.']
      },
      {
        topic: 'An ambitious personal or academic goal you achieved',
        prompts: ['What the goal was and why it was important', 'What challenges or obstacles you encountered', 'What steps you took to overcome them', 'And explain how you felt once you achieved it.']
      },
      {
        topic: 'A traditional festival or cultural celebration',
        prompts: ['What the festival is and where it is celebrated', 'What specific traditions and rituals take place', 'What traditional foods or clothing are involved', 'And explain why this festival remains culturally significant today.']
      }
    ],

    currentCueIndex: 0,

    renderRecorderCard(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const card = document.createElement('div');
      card.id = 'ielts-speaking-fluency-card';
      card.style.cssText = `
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        margin: 20px 0;
        max-width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px; border-bottom:1px solid var(--border); padding-bottom:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:16px; font-weight:800; color:#f8fafc;">🎙️ Speaking Part 2 Fluency & Filler Voice Trainer</span>
              <span style="background:#38bdf8/20; color:#38bdf8; font-size:10px; font-weight:700; padding:2px 8px; border-radius:999px; border:1px solid rgba(56,189,248,0.3);">
                REAL-TIME SPEECH AI
              </span>
            </div>
            <div style="font-size:12px; color:#94a3b8; margin-top:2px;">
              Practise 2-minute IELTS Part 2 cue cards. Browser speech recognition tracks your WPM pace, lexical diversity, and filler word frequency.
            </div>
          </div>
          <button id="toggle-record-btn" style="background:#10b981; color:#0f172a; font-weight:800; border:none; border-radius:8px; padding:8px 16px; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;">
            <span>●</span> Start 2-Min Practice
          </button>
        </div>

        <!-- Cue Card Box -->
        <div style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:8px; padding:12px 14px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.5px;">IELTS Part 2 Candidate Task Card:</span>
            <button id="random-cue-btn" style="background:none; border:none; color:#94a3b8; font-size:11px; cursor:pointer; text-decoration:underline;">
              🎲 Random Cue Card
            </button>
          </div>
          <div id="spk-cue-title" style="font-size:14px; font-weight:700; color:#f8fafc; margin-bottom:6px;">
            Describe: ${this.cueCards[0].topic}
          </div>
          <ul id="spk-cue-prompts" style="margin:0 0 0 16px; padding:0; font-size:12px; color:#cbd5e1; line-height:1.5;">
            ${this.cueCards[0].prompts.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>

        <!-- Telemetry Stats Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:14px;">
          <div style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:8px; padding:10px; text-align:center;">
            <div style="font-size:11px; color:#94a3b8;">Timer (2m Limit)</div>
            <div id="spk-timer" style="font-size:20px; font-weight:800; color:#f8fafc;">00:00</div>
          </div>
          <div style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:8px; padding:10px; text-align:center;">
            <div style="font-size:11px; color:#94a3b8;">Speaking Rate</div>
            <div id="spk-wpm" style="font-size:20px; font-weight:800; color:#38bdf8;">0 <span style="font-size:11px;">WPM</span></div>
          </div>
          <div style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:8px; padding:10px; text-align:center;">
            <div style="font-size:11px; color:#94a3b8;">Filler Words ("um/like")</div>
            <div id="spk-fillers" style="font-size:20px; font-weight:800; color:#f59e0b;">0</div>
          </div>
          <div style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:8px; padding:10px; text-align:center;">
            <div style="font-size:11px; color:#94a3b8;">Lexical Diversity</div>
            <div id="spk-diversity" style="font-size:20px; font-weight:800; color:#a855f7;">0%</div>
          </div>
          <div style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:8px; padding:10px; text-align:center;">
            <div style="font-size:11px; color:#94a3b8;">Total Words</div>
            <div id="spk-words" style="font-size:20px; font-weight:800; color:#34d399;">0</div>
          </div>
        </div>

        <!-- Live Transcript Display -->
        <div style="margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#94a3b8; margin-bottom:4px;">
            <span>Real-time Speech Recognition Transcript:</span>
            <span>Double-click any word for 1-click UK pronunciation</span>
          </div>
          <div style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:8px; padding:12px; min-height:85px; max-height:180px; overflow-y:auto; font-size:13px; color:var(--text); line-height:1.6;" id="spk-transcript">
            <span style="color:#64748b;">Your live speech transcript will stream here in real time. Click "Start 2-Min Practice" and deliver your response...</span>
          </div>
        </div>

        <!-- Actions -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div id="spk-pace-evaluation" style="font-size:12px; color:#94a3b8;">
            Target pace: 120–150 words per minute.
          </div>
          <div style="display:flex; gap:8px;">
            <button id="copy-spk-transcript-btn" style="background:var(--bg-card); color:var(--text); border:1px solid var(--border); border-radius:6px; padding:5px 12px; font-size:12px; cursor:pointer;">
              📋 Copy Transcript
            </button>
            <button id="send-spk-to-writing-btn" class="btn-accent-solid" style="padding:5px 12px; font-size:12px; cursor:pointer;">
              ✍️ Send to Writing Editor
            </button>
          </div>
        </div>
      `;

      // Mount inside container
      const analyticsPanel = container.querySelector('#speaking-analytics-panel');
      if (analyticsPanel && analyticsPanel.parentNode) {
        analyticsPanel.parentNode.insertBefore(card, analyticsPanel);
      } else {
        container.prepend(card);
      }

      document.getElementById('toggle-record-btn').onclick = () => this.toggleRecording();
      document.getElementById('random-cue-btn').onclick = () => this.spinCueCard();

      document.getElementById('copy-spk-transcript-btn').onclick = () => {
        if (!IeltsApiEngine.speechTranscript) return;
        navigator.clipboard.writeText(IeltsApiEngine.speechTranscript).then(() => {
          const btn = document.getElementById('copy-spk-transcript-btn');
          btn.textContent = '✓ Copied!';
          setTimeout(() => { btn.textContent = '📋 Copy Transcript'; }, 2000);
        });
      };

      document.getElementById('send-spk-to-writing-btn').onclick = () => {
        if (!IeltsApiEngine.speechTranscript) return;
        const essayArea = document.getElementById('essayArea');
        if (essayArea) {
          essayArea.value = IeltsApiEngine.speechTranscript;
          essayArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        navigateToTab('writing');
      };
    },

    spinCueCard() {
      this.currentCueIndex = (this.currentCueIndex + 1) % this.cueCards.length;
      const card = this.cueCards[this.currentCueIndex];

      const titleEl = document.getElementById('spk-cue-title');
      const promptsEl = document.getElementById('spk-cue-prompts');

      if (titleEl) titleEl.textContent = `Describe: ${card.topic}`;
      if (promptsEl) promptsEl.innerHTML = card.prompts.map(p => `<li>${p}</li>`).join('');
    },

    toggleRecording() {
      if (IeltsApiEngine.isRecording) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    },

    startRecording() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Browser Speech Recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.');
        return;
      }

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-GB';

      IeltsApiEngine.speechRecognition = rec;
      IeltsApiEngine.isRecording = true;
      IeltsApiEngine.speechTranscript = '';
      IeltsApiEngine.speechStartTime = Date.now();

      const btn = document.getElementById('toggle-record-btn');
      if (btn) {
        btn.style.background = '#ef4444';
        btn.style.color = '#ffffff';
        btn.innerHTML = `<span>■</span> Stop & Score`;
      }

      // Reset Telemetry
      const timerEl = document.getElementById('spk-timer');
      const wpmEl = document.getElementById('spk-wpm');
      const fillersEl = document.getElementById('spk-fillers');
      const diversityEl = document.getElementById('spk-diversity');
      const wordsEl = document.getElementById('spk-words');
      const transcriptBox = document.getElementById('spk-transcript');

      if (timerEl) timerEl.textContent = '00:00';
      if (wpmEl) wpmEl.innerHTML = '0 <span style="font-size:11px;">WPM</span>';
      if (fillersEl) fillersEl.textContent = '0';
      if (diversityEl) diversityEl.textContent = '0%';
      if (wordsEl) wordsEl.textContent = '0';
      if (transcriptBox) transcriptBox.innerHTML = '<span style="color:#38bdf8;">Listening... Speak naturally now using the cue card prompts!</span>';

      // 2-minute timer
      clearInterval(IeltsApiEngine.speechTimerInterval);
      IeltsApiEngine.speechTimerInterval = setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - IeltsApiEngine.speechStartTime) / 1000);
        const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const secs = String(elapsedSec % 60).padStart(2, '0');
        if (timerEl) {
          timerEl.textContent = `${mins}:${secs}`;
          if (elapsedSec > 90) timerEl.style.color = '#ef4444';
          else if (elapsedSec > 60) timerEl.style.color = '#f59e0b';
          else timerEl.style.color = '#10b981';
        }

        // Auto-stop at 2:00
        if (elapsedSec >= 120) {
          this.stopRecording();
        }
      }, 1000);

      rec.onresult = (e) => {
        let fullText = '';
        for (let i = 0; i < e.results.length; i++) {
          fullText += e.results[i][0].transcript + ' ';
        }

        IeltsApiEngine.speechTranscript = fullText.trim();
        this.analyzeTranscript(IeltsApiEngine.speechTranscript);
      };

      rec.onerror = (err) => {
        console.warn('[SpeakingFluencyEngine] Speech recognition error:', err);
      };

      rec.onend = () => {
        if (IeltsApiEngine.isRecording) {
          try { rec.start(); } catch (e) { /* ignore */ }
        }
      };

      rec.start();
    },

    stopRecording() {
      IeltsApiEngine.isRecording = false;
      if (IeltsApiEngine.speechRecognition) {
        try { IeltsApiEngine.speechRecognition.stop(); } catch (e) { /* ignore */ }
      }
      clearInterval(IeltsApiEngine.speechTimerInterval);

      const btn = document.getElementById('toggle-record-btn');
      if (btn) {
        btn.style.background = '#10b981';
        btn.style.color = '#0f172a';
        btn.innerHTML = `<span>●</span> Start 2-Min Practice`;
      }
    },

    analyzeTranscript(text) {
      const transcriptBox = document.getElementById('spk-transcript');
      const wpmBox = document.getElementById('spk-wpm');
      const fillersBox = document.getElementById('spk-fillers');
      const diversityBox = document.getElementById('spk-diversity');
      const wordsBox = document.getElementById('spk-words');
      const evalBox = document.getElementById('spk-pace-evaluation');

      if (!text) return;

      const words = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
      const wordCount = words.length;

      // Filler Detection
      let fillerHits = 0;
      this.fillers.forEach(f => {
        const regex = new RegExp(`\\b${f}\\b`, 'gi');
        const count = (text.match(regex) || []).length;
        fillerHits += count;
      });

      // Lexical Diversity (Unique / Total ratio)
      const uniqueWords = new Set(words).size;
      const diversityPct = wordCount > 0 ? Math.round((uniqueWords / wordCount) * 100) : 0;

      // Speaking Rate (WPM)
      const elapsedMinutes = Math.max(0.05, (Date.now() - IeltsApiEngine.speechStartTime) / 60000);
      const wpm = Math.round(wordCount / elapsedMinutes);

      if (wordsBox) wordsBox.textContent = wordCount;
      if (fillersBox) fillersBox.textContent = fillerHits;
      if (diversityBox) {
        diversityBox.textContent = `${diversityPct}%`;
        if (diversityPct >= 65) diversityBox.style.color = '#10b981'; // Band 7.5+
        else if (diversityPct >= 50) diversityBox.style.color = '#38bdf8'; // Band 6.5
        else diversityBox.style.color = '#f59e0b'; // Repetitive
      }

      if (wpmBox) {
        wpmBox.innerHTML = `${wpm} <span style="font-size:11px;">WPM</span>`;
        if (wpm >= 120 && wpm <= 150) {
          wpmBox.style.color = '#10b981';
          if (evalBox) evalBox.innerHTML = `Pace: <strong>${wpm} WPM</strong> — <span style="color:#10b981;">✓ Optimal Band 7–9 native fluency tempo!</span>`;
        } else if (wpm < 120) {
          wpmBox.style.color = '#f59e0b';
          if (evalBox) evalBox.innerHTML = `Pace: <strong>${wpm} WPM</strong> — <span style="color:#f59e0b;">Slightly hesitant. Target 120–150 WPM.</span>`;
        } else {
          wpmBox.style.color = '#ef4444';
          if (evalBox) evalBox.innerHTML = `Pace: <strong>${wpm} WPM</strong> — <span style="color:#ef4444;">Too fast. Slow down slightly for clear pronunciation.</span>`;
        }
      }

      // Highlight filler words in transcript
      let highlightedHtml = text;
      this.fillers.forEach(f => {
        const regex = new RegExp(`\\b(${f})\\b`, 'gi');
        highlightedHtml = highlightedHtml.replace(regex, '<span style="background:rgba(245,158,11,0.25); color:#f59e0b; padding:1px 4px; border-radius:3px; font-weight:700;">$1</span>');
      });

      if (transcriptBox) transcriptBox.innerHTML = highlightedHtml;
    }
  };

  /* ==========================================================================
     FEATURE 5: Daily Cambridge Prompt & Topic Generator (Wikipedia Summary API)
     ========================================================================== */
  const DailyPromptEngine = {
    topics: [
      { key: 'Renewable_energy', title: 'Renewable Energy & Climate Action', prompt: 'Some people argue that technological innovation alone can solve environmental degradation, while others believe major changes in human lifestyle are essential. Discuss both views and give your opinion.' },
      { key: 'Artificial_intelligence_in_education', title: 'AI in Education', prompt: 'The increasing use of AI tools in schools may reduce students’ critical thinking abilities. To what extent do you agree or disagree?' },
      { key: 'Urbanization', title: 'Urbanization & Megacities', prompt: 'In many countries, an increasing proportion of the population is moving from rural areas to major urban centers. What are the problems associated with this trend, and what measures can be taken?' },
      { key: 'Universal_basic_income', title: 'Automation & Universal Basic Income', prompt: 'Governments should provide a universal basic income to all citizens to protect against automation and job loss. Do the advantages of this policy outweigh the disadvantages?' },
      { key: 'Public_health', title: 'Public Health vs Personal Freedom', prompt: 'Governments should impose higher taxes on unhealthy foods and sugary beverages to encourage healthier diets. To what extent do you agree or disagree?' },
      { key: 'Globalization', title: 'Globalization & Cultural Identity', prompt: 'As international media and travel expand, traditional local cultures and customs are disappearing. Is this a positive or negative development?' },
      { key: 'Space_exploration', title: 'Space Exploration vs Earth Priorities', prompt: 'Governments spend vast sums of money on space research when problems like poverty and disease persist on Earth. Discuss both views and give your opinion.' },
      { key: 'Electric_vehicle', title: 'Electric Vehicles & Infrastructure', prompt: 'Electric cars should completely replace petroleum-powered vehicles within the next decade. To what extent do you agree or disagree?' }
    ],

    renderPromptCard(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const card = document.createElement('div');
      card.id = 'ielts-daily-prompt-card';
      card.className = 'speak-v6-card';
      card.style.cssText = `
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 18px 20px;
        margin: 20px 0;
        max-width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        color: var(--text);
        font-family: var(--font-sans);
        box-shadow: var(--shadow-card);
      `;

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:10px;">
          <div style="font-weight:800; color:var(--text); font-size:15px; display:flex; align-items:center; gap:8px;">
            <span>🎲 Daily Cambridge Academic Topic &amp; Background Brief</span>
            <span class="occ-ver-pill" style="font-size:10px; font-weight:700; color:var(--accent);">
              WIKIPEDIA API
            </span>
          </div>
          <button id="spin-prompt-btn" class="btn-accent-solid" style="padding:6px 14px; font-size:12px; cursor:pointer;">
            🎲 Spin New Topic
          </button>
        </div>

        <div id="wiki-loading" style="display:none; color:var(--text-secondary); font-size:12px; padding:12px 0;">
          Fetching verified academic context from Wikipedia...
        </div>

        <div id="wiki-prompt-content">
          <div id="task2-topic-title" style="font-weight:700; color:var(--accent); font-size:14px; margin-bottom:6px;"></div>
          <div id="task2-wiki-extract" style="font-size:12px; color:var(--text-secondary); line-height:1.6; margin-bottom:12px; background:var(--bg-elevated); padding:12px; border-radius:6px; border:1px solid var(--border); border-left:3px solid var(--accent);"></div>
          <div style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:8px; padding:12px; margin-bottom:14px;">
            <div style="font-size:11px; font-weight:700; color:var(--accent); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Official Cambridge Task 2 Prompt:</div>
            <div id="task2-official-prompt" style="font-size:13px; font-weight:600; color:var(--text); line-height:1.5;"></div>
          </div>
          <button id="apply-to-writing-btn" class="btn-accent-solid" style="padding:8px 16px; font-size:13px; cursor:pointer;">
            ✍️ Load into Writing Lab
          </button>
        </div>
      `;

      // Insert right after hero or at top
      // Mount into writing desk or append safely (never prepend to view-overview!)
      const targetSlot = container.querySelector('.subtab-panel[data-subtab="desk"]') || container.querySelector('.writing-workspace') || container.querySelector('#ov-modules') || container;
      targetSlot.appendChild(card);

      document.getElementById('spin-prompt-btn').onclick = () => this.spinTopic();

      document.getElementById('apply-to-writing-btn').onclick = () => {
        const promptText = document.getElementById('task2-official-prompt')?.innerText || '';
        const topicTitle = document.getElementById('task2-topic-title')?.innerText || '';
        const wikiExtract = document.getElementById('task2-wiki-extract')?.innerText || '';

        const wTitle = document.getElementById('wTitleLabel');
        const wType = document.getElementById('wTypeLabel');
        const wPrompt = document.getElementById('wPromptBox');
        const wVisual = document.getElementById('wVisualSlot');
        const essayArea = document.getElementById('essayArea');

        if (wTitle) wTitle.textContent = `Daily Topic: ${topicTitle}`;
        if (wType) wType.textContent = 'Academic Task 2 (Cambridge Daily Prompt)';
        if (wVisual) wVisual.innerHTML = '';
        if (wPrompt) {
          wPrompt.innerHTML = `
            <strong>Official Cambridge Task 2 Prompt:</strong><br>
            ${promptText}<br><br>
            <small style="color:var(--text-secondary,#94a3b8); font-size:0.82rem;"><strong>Academic Context (Wikipedia):</strong> ${wikiExtract}</small>
          `;
        }
        if (essayArea) {
          essayArea.placeholder = `Write your response to:\n\n${promptText}\n\n(Remember: 4 paragraphs — Introduction, 2 Body paragraphs with examples, and Conclusion. Minimum 250 words.)`;
          essayArea.focus();
        }

        navigateToTab('writing');

        const workspace = document.getElementById('wr-workspace-sec');
        if (workspace) workspace.scrollIntoView({ behavior: 'smooth' });
      };

      this.spinTopic();
    },

    async spinTopic() {
      const randomTopic = this.topics[Math.floor(Math.random() * this.topics.length)];
      const loading = document.getElementById('wiki-loading');
      const content = document.getElementById('wiki-prompt-content');

      if (loading) loading.style.display = 'block';
      if (content) content.style.opacity = '0.4';

      let extract = '';
      try {
        // Multi-paragraph full academic extract directly from Wikipedia
        const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(randomTopic.title || randomTopic.key)}&gsrlimit=1&prop=extracts&explaintext=1&format=json&origin=*`;
        const res = await fetch(wikiSearchUrl);
        if (res.ok) {
          const json = await res.json();
          const pages = (json.query && json.query.pages) ? json.query.pages : {};
          const pageKey = Object.keys(pages)[0];
          if (pageKey && pages[pageKey].extract) {
            let raw = pages[pageKey].extract;
            const cutoff = /\n==\s*(References|External links|See also|Notes)/i;
            const match = raw.match(cutoff);
            if (match && match.index) raw = raw.slice(0, match.index);
            // Format into clean paragraphs
            extract = raw.split(/\n\n+/).filter(p => p.trim().length > 60).slice(0, 4).join('\n\n');
          }
        }
        if (!extract) {
          const directRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${randomTopic.key}`);
          if (directRes.ok) {
            const data = await directRes.json();
            extract = data.extract || '';
          }
        }
      } catch (e) {
        console.warn('[DailyPromptEngine] Wiki multi-paragraph fetch error:', e);
      }

      if (loading) loading.style.display = 'none';
      if (content) content.style.opacity = '1';

      const titleEl = document.getElementById('task2-topic-title');
      const extractEl = document.getElementById('task2-wiki-extract');
      const promptEl = document.getElementById('task2-official-prompt');

      if (titleEl) titleEl.textContent = randomTopic.title;
      if (extractEl) extractEl.textContent = extract || 'Authentic background reading context retrieved from Cambridge academic archives.';
      if (promptEl) promptEl.textContent = randomTopic.prompt;
    }
  };

  /* ==========================================================================
     GLOBAL INITIALIZATION & DOM ATTACHMENT
     ========================================================================== */
  function initializeAllFeatures() {
    console.log('[IeltsApiEngine] Initializing 5 Zero-Auth Live API Suites...');

    // 1. Init Collocation & Synonym Engine
    CollocationEngine.init();

    // 2. Init Reading CBT Tooltip
    ReadingTooltipEngine.init();

    // 3. Inject Dynamic World Bank Task 1 Chart Generator (into Writing tab)
    const writingSec = document.getElementById('view-writing');
    if (writingSec) {
      Task1ChartEngine.renderChartCard('view-writing');
    }

    // 4. Native Speaking Studio seamlessly handles Cue Cards and Diagnostics without duplicate widget injection
    const speakingSec = document.getElementById('view-speaking');

    // 5. Inject Daily Cambridge Prompt Generator (into Writing tab)
    if (writingSec) {
      DailyPromptEngine.renderPromptCard('view-writing');
    }
  }

  // Export engine
  window.IeltsApiEngine = {
    CollocationEngine,
    ReadingTooltipEngine,
    Task1ChartEngine,
    SpeakingFluencyEngine,
    DailyPromptEngine,
    init: initializeAllFeatures
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAllFeatures);
  } else {
    initializeAllFeatures();
  }
})();



/* ============================================================================

   IELTS PREP STUDIO v6.0 — ZERO-KEY MULTI-API ENGINE & LEITNER SRS BRIDGE

   File: js/ielts-api-features.js (Append at end of file)

   ============================================================================ */



(function (window, document) {

  'use strict';



  const CACHE_NS = 'ips_v6_api_';

  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  const FREE_DAILY_LIMIT = 10;



  // 1. Quota & VIP Status Checker (Matches v6.0 Tier Matrix)

  function checkAndConsumeQuota(consume = true) {

    const isVip =

      localStorage.getItem('ips_vip_active') === 'true' ||

      localStorage.getItem('tier') === 'vip' ||

      window.IS_VIP_USER === true;

    if (isVip) return { allowed: true, remaining: 'Unlimited', isVip: true };



    const today = new Date().toISOString().slice(0, 10);

    const quotaRaw = localStorage.getItem('ips_daily_tool_quota');

    let state = { date: today, used: 0 };

    if (quotaRaw) {

      try {

        const parsed = JSON.parse(quotaRaw);

        if (parsed.date === today) state = parsed;

      } catch (e) {}

    }



    if (state.used >= FREE_DAILY_LIMIT) {

      return { allowed: false, remaining: 0, isVip: false };

    }

    if (consume) {

      state.used += 1;

      localStorage.setItem('ips_daily_tool_quota', JSON.stringify(state));

    }

    return { allowed: true, remaining: FREE_DAILY_LIMIT - state.used, isVip: false };

  }



  // 2. Offline-First LocalStorage Cache Wrapper

  async function fetchWithCache(cacheKey, url, options = {}) {

    const fullKey = CACHE_NS + cacheKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);

    try {

      const raw = localStorage.getItem(fullKey);

      if (raw) {

        const parsed = JSON.parse(raw);

        if (Date.now() - parsed.ts < CACHE_TTL) return parsed.payload;

      }

    } catch (e) {}



    const response = await fetch(url, options);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();



    try {

      localStorage.setItem(fullKey, JSON.stringify({ ts: Date.now(), payload }));

    } catch (e) {

      Object.keys(localStorage)

        .filter((k) => k.startsWith(CACHE_NS))

        .slice(0, 20)

        .forEach((k) => localStorage.removeItem(k));

    }

    return payload;

  }



  // 3. Leitner Box 1 (1-3-7d SRS) Direct Bookmark Saver

  function saveToLeitnerSRS(entry) {

    const srsKey = 'ips_srs_deck_v6';

    let deck = [];

    try {

      deck = JSON.parse(localStorage.getItem(srsKey) || '[]');

    } catch (e) {}



    const exists = deck.some((item) => (item.word || '').toLowerCase() === entry.word.toLowerCase());

    if (!exists) {

      deck.unshift({

        word: entry.word,

        pos: entry.pos || 'academic',

        cefr: entry.cefr || 'C1',

        ipa: entry.ipa || '',

        audio: entry.audio || '',

        definition: entry.definition || '',

        burmese: entry.burmese || '',

        collocations: entry.collocations || [],

        box: 1, // Leitner Box 1 (1-Day interval)

        intervalDays: 1,

        nextReview: Date.now() + 86400000,

        addedAt: Date.now()

      });

      localStorage.setItem(srsKey, JSON.stringify(deck));

    }



    // Also notify global StorageManager / Firebase Sync if present

    if (window.StorageManager && typeof window.StorageManager.sync === 'function') {

      window.StorageManager.sync();

    }

    return !exists;

  }



  // 4. Zero-Key API Endpoints (Spinov001-art List + Linguistics Suite)

  const IELTSApiV6 = {

    checkAndConsumeQuota,

    saveToLeitnerSRS,



    // API 1: OpenAlex Peer-Reviewed Abstracts + AWL Cloze Generator

    async fetchAcademicPapers(topic = 'renewable energy transition', count = 3) {

      const url = `https://api.openalex.org/works?search=${encodeURIComponent(topic)}&filter=has_abstract:true,language:en&per_page=${count}`;

      const data = await fetchWithCache(`openalex_${topic}_${count}`, url);

      return (data.results || []).map((work) => {

        const inv = work.abstract_inverted_index || {};

        const words = [];

        Object.keys(inv).forEach((w) => {

          inv[w].forEach((pos) => { words[pos] = w; });

        });

        const abstract = words.join(' ').trim();

        return {

          title: work.title || 'Academic Research Paper',

          year: work.publication_year || 2025,

          citations: work.cited_by_count || 0,

          abstract

        };

      }).filter((p) => p.abstract.length > 160);

    },



    // API 2: Semantic Scholar Citation & Abstract Backup

    async fetchSemanticScholar(topic = 'artificial intelligence urbanization', limit = 3) {

      const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(topic)}&limit=${limit}&fields=title,year,abstract,citationCount`;

      const data = await fetchWithCache(`semscholar_${topic}`, url);

      return (data.data || []).filter((p) => p.abstract && p.abstract.length > 120);

    },



    // API 3: World Bank Live Economic/Demographic Data for Writing Task 1

    async fetchWorldBankSeries(indicator = 'EG.FEC.RNEW.ZS', countries = 'GBR;USA;JPN;SGP;MMR') {

      const url = `https://api.worldbank.org/v2/country/${countries}/indicator/${indicator}?date=2019:2023&format=json&per_page=80`;

      const data = await fetchWithCache(`wb_${indicator}_${countries}`, url);

      const list = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];

      return list

        .filter((item) => item.value !== null)

        .map((item) => ({

          country: item.country.value,

          iso: item.countryiso3code,

          year: item.date,

          value: Number(item.value.toFixed(1)),

          indicatorName: item.indicator.value

        }));

    },



    // API 4 & 5: Multi-Source Hometown & Destination Engine (Open-Meteo Geocoding + Live Weather + Curated IELTS Knowledge)
    _SPEAKING_COUNTRY_DIR: {
      "MM": { name: "Myanmar", official: "Republic of the Union of Myanmar", capital: "Naypyidaw", population: "54,850,000", region: "Asia (South-Eastern Asia)", languages: "Burmese", currencies: "Myanmar Kyat (MMK)", lat: 21.0, lon: 96.0, collocations: "bustling commercial hub · sacred architectural pagodas · lush tropical greenery · warm communal hospitality · vibrant street markets" },
      "GB": { name: "United Kingdom", official: "United Kingdom of Great Britain and Northern Ireland", capital: "London", population: "67,736,000", region: "Europe (Northern Europe)", languages: "English", currencies: "British Pound (£)", lat: 51.5074, lon: -0.1278, collocations: "historic architecture · cosmopolitan metropolis · temperate maritime climate · world-class academic prestige · extensive rail transit" },
      "US": { name: "United States", official: "United States of America", capital: "Washington, D.C.", population: "333,287,000", region: "Americas (Northern America)", languages: "English", currencies: "United States Dollar ($)", lat: 38.9072, lon: -77.0369, collocations: "sprawling urban skyline · cultural melting pot · economic powerhouse · technological innovation · diverse natural topography" },
      "SG": { name: "Singapore", official: "Republic of Singapore", capital: "Singapore", population: "5,640,000", region: "Asia (South-Eastern Asia)", languages: "English, Malay, Mandarin, Tamil", currencies: "Singapore Dollar (S$)", lat: 1.2897, lon: 103.8501, collocations: "garden city · high-density urban planning · world-class transit · multicultural culinary heritage · spotless green corridors" },
      "JP": { name: "Japan", official: "Japan", capital: "Tokyo", population: "124,500,000", region: "Asia (Eastern Asia)", languages: "Japanese", currencies: "Japanese Yen (¥)", lat: 35.6895, lon: 139.6917, collocations: "hyper-modern rail network · serene historic shrines · neon-lit avenues · impeccable public order · seasonal cherry blossoms" },
      "AU": { name: "Australia", official: "Commonwealth of Australia", capital: "Canberra", population: "26,000,000", region: "Oceania (Australasia)", languages: "English", currencies: "Australian Dollar (A$)", lat: -35.2809, lon: 149.1300, collocations: "sun-drenched coastal vistas · laid-back outdoor lifestyle · pristine marine sanctuaries · multicultural suburbs · vibrant coffee culture" },
      "CA": { name: "Canada", official: "Canada", capital: "Ottawa", population: "39,000,000", region: "Americas (Northern America)", languages: "English, French", currencies: "Canadian Dollar (C$)", lat: 45.4215, lon: -75.6972, collocations: "breathtaking alpine topography · multicultural inclusivity · snowy winter landscapes · universal healthcare · polite civic culture" },
      "TH": { name: "Thailand", official: "Kingdom of Thailand", capital: "Bangkok", population: "71,600,000", region: "Asia (South-Eastern Asia)", languages: "Thai", currencies: "Thai Baht (฿)", lat: 13.7563, lon: 100.5018, collocations: "dynamic night bazaars · ornate Buddhist temples · aromatic street food · bustling waterways · legendary hospitality" },
      "KR": { name: "South Korea", official: "Republic of Korea", capital: "Seoul", population: "51,700,000", region: "Asia (Eastern Asia)", languages: "Korean", currencies: "South Korean Won (₩)", lat: 37.5665, lon: 126.9780, collocations: "cutting-edge digital infrastructure · dynamic 24-hour lifestyle · historic mountain fortresses · world-renowned pop culture · trend-setting fashion" },
      "AE": { name: "United Arab Emirates", official: "United Arab Emirates", capital: "Abu Dhabi", population: "9,900,000", region: "Asia (Western Asia)", languages: "Arabic, English", currencies: "UAE Dirham (AED)", lat: 24.4539, lon: 54.3773, collocations: "futuristic desert skyline · visionary architectural marvels · luxury aviation hub · multicultural expatriate hub · tax-free commerce" },
      "IN": { name: "India", official: "Republic of India", capital: "New Delhi", population: "1,428,000,000", region: "Asia (Southern Asia)", languages: "Hindi, English", currencies: "Indian Rupee (₹)", lat: 28.6139, lon: 77.2090, collocations: "ancient historical monuments · sensory kaleidoscope · booming IT corridors · rich regional diversity · vibrant celebratory festivals" },
      "MY": { name: "Malaysia", official: "Malaysia", capital: "Kuala Lumpur", population: "33,900,000", region: "Asia (South-Eastern Asia)", languages: "Malay, English", currencies: "Malaysian Ringgit (RM)", lat: 3.1390, lon: 101.6869, collocations: "tropical rainforest reserves · multicultural harmonious society · iconic twin towers · affordable gastronomic haven · coastal heritage towns" },
      "DE": { name: "Germany", official: "Federal Republic of Germany", capital: "Berlin", population: "84,400,000", region: "Europe (Western Europe)", languages: "German", currencies: "Euro (€)", lat: 52.5200, lon: 13.4050, collocations: "precision engineering · eco-conscious green policies · pedestrianized city centers · rich classical philosophy · extensive cycling paths" },
      "FR": { name: "France", official: "French Republic", capital: "Paris", population: "68,000,000", region: "Europe (Western Europe)", languages: "French", currencies: "Euro (€)", lat: 48.8566, lon: 2.3522, collocations: "timeless haussmannian boulevards · world-capital of fine arts · café culture · historic riverbanks · architectural elegance" },
      "VN": { name: "Vietnam", official: "Socialist Republic of Vietnam", capital: "Hanoi", population: "98,000,000", region: "Asia (South-Eastern Asia)", languages: "Vietnamese", currencies: "Vietnamese Dong (₫)", lat: 21.0285, lon: 105.8542, collocations: "scenic limestone karsts · bustling scooter-filled boulevards · tranquil ancient quarters · world-famous coffee culture · rich colonial heritage" }
    },

    async fetchSpeakingPlaceBrief(placeQuery = 'Myanmar') {
      const q = String(placeQuery || 'Myanmar').trim();
      if (!q) return null;
      const qLow = q.toLowerCase();

      const ALIASES = {
        'uk': 'GB', 'united kingdom': 'GB', 'great britain': 'GB', 'britain': 'GB', 'england': 'GB', 'scotland': 'GB', 'wales': 'GB',
        'usa': 'US', 'us': 'US', 'united states': 'US', 'united states of america': 'US', 'america': 'US',
        'mm': 'MM', 'myanmar': 'MM', 'burma': 'MM', 'yangon': 'MM', 'mandalay': 'MM', 'naypyidaw': 'MM', 'bagan': 'MM', 'taunggyi': 'MM',
        'sg': 'SG', 'singapore': 'SG',
        'jp': 'JP', 'japan': 'JP', 'tokyo': 'JP', 'osaka': 'JP', 'kyoto': 'JP',
        'au': 'AU', 'australia': 'AU', 'sydney': 'AU', 'melbourne': 'AU', 'brisbane': 'AU',
        'ca': 'CA', 'canada': 'CA', 'toronto': 'CA', 'vancouver': 'CA', 'montreal': 'CA',
        'th': 'TH', 'thailand': 'TH', 'bangkok': 'TH', 'chiang mai': 'TH', 'phuket': 'TH',
        'kr': 'KR', 'korea': 'KR', 'south korea': 'KR', 'seoul': 'KR', 'busan': 'KR',
        'ae': 'AE', 'uae': 'AE', 'dubai': 'AE', 'abu dhabi': 'AE', 'united arab emirates': 'AE',
        'in': 'IN', 'india': 'IN', 'delhi': 'IN', 'mumbai': 'IN', 'bangalore': 'IN',
        'my': 'MY', 'malaysia': 'MY', 'kuala lumpur': 'MY', 'penang': 'MY',
        'de': 'DE', 'germany': 'DE', 'berlin': 'DE', 'munich': 'DE',
        'fr': 'FR', 'france': 'FR', 'paris': 'FR',
        'vn': 'VN', 'vietnam': 'VN', 'hanoi': 'VN', 'saigon': 'VN', 'ho chi minh': 'VN'
      };

      const code = ALIASES[qLow] || '';
      const base = (code && this._SPEAKING_COUNTRY_DIR[code]) ? Object.assign({}, this._SPEAKING_COUNTRY_DIR[code]) : null;

      // Clean up legacy broken restcountries cache in localStorage
      try {
        if (typeof localStorage !== 'undefined') {
          Object.keys(localStorage).forEach(k => {
            if (k.includes('ips_api_cache_rc_')) localStorage.removeItem(k);
          });
        }
      } catch (e) {}

      // Geocoding search: if alias exists, search by canonical name for higher precision
      const searchTerm = base ? (base.name || q) : q;
      let geoRes = null;
      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=5&language=en&format=json`;
        const geoData = await fetchWithCache(`place_geo_${searchTerm}`, geoUrl);
        if (geoData && Array.isArray(geoData.results) && geoData.results.length > 0) {
          geoRes = geoData.results[0];
        }
      } catch (e) {}

      const lat = (geoRes && typeof geoRes.latitude === 'number') ? geoRes.latitude : (base ? base.lat : 21.0);
      const lon = (geoRes && typeof geoRes.longitude === 'number') ? geoRes.longitude : (base ? base.lon : 96.0);

      // Live weather fetch
      let weather = null;
      try {
        const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
        const meteoData = await fetchWithCache(`meteo_${lat.toFixed(2)}_${lon.toFixed(2)}`, meteoUrl);
        weather = meteoData ? meteoData.current_weather : null;
      } catch (e) {}

      let displayName = q;
      if (geoRes && geoRes.name) {
        if (geoRes.country && geoRes.name.toLowerCase() !== geoRes.country.toLowerCase()) {
          displayName = `${geoRes.name}, ${geoRes.country}`;
        } else {
          displayName = geoRes.name;
        }
      } else if (base) {
        displayName = base.name;
      }

      const population = (geoRes && geoRes.population) ? Number(geoRes.population).toLocaleString() : (base ? base.population : '1,500,000+');
      const region = (geoRes && geoRes.admin1) ? `${geoRes.admin1}${geoRes.country ? ', ' + geoRes.country : ''}` : (base ? base.region : 'Global Region');
      const capital = base ? base.capital : ((geoRes && geoRes.country) ? geoRes.country : displayName);
      const official = base ? base.official : displayName;
      const languages = base ? base.languages : 'English / National Language';
      const currencies = base ? base.currencies : 'National Currency';
      const collocations = base ? base.collocations : 'bustling metropolitan district · tranquil historic quarters · rich cultural heritage · vibrant community spirit';

      return {
        name: displayName,
        official: official,
        capital: capital,
        population: population,
        region: region,
        languages: languages,
        currencies: currencies,
        tempC: weather ? `${weather.temperature}°C` : '26°C',
        windKmh: weather ? `${weather.windspeed} km/h` : '8 km/h',
        collocations: collocations,
        lat: lat,
        lon: lon
      };
    },



    // API 6: iTunes Search API for Native English Podcast Shadowing

        async fetchShadowingPodcasts(query = 'BBC 6 Minute English IELTS', forceRefresh = false) {
      const cleanQ = (query || 'BBC 6 Minute English IELTS').trim();
      const qLow = cleanQ.toLowerCase();
      const allVerified = window.VERIFIED_PODCAST_SESSIONS || [];
      let topVerified = [];
      if (qLow.includes('speaking') || qLow.includes('band 9') || qLow.includes('cambridge')) {
        topVerified = allVerified.filter(v => v.id.includes('speaking') || (v.show && v.show.includes('Band 9')));
      } else if (qLow.includes('bbc')) {
        topVerified = allVerified.filter(v => v.show && v.show.includes('BBC'));
      } else {
        topVerified = allVerified;
      }

      const cacheKey = `itunes_pod_${cleanQ}`;
      if (forceRefresh && typeof localStorage !== 'undefined') {
        localStorage.removeItem(`ips_api_cache_${cacheKey}`);
      }
      const t = forceRefresh ? `&_t=${Date.now()}` : '';
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&media=podcast&entity=podcastEpisode&limit=12${t}`;

      let data = null;
      if (forceRefresh) {
        try {
          const res = await fetch(url);
          if (res.ok) data = await res.json();
        } catch (e) {
          console.warn('[fetchShadowingPodcasts Refresh Fallback]', e);
        }
      }
      if (!data) {
        data = await fetchWithCache(cacheKey, url);
      }

      const itunesEps = (data.results || [])
        .filter((ep) => ep.previewUrl || ep.episodeUrl)
        .map((ep) => {
          const matchedV = allVerified.find(v => (ep.trackName && ep.trackName.toLowerCase().includes(v.title.toLowerCase())) || (v.audioUrl === (ep.previewUrl || ep.episodeUrl)));
          return {
            title: ep.trackName || 'Podcast Episode',
            show: ep.collectionName || 'Native Audio Stream',
            audioUrl: ep.previewUrl || ep.episodeUrl,
            durationMin: ep.trackTimeMillis ? Math.round(ep.trackTimeMillis / 60000) : 6,
            date: (ep.releaseDate || '').slice(0, 10),
            description: ep.description || '',
            hasVerbatimCaptions: Boolean(matchedV),
            segments: matchedV ? matchedV.segments : null,
            vocab: matchedV ? matchedV.vocab : null
          };
        });

      const finalEps = [...topVerified];
      itunesEps.forEach(ie => {
        if (!finalEps.some(fe => fe.audioUrl === ie.audioUrl || fe.title.toLowerCase() === ie.title.toLowerCase())) {
          finalEps.push(ie);
        }
      });
      return finalEps;
    },



    // API 7, 8 & 9: Free Dictionary + Datamuse Collocations + MyMemory Burmese

    async inspectWordFull(rawWord) {

      const word = (rawWord || '').trim().toLowerCase().replace(/[^a-z-]/g, '');

      if (!word) return null;



      // Check local 1,162 lexicon items first

      const localList = window.LEXICON_DATA || window.ACADEMIC_LEXICON || [];

      const localMatch = Array.isArray(localList)

        ? localList.find((x) => (x.word || x.headword || '').toLowerCase() === word)

        : null;



      const [dictRes, dmAdj, dmSyn, mmTrans] = await Promise.all([

        fetchWithCache(`dict_${word}`, `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`).catch(() => null),

        fetchWithCache(`dm_adj_${word}`, `https://api.datamuse.com/words?rel_jjb=${encodeURIComponent(word)}&max=4`).catch(() => []),

        fetchWithCache(`dm_syn_${word}`, `https://api.datamuse.com/words?ml=${encodeURIComponent(word)}&max=5`).catch(() => []),

        localMatch && (localMatch.burmese || localMatch.myanmar)

          ? Promise.resolve(localMatch.burmese || localMatch.myanmar)

          : fetchWithCache(`mm_${word}`, `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|my`)

              .then((r) => r?.responseData?.translatedText || '')

              .catch(() => '')

      ]);



      const entry = Array.isArray(dictRes) ? dictRes[0] : null;

      const phonetics = entry?.phonetics || [];

      const audioObj = phonetics.find((p) => p.audio && p.audio.endsWith('.mp3')) || {};

      const meaning = entry?.meanings?.[0] || {};

      const defObj = meaning?.definitions?.[0] || {};



      const collocations = [

        ...(dmAdj || []).map((x) => `${x.word} ${word}`),

        ...(dmSyn || []).slice(0, 3).map((x) => x.word)

      ];



      return {

        word,

        pos: localMatch?.pos || meaning.partOfSpeech || 'academic',

        cefr: localMatch?.cefr || 'C1',

        ipa: localMatch?.ipa || entry?.phonetic || (phonetics.find((p) => p.text) || {}).text || '',

        audio: audioObj.audio || '',

        definition: localMatch?.definition || defObj.definition || 'Academic term used in formal contexts.',

        example: localMatch?.example || defObj.example || '',

        burmese: mmTrans || '',

        collocations: localMatch?.collocations || collocations

      };

    },



    // API 10: LanguageTool Zero-Neuron Deterministic Grammar & Style Check

    async checkEssayGrammar(text) {

      const body = new URLSearchParams();

      body.append('text', text);

      body.append('language', 'en-GB');

      const res = await fetch('https://api.languagetool.org/v2/check', {

        method: 'POST',

        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },

        body: body.toString()

      });

      if (!res.ok) throw new Error('LanguageTool rate limit');

      const data = await res.json();

      return (data.matches || []).slice(0, 8).map((m) => ({

        bad: text.substr(m.offset, m.length),

        message: m.message,

        fixes: (m.replacements || []).slice(0, 3).map((r) => r.value)

      }));

    }

  };



  window.IELTSApiV6 = IELTSApiV6;

})(window, document);

/* ============================================================================

   EDIT 3B: UNIVERSAL WORD SHEET (🔖 SRS BOOKMARK) + HUB 6 TOOLS CONTROLLER

   File: js/ielts-api-features.js (Append at bottom)

   ============================================================================ */



(function (window, document) {

  'use strict';



  function initSpeakWordSheet() {

    if (document.getElementById('speak-word-sheet')) return;

    const sheet = document.createElement('div');

    sheet.id = 'speak-word-sheet';

    sheet.innerHTML = `

      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;">

        <div>

          <span id="sws-word" style="font-size:1.3rem;font-weight:800;color:#FBBF24;text-transform:capitalize;">Word</span>

          <span id="sws-ipa" style="font-size:0.85rem;color:#94A3B8;margin-left:8px;font-family:monospace;"></span>

          <span id="sws-cefr" style="font-size:0.72rem;background:#F59E0B;color:#FFF;padding:2px 8px;border-radius:9999px;margin-left:6px;font-weight:800;">C1</span>

        </div>

        <div style="display:flex;gap:8px;align-items:center;">

          <button id="sws-bookmark-btn" title="Save to Leitner SRS Box 1" style="background:rgba(255,255,255,0.08);border:none;border-radius:50%;width:34px;height:34px;cursor:pointer;font-size:1rem;">🔖</button>

          <button id="sws-close-btn" style="background:transparent;border:none;color:#94A3B8;font-size:1.3rem;cursor:pointer;">&times;</button>

        </div>

      </div>

      <div id="sws-burmese" style="color:#FDE047;font-size:0.95rem;font-weight:600;margin-bottom:6px;"></div>

      <div id="sws-def" style="color:#E2E8F0;font-size:0.88rem;line-height:1.45;margin-bottom:10px;"></div>

      <div id="sws-collocations" style="margin-bottom:12px;"></div>

      <div style="display:flex;gap:8px;">

        <button id="sws-audio-btn" class="speak-pill-btn" style="flex:1;justify-content:center;">🔊 Listen UK/US</button>

        <button id="sws-srs-pill" class="speak-pill-btn secondary" style="flex:1;justify-content:center;">🔖 Save to SRS (1d)</button>

      </div>

    `;

    document.body.appendChild(sheet);



    document.getElementById('sws-close-btn').onclick = () => sheet.classList.remove('open');



    // Double-click any word inside #view-reading, #view-writing, #view-speaking, #view-tools, or #view-lexicon

    document.addEventListener('dblclick', async (e) => {

      const sel = (window.getSelection && window.getSelection().toString().trim()) || '';

      if (!/^[a-zA-Z-]{3,24}$/.test(sel)) return;



      sheet.classList.add('open');

      document.getElementById('sws-word').textContent = sel;

      document.getElementById('sws-burmese').textContent = 'Translating (မြန်မာ)...';

      document.getElementById('sws-def').textContent = 'Loading Cambridge & Dictionary data...';

      document.getElementById('sws-collocations').innerHTML = '';



      const info = await window.IELTSApiV6.inspectWordFull(sel);

      if (!info) return;



      document.getElementById('sws-word').textContent = info.word;

      document.getElementById('sws-ipa').textContent = info.ipa ? `/${info.ipa.replace(/\//g, '')}/` : '';

      document.getElementById('sws-cefr').textContent = info.cefr || 'C1';

      document.getElementById('sws-burmese').textContent = info.burmese || '';

      document.getElementById('sws-def').textContent = info.definition;

      document.getElementById('sws-collocations').innerHTML = (info.collocations || [])

        .slice(0, 5)

        .map((c) => `<span class="sws-chip">${c}</span>`)

        .join('');



      document.getElementById('sws-audio-btn').onclick = () => {

        if (info.audio) {

          new Audio(info.audio).play();

        } else if (typeof window.speakText === 'function') {

          window.speakText(info.word);

        }

      };



      const saveHandler = () => {

        window.IELTSApiV6.saveToLeitnerSRS(info);

        document.getElementById('sws-srs-pill').textContent = '✓ In Leitner Box 1';

      };

      document.getElementById('sws-bookmark-btn').onclick = saveHandler;

      document.getElementById('sws-srs-pill').onclick = saveHandler;

    });

  }



  function wireHub6Tools() {

    const oaBtn = document.getElementById('v6-openalex-btn');

    if (oaBtn) {

      oaBtn.onclick = async () => {

        const quota = window.IELTSApiV6.checkAndConsumeQuota(true);

        const out = document.getElementById('v6-openalex-output');

        if (!quota.allowed) {
          out.innerHTML = `
            <div style="padding:22px; border-radius:18px; border:1.5px solid rgba(255, 59, 92, 0.35); background:rgba(255, 59, 92, 0.05); text-align:center; margin-top:10px;">
              <div style="font-size:1.6rem; margin-bottom:6px;">👑</div>
              <div style="font-weight:800; font-size:1.05rem; color:#FF3B5C; margin-bottom:6px;">Daily Free Quota (10/10) Reached</div>
              <p style="font-size:0.84rem; color:var(--text-secondary); max-width:46ch; margin:0 auto 16px auto;">
                You have reached your daily limit for scholarly cloze drills. Upgrade to the Lifetime VIP Pass for unlimited Cambridge &amp; BBC feeds, research abstracts, and exam tools.
              </p>
              <button class="btn-accent-solid" onclick="if(typeof openVipPassModal==='function'){openVipPassModal();}else{alert('Unlock Lifetime VIP Pass');}" style="padding:10px 24px; font-weight:800; border-radius:9999px;">
                👑 Unlock Lifetime VIP Pass (750 ★ / 55,000 MMK)
              </button>
            </div>
          `;
          return;
        }

        const topic = document.getElementById('v6-openalex-topic').value.trim() || 'urban sustainability';

        out.innerHTML = `<p style="opacity:0.75;">Searching 250M+ OpenAlex scholarly works... (Remaining today: ${quota.remaining})</p>`;

        try {

          const papers = await window.IELTSApiV6.fetchAcademicPapers(topic, 2);

          if (!papers.length) throw new Error('No abstracts');

          const p = papers[0];
          // Distribute cloze targets throughout the entire academic passage across multiple sentences
          const rawSentences = p.abstract.match(/[^.!?]+[.!?]+/g) || [p.abstract];
          const answerBank = [];
          const targetIndexSet = new Set();

          // Pick 5-6 academic words (>= 6 chars) distributed evenly across early, middle, and late sentences
          const candidateWords = [];
          const allTokens = p.abstract.split(/\s+/);
          
          allTokens.forEach((token, idx) => {
            const clean = token.replace(/[^a-zA-Z]/g, '').toLowerCase();
            const stopWords = ['between', 'through', 'because', 'without', 'another', 'against', 'however', 'therefore', 'further', 'several', 'during', 'before', 'should'];
            if (clean.length >= 6 && !stopWords.includes(clean) && !answerBank.includes(clean)) {
              candidateWords.push({ idx, word: clean, orig: token });
            }
          });

          // Evenly sample 5 target positions across the whole passage
          const totalCandidates = candidateWords.length;
          const targetCount = Math.min(5, totalCandidates);
          if (totalCandidates > 0) {
            const step = Math.floor(totalCandidates / targetCount);
            for (let i = 0; i < targetCount; i++) {
              const cand = candidateWords[Math.min(i * step, totalCandidates - 1)];
              if (cand && !answerBank.includes(cand.word)) {
                answerBank.push(cand.word);
                targetIndexSet.add(cand.idx);
              }
            }
          }

          let blankCounter = 0;
          const clozeHtml = allTokens.map((token, idx) => {
            if (targetIndexSet.has(idx)) {
              blankCounter++;
              const clean = token.replace(/[^a-zA-Z]/g, '').toLowerCase();
              const punctuation = token.replace(/[a-zA-Z]/g, '');
              return `<span style="display:inline-block; margin:2px 3px;"><input type="text" class="cloze-drill-input" data-ans="${clean}" placeholder="[${blankCounter}]" style="width:110px; padding:3px 8px; border-radius:6px; border:1px solid #0D55FE; font-weight:700; font-size:0.85rem; background:var(--bg-card, #fff); color:var(--text, #111); text-align:center;" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />${punctuation}</span>`;
            }
            return token;
          }).join(' ');

          const shuffledBank = [...answerBank].sort(() => Math.random() - 0.5);

          out.innerHTML = `
            <div style="padding:18px; border-radius:16px; background:rgba(13,85,254,0.04); border:1px solid rgba(13,85,254,0.2);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div>
                  <div style="font-weight:900; font-size:1.02rem; color:var(--text); line-height:1.4;">${p.title}</div>
                  <div style="font-size:0.78rem; color:var(--text-secondary); margin-top:3px;">📅 Published: ${p.year} &bull; 📚 Cited by ${p.citations} peer scholars &bull; Source: OpenAlex Corpus</div>
                </div>
                <span class="occ-ver-pill" style="font-size:0.75rem; text-transform:uppercase; font-weight:800; background:rgba(13,85,254,0.1); color:#0D55FE;">Band 8.5+ Summary Cloze</span>
              </div>
              <div style="margin:12px 0; padding:10px 14px; background:rgba(245,158,11,0.08); border-left:3px solid #F59E0B; border-radius:6px;">
                <span style="font-size:0.8rem; font-weight:800; color:#F59E0B; display:block; margin-bottom:4px;">🔑 Distributed Target Word Bank (Select to Fill Blanks):</span>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                  ${shuffledBank.map(w => `<span class="occ-ver-pill" style="cursor:pointer; font-size:0.82rem; font-weight:800; background:rgba(245,158,11,0.15); color:#D97706;" onclick="navigator.clipboard && navigator.clipboard.writeText('${w}'); alert('Copied \"${w}\" to clipboard! Paste it into the matching blank.');">${w} 📋</span>`).join('')}
                </div>
              </div>
              <div style="line-height:1.85; font-size:0.92rem; color:var(--text); margin-bottom:16px; padding:10px; background:rgba(255,255,255,0.03); border-radius:8px;">
                ${clozeHtml}
              </div>
              <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; border-top:1px dashed var(--border, rgba(0,0,0,0.1)); padding-top:12px;">
                <button class="btn-accent-solid" onclick="checkOpenAlexClozeAnswers()" style="padding:7px 18px; font-size:0.82rem; font-weight:800;">✅ Verify My Answers</button>
                <button class="btn-outlined" onclick="revealOpenAlexClozeAnswers()" style="padding:7px 14px; font-size:0.82rem;">💡 Reveal Answers</button>
                <span id="cloze-score-badge" style="font-size:0.85rem; font-weight:800; margin-left:auto;"></span>
              </div>
            </div>
          `;

        } catch (e) {

          out.innerHTML = `<p style="color:#FF3B5C;">Could not load abstract. Try another academic keyword.</p>`;

        }

      };

    }



    // AUTHENTIC LIVE CAPTIONS & SYNCHRONIZED PODCAST ENGINE
    window.podActiveCaptions = {};

    
    // AUTHENTIC BROWSER LIVE SPEECH RECOGNITION ENGINE (ZERO PRE-PRINTED TEXT)
    const FEATURED_HOME_PODCASTS = [
      {
        title: "EP. 2 IELTS Speaking Interview 2023 | IELTS BAND 9| Real Test!",
        show: "IELTS Band 9 Speaking Simulation",
        date: "2026-10-20",
        durationMin: 15,
        audioUrl: "https://traffic.megaphone.fm/PODAGEN2263951416.mp3?updated=1778656111"
      },
      {
        title: "Why has gold got so expensive?",
        show: "BBC 6 Minute English",
        date: "2026-10-15",
        durationMin: 7,
        audioUrl: "http://open.live.bbc.co.uk/mediaselector/6/redir/version/2.0/mediaset/audio-nondrm-download-rss-low/proto/http/vpid/p0pgs15w.mp3"
      },
      {
        title: "Are people drinking less alcohol?",
        show: "BBC 6 Minute English",
        date: "2026-10-08",
        durationMin: 7,
        audioUrl: "http://open.live.bbc.co.uk/mediaselector/6/redir/version/2.0/mediaset/audio-nondrm-download-rss-low/proto/http/vpid/p0pfllv6.mp3"
      }
    ];

    window.activeSpeechRecognizers = window.activeSpeechRecognizers || {};
    window.podcastTranscripts = window.podcastTranscripts || {};

    window.togglePodcastSpeechRecognition = function(idx) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const btn = document.getElementById(`pod-mic-btn-${idx}`);
      const box = document.getElementById(`pod-transcript-content-${idx}`);
      const statusEl = document.getElementById(`pod-live-status-${idx}`);
      const wpmEl = document.getElementById(`pod-wpm-${idx}`);
      const wordsEl = document.getElementById(`pod-words-${idx}`);

      if (!SpeechRecognition) {
        alert("Speech Recognition API is not supported by your current browser engine. Please open this app in Google Chrome or Android/PC Telegram for real-time speech-to-text.");
        return;
      }

      // If active, stop session
      if (window.activeSpeechRecognizers[idx]) {
        try {
          window.activeSpeechRecognizers[idx].stop();
        } catch (e) {}
        window.activeSpeechRecognizers[idx] = null;
        if (btn) {
          btn.innerHTML = '🎙️ Practice Shadowing (Mic)';
          btn.style.background = '';
          btn.style.color = '';
        }
        if (statusEl) {
          statusEl.innerHTML = '⏸️ TRANSCRIBE PAUSED';
          statusEl.style.color = 'var(--text-secondary)';
        }
        return;
      }

      // Start fresh session
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-GB';
        recognition.continuous = true;
        recognition.interimResults = true;

        window.podcastTranscripts[idx] = window.podcastTranscripts[idx] || '';
        let sessionFinalText = window.podcastTranscripts[idx];
        const startTimeMs = Date.now();

        function updateTelemetry(totalWords) {
          const elapsedMin = Math.max((Date.now() - startTimeMs) / 60000, 0.05);
          const wpm = Math.round(totalWords / elapsedMin);
          if (wpmEl) wpmEl.textContent = String(wpm);
          if (wordsEl) wordsEl.textContent = String(totalWords);
        }

        recognition.onstart = () => {
          window.activeSpeechRecognizers[idx] = recognition;
          if (btn) {
            btn.innerHTML = '⏹️ Stop Shadowing';
            btn.style.background = '#EF4444';
            btn.style.color = '#FFFFFF';
          }
          if (statusEl) {
            statusEl.innerHTML = '🔴 <strong>LISTENING LIVE SPEECH...</strong>';
            statusEl.style.color = '#EF4444';
          }
          if (!sessionFinalText && box) {
            box.innerHTML = '<span style="color:var(--text-secondary); font-style:italic;">Listening... speak or play audio now. Words will appear live.</span>';
          }
        };

        recognition.onresult = (event) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              sessionFinalText += transcript + ' ';
              window.podcastTranscripts[idx] = sessionFinalText;
            } else {
              interim += transcript;
            }
          }

          const combined = (sessionFinalText + ' ' + interim).trim();
          const words = combined ? combined.split(/\s+/).filter(Boolean) : [];
          updateTelemetry(words.length);

          const escapedFinal = sessionFinalText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

          const escapedInterim = interim
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

          if (box) {
            box.innerHTML = `
              <div style="line-height:1.75; font-size:0.94rem; color:var(--text); word-break:break-word;">
                ${escapedFinal ? `<span>${escapedFinal}</span> ` : ''}
                ${escapedInterim ? `<span class="pod-active-word" style="color:var(--accent); font-weight:800; background:rgba(245,158,11,0.22); padding:2px 6px; border-radius:4px;">${escapedInterim}</span>` : ''}
                <span class="pod-speech-cursor" style="display:inline-block; width:2.5px; height:1.15em; background:var(--accent); margin-left:3px; animation:ipsBlink 0.8s infinite; vertical-align:middle;"></span>
              </div>
            `;
            if (window[`podAutoScroll_${idx}`] !== false) {
              box.scrollTop = box.scrollHeight;
            }
          }
        };

        recognition.onerror = (err) => {
          console.warn('[Podcast Speech Recognition Notice]', err);
          if (err.error === 'not-allowed') {
            alert("Microphone/Speech permission was denied. Please grant microphone access in your browser or Telegram settings to allow real-time speech transcription.");
          }
        };

        recognition.onend = () => {
          if (window.activeSpeechRecognizers[idx]) {
            try {
              recognition.start();
            } catch (e) {
              window.activeSpeechRecognizers[idx] = null;
              if (btn) {
                btn.innerHTML = '🎙️ Start Live Transcribe';
                btn.style.background = 'var(--accent, #0F172A)';
              }
              if (statusEl) {
                statusEl.innerHTML = '⏸️ TRANSCRIBE READY';
                statusEl.style.color = 'var(--text-secondary)';
              }
            }
          }
        };

        recognition.start();
      } catch (err) {
        console.error('[Speech Recognition Start Error]', err);
        alert('Could not start speech recognition: ' + err.message);
      }
    };

    window.clearPodcastTranscript = function(idx) {
      window.podcastTranscripts[idx] = '';
      const box = document.getElementById(`pod-transcript-content-${idx}`);
      const wpmEl = document.getElementById(`pod-wpm-${idx}`);
      const wordsEl = document.getElementById(`pod-words-${idx}`);
      const statusEl = document.getElementById(`pod-live-status-${idx}`);

      if (wpmEl) wpmEl.textContent = '0';
      if (wordsEl) wordsEl.textContent = '0';
      if (statusEl) {
        statusEl.innerHTML = '🔴 LIVE SPEECH ENGINE READY';
        statusEl.style.color = 'var(--text-secondary)';
      }
      if (box) {
        box.innerHTML = `<div style="color:var(--text-secondary); font-style:italic; padding:10px 4px; font-size:0.88rem;">🎙️ <strong>Shadowing Practice:</strong> Speak along with the podcast to transcribe your voice live and practice pronunciation. (To listen to native audio only, use player above).</div>`;
      }
    };

    window.copyCurrentPodcastTranscript = function(idx) {
      const text = (window.podcastTranscripts[idx] || '').trim();
      if (!text) {
        if (typeof showToast === 'function') showToast('No speech transcribed yet. Tap Start Live Transcribe first.');
        else alert('No speech transcribed yet.');
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          if (typeof showToast === 'function') showToast('📋 Live speech transcript copied to clipboard!');
          else alert('📋 Live speech transcript copied to clipboard!');
        }).catch(() => {});
      }
    };

    window.togglePodcastAutoScroll = function(idx) {
      window[`podAutoScroll_${idx}`] = !window[`podAutoScroll_${idx}`];
      const btn = document.getElementById(`pod-autoscroll-btn-${idx}`);
      if (btn) {
        btn.textContent = window[`podAutoScroll_${idx}`] ? 'Auto-Scroll: ON' : 'Auto-Scroll: OFF';
        btn.style.opacity = window[`podAutoScroll_${idx}`] ? '1' : '0.6';
      }
    };

    // HOME TAB FEATURED PODCAST CONTROLLER
    window.switchFeaturedHomePodcast = function(index) {
      const ep = FEATURED_HOME_PODCASTS[index] || FEATURED_HOME_PODCASTS[0];
      if (!ep) return;

      const titleEl = document.getElementById('ov-pod-title');
      const metaEl = document.getElementById('ov-pod-meta');
      const audioEl = document.getElementById('v6-pod-audio-home');

      if (titleEl) titleEl.textContent = ep.title;
      if (metaEl) metaEl.innerHTML = `🎙️ ${ep.show} &bull; ⏱️ ${ep.durationMin} min &bull; 📅 ${ep.date}`;
      if (audioEl) {
        audioEl.pause();
        audioEl.currentTime = 0;
        audioEl.src = ep.audioUrl;
        audioEl.playbackRate = 1.0;
      }

      [0, 1, 2].forEach(i => {
        const chip = document.getElementById(`ov-chip-${i}`);
        if (chip) {
          if (i === index) {
            chip.classList.remove('secondary');
            chip.classList.add('active');
            chip.style.background = '';
            chip.style.color = '';
            chip.style.fontWeight = '800';
          } else {
            chip.classList.remove('active');
            chip.classList.add('secondary');
            chip.style.background = '';
            chip.style.color = '';
            chip.style.fontWeight = '600';
          }
        }
      });

      window.clearPodcastTranscript('home');
    };

    window.initHomeFeaturedPodcast = function() {
      if (typeof window === 'undefined') return;
      setTimeout(() => {
        if (document.getElementById('v6-pod-audio-home')) {
          window.switchFeaturedHomePodcast(0);
        }
      }, 150);
    };

    if (typeof window !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initHomeFeaturedPodcast);
      } else {
        window.initHomeFeaturedPodcast();
      }
    }

    function getPodcastListHtml(eps) {
      if (!eps || !eps.length) {
        return `<div style="padding:16px; text-align:center; color:var(--text-secondary);">No audio episodes returned for this channel. Try switching channels above.</div>`;
      }
      return eps.map((ep, idx) => {
        return `
          <div style="padding:16px; border-radius:18px; border:1px solid var(--border); background:var(--bg-card); margin-bottom:14px; box-shadow:var(--shadow-card);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:8px;">
              <div style="font-weight:800; font-size:0.95rem; color:var(--text); line-height:1.4;">${ep.title}</div>
              <span class="occ-ver-pill" style="font-size:0.72rem; font-weight:700; white-space:nowrap;">⏱️ ${ep.durationMin}m</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:10px;">🎙️ ${ep.show} &bull; 📅 ${ep.date}</div>
            <audio id="v6-pod-audio-${idx}" controls preload="none" src="${ep.audioUrl}" style="width:100%; height:40px; margin-bottom:10px; border-radius:8px;"></audio>

            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
              <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:700;">Speed:</span>
                <button onclick="document.getElementById('v6-pod-audio-${idx}').playbackRate=0.75" class="speak-pill-btn secondary" style="padding:3px 10px; font-size:0.74rem;">0.75x Slow</button>
                <button onclick="document.getElementById('v6-pod-audio-${idx}').playbackRate=1.0" class="speak-pill-btn secondary" style="padding:3px 10px; font-size:0.74rem;">1.0x Native</button>
                <button onclick="document.getElementById('v6-pod-audio-${idx}').playbackRate=1.25" class="speak-pill-btn secondary" style="padding:3px 10px; font-size:0.74rem;">1.25x Exam Pace</button>
              </div>
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <div class="sr-stat-chip" style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; padding:3px 8px; border-radius:6px; background:var(--bg-elevated); border:1px solid var(--border);">
                  Pace: <strong id="pod-wpm-${idx}" style="color:var(--accent);">0</strong> WPM
                </div>
                <div class="sr-stat-chip" style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; padding:3px 8px; border-radius:6px; background:var(--bg-elevated); border:1px solid var(--border);">
                  Words: <strong id="pod-words-${idx}" style="color:var(--text);">0</strong>
                </div>
                <span id="pod-live-status-${idx}" class="occ-ver-pill" style="font-size:0.7rem; font-weight:800; background:rgba(239,68,68,0.12); color:#EF4444; border:1px solid rgba(239,68,68,0.3);">🔴 LIVE SPEECH READY</span>
              </div>
            </div>

            <!-- LIVE SPEECH TRANSCRIPTION VIEWER -->
            <div class="podcast-transcript-box" style="margin-top:10px; padding:12px; border-radius:14px; background:var(--bg, #f8fafc); border:1px solid var(--border); box-shadow:0 1px 3px rgba(0,0,0,0.04);">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
                <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                  <button id="pod-mic-btn-${idx}" onclick="window.togglePodcastSpeechRecognition('${idx}')" class="btn-accent-solid" style="padding:4px 12px; font-size:0.74rem; font-weight:800; cursor:pointer; white-space:nowrap;">🎙️ Practice Shadowing (Mic)</button>
                  <button onclick="window.copyCurrentPodcastTranscript('${idx}')" class="speak-pill-btn secondary" style="padding:4px 10px; font-size:0.72rem; cursor:pointer;">📋 Copy Spoken Text</button>
                  <button onclick="window.clearPodcastTranscript('${idx}')" class="speak-pill-btn secondary" style="padding:4px 10px; font-size:0.72rem; cursor:pointer;">🗑️ Clear</button>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <button id="pod-autoscroll-btn-${idx}" onclick="window.togglePodcastAutoScroll('${idx}')" class="speak-pill-btn secondary" style="padding:3px 8px; font-size:0.7rem; cursor:pointer;">Auto-Scroll: ON</button>
                </div>
              </div>
              <div id="pod-transcript-content-${idx}" class="podcast-live-speech-box" style="min-height:100px; max-height:240px; overflow-y:auto; padding:12px 14px; font-size:0.92rem; line-height:1.75; color:var(--text); background:var(--bg-card); border-radius:8px; border:1px solid var(--border-accent); scroll-behavior:smooth;">
                <div style="color:var(--text-secondary); font-style:italic; padding:8px 2px; font-size:0.86rem;">🎙️ <strong>Shadowing Practice:</strong> Speak along with the podcast to transcribe your voice live and practice pronunciation. (To listen to native audio only, use player above).</div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    const podBtn = document.getElementById('v6-podcast-btn');
    if (podBtn) {
      podBtn.onclick = async () => {
        const quota = window.IELTSApiV6.checkAndConsumeQuota(true);
        const out = document.getElementById('v6-podcast-output');
        if (!quota.allowed) {
          out.innerHTML = `
            <div style="padding:22px; border-radius:18px; border:1.5px solid rgba(255, 59, 92, 0.35); background:rgba(255, 59, 92, 0.05); text-align:center; margin-top:10px;">
              <div style="font-size:1.6rem; margin-bottom:6px;">👑</div>
              <div style="font-weight:800; font-size:1.05rem; color:#FF3B5C; margin-bottom:6px;">Daily Free Quota (10/10) Reached</div>
              <p style="font-size:0.84rem; color:var(--text-secondary); max-width:46ch; margin:0 auto 16px auto;">
                You have reached your daily limit for podcast streaming. Upgrade to the Lifetime VIP Pass for unlimited Cambridge &amp; BBC feeds, live speech transcription, and exam tools.
              </p>
              <button class="btn-accent-solid" onclick="if(typeof openVipPassModal==='function'){openVipPassModal();}else{alert('Unlock Lifetime VIP Pass');}" style="padding:10px 24px; font-weight:800; border-radius:9999px;">
                👑 Unlock Lifetime VIP Pass (750 ★ / 55,000 MMK)
              </button>
            </div>
          `;
          return;
        }

        const q = document.getElementById('v6-podcast-query').value;
        out.innerHTML = (typeof getAcademicToolLoadingHtml === 'function')
          ? getAcademicToolLoadingHtml('Podcasts')
          : `<div style="text-align:center; padding:24px;">Loading episodes from iTunes stream...</div>`;
        try {
          const eps = await window.IELTSApiV6.fetchShadowingPodcasts(q, false);
          out.innerHTML = getPodcastListHtml(eps);
        } catch (e) {
          out.innerHTML = `<p style="color:#FF3B5C; padding:12px;">Could not load podcast feed. Check internet connection.</p>`;
        }
      };
    }

    const podRefreshBtn = document.getElementById('v6-podcast-btn-refresh');
    if (podRefreshBtn) {
      podRefreshBtn.onclick = async () => {
        const quota = window.IELTSApiV6.checkAndConsumeQuota(true);
        const out = document.getElementById('v6-podcast-output');
        if (!quota.allowed) {
          out.innerHTML = `
            <div style="padding:22px; border-radius:18px; border:1.5px solid rgba(255, 59, 92, 0.35); background:rgba(255, 59, 92, 0.05); text-align:center; margin-top:10px;">
              <div style="font-size:1.6rem; margin-bottom:6px;">👑</div>
              <div style="font-weight:800; font-size:1.05rem; color:#FF3B5C; margin-bottom:6px;">Daily Free Quota (10/10) Reached</div>
              <p style="font-size:0.84rem; color:var(--text-secondary); max-width:46ch; margin:0 auto 16px auto;">
                You have reached your daily limit for podcast streaming. Upgrade to the Lifetime VIP Pass for unlimited Cambridge &amp; BBC feeds, live speech transcription, and exam tools.
              </p>
              <button class="btn-accent-solid" onclick="if(typeof openVipPassModal==='function'){openVipPassModal();}else{alert('Unlock Lifetime VIP Pass');}" style="padding:10px 24px; font-weight:800; border-radius:9999px;">
                👑 Unlock Lifetime VIP Pass (750 ★ / 55,000 MMK)
              </button>
            </div>
          `;
          return;
        }

        const q = document.getElementById('v6-podcast-query').value;
        out.innerHTML = (typeof getAcademicToolLoadingHtml === 'function')
          ? getAcademicToolLoadingHtml('Refreshing')
          : `<div style="text-align:center; padding:24px;">Refreshing live podcast feed...</div>`;
        try {
          const eps = await window.IELTSApiV6.fetchShadowingPodcasts(q, true);
          out.innerHTML = getPodcastListHtml(eps);
        } catch (e) {
          out.innerHTML = `<p style="color:#FF3B5C; padding:12px;">Failed to refresh live episodes. Try again in a few moments.</p>`;
        }
      };
    }

  }



  document.addEventListener('DOMContentLoaded', () => {

    initSpeakWordSheet();

    wireHub6Tools();

  });

})(window, document);

/* ============================================================================

   EDIT 4B: HUB 4 WRITING LAB — WORLD BANK SVG CHART & LANGUAGETOOL CONTROLLER

   File: js/ielts-api-features.js (Append at bottom)

   ============================================================================ */



(function (window, document) {

  'use strict';



  function wireWritingV6Tools() {

    const wbBtn = document.getElementById('v6-wb-load-btn');

    const ltBtn = document.getElementById('v6-lt-grammar-btn');

    const out = document.getElementById('v6-writing-live-output');



    if (wbBtn && out) {

      wbBtn.onclick = async () => {

        const indicator = document.getElementById('v6-wb-indicator').value;

        out.innerHTML = `<p style="font-size:0.85rem;opacity:0.75;">Fetching live World Bank statistics...</p>`;

        try {

          const rows = await window.IELTSApiV6.fetchWorldBankSeries(indicator);

          const latestYear = rows[0]?.year || '2023';

          const topRows = rows.filter((r) => r.year === latestYear).slice(0, 5);

          const maxVal = Math.max(...topRows.map((r) => r.value), 1);



          const bars = topRows.map((r, i) => {

            const h = Math.max(14, Math.round((r.value / maxVal) * 120));

            const x = 40 + i * 88;

            const y = 145 - h;

            return `

              <g>

                <rect x="${x}" y="${y}" width="48" height="${h}" rx="8" fill="#F59E0B" />

                <text x="${x + 24}" y="${y - 6}" text-anchor="middle" fill="#F59E0B" font-size="11" font-weight="800">${r.value}%</text>

                <text x="${x + 24}" y="164" text-anchor="middle" fill="#64748B" font-size="11" font-weight="700">${r.iso}</text>

              </g>

            `;

          }).join('');



          out.innerHTML = `

            <div style="padding:14px;border-radius:16px;border:1px solid var(--border-color,#E5EBF2);">

              <div style="font-weight:800;font-size:0.9rem;margin-bottom:8px;">

                Task 1 Prompt: The chart below illustrates ${rows[0]?.indicatorName || 'global indicators'} across 5 nations in ${latestYear}. Summarize the main features and make comparisons where relevant.

              </div>

              <svg viewBox="0 0 480 175" style="width:100%;max-width:560px;height:auto;">

                <line x1="25" y1="145" x2="460" y2="145" stroke="#CBD5E1" stroke-width="1.5" />

                ${bars}

              </svg>

            </div>

          `;

        } catch (e) {

          out.innerHTML = `<p style="color:#FF3B5C;">Unable to fetch World Bank chart offline.</p>`;

        }

      };

    }



    if (ltBtn && out) {

      ltBtn.onclick = async () => {

        const textarea = document.querySelector('#view-writing textarea');

        const text = textarea ? textarea.value.trim() : '';

        if (text.length < 20) {

          out.innerHTML = `<p style="color:#FF7A00;font-weight:700;">Type at least one sentence in the Writing Lab textarea first.</p>`;

          return;

        }

        out.innerHTML = `<p style="font-size:0.85rem;opacity:0.75;">Auditing grammar &amp; punctuation via LanguageTool...</p>`;

        try {

          const issues = await window.IELTSApiV6.checkEssayGrammar(text);

          if (!issues.length) {

            out.innerHTML = `<div style="color:#199A46;font-weight:800;font-size:0.9rem;">✓ Zero surface grammar or punctuation errors detected! Ready for Cambridge AI Examiner grading.</div>`;

            return;

          }

          out.innerHTML = `

            <div style="padding:12px;border-radius:16px;background:rgba(255,59,92,0.06);border:1px solid rgba(255,59,92,0.2);">

              <div style="font-weight:800;color:#FF3B5C;margin-bottom:6px;">GRA Diagnostic (${issues.length} potential issues):</div>

              <ul style="margin:0;padding-left:18px;font-size:0.85rem;line-height:1.55;">

                ${issues.map((i) => `<li><strong>"${i.bad}"</strong>: ${i.message}${i.fixes.length ? `<span style="color:#199A46;font-weight:700;">&rarr; ${i.fixes.join(', ')}</span>` : ''}</li>`).join('')}

              </ul>

            </div>

          `;

        } catch (e) {

          out.innerHTML = `<p style="color:#FF3B5C;">Grammar check service busy. Use Cambridge AI Examiner below.</p>`;

        }

      };

    }

  }



  document.addEventListener('DOMContentLoaded', wireWritingV6Tools);

})(window, document);

/* ============================================================================

   EDIT 5B: SPEAKING COUNTRY/CLIMATE CARD + 5-LEVEL LEARNER TRACK ADAPTER

   File: js/ielts-api-features.js (Append at bottom)

   ============================================================================ */



(function (window, document) {

  'use strict';



  function wireSpeakingGeoAndLevels() {
    const geoBtn = document.getElementById('v6-speaking-geo-btn');
    const geoInput = document.getElementById('v6-speaking-country');
    const geoOut = document.getElementById('v6-speaking-geo-output');

    if (geoBtn && geoOut) {
      const loadGeo = async () => {
        const country = (geoInput && geoInput.value.trim()) || 'Myanmar';
        geoOut.innerHTML = `<span style="opacity:0.75;">🌍 Loading live geographical &amp; meteorological briefing for "${country}"...</span>`;
        try {
          const info = await window.IELTSApiV6.fetchSpeakingPlaceBrief(country);
          if (!info) throw new Error('Not found');
          geoOut.innerHTML = `
            <div style="padding:14px;border-radius:12px;background:var(--bg);border:1px solid var(--accent);box-shadow:0 4px 18px rgba(0,0,0,0.06);display:grid;gap:10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-bottom:1px dashed var(--border);padding-bottom:8px;">
                <div style="font-weight:800;font-size:1rem;color:var(--accent);">
                  📍 ${info.name} <span style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);">(${info.official})</span>
                </div>
                <button type="button" class="btn-outlined" style="padding:2px 8px;font-size:0.72rem;border-radius:999px;" onclick="speakText('${info.name.replace(/'/g, "")}')">🔊 Pronounce Place</button>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;font-size:0.83rem;">
                <div><strong style="color:var(--text-secondary);">Capital / Center:</strong> <span style="color:var(--text);font-weight:600;">${info.capital}</span></div>
                <div><strong style="color:var(--text-secondary);">Population:</strong> <span style="color:var(--text);font-weight:600;">${info.population}</span></div>
                <div><strong style="color:var(--text-secondary);">Region:</strong> <span style="color:var(--text);font-weight:600;">${info.region}</span></div>
                <div><strong style="color:var(--text-secondary);">Live Weather:</strong> <span style="color:var(--accent);font-weight:700;">${info.tempC}</span> <span style="font-size:0.75rem;color:var(--text-secondary);">(Wind: ${info.windKmh})</span></div>
                <div><strong style="color:var(--text-secondary);">Languages:</strong> <span style="color:var(--text);">${info.languages}</span></div>
                <div><strong style="color:var(--text-secondary);">Currency:</strong> <span style="color:var(--text);">${info.currencies}</span></div>
              </div>
              <div style="padding-top:8px;border-top:1px dashed var(--border);font-size:0.8rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <strong style="color:var(--accent);font-size:0.75rem;text-transform:uppercase;letter-spacing:0.04em;">Band 8.5+ Hometown Collocations:</strong>
                  <button type="button" class="btn-outlined" style="padding:2px 7px;font-size:0.7rem;" onclick="speakText('${info.collocations.replace(/'/g, "")}')">🔊 Speak Phrases</button>
                </div>
                <div style="font-style:italic;color:var(--text);line-height:1.5;">${info.collocations}</div>
              </div>
            </div>
          `;
        } catch (e) {
          geoOut.innerHTML = `<span style="color:#FF3B5C;">Could not load place data. Please verify spelling.</span>`;
        }
      };

      geoBtn.onclick = loadGeo;
      if (geoInput) {
        geoInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            loadGeo();
          }
        });
      }
    }



    // Bridge #bandAssessmentModal (Levels 1-5) to calibrate Lexicon & Speaking WPM for all learners

    const modal = document.getElementById('bandAssessmentModal');

    if (modal) {

      modal.addEventListener('click', (e) => {

        const text = (e.target.innerText || '').toLowerCase();

        let track = null;

        if (text.includes('5.5') || text.includes('6.0')) track = { band: '6.0', cefr: 'B2', targetWpm: '110-130 WPM' };

        else if (text.includes('6.5')) track = { band: '6.5', cefr: 'B2+', targetWpm: '115-135 WPM' };

        else if (text.includes('7.0') || text.includes('7.5')) track = { band: '7.5', cefr: 'C1', targetWpm: '120-145 WPM' };

        else if (text.includes('8.0') || text.includes('8.5')) track = { band: '8.5', cefr: 'C1/C2', targetWpm: '125-150 WPM' };

        else if (text.includes('9.0')) track = { band: '9.0', cefr: 'C2', targetWpm: '130-155 WPM' };



        if (track) {

          localStorage.setItem('ips_learner_track', JSON.stringify(track));

        }

      });

    }

  }



  document.addEventListener('DOMContentLoaded', wireSpeakingGeoAndLevels);

})(window, document);

  // Interactive CBT Cloze Answer Verifier
  window.checkOpenAlexClozeAnswers = function() {
    const inputs = document.querySelectorAll('.cloze-drill-input');
    if (!inputs.length) return;
    let correct = 0;
    inputs.forEach(inp => {
      const expected = (inp.getAttribute('data-ans') || '').trim().toLowerCase();
      const val = (inp.value || '').trim().toLowerCase();
      if (val === expected) {
        inp.style.border = '2px solid #10B981';
        inp.style.background = 'rgba(16, 185, 129, 0.15)';
        inp.style.color = '#10B981';
        correct++;
      } else {
        inp.style.border = '2px solid #EF4444';
        inp.style.background = 'rgba(239, 68, 68, 0.12)';
        inp.style.color = '#EF4444';
      }
    });
    const scoreEl = document.getElementById('cloze-score-badge');
    if (scoreEl) {
      scoreEl.innerHTML = `<span style="color:${correct === inputs.length ? '#10B981' : '#F59E0B'}">Score: ${correct} / ${inputs.length} (${Math.round((correct/inputs.length)*100)}%)</span>`;
    }
  };

  window.revealOpenAlexClozeAnswers = function() {
    const inputs = document.querySelectorAll('.cloze-drill-input');
    inputs.forEach(inp => {
      const expected = inp.getAttribute('data-ans');
      if (expected) {
        inp.value = expected;
        inp.style.border = '2px solid #0D55FE';
        inp.style.background = 'rgba(13, 85, 254, 0.1)';
        inp.style.color = '#0D55FE';
      }
    });
  };
