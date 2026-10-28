import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

old_aichat_hub = """      } else if (hubId === 'aichat') {
        if (typeof initAiMentorTab === 'function') initAiMentorTab();
      }"""

new_aichat_hub = """      } else if (hubId === 'aichat') {
        if (typeof window.loadAiChatHistoryFromStorage === 'function') {
          window.loadAiChatHistoryFromStorage();
        }
        if (typeof initAiMentorTab === 'function') initAiMentorTab();
      }"""

if old_aichat_hub in content:
    content = content.replace(old_aichat_hub, new_aichat_hub, 1)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✓ Added loadAiChatHistoryFromStorage to activateStudioTab")
else:
    print("❌ old_aichat_hub not found")
    sys.exit(1)
