import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Define saveAiChatHistoryToStorage and loadAiChatHistoryFromStorage
target_def = "let aiChatMessages = [];"

replacement_def = """let aiChatMessages = [];

function saveAiChatHistoryToStorage() {
  try {
    const toSave = (aiChatMessages || []).slice(-80);
    localStorage.setItem('ips_ai_chat_history', JSON.stringify(toSave));
    if (window.appState) {
      window.appState.ai_chats = toSave;
    }
  } catch (e) {}
}

window.loadAiChatHistoryFromStorage = function() {
  try {
    const raw = localStorage.getItem('ips_ai_chat_history');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        aiChatMessages = parsed;
        const stream = document.getElementById('aiChatStream');
        const hero = document.getElementById('geminiHero');
        if (hero) hero.style.display = 'none';
        if (stream && stream.children.length === 0) {
          stream.innerHTML = '';
          aiChatMessages.forEach(msg => {
            appendAiChatMessage(msg.role, msg.content, msg.imageSrc || null);
          });
        }
      }
    }
  } catch (e) {}
};"""

if target_def in content:
    content = content.replace(target_def, replacement_def, 1)
    print("✓ Added saveAiChatHistoryToStorage and loadAiChatHistoryFromStorage definitions")
else:
    print("❌ Could not find let aiChatMessages = [];")
    sys.exit(1)

# 2. Update startNewGeminiChat
old_new_chat = """function startNewGeminiChat() {
  aiChatMessages = [];
  const stream = document.getElementById('aiChatStream');
  if (stream) stream.innerHTML = '';
  const hero = document.getElementById('geminiHero');
  if (hero) hero.style.display = 'flex';
  const input = document.getElementById('aiChatInput');
  if (input) {
    input.value = '';
    input.style.height = 'auto';
    input.focus();
  }
  const status = document.getElementById('aiChatStatus');
  if (status) status.textContent = 'Cambridge AI Multimodal Core • 100% Free & Keyless';
}"""

new_new_chat = """function startNewGeminiChat() {
  aiChatMessages = [];
  try {
    localStorage.removeItem('ips_ai_chat_history');
    if (window.appState) window.appState.ai_chats = [];
    if (window.StorageManager && typeof window.StorageManager.syncServerless === 'function' && window.appState) {
      window.StorageManager.syncServerless(window.appState);
    }
  } catch (e) {}
  const stream = document.getElementById('aiChatStream');
  if (stream) stream.innerHTML = '';
  const hero = document.getElementById('geminiHero');
  if (hero) hero.style.display = 'flex';
  const input = document.getElementById('aiChatInput');
  if (input) {
    input.value = '';
    input.style.height = 'auto';
    input.focus();
  }
  const status = document.getElementById('aiChatStatus');
  if (status) status.textContent = 'Cambridge AI Multimodal Core • 100% Free & Keyless';
}"""

if old_new_chat in content:
    content = content.replace(old_new_chat, new_new_chat, 1)
    print("✓ Updated startNewGeminiChat")
else:
    print("❌ Could not find old_new_chat")
    sys.exit(1)

# 3. Update user message push to save to storage
old_user_push = """  // Maintain sliding window conversation history (last 6 turns)
  aiChatMessages.push({ role: 'user', content: promptText });
  if (aiChatMessages.length > 6) {
    aiChatMessages = aiChatMessages.slice(-6);
  }"""

new_user_push = """  // Save user message to persistent history and cloud sync state
  aiChatMessages.push({ role: 'user', content: promptText, imageSrc: attachedImg?.dataUrl || null });
  saveAiChatHistoryToStorage();"""

if old_user_push in content:
    content = content.replace(old_user_push, new_user_push, 1)
    print("✓ Updated user message push")
else:
    print("❌ Could not find old_user_push")
    sys.exit(1)

# Also ensure context sent to LLM uses recent messages slice
content = content.replace(
    "const byokRes = await window.callByokAiMentorChat(aiChatMessages, AI_MENTOR_SYSTEM_PROMPT, imagePayload);",
    "const byokRes = await window.callByokAiMentorChat(aiChatMessages.slice(-8), AI_MENTOR_SYSTEM_PROMPT, imagePayload);"
)
content = content.replace(
    "...aiChatMessages",
    "...aiChatMessages.slice(-8)"
)

# 4. Update replyText push to save to storage and sync
old_reply_push = """  if (replyText) {
    aiChatMessages.push({ role: 'assistant', content: replyText });
    appendAiChatMessage('assistant', replyText);
    if (status) status.textContent = `Status: Ready (${providerUsed})`;
  }"""

new_reply_push = """  if (replyText) {
    aiChatMessages.push({ role: 'assistant', content: replyText });
    saveAiChatHistoryToStorage();
    if (window.StorageManager && typeof window.StorageManager.syncServerless === 'function' && window.appState) {
      window.StorageManager.syncServerless(window.appState);
    }
    appendAiChatMessage('assistant', replyText);
    if (status) status.textContent = `Status: Ready (${providerUsed})`;
  }"""

if old_reply_push in content:
    content = content.replace(old_reply_push, new_reply_push, 1)
    print("✓ Updated assistant reply push")
else:
    print("❌ Could not find old_reply_push")
    sys.exit(1)

# 5. Call loadAiChatHistoryFromStorage on view switch and DOMContentLoaded
old_hub_switch = """} else if (hubId === 'aichat') {
      window.initAiChatView && window.initAiChatView();"""

new_hub_switch = """} else if (hubId === 'aichat') {
      if (typeof window.loadAiChatHistoryFromStorage === 'function') {
        window.loadAiChatHistoryFromStorage();
      }
      window.initAiChatView && window.initAiChatView();"""

if old_hub_switch in content:
    content = content.replace(old_hub_switch, new_hub_switch, 1)
    print("✓ Added loadAiChatHistoryFromStorage to hubId === 'aichat'")
else:
    print("⚠ old_hub_switch not found, checking alternate")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("✓ Successfully patched index.html")
