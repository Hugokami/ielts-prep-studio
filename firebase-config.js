/**
 * IELTS Prep Studio - Firebase Authentication & Cloud Sync Configuration
 * Supports Firebase Hosting, App Hosting, and local/GitHub Pages environments.
 */

// 1. Firebase Project Configuration
// Replace with your real Firebase Project Web App Credentials from:
// https://console.firebase.google.com/project/_/settings/general
window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
  apiKey: "AIzaSyDYZqW0Xxnjhlv3nQ4Ep1M_6zDYmZqMEMs",
  authDomain: "ielts-20309.firebaseapp.com",
  projectId: "ielts-20309",
  storageBucket: "ielts-20309.firebasestorage.app",
  messagingSenderId: "761262240112",
  appId: "1:761262240112:web:82c497847829dbc78ddfb5",
  measurementId: "G-8GHWTW7NMD"
};

// 2. Google Gemini Generative AI Configuration
const _DEFAULT_GEMINI_KEY = atob("QVEuQWI4Uk42S0stb0JhZF9QeDJMcUljZmNqNnhseEZheUFjYmd6SGVJNW9GY2NGSUU5d0E=");
window.GEMINI_CONFIG = window.GEMINI_CONFIG || {
  apiKey: (typeof localStorage !== "undefined" && localStorage.getItem("ielts_gemini_api_key")) || _DEFAULT_GEMINI_KEY,
  model: "gemini-3.5-flash-lite",
  fallbackModels: ["gemini-3.5-flash", "gemini-3.8-flash"]
};

window.isFirebaseConfigured = function() {
  return window.FIREBASE_CONFIG &&
    window.FIREBASE_CONFIG.apiKey &&
    !window.FIREBASE_CONFIG.apiKey.includes("YOUR_API_KEY");
};

// Global Auth & Cloud Sync State
window.currentUser = null;
window.authInitialized = false;

/**
 * Initialize Firebase SDKs for Google Authentication and Firestore Cloud Sync
 */
window.initFirebaseServices = function() {
  // Purge any legacy demo user from storage
  try { localStorage.removeItem("ielts_demo_user"); } catch (e) {}

  if (typeof firebase === "undefined") {
    console.log("[Firebase] SDK not loaded from CDN.");
    return;
  }

  if (window.isFirebaseConfigured()) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      window.firebaseAuthInstance = firebase.auth();
      window.firebaseDbInstance = firebase.firestore();

      if (typeof window.firebaseAuthInstance.getRedirectResult === "function") {
        window.firebaseAuthInstance.getRedirectResult().then((result) => {
          if (result && result.user) {
            handleAuthState(result.user);
          }
        }).catch((err) => {
          console.warn("[Firebase Redirect Auth Notice]", err);
        });
      }

      window.firebaseAuthInstance.onAuthStateChanged((user) => {
        handleAuthState(user);
      });
      console.log("[Firebase] Live Firebase initialized successfully.");
    } catch (err) {
      console.warn("[Firebase] Initialization error:", err);
    }
  } else {
    console.log("[Firebase] Credentials not configured.");
  }
};

/**
 * Handle Auth State Change from Firebase
 */
function handleAuthState(user) {
  if (user) {
    window.currentUser = {
      uid: user.uid,
      displayName: user.displayName || user.email?.split("@")[0] || "Scholar",
      email: user.email,
      photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "S")}&background=e06c35&color=fff`,
      isAnonymous: user.isAnonymous
    };
    // Load cloud progress and verified VIP status
    loadUserDataFromCloud();
  } else {
    window.currentUser = null;
    const isTg = !!(typeof window !== "undefined" && (window.telegramUser || (window.StorageManager && window.StorageManager.isTelegram) || (window.Telegram && window.Telegram.WebApp && ((window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) || window.Telegram.WebApp.initData))));
    if (!isTg && typeof appState !== "undefined" && appState.userProfile && appState.userProfile.tier !== "vip") {
      appState.userProfile.tier = "free";
      appState.userProfile.vipExpiresAt = null;
      appState.userProfile.voucherCode = null;
      if (typeof saveAppState === "function") saveAppState();
    }
    if (typeof refreshAllVipViews === "function") {
      refreshAllVipViews();
    }
  }
  updateAuthUI();
}

/**
 * Sign in with Google (Popup)
 */
window.signInWithGoogle = async function() {
  const isTg = !!(typeof window !== "undefined" && (window.telegramUser || (window.StorageManager && window.StorageManager.isTelegram) || (window.Telegram && window.Telegram.WebApp && ((window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) || window.Telegram.WebApp.initData))));
  if (isTg) {
    const tgUser = window.telegramUser || (window.StorageManager && window.StorageManager.getTelegramUser && window.StorageManager.getTelegramUser()) || (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user);
    const name = (tgUser && (tgUser.username ? '@' + tgUser.username : tgUser.first_name)) || "Telegram Account";
    alert(`Connected to Telegram as ${name}!\n\nInside Telegram Mini App, your account is automatically authenticated via Telegram and Cloudflare D1. Google Sign-In is only needed when using an external desktop browser.`);
    return null;
  }

  if (typeof firebase !== "undefined" && window.isFirebaseConfigured() && window.firebaseAuthInstance) {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");
      let result;
      try {
        result = await window.firebaseAuthInstance.signInWithPopup(provider);
        return result.user;
      } catch (popupErr) {
        if (popupErr.code === "auth/popup-blocked") {
          console.log("[Firebase] Popup blocked, attempting signInWithRedirect...");
          await window.firebaseAuthInstance.signInWithRedirect(provider);
          return null;
        }
        throw popupErr;
      }
    } catch (error) {
      console.error("[Firebase Auth Error]:", error);
      if (error.code === "auth/unauthorized-domain") {
        const host = window.location.hostname;
        const msg = `⚠️ Google Sign-In Setup Required for this Domain:

` +
          `"${host}" is not yet listed in your Firebase Authorized Domains.

` +
          `To fix this in 1 minute:
` +
          `1. Go to Firebase Console (https://console.firebase.google.com)
` +
          `2. Project: ielts-20309 > Build > Authentication > Settings
` +
          `3. Click "Authorized domains" > Add "${host}"

` +
          `💡 Tip: You can also log in instantly using the "Log in with Telegram" button or your VIP Voucher!`;
        alert(msg);
      } else if (error.code !== "auth/popup-closed-by-user") {
        alert(`Google Sign-In error: ${error.message}`);
      }
      return null;
    }
  } else {
    alert("Firebase Auth service is currently connecting. Please ensure internet access and try again.");
    return null;
  }
};

/**
 * Sign out
 */
window.signOutUser = async function() {
  const isTg = !!(typeof window !== "undefined" && (window.telegramUser || (window.StorageManager && window.StorageManager.isTelegram) || (window.Telegram && window.Telegram.WebApp && ((window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) || window.Telegram.WebApp.initData))));
  if (isTg) {
    alert("You are running inside the Telegram Mini App. Your session is tied to your Telegram profile.");
    return;
  }

  if (window.firebaseAuthInstance && window.isFirebaseConfigured()) {
    try {
      await window.firebaseAuthInstance.signOut();
    } catch (e) {}
  }
  window.currentUser = null;
  if (typeof appState !== "undefined" && appState.userProfile) {
    appState.userProfile.tier = "free";
    appState.userProfile.vipExpiresAt = null;
    appState.userProfile.voucherCode = null;
    if (typeof saveAppState === "function") saveAppState();
  }
  updateAuthUI();
  if (typeof refreshAllVipViews === "function") {
    refreshAllVipViews();
  }
  showToast("Signed out. Switched to Free Tier.");
};

/**
 * Cloud Sync (Firestore)
 */
window.syncUserDataToCloud = async function() {
  const isTg = !!(window.telegramUser || (window.StorageManager && window.StorageManager.isTelegram) || (window.Telegram && window.Telegram.WebApp && ((window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) || window.Telegram.WebApp.initData)));
  if (isTg) {
    if (window.StorageManager && typeof window.StorageManager.syncServerless === "function") {
      return await window.StorageManager.syncServerless(window.appState);
    }
    return true;
  }

  if (!window.currentUser) {
    console.log("[CloudSync] No Google user signed in; skipping Firestore sync.");
    return false;
  }

  if (window.firebaseDbInstance && window.isFirebaseConfigured()) {
    try {
      const docRef = window.firebaseDbInstance.collection("users").doc(window.currentUser.uid).collection("studioState").doc("progress");
      
      // Bounded Payload to prevent Firestore 1 MiB document limit exhaustion
      const payload = {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        mastered: (appState.mastered || []).slice(0, 1000),
        srsSchedule: appState.srsSchedule ? Object.fromEntries(Object.entries(appState.srsSchedule).slice(0, 1000)) : {},
        drillBest: Math.min(Math.max(appState.drillBest || 0, 0), 100000),
        writingDrafts: appState.writingDrafts ? Object.fromEntries(Object.entries(appState.writingDrafts).slice(0, 50)) : {},
        readingDone: (appState.readingDone || []).slice(0, 100),
        errorLog: (appState.errorLog || []).slice(-500), // retain 500 most recent errors
        userProfile: appState.userProfile || {}
      };
      await docRef.set(payload, { merge: true });
      showToast("☁️ Progress successfully synced to Firebase Cloud!");
      return true;
    } catch (err) {
      console.error("[Firestore Sync Error]:", err);
      showToast("⚠️ Cloud sync failed. Saved to local storage.");
      return false;
    }
  } else {
    // Local / Sandbox simulated cloud sync
    showToast("☁️ Progress saved! (Firebase keys pending for cross-device live sync)");
    return true;
  }
};

window.loadUserDataFromCloud = async function() {
  if (!window.currentUser || !window.firebaseDbInstance || !window.isFirebaseConfigured()) return;
  try {
    const docRef = window.firebaseDbInstance.collection("users").doc(window.currentUser.uid).collection("studioState").doc("progress");
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data();
      
      // Tombstone-aware merge for mastered items (prevents zombie resurrection)
      const tombstones = new Set(appState.unmastered || []);
      if (Array.isArray(data.mastered)) {
        const merged = new Set([...(appState.mastered || []), ...data.mastered]);
        tombstones.forEach(id => merged.delete(id));
        appState.mastered = Array.from(merged).slice(0, 1000);
      }
      if (data.srsSchedule && typeof data.srsSchedule === 'object') {
        appState.srsSchedule = Object.assign({}, appState.srsSchedule || {}, data.srsSchedule);
      }
      if (typeof data.drillBest === 'number') {
        appState.drillBest = Math.max(appState.drillBest || 0, data.drillBest);
      }
      if (data.writingDrafts && typeof data.writingDrafts === 'object') {
        appState.writingDrafts = Object.assign({}, appState.writingDrafts || {}, data.writingDrafts);
      }
      if (Array.isArray(data.readingDone)) {
        appState.readingDone = Array.from(new Set([...(appState.readingDone || []), ...data.readingDone])).slice(0, 100);
      }
      if (Array.isArray(data.errorLog)) {
        appState.errorLog = data.errorLog.slice(-500);
      }
      if (data.userProfile && typeof data.userProfile === 'object') {
        if (!appState.userProfile) appState.userProfile = {};
        if (data.userProfile.tier === "vip") {
          // Check expiration if time-bounded pass
          let isExpired = false;
          if (data.userProfile.vipExpiresAt) {
            const expMillis = typeof data.userProfile.vipExpiresAt.toMillis === 'function'
              ? data.userProfile.vipExpiresAt.toMillis()
              : new Date(data.userProfile.vipExpiresAt).getTime();
            if (!isNaN(expMillis) && expMillis < Date.now()) {
              isExpired = true;
            }
          }
          if (isExpired) {
            appState.userProfile.tier = "free";
            appState.userProfile.vipExpiresAt = null;
            appState.userProfile.voucherCode = null;
          } else {
            appState.userProfile.tier = "vip";
            appState.userProfile.vipExpiresAt = data.userProfile.vipExpiresAt;
            if (data.userProfile.voucherCode) appState.userProfile.voucherCode = data.userProfile.voucherCode;
          }
        } else {
          appState.userProfile.tier = "free";
          appState.userProfile.vipExpiresAt = null;
          appState.userProfile.voucherCode = null;
        }
        if (data.userProfile.monthlyUsage) {
          appState.userProfile.monthlyUsage = Object.assign({}, appState.userProfile.monthlyUsage || {}, data.userProfile.monthlyUsage);
        }
        if (data.userProfile.dailyUsage) {
          appState.userProfile.dailyUsage = Object.assign({}, appState.userProfile.dailyUsage || {}, data.userProfile.dailyUsage);
        }
      }
      saveAppState();
      if (typeof refreshAllVipViews === "function") {
        refreshAllVipViews();
      } else {
        renderLexiconGrid();
      }
      showToast("☁️ Cloud progress restored!");
    } else {
      // New cloud profile: enforce clean free tier defaults and purge any unverified local tampering
      if (!appState.userProfile) appState.userProfile = {};
      appState.userProfile.tier = "free";
      appState.userProfile.vipExpiresAt = null;
      appState.userProfile.voucherCode = null;
      saveAppState();
      if (typeof refreshAllVipViews === "function") {
        refreshAllVipViews();
      }
    }
    // Check and execute queued 1-click Magic Link voucher redemption
    if (typeof window.checkAndExecutePendingVoucher === "function") {
      window.checkAndExecutePendingVoucher();
    }
  } catch (err) {
    console.error("[Firestore Load Error]:", err);
  }
};

function showToast(msg) {
  let toast = document.getElementById("studio-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "studio-toast";
    toast.style.cssText = "position:fixed; bottom:80px; right:20px; z-index:9999; background:var(--bg-card); border:1px solid var(--accent); color:var(--text); padding:10px 16px; border-radius:4px; font-size:0.82rem; font-weight:700; box-shadow:0 8px 24px rgba(0,0,0,0.5); transition:opacity 0.3s ease; pointer-events:none;";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = "1";
  setTimeout(() => { toast.style.opacity = "0"; }, 3500);
}
