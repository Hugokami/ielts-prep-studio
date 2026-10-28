import os
import sys

def patch():
    repo = r'c:\Users\lyan1\Documents\antigravity\ielts-prep-studio'
    file_path = os.path.join(repo, 'index.html')
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Insert reading live panel
    reading_target = '''    <!-- SUBTAB 3: TRUE / FALSE / NOT GIVEN DECISIVE ARBITER -->
    <div class="subtab-panel" data-subtab="tfng">
      <div id="tfngArbiterContainer" style="padding-top:4px;"></div>
    </div>
  </section>'''

    reading_panel = '''    <!-- SUBTAB 3: TRUE / FALSE / NOT GIVEN DECISIVE ARBITER -->
    <div class="subtab-panel" data-subtab="tfng">
      <div id="tfngArbiterContainer" style="padding-top:4px;"></div>
    </div>

    <!-- SUBTAB 4: LIVE CBT READING RECALLS -->
    <div class="subtab-panel" data-subtab="live-reading" id="subtab-reading-live" style="padding:16px 0;">
      <!-- Balanced 2-Column Bento Header -->
      <div style="background:var(--bg-card); border:1px solid var(--border-accent); border-radius:12px; padding:18px 20px; margin-bottom:16px; box-sizing:border-box;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(16, 185, 129, 0.12); border:1px solid #10B981; color:#10B981; padding:3px 10px; border-radius:20px; font-size:0.72rem; font-weight:800; text-transform:uppercase; letter-spacing:0.04em;">
            <span style="width:7px; height:7px; border-radius:50%; background:#10B981; display:inline-block; animation:pulse 2s infinite;"></span>
            LIVE CBT TEST-ROOM RECALLS
          </div>
          <div id="readingRadarVipMount">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; align-items:center; margin-bottom:14px;">
          <div>
            <h2 style="font-size:1.35rem; font-weight:900; color:var(--text); margin:0 0 4px 0; line-height:1.25;">🔥 Real Exam Reading Recalls</h2>
            <div style="font-size:0.8rem; font-weight:700; color:var(--accent);">Actual Computer-Delivered IELTS Passages &amp; Question Batteries</div>
          </div>
          <div style="background:rgba(255,255,255,0.03); border-left:3px solid #10B981; padding:10px 14px; border-radius:0 8px 8px 0; font-size:0.82rem; color:var(--text-secondary); line-height:1.55;">
            Weekly ingested reading passages directly recalled from recent test dates with complete paragraph breakdowns, question sets, and bilingual Burmese citation evidence.
          </div>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; border-top:1px solid var(--border-subtle); padding-top:10px; font-size:0.78rem;">
          <span style="color:var(--text-muted); font-weight:700;">Live Inventory:</span>
          <span class="occ-ver-pill" style="background:rgba(16,185,129,0.12); color:#10B981; border:1px solid rgba(16,185,129,0.3); font-weight:700;">📖 Real CBT Passages</span>
          <span class="occ-ver-pill" style="background:rgba(37,99,235,0.12); color:#60A5FA; border:1px solid rgba(37,99,235,0.3); font-weight:700;">⚡ 1-Click CBT Simulator Launch</span>
          <span class="occ-ver-pill" style="background:rgba(245,158,11,0.12); color:#F59E0B; border:1px solid rgba(245,158,11,0.3); font-weight:700;">🇲🇲 Burmese Paragraph Evidence</span>
        </div>
      </div>

      <!-- Live Reading Cards Mount -->
      <div id="liveReadingMount">
        <div style="padding:24px; text-align:center; color:var(--text-muted); font-size:0.85rem;">Retrieving live reading exam recalls...</div>
      </div>
    </div>
  </section>'''

    if reading_target in content:
        content = content.replace(reading_target, reading_panel, 1)
        print("SUCCESS: Inserted live-reading panel in #view-reading")
    else:
        print("ERROR: reading_target not found")
        return False

    # 2. Insert writing live panel
    writing_target = '''      <div class="occ-card">
        <div class="sec-eyebrow">PART 28 // 8-POINT WRITING SELF-CHECKLIST (CHECK BEFORE SUBMITTING)</div>
        <div id="writingSelfCheckBox" class="occ-grid-2" style="margin-top:10px;"></div>
      </div>
    </div>

  
    </div>
  </section>'''

    writing_panel = '''      <div class="occ-card">
        <div class="sec-eyebrow">PART 28 // 8-POINT WRITING SELF-CHECKLIST (CHECK BEFORE SUBMITTING)</div>
        <div id="writingSelfCheckBox" class="occ-grid-2" style="margin-top:10px;"></div>
      </div>
    </div>

    </div>

    <!-- SUBTAB 4: LIVE WRITING RECALLS -->
    <div class="subtab-panel" data-subtab="live-writing" id="subtab-writing-live" style="padding:16px 0;">
      <!-- Balanced 2-Column Bento Header -->
      <div style="background:var(--bg-card); border:1px solid var(--border-accent); border-radius:12px; padding:18px 20px; margin-bottom:16px; box-sizing:border-box;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(16, 185, 129, 0.12); border:1px solid #10B981; color:#10B981; padding:3px 10px; border-radius:20px; font-size:0.72rem; font-weight:800; text-transform:uppercase; letter-spacing:0.04em;">
            <span style="width:7px; height:7px; border-radius:50%; background:#10B981; display:inline-block; animation:pulse 2s infinite;"></span>
            LIVE TEST-CENTER WRITING RECALLS
          </div>
          <div id="writingRadarVipMount">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; align-items:center; margin-bottom:14px;">
          <div>
            <h2 style="font-size:1.35rem; font-weight:900; color:var(--text); margin:0 0 4px 0; line-height:1.25;">🔥 Real Exam Writing Recalls</h2>
            <div style="font-size:0.8rem; font-weight:700; color:var(--accent);">Latest Real Test Prompts &amp; Band 8.5+ Official Model Essays</div>
          </div>
          <div style="background:rgba(255,255,255,0.03); border-left:3px solid #2563EB; padding:10px 14px; border-radius:0 8px 8px 0; font-size:0.82rem; color:var(--text-secondary); line-height:1.55;">
            Weekly scraped authentic Task 1 &amp; Task 2 prompts from recent test sessions with examiner criteria breakdowns, lexical highlights, and 1-click loading into the Writing Desk.
          </div>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; border-top:1px solid var(--border-subtle); padding-top:10px; font-size:0.78rem;">
          <span style="color:var(--text-muted); font-weight:700;">Live Inventory:</span>
          <span class="occ-ver-pill" style="background:rgba(37,99,235,0.12); color:#60A5FA; border:1px solid rgba(37,99,235,0.3); font-weight:700;">✍️ Task 1 &amp; Task 2 Recalls</span>
          <span class="occ-ver-pill" style="background:rgba(245,158,11,0.12); color:#F59E0B; border:1px solid rgba(245,158,11,0.3); font-weight:700;">⭐ Band 8.5+ Model Essays</span>
          <span class="occ-ver-pill" style="background:rgba(16,185,129,0.12); color:#10B981; border:1px solid rgba(16,185,129,0.3); font-weight:700;">⚡ 1-Click Writing Desk Practice</span>
        </div>
      </div>

      <!-- Live Writing Cards Mount -->
      <div id="liveWritingMount">
        <div style="padding:24px; text-align:center; color:var(--text-muted); font-size:0.85rem;">Retrieving live writing exam recalls...</div>
      </div>
    </div>
  </section>'''

    if writing_target in content:
        content = content.replace(writing_target, writing_panel, 1)
        print("SUCCESS: Inserted live-writing panel in #view-writing")
    else:
        print("ERROR: writing_target not found")
        return False

    # 3. Explicit window assignments for live functions
    fn_target = 'window.radarData = null;'
    fn_replacement = '''window.radarData = null;
window.initLiveExamLexicons = initLiveExamLexicons;
window.initLiveExamWriting = initLiveExamWriting;
window.initLiveExamReading = initLiveExamReading;'''

    if fn_target in content:
        content = content.replace(fn_target, fn_replacement, 1)
        print("SUCCESS: Bound live functions to window object")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("PATCH COMPLETED SUCCESSFULLY!")
    return True

if __name__ == '__main__':
    patch()
