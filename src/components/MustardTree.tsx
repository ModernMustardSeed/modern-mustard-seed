import { useEffect, useRef } from 'react';
import p5 from 'p5';

const MustardTree: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = (p: p5) => {
      let growthProgress = 0;
      let zOff = 0;
      const mousePos = { x: 0, y: 0, active: false };

      // Tree geometry — pre-computed
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

      const segments: Segment[] = [];
      const leaves: Leaf[] = [];
      const fallingLeaves: FallingLeaf[] = [];

      // Proportional coordinates
      let seedX = 0;
      let seedY = 0;
      let groundY = 0;

      const generateTree = () => {
        segments.length = 0;
        leaves.length = 0;

        seedX = p.width * 0.5;
        groundY = p.height * 0.58;
        seedY = groundY;

        // --- ROOTS ---
        const generateRoots = (
          x: number, y: number,
          angle: number, length: number,
          thickness: number, depth: number,
          baseGrow: number
        ) => {
          if (depth > 6 || length < 4) return;
          const noiseVal = p.noise(x * 0.01, y * 0.01, depth) * 0.4 - 0.2;
          const endX = x + p.cos(angle + noiseVal) * length;
          const endY = y + p.sin(angle + noiseVal) * length;
          const grow = baseGrow + (depth * 0.015);

          segments.push({
            x1: x, y1: y, x2: endX, y2: endY,
            thickness,
            growAt: p.constrain(grow, 0, 1),
            h: p.lerp(25, 18, depth / 6),
            s: p.lerp(50, 35, depth / 6),
            b: p.lerp(30, 18, depth / 6),
            isRoot: true,
          });

          // Branch roots
          const numBranches = depth < 3 ? p.floor(p.random(2, 4)) : p.floor(p.random(1, 3));
          for (let i = 0; i < numBranches; i++) {
            const branchAngle = angle + p.random(-0.6, 0.6);
            const branchLen = length * p.random(0.6, 0.85);
            const branchThick = thickness * p.random(0.5, 0.7);
            generateRoots(endX, endY, branchAngle, branchLen, branchThick, depth + 1, grow + 0.02);
          }
        };

        // 4 main root directions
        const rootAngles = [
          p.PI * 0.55, p.PI * 0.65, p.PI * 0.4, p.PI * 0.75,
        ];
        for (const angle of rootAngles) {
          generateRoots(seedX, seedY, angle, p.height * 0.08, p.width * 0.008, 0, 0.08);
        }

        // --- TRUNK ---
        const trunkHeight = p.height * 0.35;
        const trunkSegments = 12;
        let tx = seedX;
        let ty = seedY;
        for (let i = 0; i < trunkSegments; i++) {
          const t = i / trunkSegments;
          const segLen = trunkHeight / trunkSegments;
          const wobble = p.noise(i * 0.5, 42) * 3 - 1.5;
          const nx = tx + wobble;
          const ny = ty - segLen;
          const thick = p.lerp(p.width * 0.012, p.width * 0.004, t);
          const grow = 0.15 + t * 0.2;

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

        const trunkTopX = tx;
        const trunkTopY = ty;

        // --- BRANCHES ---
        const generateBranches = (
          x: number, y: number,
          angle: number, length: number,
          thickness: number, depth: number,
          baseGrow: number
        ) => {
          if (depth > 7 || length < 6) return;
          const noiseVal = p.noise(x * 0.008, y * 0.008, depth * 0.5) * 0.5 - 0.25;
          const endX = x + p.cos(angle + noiseVal) * length;
          const endY = y + p.sin(angle + noiseVal) * length;
          const grow = baseGrow + (depth * 0.02);

          segments.push({
            x1: x, y1: y, x2: endX, y2: endY,
            thickness,
            growAt: p.constrain(grow, 0, 1),
            h: p.lerp(85, 115, depth / 7),
            s: p.lerp(30, 25, depth / 7),
            b: p.lerp(38, 45, depth / 7),
            isRoot: false,
          });

          // Add leaves at branch tips and mid-branches
          if (depth >= 3) {
            const numLeaves = depth >= 5 ? p.floor(p.random(3, 6)) : p.floor(p.random(1, 3));
            for (let l = 0; l < numLeaves; l++) {
              const lt = p.random(0.4, 1);
              const lx = p.lerp(x, endX, lt) + p.random(-8, 8);
              const ly = p.lerp(y, endY, lt) + p.random(-8, 8);
              leaves.push({
                x: lx, y: ly,
                size: p.random(4, 12),
                h: p.random(75, 145),
                s: p.random(30, 60),
                b: p.random(35, 65),
                swayOffset: p.random(1000),
                swaySpeed: p.random(0.5, 2),
                growAt: p.constrain(grow + 0.08, 0, 1),
                angle: p.random(p.TWO_PI),
              });
            }
          }

          // Recurse
          const numBranches = depth < 3 ? p.floor(p.random(2, 4)) : p.floor(p.random(1, 3));
          for (let i = 0; i < numBranches; i++) {
            const spread = depth < 2 ? p.random(-0.8, 0.8) : p.random(-0.5, 0.5);
            const branchAngle = angle + spread;
            const branchLen = length * p.random(0.6, 0.82);
            const branchThick = thickness * p.random(0.5, 0.75);
            generateBranches(endX, endY, branchAngle, branchLen, branchThick, depth + 1, grow + 0.015);
          }
        };

        // Main branch directions — spread wide for canopy
        const branchAngles = [
          -p.HALF_PI - 0.6,
          -p.HALF_PI - 0.3,
          -p.HALF_PI,
          -p.HALF_PI + 0.3,
          -p.HALF_PI + 0.6,
        ];
        for (const angle of branchAngles) {
          const len = p.height * p.random(0.1, 0.18);
          const thick = p.width * p.random(0.003, 0.006);
          generateBranches(trunkTopX, trunkTopY, angle, len, thick, 0, 0.35);
        }

        // Extra canopy leaves for fullness
        for (let i = 0; i < 80; i++) {
          const angle = p.random(-p.PI, 0);
          const dist = p.random(p.width * 0.05, p.width * 0.32);
          const lx = trunkTopX + p.cos(angle) * dist;
          const ly = trunkTopY + p.sin(angle * 0.6) * dist * 0.5 - p.random(0, p.height * 0.08);
          if (ly > groundY - 20) continue;
          leaves.push({
            x: lx, y: ly,
            size: p.random(5, 15),
            h: p.random(75, 145),
            s: p.random(30, 55),
            b: p.random(35, 60),
            swayOffset: p.random(1000),
            swaySpeed: p.random(0.5, 1.5),
            growAt: p.constrain(p.random(0.55, 0.85), 0, 1),
            angle: p.random(p.TWO_PI),
          });
        }
      };

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noStroke();
        generateTree();
      };

      p.draw = () => {
        // Dark warm background
        p.background(30, 20, 3);
        zOff += 0.003;

        // Growth speed — full tree in ~16 seconds at 60fps
        if (growthProgress < 1) {
          growthProgress += 0.001;
        }

        // Ground
        const grd = groundY;
        p.noStroke();
        // Subtle ground line
        for (let i = 0; i < 3; i++) {
          p.fill(25, 30, 12, 8 - i * 2);
          p.rect(0, grd + i * 2, p.width, p.height - grd);
        }

        // Soil texture below ground
        p.fill(20, 25, 8, 6);
        p.rect(0, grd, p.width, p.height - grd);

        // Seed glow
        if (growthProgress < 0.2) {
          const seedAlpha = p.map(growthProgress, 0, 0.15, 0, 50);
          const pulseSize = 8 + p.sin(p.frameCount * 0.05) * 3;
          // Outer glow
          p.fill(35, 60, 50, seedAlpha * 0.3);
          p.ellipse(seedX, seedY, pulseSize * 4, pulseSize * 4);
          // Seed
          p.fill(35, 70, 45, seedAlpha);
          p.ellipse(seedX, seedY, pulseSize, pulseSize * 0.7);
        }

        // Draw segments
        for (const seg of segments) {
          if (growthProgress < seg.growAt) continue;
          // Fade in
          const segProgress = p.constrain((growthProgress - seg.growAt) / 0.05, 0, 1);

          // Partial drawing — grow the segment
          const drawX2 = p.lerp(seg.x1, seg.x2, segProgress);
          const drawY2 = p.lerp(seg.y1, seg.y2, segProgress);

          // Root pulse
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

            // Mouse interaction
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

          // Leaf cluster: 2-3 overlapping ellipses
          p.push();
          p.translate(lx, ly);
          p.rotate(leaf.angle + swayX * 0.05);

          // Glow
          p.fill(leaf.h, leaf.s * 0.5, leaf.b, 8 * leafProgress);
          p.ellipse(0, 0, sz * 3, sz * 3);

          // Main leaf
          p.fill(leaf.h, leaf.s, leaf.b, 45 * leafProgress);
          p.ellipse(0, 0, sz, sz * 1.4);

          // Secondary
          p.fill(leaf.h + 10, leaf.s * 0.8, leaf.b + 5, 30 * leafProgress);
          p.ellipse(sz * 0.25, -sz * 0.15, sz * 0.8, sz * 1.1);

          p.pop();
        }

        // Falling leaves (idle phase)
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

        // Ambient ground glow
        if (growthProgress > 0.4) {
          const glowAlpha = p.map(growthProgress, 0.4, 1, 0, 4);
          p.fill(35, 40, 30, glowAlpha);
          p.ellipse(seedX, grd, p.width * 0.5, 40);
        }

        // Canopy shade effect — subtle dark overlay at top
        if (growthProgress > 0.7) {
          const shadeAlpha = p.map(growthProgress, 0.7, 1, 0, 10);
          p.fill(90, 20, 15, shadeAlpha);
          p.ellipse(seedX, seedY - p.height * 0.25, p.width * 0.7, p.height * 0.35);
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        generateTree();
      };

      p.mouseMoved = () => {
        mousePos.x = p.mouseX;
        mousePos.y = p.mouseY;
        mousePos.active = true;
      };
    };

    const p5Instance = new p5(sketch, containerRef.current);
    return () => { p5Instance.remove(); };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default MustardTree;
