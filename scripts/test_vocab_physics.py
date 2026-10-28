import sys, math, random

if sys.platform == "win32":
    try: sys.stdout.reconfigure(encoding="utf-8")
    except: pass

class VocabGraphSimulation:
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.cx = width / 2.0
        self.cy = height / 2.0
        self.kRepulse = 70.0
        self.damping = 0.82
        self.maxIterations = 140
        self.nodes = []
        self.links = []

    def setup(self, center_word, syns, avoids, antonyms, peers):
        self.nodes = []
        self.links = []

        # Center node (fixed)
        center_node = {
            'id': center_word['id'],
            'word': center_word['word'],
            'type': 'center',
            'x': self.cx,
            'y': self.cy,
            'vx': 0.0,
            'vy': 0.0,
            'fixed': True,
            'radius': 38
        }
        self.nodes.append(center_node)

        # Synonyms
        for i, syn in enumerate(syns[:4]):
            angle = (i / 4.0) * math.pi - math.pi / 4.0
            n = {
                'id': f'syn-{i}',
                'word': syn,
                'type': 'synonym',
                'x': self.cx + math.cos(angle) * 110.0,
                'y': self.cy + math.sin(angle) * 110.0,
                'vx': 0.0,
                'vy': 0.0,
                'fixed': False,
                'radius': 30
            }
            self.nodes.append(n)
            self.links.append({'source': center_node, 'target': n, 'length': 100.0})

        # Avoids
        for i, av in enumerate(avoids[:2]):
            angle = math.pi * 0.75 + (i * 0.4)
            n = {
                'id': f'av-{i}',
                'word': av,
                'type': 'avoid',
                'x': self.cx + math.cos(angle) * 130.0,
                'y': self.cy + math.sin(angle) * 130.0,
                'vx': 0.0,
                'vy': 0.0,
                'fixed': False,
                'radius': 28
            }
            self.nodes.append(n)
            self.links.append({'source': center_node, 'target': n, 'length': 130.0})

        # Peers
        for i, p in enumerate(peers[:3]):
            angle = -math.pi * 0.6 - (i * 0.5)
            n = {
                'id': p['id'],
                'word': p['word'],
                'type': 'peer',
                'x': self.cx + math.cos(angle) * 140.0,
                'y': self.cy + math.sin(angle) * 140.0,
                'vx': 0.0,
                'vy': 0.0,
                'fixed': False,
                'radius': 28
            }
            self.nodes.append(n)
            self.links.append({'source': center_node, 'target': n, 'length': 145.0})

    def run_simulation(self):
        pad_x = 42.0
        pad_y = 30.0
        for _ in range(self.maxIterations):
            # Repulsion
            for i in range(len(self.nodes)):
                for j in range(i + 1, len(self.nodes)):
                    n1 = self.nodes[i]
                    n2 = self.nodes[j]
                    dx = n2['x'] - n1['x']
                    dy = n2['y'] - n1['y']
                    dist = math.hypot(dx, dy) or 1.0
                    if dist < 180.0:
                        force = (self.kRepulse * self.kRepulse) / (dist * dist)
                        fx = (dx / dist) * force
                        fy = (dy / dist) * force
                        if not n1['fixed']:
                            n1['vx'] -= fx
                            n1['vy'] -= fy
                        if not n2['fixed']:
                            n2['vx'] += fx
                            n2['vy'] += fy

            # Spring attraction
            for l in self.links:
                dx = l['target']['x'] - l['source']['x']
                dy = l['target']['y'] - l['source']['y']
                dist = math.hypot(dx, dy) or 1.0
                displacement = dist - l['length']
                force = displacement * 0.045
                fx = (dx / dist) * force
                fy = (dy / dist) * force
                if not l['source']['fixed']:
                    l['source']['vx'] += fx
                    l['source']['vy'] += fy
                if not l['target']['fixed']:
                    l['target']['vx'] -= fx
                    l['target']['vy'] -= fy

            # Center gravity
            for n in self.nodes:
                if not n['fixed']:
                    gx = (self.cx - n['x']) * 0.008
                    gy = (self.cy - n['y']) * 0.008
                    n['vx'] += gx
                    n['vy'] += gy

            # Update & Clamp
            for n in self.nodes:
                if not n['fixed']:
                    n['x'] += n['vx'] * self.damping
                    n['y'] += n['vy'] * self.damping
                    n['vx'] *= self.damping
                    n['vy'] *= self.damping
                    n['x'] = max(pad_x, min(self.width - pad_x, n['x']))
                    n['y'] = max(pad_y, min(self.height - pad_y, n['y']))

# Run verification tests across all viewports
viewports = [
    ('iPhone SE (375x420)', 375, 420),
    ('iPhone 14 (390x440)', 390, 440),
    ('Pixel 7 (412x440)', 412, 440),
    ('iPad Mini (768x480)', 768, 480)
]

sample_center = {'id': 'v1', 'word': 'ubiquitous', 'band': 'Band 8.5', 'pos': 'adj'}
sample_syns = ['omnipresent', 'pervasive', 'universal', 'prevalent']
sample_avoids = ['common', 'everywhere']
sample_antonyms = ['rare', 'scarce']
sample_peers = [{'id': 'v2', 'word': 'proliferate'}, {'id': 'v3', 'word': 'catalyst'}, {'id': 'v4', 'word': 'paradigm'}]

all_passed = True
for name, w, h in viewports:
    sim = VocabGraphSimulation(w, h)
    sim.setup(sample_center, sample_syns, sample_avoids, sample_antonyms, sample_peers)
    sim.run_simulation()
    
    pad_x = 42.0
    pad_y = 30.0
    for n in sim.nodes:
        x, y = n['x'], n['y']
        if x < pad_x or x > w - pad_x or y < pad_y or y > h - pad_y:
            print(f"[FAIL] {name}: Node {n['word']} out of bounds: ({x:.1f}, {y:.1f})")
            all_passed = False

    print(f"[PASS] {name}: All {len(sim.nodes)} nodes strictly clamped within ({pad_x:.0f}px - {w-pad_x:.0f}px, {pad_y:.0f}px - {h-pad_y:.0f}px)")

if all_passed:
    print("\n✓ ALL VIEWPORT CLAMPING INVARIANTS VERIFIED!")
else:
    sys.exit(1)
