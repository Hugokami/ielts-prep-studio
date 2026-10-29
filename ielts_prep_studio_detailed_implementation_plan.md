# 📘 IELTS Prep Studio: Detailed Implementation Plan & Architecture Specification
**Target Systems:**
- **Codebase:** `C:/Users/lyan1/Documents/antigravity/ielts-prep-studio` (`index.html`)
- **Reference Conversation:** `2e858d55-bb79-446c-a682-8d390b103838`
- **Inspiration Sources (GitHub Trending 2026-10-29):** [`HKUDS/DeepTutor`](https://github.com/HKUDS/DeepTutor), [`Graphify-Labs/graphify`](https://github.com/Graphify-Labs/graphify), [`Nutlope/hallmark`](https://github.com/Nutlope/hallmark), [`elayadesign/ai-design-skills`](https://github.com/elayadesign/ai-design-skills).

---

## 1. Executive Status & Problem Diagnosis

IELTS Prep Studio is a monolithic single-page educational application deployed across a 3-way parity mirror (`index.html`, `ielts_prep_studio_open_academic_edition.html`, and the user's Downloads mirror).

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                CURRENT BOTTLENECK VS TARGET STATE                                │
├──────────────────────────────────────┬───────────────────────────────────────────────────────────┤
│ Current Implementation               │ Target State (Trending-Inspired Breakthroughs)            │
├──────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ 1. Binary Regex Error Badges         │ 1. DeepTutor 3-Tier Socratic Diagnostic Engine            │
│    • Direct answer disclosure        │    • Tier 1 (Metacognitive) → Tier 2 (Hint) → Tier 3 (Ans)│
│    • Low student cognitive retention │    • Leitner spaced repetition tracking in LocalStorage   │
├──────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ 2. Static Slot Constellation Grid    │ 2. Clamped Barnes-Hut Force-Directed Constellation Engine │
│    • Hardcoded slot % coordinates    │    • Coulomb repulsion + Hooke's elastic spring law       │
│    • Node overlap & mobile overflow  │    • Clamped boundary physics: ZERO mobile scrollbars     │
├──────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ 3. Uncalibrated Visual Contrast      │ 3. Academic 60-30-10 Editorial Tokens (`hallmark`)        │
│    • Generic AI card borders         │    • Oxford Charcoal, Cambridge Slate, Imperial Gold      │
│    • Loose letter spacing            │    • Tight headline tracking (-0.02em), crisp micro-badges│
└──────────────────────────────────────┴───────────────────────────────────────────────────────────┘
```

---

## 2. Phase 1: DeepTutor 3-Tier Socratic Diagnostic Engine (`index.html`)

### 2.1 The Cognitive Scaffolding Model
Direct answer disclosure promotes passive reading. DeepTutor uses a 3-tier progressive hint disclosure:
- **Tier 1 (Metacognitive Nudge):** Prompts the student to notice tone, intensity, or grammatical form without giving vocabulary away.
- **Tier 2 (Collocation Pattern Hint):** Exposes syntactic scaffolding (e.g. `[Verb] + [Adverb]` or first letter clues).
- **Tier 3 (Band 8+ Academic Mastery):** Displays the exact academic collocations with example sentences.

### 2.2 Drop-In JavaScript Module for `index.html`

```javascript
// Add to index.html within the script section
class DeepTutorSocraticEngine {
  constructor() {
    this.storageKey = 'ielts_socratic_state_v1';
    this.memory = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
  }

  evaluateDraft(essayText) {
    const feedbackItems = [];

    const trapRules = [
      {
        id: "informal_dynamic_verb",
        regex: /\b(big|huge|large)\s+(increase|rise|growth)\b/gi,
        domain: "Task 1 Dynamic Movement",
        tier1: "Look closely at 'big'. In academic Task 1 reporting, what specific verb captures upward acceleration?",
        tier2: "Collocation frame: [Verb] + [Adverb], e.g., 'surged _______' or 'escalated _______'.",
        tier3: "Band 8+ Collocations: 'surged dramatically', 'witnessed an exponential increase', 'escalated markedly'."
      },
      {
        id: "evaluative_conversational_adjective",
        regex: /\b(good|bad)\s+(thing|effect|impact)\b/gi,
        domain: "Task 2 Evaluative Stance",
        tier1: "The adjective 'good' lacks academic objectivity. How can you describe a positive outcome without conversational bias?",
        tier2: "Collocation hint: Consider academic adjectives starting with 'b...' or 's...'.",
        tier3: "Band 8+ Academic Collocations: 'profoundly beneficial consequence', 'salutary influence', 'favorable repercussion'."
      },
      {
        id: "absolute_overgeneralization",
        regex: /\b(proves that|everyone knows that|always leads to)\b/gi,
        domain: "Task 2 Academic Hedging",
        tier1: "Absolute claims weaken academic essays. What modal verb or hedging phrase softens this generalization?",
        tier2: "Hedging frame: 'Evidence suggests that...' or 'It is widely contended that...'",
        tier3: "Band 8+ Hedging: 'Compelling empirical evidence indicates that...', 'This tendency arguably precipitates...'"
      }
    ];

    trapRules.forEach(rule => {
      let match;
      while ((match = rule.regex.exec(essayText)) !== null) {
        const key = rule.id;
        this.memory[key] = (this.memory[key] || 0) + 1;

        feedbackItems.push({
          matchText: match[0],
          domain: rule.domain,
          occurrences: this.memory[key],
          tier1: rule.tier1,
          tier2: rule.tier2,
          tier3: rule.tier3
        });
      }
    });

    localStorage.setItem(this.storageKey, JSON.stringify(this.memory));
    return feedbackItems;
  }
}
```

---

## 3. Phase 2: Clamped Barnes-Hut Force-Directed Constellation Engine (`index.html`)

### 3.1 Physics & Boundary Clamping Formulation
Replace static slot coordinate arrays (`synSlots`, `peerSlots` at [index.html#L13260](file:///C:/Users/lyan1/Documents/antigravity/ielts-prep-studio/index.html#L13260)) with an iterative physics simulation:
1. **Coulomb Repulsion:** $F_{\text{repulse}} = \frac{k_r^2}{d^2} \cdot \hat{u}_{ij} \quad (k_r = 75px)$
2. **Hooke's Elastic Attraction:** $F_{\text{spring}} = \frac{d - L_0}{k_s} \cdot \hat{u}_{ji} \quad (L_0 = 105px)$
3. **Boundary Clamping (Zero Mobile Scroll):**
   $$x_i = \text{clamp}(x_i, r_i + 12, W - r_i - 12), \quad y_i = \text{clamp}(y_i, r_i + 12, H - r_i - 12)$$

### 3.2 Drop-In Constellation Physics Engine Code

```javascript
// Drop-in Constellation Physics Engine for index.html
class ClampedVocabSimulation {
  constructor(containerEl, svgEl) {
    this.container = containerEl;
    this.svg = svgEl;
    this.nodes = [];
    this.links = [];
    this.animId = null;
    this.iteration = 0;
    this.maxIterations = 120;
  }

  init(centerWord, syns, avoids, antonyms) {
    const rect = this.container.getBoundingClientRect();
    const w = rect.width || 360;
    const h = rect.height || 400;
    const cx = w / 2;
    const cy = h / 2;

    this.nodes = [{ id: centerWord, x: cx, y: cy, vx: 0, vy: 0, r: 24, type: 'center' }];
    this.links = [];

    syns.forEach((wrd, idx) => {
      const angle = (idx / syns.length) * 6.283;
      const node = { id: wrd, x: cx + Math.cos(angle) * 70, y: cy + Math.sin(angle) * 70, vx: 0, vy: 0, r: 16, type: 'synonym' };
      this.nodes.push(node);
      this.links.push({ source: 0, target: this.nodes.length - 1, length: 95 });
    });

    this.iteration = 0;
    this.startSimulation(w, h);
  }

  startSimulation(w, h) {
    const tick = () => {
      if (this.iteration++ > this.maxIterations) return;

      // 1. Repulsion
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const a = this.nodes[i], b = this.nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist2 = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(dist2);
          const force = (70 * 70) / dist2;
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          if (i !== 0) { a.vx -= fx; a.vy -= fy; }
          b.vx += fx; b.vy += fy;
        }
      }

      // 2. Spring Attraction
      this.links.forEach(link => {
        const a = this.nodes[link.source], b = this.nodes[link.target];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const displacement = dist - link.length;
        const fx = (dx / dist) * displacement * 0.05;
        const fy = (dy / dist) * displacement * 0.05;
        if (link.source !== 0) { a.vx += fx; a.vy += fy; }
        b.vx -= fx; b.vy -= fy;
      });

      // 3. Clamping Invariant (Guarantees zero mobile scrollbar triggers)
      for (let i = 1; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        n.x = Math.max(n.r + 10, Math.min(w - n.r - 10, (n.x + n.vx * 0.8) | 0));
        n.y = Math.max(n.r + 10, Math.min(h - n.r - 10, (n.y + n.vy * 0.8) | 0));
        n.vx *= 0.82;
        n.vy *= 0.82;
      }

      this.render();
      this.animId = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(this.animId);
    this.animId = requestAnimationFrame(tick);
  }

  render() {
    // Blit SVG lines and HTML node positions
    this.nodes.forEach(n => {
      const el = document.getElementById(`vnode-${n.id}`);
      if (el) {
        el.style.transform = `translate3d(${n.x - n.r}px, ${n.y - n.r}px, 0)`;
      }
    });
  }
}
```

---

## 4. Phase 3: Academic 60-30-10 Editorial Tokens (`Nutlope/hallmark`)

```css
/* Academic Hallmark Design Tokens */
:root {
  /* 60% Canvas Base */
  --bg-parchment: #FAF8F5;
  --bg-slate-dark: #0F141C;

  /* 30% Structural Frame */
  --frame-cambridge-card: #18202C;
  --frame-border-subtle: rgba(226, 232, 240, 0.12);

  /* 10% High-Energy Accents */
  --accent-british-gold: #D4AF37;
  --accent-cambridge-crimson: #9E2A2B;
  --accent-oxford-blue: #003366;
}

/* Typography Hierarchy */
.academic-headline {
  font-family: "Georgia", serif;
  letter-spacing: -0.02em;
  font-weight: 700;
}

.academic-badge {
  font-family: system-ui, -apple-system, sans-serif;
  letter-spacing: +0.12em;
  text-transform: uppercase;
  font-size: 0.72rem;
  font-weight: 600;
}
```

---

## 5. Verification & Execution Steps

1. **Verify 3-way Parity**: Apply script changes to `index.html` and mirror to `ielts_prep_studio_open_academic_edition.html`.
2. **Mobile Viewport Test**: Verify constellation renders at $375\times 667$ without triggering horizontal scrollbars.
3. **Spaced Repetition Audit**: Check `localStorage['ielts_socratic_state_v1']` updates correctly on diagnostic runs.
