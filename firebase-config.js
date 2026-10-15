/**
 * IELTS Prep Studio - Firebase Authentication & Cloud Sync Configuration
 * Supports Firebase Hosting, App Hosting, and local/GitHub Pages environments.
 */

// 1. Firebase Project Configuration
// Replace with your real Firebase Project Web App Credentials from:
// https://console.firebase.google.com/project/_/settings/general
window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
  apiKey: "AIzaSy_YOUR_API_KEY_HERE",
  authDomain: "ielts-prep-studio.firebaseapp.com",
  projectId: "ielts-prep-studio",
  storageBucket: "ielts-prep-studio.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
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
 * Initialize Firebase SDKs if credentials are valid, or fallback to graceful Demo Auth
 */
window.initFirebaseServices = function() {
  if (typeof firebase === "undefined") {
    console.log("[Firebase] SDK not loaded from CDN. Running in local sandbox mode.");
    restoreLocalAuthSession();
    return;
  }

  if (window.isFirebaseConfigured()) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      window.firebaseAuthInstance = firebase.auth();
      window.firebaseDbInstance = firebase.firestore();

      window.firebaseAuthInstance.onAuthStateChanged((user) => {
        handleAuthState(user);
      });
      console.log("[Firebase] Live Firebase initialized successfully.");
      return;
    } catch (err) {
      console.warn("[Firebase] Initialization error, falling back to sandbox mode:", err);
    }
  } else {
    console.log("[Firebase] Placeholder credentials detected. Running in Sandbox / Demo Auth Mode.");
  }

  restoreLocalAuthSession();
};

function restoreLocalAuthSession() {
  try {
    const saved = localStorage.getItem("ielts_demo_user");
    if (saved) {
      window.currentUser = JSON.parse(saved);
    }
  } catch (e) {}
  updateAuthUI();
}

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
    // Attempt cloud sync on sign in
    loadUserDataFromCloud();
  } else {
    window.currentUser = null;
  }
  updateAuthUI();
}

/**
 * Sign in with Google (Popup with Demo Fallback)
 */
window.signInWithGoogle = async function() {
  if (typeof firebase !== "undefined" && window.isFirebaseConfigured() && window.firebaseAuthInstance) {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");
      const result = await window.firebaseAuthInstance.signInWithPopup(provider);
      return result.user;
    } catch (error) {
      console.error("[Firebase Auth Error]:", error);
      if (error.code === "auth/unauthorized-domain") {
        alert(`Google Sign-In Domain Warning:\n${window.location.hostname} is not in your Firebase Authorized Domains.\nAdd it in Firebase Console > Authentication > Settings > Authorized domains.`);
      }
      // Offer demo sign-in if real auth fails
      return promptDemoSignIn(error.message);
    }
  } else {
    // Sandbox / Demo Google Sign-In
    return promptDemoSignIn("Running in Sandbox Mode (Add Firebase keys in window.FIREBASE_CONFIG for live auth).");
  }
};

function promptDemoSignIn(notice) {
  const defaultName = "IELTS Scholar";
  const defaultEmail = "scholar@ieltsstudio.com";
  const name = prompt(`${notice}\n\nEnter your name to simulate Google Sign-In:`, defaultName) || defaultName;
  const user = {
    uid: "demo_" + Date.now(),
    displayName: name,
    email: defaultEmail,
    photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e06c35&color=fff`,
    isDemo: true
  };
  window.currentUser = user;
  try {
    localStorage.setItem("ielts_demo_user", JSON.stringify(user));
  } catch (e) {}
  updateAuthUI();
  return user;
}

/**
 * Sign out
 */
window.signOutUser = async function() {
  if (window.firebaseAuthInstance && window.isFirebaseConfigured()) {
    try {
      await window.firebaseAuthInstance.signOut();
    } catch (e) {}
  }
  window.currentUser = null;
  try {
    localStorage.removeItem("ielts_demo_user");
  } catch (e) {}
  updateAuthUI();
};

/**
 * Cloud Sync (Firestore)
 */
window.syncUserDataToCloud = async function() {
  if (!window.currentUser) {
    alert("Please sign in with Google to sync your study progress to the cloud!");
    return false;
  }

  if (window.firebaseDbInstance && window.isFirebaseConfigured()) {
    try {
      const docRef = window.firebaseDbInstance.collection("users").doc(window.currentUser.uid).collection("studioState").doc("progress");
      const payload = {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        mastered: appState.mastered || [],
        srsSchedule: appState.srsSchedule || {},
        drillScore: appState.drillScore || 0,
        savedEssays: appState.savedEssays || [],
        errorLog: appState.errorLog || [],
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
      if (data.mastered) appState.mastered = data.mastered;
      if (data.srsSchedule) appState.srsSchedule = data.srsSchedule;
      if (data.drillScore) appState.drillScore = data.drillScore;
      if (data.userProfile && data.userProfile.tier === "vip") {
        appState.userProfile.tier = "vip";
        appState.userProfile.vipExpiresAt = data.userProfile.vipExpiresAt;
      }
      saveAppState();
      renderLexiconGrid();
      showToast("☁️ Cloud progress restored!");
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
