import os
import re
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('js/storage-sync.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update V6_SYNC_KEYS
old_keys = """  const V6_SYNC_KEYS = [
    'ips_srs_deck_v6',
    'ips_daily_tool_quota',
    'ips_learner_track',
    'ips_user_target_band',
    'ielts_target_band',
    'ielts_target_exam_date',
    'ips_target_score_onboarded'
  ];"""

new_keys = """  const V6_SYNC_KEYS = [
    'ips_srs_deck_v6',
    'ips_daily_tool_quota',
    'ips_learner_track',
    'ips_user_target_band',
    'ielts_target_band',
    'ielts_target_exam_date',
    'ips_target_score_onboarded',
    'ips_ai_chat_history',
    'ips_listening_answers',
    'ips_listening_history',
    'ips_reading_history',
    'ips_reading_answers'
  ];"""

content = content.replace(old_keys, new_keys)

# 2. Update restoreV6State to trigger loadAiChatHistoryFromStorage
old_restore_end = """      if (typeof window.renderTodayPlanCard === 'function') {
        window.renderTodayPlanCard('todayPlanMount');
      }
    } catch (e) {}
  }"""

new_restore_end = """      if (typeof window.renderTodayPlanCard === 'function') {
        window.renderTodayPlanCard('todayPlanMount');
      }
      if (typeof window.loadAiChatHistoryFromStorage === 'function') {
        window.loadAiChatHistoryFromStorage();
      }
    } catch (e) {}
  }"""

content = content.replace(old_restore_end, new_restore_end)

# 3. In syncServerless, ensure deviceId is passed
old_body = """          body: JSON.stringify({
            initData: initData,
            telegramId: tgUser ? tgUser.id : (state && state.userProfile && state.userProfile.telegramId) || 0,
            voucher: clientVoucher,
            progress: state,
            srsDueCount: dueCount
          })"""

new_body = """          body: JSON.stringify({
            initData: initData,
            telegramId: tgUser ? tgUser.id : (state && state.userProfile && state.userProfile.telegramId) || 0,
            voucher: clientVoucher,
            deviceId: getDeviceId(),
            progress: state,
            srsDueCount: dueCount
          })"""

content = content.replace(old_body, new_body)

with open('js/storage-sync.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("✓ Patched js/storage-sync.js")

if os.path.exists('.vercel/output/static/js/storage-sync.js'):
    with open('.vercel/output/static/js/storage-sync.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✓ Patched .vercel/output/static/js/storage-sync.js")
