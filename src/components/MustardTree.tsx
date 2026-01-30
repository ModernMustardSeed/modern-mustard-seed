import { useEffect, useRef } from 'react';
import p5 from 'p5';

const MustardTree: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Bird song audio synthesis ---
    let audioCtx: AudioContext | null = null;
    let songInterval: ReturnType<typeof setInterval> | null = null;
    let audioStarted = false;

    const startBirdSong = () => {
      if (audioStarted) return;
      audioStarted = true;
      try {
        audioCtx = new AudioContext();
      } catch { return; }

      // Play a single note with envelope
      const playNote = (freq: number, startTime: number, duration: number, volume: number = 0.035) => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        filter.type = 'bandpass';
        filter.frequency.value = freq;
        filter.Q.value = 8;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + duration * 0.1);
        gain.gain.setValueAtTime(volume * 0.9, startTime + duration * 0.6);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        osc.frequency.setValueAtTime(freq, startTime);
        // Slight vibrato
        osc.frequency.linearRampToValueAtTime(freq * 1.02, startTime + duration * 0.5);
        osc.frequency.linearRampToValueAtTime(freq * 0.99, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);
      };

      // Melodic song phrases — sequences of notes forming short melodies
      const melodies = [
        // Robin-like: descending then up
        (base: number, t: number) => {
          const notes = [1, 0.9, 0.8, 0.85, 1.1, 1.0, 0.75, 0.9];
          notes.forEach((r, i) => playNote(base * r, t + i * 0.12, 0.1, 0.03));
        },
        // Warbler: ascending scale with trill at end
        (base: number, t: number) => {
          [0.8, 0.9, 1.0, 1.1, 1.2, 1.3].forEach((r, i) => playNote(base * r, t + i * 0.1, 0.09, 0.03));
          // Trill at end
          for (let i = 0; i < 6; i++) {
            playNote(base * (i % 2 === 0 ? 1.3 : 1.4), t + 0.6 + i * 0.04, 0.035, 0.025);
          }
        },
        // Nightingale-like: varied intervals, longer phrase
        (base: number, t: number) => {
          const pattern = [1.0, 1.2, 1.0, 0.8, 1.0, 1.3, 1.1, 0.9, 1.0, 1.15];
          const durations = [0.15, 0.1, 0.2, 0.12, 0.08, 0.15, 0.1, 0.15, 0.12, 0.2];
          let offset = 0;
          pattern.forEach((r, i) => {
            playNote(base * r, t + offset, durations[i], 0.032);
            offset += durations[i] + 0.02;
          });
        },
        // Finch: short bright bursts
        (base: number, t: number) => {
          [1.0, 1.2, 1.4, 1.2, 1.0].forEach((r, i) => playNote(base * r, t + i * 0.08, 0.07, 0.035));
        },
        // Thrush: slow melodic with pauses
        (base: number, t: number) => {
          playNote(base * 1.0, t, 0.25, 0.03);
          playNote(base * 0.85, t + 0.35, 0.2, 0.028);
          playNote(base * 1.1, t + 0.65, 0.3, 0.032);
          playNote(base * 0.9, t + 1.05, 0.2, 0.025);
        },
      ];

      // Quick chirp (kept for variety)
      const playChirp = () => {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const base = 2500 + Math.random() * 2000;
        const type = Math.random();
        if (type < 0.5) {
          // Quick ascending chirp
          playNote(base * 0.7, now, 0.06, 0.03);
          playNote(base * 1.1, now + 0.07, 0.08, 0.035);
        } else {
          // Two-tone tweet
          playNote(base, now, 0.08, 0.03);
          playNote(base * 1.25, now + 0.1, 0.1, 0.03);
        }
      };

      // Play a full song phrase
      const playSong = () => {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const base = 1800 + Math.random() * 1500;
        const melody = melodies[Math.floor(Math.random() * melodies.length)];
        melody(base, now);
      };

      // Birds "talking" — one sings, another responds after a pause
      const playConversation = () => {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        // Bird A sings
        const baseA = 1800 + Math.random() * 1200;
        const melA = melodies[Math.floor(Math.random() * melodies.length)];
        melA(baseA, now);
        // Bird B responds (different pitch range)
        const delay = 1.2 + Math.random() * 0.8;
        const baseB = 2200 + Math.random() * 1500;
        const melB = melodies[Math.floor(Math.random() * melodies.length)];
        melB(baseB, now + delay);
      };

      // Schedule bird sounds — mix of songs, chirps, and conversations
      const scheduleSong = () => {
        const delay = 2000 + Math.random() * 4000;
        songInterval = setTimeout(() => {
          const r = Math.random();
          if (r < 0.45) {
            playSong();
          } else if (r < 0.7) {
            playConversation();
          } else {
            playChirp();
            if (Math.random() < 0.5) {
              setTimeout(playChirp, 150 + Math.random() * 250);
            }
          }
          scheduleSong();
        }, delay);
      };
      scheduleSong();
    };

    const sketch = (p: p5) => {
      let growthProgress = 0;
      let zOff = 0;
      const mousePos = { x: 0, y: 0, active: false };
      let birdsSpawned = false;

      interface Segment {
        x1: number; y1: number;
        x2: number; y2: number;
        thickness: number;
        growAt: number;
        h: number; s: number; b: number;
        isRoot: boolean;
      }

      interface Leaf {
        x: number; y: number;
        size: number;
        h: number; s: number; b: number;
        swayOffset: number;
        swaySpeed: number;
        growAt: number;
        angle: number;
      }

      interface FallingLeaf {
        x: number; y: number;
        size: number;
        h: number; s: number; b: number;
        vx: number; vy: number;
        rotation: number;
        rotSpeed: number;
        life: number;
      }

      interface Bird {
        x: number; y: number;
        targetX: number; targetY: number;
        perchX: number; perchY: number;
        wingAngle: number;
        wingSpeed: number;
        size: number;
        h: number; s: number; b: number;
        phase: 'flying' | 'landing' | 'perched';
        speed: number;
        flapOffset: number;
        perchSway: number;
        perchSwaySpeed: number;
        headBob: number;
        entryAngle: number;
      }

      const segments: Segment[] = [];
      const leaves: Leaf[] = [];
      const fallingLeaves: FallingLeaf[] = [];
      const birds: Bird[] = [];

      let seedX = 0;
      let seedY = 0;
      let groundY = 0;
      let trunkTopXGlobal = 0;
      let trunkTopYGlobal = 0;

      const generateTree = () => {
        segments.length = 0;
        leaves.length = 0;

        seedX = p.width * 0.5;
        groundY = p.height * 0.72;
        seedY = groundY;

        // --- ROOTS --- deeper and wider
        const generateRoots = (
          x: number, y: number,
          angle: number, length: number,
          thickness: number, depth: number,
          baseGrow: number
        ) => {
          if (depth > 8 || length < 3) return;
          const noiseVal = p.noise(x * 0.01, y * 0.01, depth) * 0.5 - 0.25;
          const endX = x + p.cos(angle + noiseVal) * length;
          const endY = y + p.sin(angle + noiseVal) * length;
          const grow = baseGrow + (depth * 0.012);

          segments.push({
            x1: x, y1: y, x2: endX, y2: endY,
            thickness,
            growAt: p.constrain(grow, 0, 1),
            h: p.lerp(25, 15, depth / 8),
            s: p.lerp(50, 30, depth / 8),
            b: p.lerp(30, 14, depth / 8),
            isRoot: true,
          });

          const numBranches = depth < 3 ? p.floor(p.random(2, 5)) : p.floor(p.random(1, 3));
          for (let i = 0; i < numBranches; i++) {
            const branchAngle = angle + p.random(-0.7, 0.7);
            const branchLen = length * p.random(0.55, 0.85);
            const branchThick = thickness * p.random(0.45, 0.7);
            generateRoots(endX, endY, branchAngle, branchLen, branchThick, depth + 1, grow + 0.015);
          }
        };

        // 7 main root directions — wider spread
        const rootAngles = [
          p.PI * 0.35, p.PI * 0.45, p.PI * 0.55,
          p.PI * 0.5,
          p.PI * 0.65, p.PI * 0.75, p.PI * 0.85,
        ];
        for (const angle of rootAngles) {
          generateRoots(seedX, seedY, angle, p.height * 0.12, p.width * 0.009, 0, 0.06);
        }

        // --- TRUNK ---
        const trunkHeight = p.height * 0.38;
        const trunkSegments = 14;
        let tx = seedX;
        let ty = seedY;
        for (let i = 0; i < trunkSegments; i++) {
          const t = i / trunkSegments;
          const segLen = trunkHeight / trunkSegments;
          const wobble = p.noise(i * 0.5, 42) * 3 - 1.5;
          const nx = tx + wobble;
          const ny = ty - segLen;
          const thick = p.lerp(p.width * 0.014, p.width * 0.005, t);
          const grow = 0.12 + t * 0.2;

          segments.push({
            x1: tx, y1: ty, x2: nx, y2: ny,
            thickness: thick,
            growAt: grow,
            h: p.lerp(28, 85, t),
            s: p.lerp(50, 35, t),
            b: p.lerp(32, 38, t),
            isRoot: false,
          });
          tx = nx;
          ty = ny;
        }

        trunkTopXGlobal = tx;
        trunkTopYGlobal = ty;

        // --- BRANCHES --- more robust
        const generateBranches = (
          x: number, y: number,
          angle: number, length: number,
          thickness: number, depth: number,
          baseGrow: number
        ) => {
          if (depth > 8 || length < 5) return;
          const noiseVal = p.noise(x * 0.008, y * 0.008, depth * 0.5) * 0.5 - 0.25;
          const endX = x + p.cos(angle + noiseVal) * length;
          const endY = y + p.sin(angle + noiseVal) * length;
          const grow = baseGrow + (depth * 0.018);

          segments.push({
            x1: x, y1: y, x2: endX, y2: endY,
            thickness,
            growAt: p.constrain(grow, 0, 1),
            h: p.lerp(85, 115, depth / 8),
            s: p.lerp(32, 22, depth / 8),
            b: p.lerp(38, 48, depth / 8),
            isRoot: false,
          });

          if (depth >= 2) {
            const numLeaves = depth >= 5 ? p.floor(p.random(4, 8)) : p.floor(p.random(2, 4));
            for (let l = 0; l < numLeaves; l++) {
              const lt = p.random(0.3, 1);
              const lx = p.lerp(x, endX, lt) + p.random(-10, 10);
              const ly = p.lerp(y, endY, lt) + p.random(-10, 10);
              leaves.push({
                x: lx, y: ly,
                size: p.random(4, 14),
                h: p.random(70, 150),
                s: p.random(30, 65),
                b: p.random(30, 70),
                swayOffset: p.random(1000),
                swaySpeed: p.random(0.5, 2),
                growAt: p.constrain(grow + 0.06, 0, 1),
                angle: p.random(p.TWO_PI),
              });
            }
          }

          const numBranches = depth < 2 ? p.floor(p.random(3, 5)) : depth < 4 ? p.floor(p.random(2, 4)) : p.floor(p.random(1, 3));
          for (let i = 0; i < numBranches; i++) {
            const spread = depth < 2 ? p.random(-0.9, 0.9) : p.random(-0.6, 0.6);
            const branchAngle = angle + spread;
            const branchLen = length * p.random(0.55, 0.82);
            const branchThick = thickness * p.random(0.45, 0.75);
            generateBranches(endX, endY, branchAngle, branchLen, branchThick, depth + 1, grow + 0.012);
          }
        };

        // 9 main branch directions — massive canopy
        const branchAngles = [
          -p.HALF_PI - 1.3,
          -p.HALF_PI - 1.0,
          -p.HALF_PI - 0.6,
          -p.HALF_PI - 0.25,
          -p.HALF_PI,
          -p.HALF_PI + 0.25,
          -p.HALF_PI + 0.6,
          -p.HALF_PI + 1.0,
          -p.HALF_PI + 1.3,
        ];
        for (const angle of branchAngles) {
          const len = p.height * p.random(0.14, 0.26);
          const thick = p.width * p.random(0.005, 0.008);
          generateBranches(tx, ty, angle, len, thick, 0, 0.32);
        }

        // Extra canopy leaves — massive fullness
        for (let i = 0; i < 250; i++) {
          const angle = p.random(-p.PI, 0);
          const dist = p.random(p.width * 0.03, p.width * 0.52);
          const lx = tx + p.cos(angle) * dist;
          const ly = ty + p.sin(angle * 0.55) * dist * 0.45 - p.random(0, p.height * 0.1);
          if (ly > groundY - 30) continue;
          leaves.push({
            x: lx, y: ly,
            size: p.random(5, 16),
            h: p.random(70, 150),
            s: p.random(28, 60),
            b: p.random(30, 65),
            swayOffset: p.random(1000),
            swaySpeed: p.random(0.4, 1.5),
            growAt: p.constrain(p.random(0.5, 0.85), 0, 1),
            angle: p.random(p.TWO_PI),
          });
        }
      };

      const spawnBird = () => {
        // Bird enters from off-screen, flies to a perch point in the canopy
        const side = p.random() < 0.5 ? -1 : 1;
        const startX = side < 0 ? -50 : p.width + 50;
        const startY = p.random(p.height * 0.05, p.height * 0.3);

        // Pick a perch point in the canopy area
        const perchAngle = p.random(-p.PI * 0.85, -p.PI * 0.15);
        const perchDist = p.random(p.width * 0.05, p.width * 0.35);
        const perchX = trunkTopXGlobal + p.cos(perchAngle) * perchDist;
        const perchY = trunkTopYGlobal + p.sin(perchAngle * 0.5) * perchDist * 0.3 - p.random(0, p.height * 0.05);

        const birdColors = [
          { h: 35, s: 60, b: 55 },    // brown
          { h: 210, s: 40, b: 50 },   // blue-gray
          { h: 15, s: 50, b: 60 },    // robin red
          { h: 50, s: 70, b: 65 },    // golden
          { h: 0, s: 10, b: 40 },     // dark gray
          { h: 120, s: 30, b: 45 },   // olive green
        ];
        const col = birdColors[p.floor(p.random(birdColors.length))];

        birds.push({
          x: startX,
          y: startY,
          targetX: perchX,
          targetY: perchY,
          perchX: perchX,
          perchY: perchY,
          wingAngle: 0,
          wingSpeed: p.random(8, 14),
          size: p.random(12, 18),
          h: col.h, s: col.s, b: col.b,
          phase: 'flying',
          speed: p.random(2.5, 5),
          flapOffset: p.random(1000),
          perchSway: p.random(1000),
          perchSwaySpeed: p.random(0.3, 1),
          headBob: p.random(1000),
          entryAngle: 0,
        });
      };

      const drawBird = (bird: Bird) => {
        p.push();
        p.translate(bird.x, bird.y);

        const sz = bird.size;

        if (bird.phase === 'flying' || bird.phase === 'landing') {
          // Wing flap
          const flapAmt = p.sin(p.frameCount * bird.wingSpeed * 0.1 + bird.flapOffset);
          const wingUp = flapAmt * 0.7;

          // Direction facing
          const dx = bird.targetX - bird.x;
          const facing = dx > 0 ? 1 : -1;
          p.scale(facing, 1);

          // Body
          p.noStroke();
          p.fill(bird.h, bird.s, bird.b, 80);
          p.ellipse(0, 0, sz * 2, sz * 1.2);

          // Head
          p.fill(bird.h, bird.s * 0.8, bird.b + 10, 85);
          p.ellipse(sz * 0.9, -sz * 0.2, sz * 0.9, sz * 0.8);

          // Beak
          p.fill(40, 80, 70, 90);
          p.triangle(sz * 1.3, -sz * 0.2, sz * 1.7, -sz * 0.1, sz * 1.3, 0);

          // Eye
          p.fill(0, 0, 10, 90);
          p.ellipse(sz * 1.05, -sz * 0.3, sz * 0.15, sz * 0.15);

          // Wings
          p.fill(bird.h, bird.s + 10, bird.b - 5, 70);
          // Left wing
          p.push();
          p.rotate(wingUp * 0.8);
          p.ellipse(-sz * 0.2, -sz * 0.3, sz * 1.8, sz * 0.5);
          p.pop();

          // Tail
          p.fill(bird.h, bird.s, bird.b - 8, 65);
          p.triangle(-sz * 0.8, 0, -sz * 1.6, -sz * 0.3, -sz * 1.6, sz * 0.3);

        } else {
          // Perched — sitting still with occasional head bob
          const bob = p.sin(p.frameCount * 0.05 + bird.headBob) * 1;
          const sway = p.sin(zOff * 40 * bird.perchSwaySpeed + bird.perchSway) * 1.5;
          p.translate(sway, 0);

          // Body
          p.noStroke();
          p.fill(bird.h, bird.s, bird.b, 80);
          p.ellipse(0, 0, sz * 1.6, sz * 1.4);

          // Head
          p.fill(bird.h, bird.s * 0.8, bird.b + 10, 85);
          p.ellipse(sz * 0.5, -sz * 0.5 + bob, sz * 0.85, sz * 0.75);

          // Beak
          p.fill(40, 80, 70, 90);
          p.triangle(sz * 0.9, -sz * 0.5 + bob, sz * 1.3, -sz * 0.4 + bob, sz * 0.9, -sz * 0.3 + bob);

          // Eye
          p.fill(0, 0, 10, 90);
          p.ellipse(sz * 0.65, -sz * 0.6 + bob, sz * 0.12, sz * 0.12);

          // Folded wings
          p.fill(bird.h, bird.s + 5, bird.b - 5, 60);
          p.ellipse(-sz * 0.1, sz * 0.1, sz * 1.4, sz * 0.8);

          // Tail
          p.fill(bird.h, bird.s, bird.b - 8, 60);
          p.triangle(-sz * 0.6, sz * 0.2, -sz * 1.3, sz * 0.1, -sz * 1.2, sz * 0.5);

          // Legs
          p.stroke(30, 30, 35, 50);
          p.strokeWeight(1);
          p.line(sz * 0.1, sz * 0.6, sz * 0.1, sz * 1.0);
          p.line(-sz * 0.2, sz * 0.6, -sz * 0.2, sz * 1.0);
          p.noStroke();
        }

        p.pop();
      };

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noStroke();
        generateTree();
      };

      p.draw = () => {
        p.background(30, 20, 3);
        zOff += 0.003;

        if (growthProgress < 1) {
          growthProgress += 0.001;
        }

        // Spawn birds once tree is fully grown
        if (growthProgress >= 1 && !birdsSpawned) {
          birdsSpawned = true;
          // Stagger bird arrivals
          for (let b = 0; b < 6; b++) {
            setTimeout(() => spawnBird(), b * 2000 + Math.random() * 1500);
          }
          // Start birdsong after first bird arrives
          setTimeout(() => startBirdSong(), 3000);
          // Occasional new birds
          setInterval(() => {
            if (birds.length < 10 && Math.random() < 0.3) {
              spawnBird();
            }
          }, 8000);
        }

        // Ground
        const grd = groundY;
        p.noStroke();
        for (let i = 0; i < 3; i++) {
          p.fill(25, 30, 12, 8 - i * 2);
          p.rect(0, grd + i * 2, p.width, p.height - grd);
        }
        p.fill(20, 25, 8, 6);
        p.rect(0, grd, p.width, p.height - grd);

        // Seed glow
        if (growthProgress < 0.2) {
          const seedAlpha = p.map(growthProgress, 0, 0.15, 0, 50);
          const pulseSize = 8 + p.sin(p.frameCount * 0.05) * 3;
          p.fill(35, 60, 50, seedAlpha * 0.3);
          p.ellipse(seedX, seedY, pulseSize * 4, pulseSize * 4);
          p.fill(35, 70, 45, seedAlpha);
          p.ellipse(seedX, seedY, pulseSize, pulseSize * 0.7);
        }

        // Draw segments
        for (const seg of segments) {
          if (growthProgress < seg.growAt) continue;
          const segProgress = p.constrain((growthProgress - seg.growAt) / 0.05, 0, 1);
          const drawX2 = p.lerp(seg.x1, seg.x2, segProgress);
          const drawY2 = p.lerp(seg.y1, seg.y2, segProgress);

          let alphaBoost = 1;
          if (seg.isRoot && growthProgress >= 1) {
            alphaBoost = 0.7 + p.sin(zOff * 80 + seg.x1 * 0.01) * 0.3;
          }

          p.stroke(seg.h, seg.s, seg.b, 70 * alphaBoost);
          p.strokeWeight(seg.thickness);
          p.line(seg.x1, seg.y1, drawX2, drawY2);
        }
        p.noStroke();

        // Draw leaves
        for (const leaf of leaves) {
          if (growthProgress < leaf.growAt) continue;
          const leafProgress = p.constrain((growthProgress - leaf.growAt) / 0.06, 0, 1);

          let swayX = 0;
          let swayY = 0;
          if (growthProgress >= 1) {
            swayX = p.sin(zOff * 50 * leaf.swaySpeed + leaf.swayOffset) * 2.5;
            swayY = p.cos(zOff * 35 * leaf.swaySpeed + leaf.swayOffset) * 1.2;

            if (mousePos.active) {
              const dx = mousePos.x - leaf.x;
              const dy = mousePos.y - leaf.y;
              const dist = p.sqrt(dx * dx + dy * dy);
              if (dist < 150) {
                const push = (1 - dist / 150) * 6;
                swayX -= (dx / dist) * push;
                swayY -= (dy / dist) * push;
              }
            }
          }

          const lx = leaf.x + swayX;
          const ly = leaf.y + swayY;
          const sz = leaf.size * leafProgress;

          p.push();
          p.translate(lx, ly);
          p.rotate(leaf.angle + swayX * 0.05);

          p.fill(leaf.h, leaf.s * 0.5, leaf.b, 8 * leafProgress);
          p.ellipse(0, 0, sz * 3, sz * 3);

          p.fill(leaf.h, leaf.s, leaf.b, 45 * leafProgress);
          p.ellipse(0, 0, sz, sz * 1.4);

          p.fill(leaf.h + 10, leaf.s * 0.8, leaf.b + 5, 30 * leafProgress);
          p.ellipse(sz * 0.25, -sz * 0.15, sz * 0.8, sz * 1.1);

          p.pop();
        }

        // Falling leaves
        if (growthProgress >= 1 && p.random() < 0.008) {
          const sourceLeaf = leaves[p.floor(p.random(leaves.length))];
          if (sourceLeaf) {
            fallingLeaves.push({
              x: sourceLeaf.x, y: sourceLeaf.y,
              size: p.random(3, 6),
              h: sourceLeaf.h, s: sourceLeaf.s, b: sourceLeaf.b,
              vx: p.random(-0.5, 0.5),
              vy: p.random(0.3, 1),
              rotation: p.random(p.TWO_PI),
              rotSpeed: p.random(-0.03, 0.03),
              life: 1,
            });
          }
        }

        for (let i = fallingLeaves.length - 1; i >= 0; i--) {
          const fl = fallingLeaves[i];
          fl.x += fl.vx + p.sin(zOff * 100 + fl.rotation) * 0.3;
          fl.y += fl.vy;
          fl.rotation += fl.rotSpeed;
          fl.life -= 0.003;

          if (fl.life <= 0 || fl.y > p.height) {
            fallingLeaves.splice(i, 1);
            continue;
          }

          p.push();
          p.translate(fl.x, fl.y);
          p.rotate(fl.rotation);
          p.fill(fl.h, fl.s, fl.b, 35 * fl.life);
          p.ellipse(0, 0, fl.size, fl.size * 1.5);
          p.pop();
        }

        // Update and draw birds
        for (const bird of birds) {
          if (bird.phase === 'flying') {
            const dx = bird.targetX - bird.x;
            const dy = bird.targetY - bird.y;
            const dist = p.sqrt(dx * dx + dy * dy);

            if (dist < 30) {
              bird.phase = 'landing';
            } else {
              bird.x += (dx / dist) * bird.speed;
              bird.y += (dy / dist) * bird.speed;
              // Gentle sine wave flight path
              bird.y += p.sin(p.frameCount * 0.08 + bird.flapOffset) * 0.8;
            }
          } else if (bird.phase === 'landing') {
            const dx = bird.perchX - bird.x;
            const dy = bird.perchY - bird.y;
            const dist = p.sqrt(dx * dx + dy * dy);

            if (dist < 3) {
              bird.phase = 'perched';
              bird.x = bird.perchX;
              bird.y = bird.perchY;
            } else {
              bird.x += (dx / dist) * bird.speed * 0.5;
              bird.y += (dy / dist) * bird.speed * 0.5;
            }
          }

          drawBird(bird);
        }

        // Ambient ground glow
        if (growthProgress > 0.4) {
          const glowAlpha = p.map(growthProgress, 0.4, 1, 0, 4);
          p.fill(35, 40, 30, glowAlpha);
          p.ellipse(seedX, grd, p.width * 0.6, 50);
        }

        // Canopy shade
        if (growthProgress > 0.7) {
          const shadeAlpha = p.map(growthProgress, 0.7, 1, 0, 12);
          p.fill(90, 20, 15, shadeAlpha);
          p.ellipse(seedX, seedY - p.height * 0.38, p.width * 1.1, p.height * 0.5);
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        generateTree();
        birds.length = 0;
        birdsSpawned = false;
      };

      p.mouseMoved = () => {
        mousePos.x = p.mouseX;
        mousePos.y = p.mouseY;
        mousePos.active = true;
      };
    };

    const p5Instance = new p5(sketch, containerRef.current);
    return () => {
      p5Instance.remove();
      if (songInterval) clearTimeout(songInterval);
      if (audioCtx) audioCtx.close();
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default MustardTree;
