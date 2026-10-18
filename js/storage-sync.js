/**
 * IELTS Prep Studio - StorageManager & Telegram Mini App (TMA) Integration
 * 3-Tier Storage Engine: LocalStorage -> CloudStorage -> Cloudflare D1/KV Backend
 * Zero LLM / Zero External Cost / Deterministic Sync
 */

(function(window) {
  'use strict';

  const STORAGE_KEY = 'occ_ielts_studio_v5';
  const BACKUP_FILENAME = 'ielts_prep_studio_backup.json';

  // Configurable Worker endpoint
  const getApiBase = () => {
    if (typeof window !== 'undefined' && window.STUDIO_API_URL) {
      return window.STUDIO_API_URL;
    }
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://127.0.0.1:8787';
    }
    return 'https://ielts-prep-studio-backend.lyan123-lh.workers.dev';
  };

  const tg = (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp)
    ? window.Telegram.WebApp
    : null;

  // Initialize TMA SDK immediately
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor('#0d0d0d');
      if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor('#0d0d0d');
      if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        window.telegramUser = tg.initDataUnsafe.user;
        console.log('[TMA] Telegram User connected:', tg.initDataUnsafe.user.id, tg.initDataUnsafe.user.first_name);
      }
    } catch (e) {
      console.warn('[TMA Init Notice]', e);
    }
  }

  // Native Haptics Bridge
  function triggerHaptic(type) {
    if (tg && tg.HapticFeedback) {
      try {
        if (type === 'selection') {
          tg.HapticFeedback.selectionChanged();
          return;
        }
        if (type === 'success' || type === 'warning' || type === 'error') {
          tg.HapticFeedback.notificationOccurred(type);
          return;
        }
        // Impact
        const style = (type === 'heavy' || type === 'medium' || type === 'soft' || type === 'rigid') ? type : 'light';
        tg.HapticFeedback.impactOccurred(style);
        return;
      } catch (err) {}
    }
    // Web Vibration fallback
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(15);
      } catch (e) {}
    }
  }

  // Override / enhance global studioHaptic if defined
  if (typeof window !== 'undefined') {
    const origHaptic = window.studioHaptic;
    window.studioHaptic = function(msOrType) {
      if (typeof msOrType === 'string') {
        triggerHaptic(msOrType);
      } else {
        triggerHaptic('light');
      }
      if (typeof origHaptic === 'function') {
        try { origHaptic(msOrType); } catch (e) {}
      }
    };
  }

  // Count due SRS items for server telemetry and reminders
  function getDueSrsCount(state) {
    if (!state || !state.srsSchedule) return 0;
    const now = Date.now();
    let due = 0;
    for (const id in state.srsSchedule) {
      if (state.srsSchedule[id] && state.srsSchedule[id].due <= now) {
        due++;
      }
    }
    return due;
  }

  const StorageManager = {
    isTelegram: !!(tg && ((tg.initDataUnsafe && tg.initDataUnsafe.user) || tg.initData)),
    telegramUser: (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) ? tg.initDataUnsafe.user : null,

    getTelegramUser() {
      if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        return tg.initDataUnsafe.user;
      }
      return null;
    },

    getInitData() {
      return (tg && tg.initData) ? tg.initData : '';
    },

    triggerHaptic,

    // Tier A: LocalStorage
    getLocalState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn('[StorageManager] LocalStorage read error', e);
      }
      return null;
    },

    saveLocalState(state) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('[StorageManager] LocalStorage write error', e);
      }
    },

    // Tier B: Telegram CloudStorage
    async saveCloudStorage(state) {
      if (!tg || !tg.CloudStorage || typeof tg.CloudStorage.setItem !== 'function') return false;
      return new Promise((resolve) => {
        try {
          const serialized = JSON.stringify({
            updatedAt: Date.now(),
            mastered: state.mastered || [],
            srsSchedule: state.srsSchedule || {},
            drillBest: state.drillBest || 0,
            readingDone: state.readingDone || [],
            errorLog: (state.errorLog || []).slice(0, 100),
            userProfile: state.userProfile || {}
          });
          tg.CloudStorage.setItem('ips_progress', serialized, (err, success) => {
            if (err) console.warn('[TMA CloudStorage Error]', err);
            resolve(!!success);
          });
        } catch (e) {
          resolve(false);
        }
      });
    },

    async loadCloudStorage() {
      if (!tg || !tg.CloudStorage || typeof tg.CloudStorage.getItem !== 'function') return null;
      return new Promise((resolve) => {
        try {
          tg.CloudStorage.getItem('ips_progress', (err, value) => {
            if (!err && value) {
              try {
                resolve(JSON.parse(value));
                return;
              } catch (e) {}
            }
            resolve(null);
          });
        } catch (e) {
          resolve(null);
        }
      });
    },

    // Tier B: Cloudflare Serverless Sync (D1 + KV)
    async syncServerless(state) {
      const initData = this.getInitData();
      if (!initData) return null; // Outside Telegram, no initData

      const dueCount = getDueSrsCount(state);
      const apiBase = getApiBase();

      try {
        const response = await fetch(`${apiBase}/api/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            initData: initData,
            progress: state,
            srsDueCount: dueCount
          })
        });

        if (!response.ok) {
          throw new Error(`Sync HTTP error ${response.status}`);
        }

        const data = await response.json();
        console.log('[StorageManager] Sync response:', data.isVip ? '👑 VIP User' : 'Free Mode');

        // If server verified user is VIP and returned VIP bundle, merge it
        if (data.isVip && data.vipData && typeof window.mergeVipBundle === 'function') {
          window.mergeVipBundle(data.vipData);
        }
        if (data.isVip && typeof window.activateVipPass === 'function') {
          window.activateVipPass('lifetime');
        }
        if (typeof window.updateAuthUI === 'function') {
          window.updateAuthUI();
        }

        return data;
      } catch (err) {
        console.warn('[StorageManager Sync Error]', err.message);
        return null;
      }
    },

    // Redeem VIP Activation Code via Serverless API
    async redeemActivationCode(code) {
      const initData = this.getInitData();
      const apiBase = getApiBase();

      try {
        const response = await fetch(`${apiBase}/api/redeem-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            initData: initData,
            code: (code || '').trim().toUpperCase()
          })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to redeem activation code');
        }

        // Successfully redeemed! Merge VIP bundle
        if (data.vipData && typeof window.mergeVipBundle === 'function') {
          window.mergeVipBundle(data.vipData);
        }
        return { success: true, message: 'VIP Activated Successfully!' };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // Tier C: Offline Manual Backup Export (.json)
    exportLocalBackup() {
      try {
        const state = (typeof window.appState !== 'undefined') ? window.appState : this.getLocalState();
        if (!state) {
          alert('No study progress found to export.');
          return;
        }
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', BACKUP_FILENAME);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        triggerHaptic('success');
        if (typeof window.showToast === 'function') {
          window.showToast('📥 Study progress backup downloaded successfully!');
        }
      } catch (err) {
        console.error('[Export Error]', err);
        alert('Could not export backup: ' + err.message);
      }
    },

    // Tier C: Offline Manual Backup Import (.json)
    importLocalBackup(file) {
      return new Promise((resolve, reject) => {
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const parsed = JSON.parse(e.target.result);
            if (!parsed || typeof parsed !== 'object') {
              throw new Error('Invalid JSON format');
            }
            // Sanitize and save
            this.saveLocalState(parsed);
            if (typeof window.appState !== 'undefined') {
              window.appState = Object.assign(window.appState, parsed);
            }
            if (typeof window.loadAppState === 'function') {
              window.loadAppState();
            }
            triggerHaptic('success');
            if (typeof window.showToast === 'function') {
              window.showToast('✅ Study progress backup restored successfully!');
            }
            resolve(parsed);
          } catch (err) {
            alert('Invalid backup file: ' + err.message);
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('File reading failed'));
        reader.readAsText(file);
      });
    }
  };

  // Auto-run sync on app boot if in Telegram
  if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;

    window.addEventListener('DOMContentLoaded', () => {
      if (typeof window.updateAuthUI === 'function') {
        window.updateAuthUI();
      }
      setTimeout(async () => {
        if (StorageManager.isTelegram && typeof window.appState !== 'undefined') {
          console.log('[StorageManager] Booting auto-sync with Cloudflare Worker...');
          await StorageManager.syncServerless(window.appState);
        }
        if (typeof window.updateAuthUI === 'function') {
          window.updateAuthUI();
        }
      }, 800);
    });
  }

})(typeof window !== 'undefined' ? window : this);
