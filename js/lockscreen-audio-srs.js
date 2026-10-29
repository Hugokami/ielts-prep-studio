/**
 * lockscreen-audio-srs.js — IELTS Prep Studio
 * Background Commute & Lockscreen Audio SRS Player
 * Uses Web Speech API & W3C MediaSession API for lockscreen metadata and headphone controls.
 */

(function(window) {
  'use strict';

  var playlist = [];
  var currentIndex = 0;
  var isPlaying = false;
  var playbackRate = 1.0;
  var pauseTimeout = null;
  var silentOscillator = null;
  var audioCtx = null;

  function initSilentAudio() {
    try {
      if (!audioCtx) {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
          // Create silent buffer loop to keep audio session alive on mobile WebViews
          var buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
          var source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.connect(audioCtx.destination);
          source.start(0);
        }
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } catch (e) {
      // Graceful fallback
    }
  }

  function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', function() {
        resumePlayback();
      });
      navigator.mediaSession.setActionHandler('pause', function() {
        pausePlayback();
      });
      navigator.mediaSession.setActionHandler('nexttrack', function() {
        nextTrack();
      });
      navigator.mediaSession.setActionHandler('previoustrack', function() {
        previousTrack();
      });
      navigator.mediaSession.setActionHandler('stop', function() {
        stopSession();
      });
    } catch (e) {
      console.warn('MediaSession handler setup error:', e);
    }
  }

  function updateMediaMetadata(item) {
    if (!('mediaSession' in navigator) || !item) return;

    try {
      var wordText = item.word || item.title || item.term || 'Academic Word';
      var pos = item.pos || 'term';
      var defMm = item.meaning_mm || item.definition_mm || item.defMm || item.meaning || '';
      var defEn = item.definition_en || item.meaning || item.defEn || '';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: wordText + ' [' + pos + '] • Band 8.5',
        artist: 'IELTS Prep Studio — Commute SRS',
        album: defMm ? defMm + ' · ' + defEn : defEn,
        artwork: [
          { src: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=512&auto=format&fit=crop&q=80', sizes: '512x512', type: 'image/jpeg' }
        ]
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (e) {
      // Ignore
    }
  }

  function getPlaylistItems() {
    var items = [];
    // 1. Try currently filtered lexicon from window.ACADEMIC_LEXICON_DATA or window.VOCAB_DATA
    if (typeof window.getFilteredLexicon === 'function') {
      try {
        var filtered = window.getFilteredLexicon();
        if (Array.isArray(filtered) && filtered.length > 0) items = filtered;
      } catch (e) {}
    }

    if (!items.length && Array.isArray(window.VOCAB_DATA) && window.VOCAB_DATA.length > 0) {
      items = window.VOCAB_DATA;
    }

    if (!items.length && window.CURATED_ACADEMIC_LEXICON) {
      items = Object.keys(window.CURATED_ACADEMIC_LEXICON).map(function(k) {
        var entry = window.CURATED_ACADEMIC_LEXICON[k];
        return {
          word: k,
          pos: entry.pos || 'term',
          meaning_mm: entry.meaning_mm || '',
          definition_en: entry.definition_en || ''
        };
      });
    }

    return items;
  }

  function speakTextPromise(text, lang, rate) {
    return new Promise(function(resolve) {
      if (!('speechSynthesis' in window) || !text) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      var utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang || 'en-GB';
      utter.rate = rate || playbackRate;
      utter.pitch = 1.0;

      utter.onend = function() {
        resolve();
      };
      utter.onerror = function() {
        resolve();
      };
      window.speechSynthesis.speak(utter);
    });
  }

  function playCurrentWord() {
    if (!isPlaying) return;
    if (currentIndex >= playlist.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = playlist.length - 1;

    var item = playlist[currentIndex];
    if (!item) {
      stopSession();
      return;
    }

    updateMediaMetadata(item);
    updateWidgetUI(item);

    var word = item.word || item.title || item.term || '';
    var pos = item.pos ? item.pos + '.' : '';
    var defEn = item.definition_en || item.meaning || item.defEn || '';
    var defMm = item.meaning_mm || item.definition_mm || item.defMm || '';

    // Step 1: Speak English Word with clear British RP cadence
    speakTextPromise(word, 'en-GB', playbackRate * 0.95).then(function() {
      if (!isPlaying) return;
      pauseTimeout = setTimeout(function() {
        if (!isPlaying) return;

        // Step 2: Speak English definition or example
        var explainText = defEn ? (pos ? pos + ' ' : '') + defEn : '';
        speakTextPromise(explainText, 'en-US', playbackRate * 1.05).then(function() {
          if (!isPlaying) return;

          pauseTimeout = setTimeout(function() {
            if (!isPlaying) return;

            // Step 3: Speak Burmese meaning (or spelling/synonym if TTS lacks my-MM)
            var mmText = defMm || '';
            speakTextPromise(mmText, 'my-MM', playbackRate).then(function() {
              if (!isPlaying) return;

              // Step 4: 2.5s Reflection Gap before next word
              pauseTimeout = setTimeout(function() {
                if (!isPlaying) return;
                currentIndex++;
                playCurrentWord();
              }, 2500);
            });
          }, 800);
        });
      }, 700);
    });
  }

  function startSession(customList, startIdx) {
    initSilentAudio();
    setupMediaSession();

    playlist = (Array.isArray(customList) && customList.length > 0) ? customList : getPlaylistItems();
    if (!playlist.length) {
      if (typeof window.showAppToast === 'function') {
        window.showAppToast('No vocabulary items available for commute audio mode.', 'error');
      } else {
        alert('No vocabulary items found for Commute Audio Mode.');
      }
      return;
    }

    currentIndex = typeof startIdx === 'number' ? startIdx : 0;
    isPlaying = true;

    renderWidget();
    playCurrentWord();
  }

  function pausePlayback() {
    isPlaying = false;
    clearTimeout(pauseTimeout);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    updateWidgetPlayButton();
  }

  function resumePlayback() {
    if (!playlist.length) return;
    isPlaying = true;
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    updateWidgetPlayButton();
    playCurrentWord();
  }

  function togglePlay() {
    if (isPlaying) {
      pausePlayback();
    } else {
      resumePlayback();
    }
  }

  function nextTrack() {
    clearTimeout(pauseTimeout);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    currentIndex++;
    if (currentIndex >= playlist.length) currentIndex = 0;
    if (isPlaying) {
      playCurrentWord();
    } else {
      updateWidgetUI(playlist[currentIndex]);
      updateMediaMetadata(playlist[currentIndex]);
    }
  }

  function previousTrack() {
    clearTimeout(pauseTimeout);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    currentIndex--;
    if (currentIndex < 0) currentIndex = playlist.length - 1;
    if (isPlaying) {
      playCurrentWord();
    } else {
      updateWidgetUI(playlist[currentIndex]);
      updateMediaMetadata(playlist[currentIndex]);
    }
  }

  function setRate(rate) {
    playbackRate = rate;
    updateWidgetRateButtons();
  }

  function stopSession() {
    isPlaying = false;
    clearTimeout(pauseTimeout);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';

    var widget = document.getElementById('lockscreenAudioWidget');
    if (widget) widget.remove();
  }

  function toggle() {
    var widget = document.getElementById('lockscreenAudioWidget');
    if (widget) {
      stopSession();
    } else {
      startSession();
    }
  }

  // Floating Player Widget (Speak Design Tokens & Responsive Zero-Spill)
  function renderWidget() {
    var existing = document.getElementById('lockscreenAudioWidget');
    if (existing) existing.remove();

    var widget = document.createElement('div');
    widget.id = 'lockscreenAudioWidget';
    widget.style.cssText = [
      'position: fixed',
      'bottom: calc(72px + env(safe-area-inset-bottom, 8px))',
      'left: 12px',
      'right: 12px',
      'max-width: 540px',
      'margin: 0 auto',
      'background: var(--bg-card, #FFFFFF)',
      'border: 1px solid var(--border-accent, #0F172A)',
      'box-shadow: 0 12px 36px rgba(0,0,0,0.22)',
      'border-radius: 14px',
      'padding: 12px 16px',
      'z-index: 9999',
      'box-sizing: border-box',
      'display: flex',
      'flex-direction: column',
      'gap: 8px',
      'animation: slideUpWidget 0.25s ease-out'
    ].join(';');

    widget.innerHTML = [
      '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">',
      '  <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">',
      '    <span style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:50%; background:rgba(245,158,11,0.15); color:#F59E0B; font-size:0.9rem; flex-shrink:0;">🎧</span>',
      '    <div style="min-width:0; flex:1;">',
      '      <div style="display:flex; align-items:center; gap:6px;">',
      '        <strong id="lsWordTitle" style="font-size:1rem; font-weight:900; color:var(--text); text-transform:uppercase; letter-spacing:0.02em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Loading...</strong>',
      '        <span id="lsPosBadge" class="occ-ver-pill" style="font-size:0.65rem; font-weight:800; padding:1px 5px; flex-shrink:0;">C1</span>',
      '      </div>',
      '      <div id="lsMeaningMm" class="burmese" style="font-size:0.78rem; font-weight:700; color:var(--accent); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">...</div>',
      '    </div>',
      '  </div>',
      '  <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">',
      '    <button type="button" onclick="window.LockscreenAudioSRS.previous()" class="util-icon-btn" style="padding:4px 8px; font-size:0.85rem;" title="Previous Word">⏮</button>',
      '    <button type="button" id="lsPlayPauseBtn" onclick="window.LockscreenAudioSRS.togglePlay()" class="btn-accent-solid" style="padding:4px 12px; font-size:0.85rem; font-weight:800;" title="Play/Pause">⏸</button>',
      '    <button type="button" onclick="window.LockscreenAudioSRS.next()" class="util-icon-btn" style="padding:4px 8px; font-size:0.85rem;" title="Next Word">⏭</button>',
      '    <button type="button" onclick="window.LockscreenAudioSRS.stop()" class="util-icon-btn" style="padding:4px 8px; font-size:0.85rem; color:var(--text-muted);" title="Close Commute Mode">✕</button>',
      '  </div>',
      '</div>',
      '<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; color:var(--text-secondary); border-top:1px dashed var(--border); padding-top:6px; margin-top:2px; flex-wrap:wrap; gap:4px;">',
      '  <span id="lsPlaylistCounter">Word 1 of 1</span>',
      '  <div style="display:flex; align-items:center; gap:4px;">',
      '    <span>Speed:</span>',
      '    <button type="button" id="lsRate08" onclick="window.LockscreenAudioSRS.setRate(0.8)" style="background:none; border:none; padding:1px 5px; border-radius:3px; font-size:0.7rem; font-weight:700; cursor:pointer;">0.8x</button>',
      '    <button type="button" id="lsRate10" onclick="window.LockscreenAudioSRS.setRate(1.0)" style="background:var(--accent); color:#FFF; border:none; padding:1px 5px; border-radius:3px; font-size:0.7rem; font-weight:700; cursor:pointer;">1.0x</button>',
      '    <button type="button" id="lsRate12" onclick="window.LockscreenAudioSRS.setRate(1.2)" style="background:none; border:none; padding:1px 5px; border-radius:3px; font-size:0.7rem; font-weight:700; cursor:pointer;">1.2x</button>',
      '  </div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(widget);
  }

  function updateWidgetUI(item) {
    if (!item) return;
    var titleEl = document.getElementById('lsWordTitle');
    var posEl = document.getElementById('lsPosBadge');
    var mmEl = document.getElementById('lsMeaningMm');
    var counterEl = document.getElementById('lsPlaylistCounter');

    if (titleEl) titleEl.textContent = item.word || item.title || item.term || '';
    if (posEl) posEl.textContent = (item.pos || 'C1').toUpperCase();
    if (mmEl) mmEl.textContent = item.meaning_mm || item.definition_mm || item.defMm || item.definition_en || '';
    if (counterEl) counterEl.textContent = 'Word ' + (currentIndex + 1) + ' of ' + playlist.length + ' · Headphone Controls Active';
  }

  function updateWidgetPlayButton() {
    var btn = document.getElementById('lsPlayPauseBtn');
    if (btn) btn.textContent = isPlaying ? '⏸' : '▶';
  }

  function updateWidgetRateButtons() {
    ['08', '10', '12'].forEach(function(r) {
      var btn = document.getElementById('lsRate' + r);
      if (!btn) return;
      var val = r === '08' ? 0.8 : (r === '10' ? 1.0 : 1.2);
      if (Math.abs(playbackRate - val) < 0.05) {
        btn.style.background = 'var(--accent)';
        btn.style.color = '#FFF';
      } else {
        btn.style.background = 'none';
        btn.style.color = 'var(--text-secondary)';
      }
    });
  }

  // Export globally
  window.LockscreenAudioSRS = {
    start: startSession,
    pause: pausePlayback,
    resume: resumePlayback,
    togglePlay: togglePlay,
    next: nextTrack,
    previous: previousTrack,
    setRate: setRate,
    stop: stopSession,
    toggle: toggle
  };

})(window);
