'use client';

import { useEffect, useRef } from 'react';

/**
 * SeedBloom: one glowing mustard seed that grows, particle by particle, into a
 * tree of gold light. The parable, told in about four seconds. Points are laid
 * out once on the CPU (a seeded branching tree plus a seed-shaped ellipsoid);
 * the shader morphs each point from seed to tree, staggered by height so the
 * tree rises out of the seed. The cursor breathes through the canopy.
 *
 * Three.js loads after first paint, the loop sleeps off screen, and reduced
 * motion gets the grown tree, still.
 */

export type Seg = { a: [number, number, number]; b: [number, number, number]; depth: number };

export function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function growTree(rand: () => number) {
  const segs: Seg[] = [];
  const tips: [number, number, number][] = [];
  const branch = (x: number, y: number, z: number, dx: number, dy: number, dz: number, len: number, depth: number) => {
    const bx = x + dx * len, by = y + dy * len, bz = z + dz * len;
    segs.push({ a: [x, y, z], b: [bx, by, bz], depth });
    if (depth >= 7) { tips.push([bx, by, bz]); return; }
    const kids = depth < 2 ? 3 : 2 + (rand() < 0.35 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const yaw = (k / kids) * Math.PI * 2 + rand() * 1.4 + depth * 0.9;
      const tilt = 0.55 + rand() * 0.45 + depth * 0.04;
      let nx = dx + Math.cos(yaw) * Math.sin(tilt) * 1.35;
      let ny = dy * Math.cos(tilt) + 0.12;
      let nz = dz + Math.sin(yaw) * Math.sin(tilt) * 1.35;
      const m = Math.hypot(nx, ny, nz); nx /= m; ny /= m; nz /= m;
      branch(bx, by, bz, nx, ny, nz, len * (0.72 + rand() * 0.1), depth + 1);
    }
  };
  branch(0, -2.4, 0, 0, 1, 0, 1.45, 0);
  return { segs, tips };
}

export type GroveSite = { name: string; slug: string; url: string };

/* With `sites`, the grown tree carries the live work: each site hangs from a
   branch tip on a gold thread, turning with the tree, facing the viewer. The
   piece nearest the viewer is reported through onFront; tap one to visit. */
export default function SeedBloom({ className, sites, onFront, centered }: { className?: string; sites?: GroveSite[]; onFront?: (i: number) => void; centered?: boolean }) {
  const front = useRef(onFront);
  useEffect(() => { front.current = onFront; }, [onFront]);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import('three');
      if (disposed) return;
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const phone = window.innerWidth < 760;

      let renderer: import('three').WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: !!sites?.length, alpha: true, powerPreference: 'high-performance' });
      } catch { el.dataset.fallback = '1'; return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
      camera.position.set(0, 0.2, 9.2);

      const rand = rng(17);
      const { segs, tips } = growTree(rand);
      const N = phone ? 14000 : 26000;
      const tree = new Float32Array(N * 3);
      const seed = new Float32Array(N * 3);
      const delay = new Float32Array(N);
      const size = new Float32Array(N);
      const hue = new Float32Array(N);
      const phase = new Float32Array(N);

      const weights = segs.map(s => Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]) * Math.pow(0.86, s.depth));
      const total = weights.reduce((a, b) => a + b, 0);
      const pick = () => { let r = rand() * total; for (let i = 0; i < segs.length; i++) { r -= weights[i]; if (r <= 0) return segs[i]; } return segs[segs.length - 1]; };
      const minY = -2.4, maxY = 2.6;

      for (let i = 0; i < N; i++) {
        let x: number, y: number, z: number, s: number, h: number;
        if (i < N * 0.74) {
          const g = pick();
          const t = rand();
          const r = 0.12 * Math.pow(0.62, g.depth) * Math.sqrt(rand());
          const a = rand() * Math.PI * 2;
          x = g.a[0] + (g.b[0] - g.a[0]) * t + Math.cos(a) * r;
          y = g.a[1] + (g.b[1] - g.a[1]) * t + (rand() - 0.5) * r;
          z = g.a[2] + (g.b[2] - g.a[2]) * t + Math.sin(a) * r;
          s = 1.6 + (7 - g.depth) * 0.3 + rand() * 0.8;
          h = 0.15 + rand() * 0.35;
        } else {
          const tip = tips[Math.floor(rand() * tips.length)];
          const r = 0.3 * Math.cbrt(rand());
          const u = rand() * 2 - 1, a = rand() * Math.PI * 2, q = Math.sqrt(1 - u * u);
          x = tip[0] + q * Math.cos(a) * r; y = tip[1] + u * r * 0.8; z = tip[2] + q * Math.sin(a) * r;
          s = 1.8 + rand() * 3.2;
          h = 0.55 + rand() * 0.45;
        }
        tree.set([x, y, z], i * 3);
        const u = rand() * 2 - 1, a = rand() * Math.PI * 2, q = Math.sqrt(1 - u * u), r = Math.cbrt(rand());
        seed.set([q * Math.cos(a) * 0.2 * r, -2.3 + u * 0.27 * r, q * Math.sin(a) * 0.2 * r], i * 3);
        delay[i] = (y - minY) / (maxY - minY) * 0.62 + rand() * 0.08;
        size[i] = s; hue[i] = h; phase[i] = rand() * Math.PI * 2;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(tree, 3));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
      geo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
      geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      geo.setAttribute('aHue', new THREE.BufferAttribute(hue, 1));
      geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));

      const uniforms = {
        uGrow: { value: still ? 1.2 : 0 },
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector3(99, 99, 0) },
        uPx: { value: renderer.getPixelRatio() },
        uScale: { value: 1 },
      };
      const mat = new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          attribute vec3 aSeed; attribute float aDelay; attribute float aSize; attribute float aHue; attribute float aPhase;
          uniform float uGrow; uniform float uTime; uniform vec3 uMouse; uniform float uPx; uniform float uScale;
          varying float vHue; varying float vAlpha;
          float ease(float t){ t = clamp(t,0.,1.); return t<.5 ? 4.*t*t*t : 1.-pow(-2.*t+2.,3.)/2.; }
          void main(){
            float t = ease((uGrow - aDelay) / 0.5);
            vec3 p = mix(aSeed, position, t);
            p += vec3(sin(uTime*.6+aPhase), cos(uTime*.5+aPhase*1.3), sin(uTime*.4+aPhase*.7)) * .018 * t;
            vec3 d = p - uMouse; float dist = length(d.xy);
            p.xy += normalize(d.xy + 1e-4) * smoothstep(1.1, 0., dist) * .32 * t;
            vec4 mv = modelViewMatrix * vec4(p, 1.);
            gl_Position = projectionMatrix * mv;
            float tw = .75 + .25 * sin(uTime * 2.2 + aPhase * 3.);
            gl_PointSize = aSize * tw * uPx * uScale * (12. / -mv.z) * mix(1.6, 1., t);
            vHue = aHue; vAlpha = mix(.95, .8, t);
          }`,
        fragmentShader: /* glsl */ `
          varying float vHue; varying float vAlpha;
          void main(){
            vec2 c = gl_PointCoord - .5; float r = length(c);
            float a = smoothstep(.5, 0., r); a *= a;
            vec3 deep = vec3(.72,.45,.02), gold = vec3(.96,.72,0.), cream = vec3(1.,.94,.78);
            vec3 col = vHue < .5 ? mix(deep, gold, vHue*2.) : mix(gold, cream, (vHue-.5)*2.);
            gl_FragColor = vec4(col, a * vAlpha);
          }`,
      });
      const points = new THREE.Points(geo, mat);
      const group = new THREE.Group();
      group.add(points);
      scene.add(group);

      type Hung = { g: import('three').Group; frame: import('three').MeshBasicMaterial; img: import('three').MeshBasicMaterial; mesh: import('three').Mesh; line: import('three').LineBasicMaterial; url: string };
      const hung: Hung[] = [];
      const disposables: { dispose: () => void }[] = [];
      if (sites?.length) {
        const upper = tips.filter(t => t[1] > 0.9);
        const taken = new Set<number>();
        const loader = new THREE.TextureLoader();
        const PW = phone ? 1.4 : 1.55, PH = PW * 0.625;
        sites.forEach((site, i) => {
          const want = -Math.PI + (i + 0.5) * (Math.PI * 2 / sites.length);
          let best = 0, bestD = Infinity;
          upper.forEach((t, k) => {
            if (taken.has(k)) return;
            const d = Math.abs(Math.atan2(Math.sin(Math.atan2(t[2], t[0]) - want), Math.cos(Math.atan2(t[2], t[0]) - want))) - t[1] * 0.08;
            if (d < bestD) { bestD = d; best = k; }
          });
          taken.add(best);
          const tip = upper[best];
          const out = Math.hypot(tip[0], tip[2]) || 1;
          const drop = 0.55 + (i % 2) * 0.55;
          const pos = new THREE.Vector3(tip[0] + (tip[0] / out) * 1.15, tip[1] - drop, tip[2] + (tip[2] / out) * 1.15);
          const g = new THREE.Group();
          g.position.copy(pos);
          const frameMat = new THREE.MeshBasicMaterial({ color: 0xf6ecd2, transparent: true });
          const frameGeo = new THREE.PlaneGeometry(PW + 0.09, PH + 0.09);
          const frame = new THREE.Mesh(frameGeo, frameMat);
          const tex = loader.load('/images/editorial/' + site.slug + '-960.webp', () => { if (still) renderer.render(scene, camera); });
          tex.colorSpace = THREE.SRGBColorSpace;
          const imgMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
          const imgGeo = new THREE.PlaneGeometry(PW, PH);
          const mesh = new THREE.Mesh(imgGeo, imgMat);
          mesh.position.z = 0.01;
          frame.renderOrder = 1; mesh.renderOrder = 2;
          g.add(frame, mesh);
          g.scale.setScalar(still ? 1 : 0.0001);
          group.add(g);
          const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...tip), pos.clone().add(new THREE.Vector3(0, PH / 2 + 0.05, 0))]);
          const lineMat = new THREE.LineBasicMaterial({ color: 0xf5b700, transparent: true, opacity: still ? 0.55 : 0 });
          group.add(new THREE.Line(lineGeo, lineMat));
          disposables.push(frameMat, frameGeo, tex, imgMat, imgGeo, lineGeo, lineMat);
          hung.push({ g, frame: frameMat, img: imgMat, mesh, line: lineMat, url: site.url });
        });
      }
      let hover = -1, frontIdx = -1;
      const wp = new THREE.Vector3();

      const resize = () => {
        const w = el.clientWidth, h = el.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const narrow = w < 760;
        if (centered) {
          group.position.set(0, narrow ? 1.3 : 1.12, 0);
          group.scale.setScalar(narrow ? 0.44 : 0.56);
        } else {
          group.position.set(narrow ? 0 : Math.min(3.2, (w / h) * 1.62), narrow ? 0.7 : -0.1, 0);
          group.scale.setScalar(narrow ? 0.72 : 0.98);
        }
        uniforms.uScale.value = h / 900;
        camera.updateProjectionMatrix();
        if (still) renderer.render(scene, camera);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      const target = { x: 0, y: 0 };
      const ray = new THREE.Raycaster();
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const hit = new THREE.Vector3();
      const onMove = (e: PointerEvent) => {
        const b = el.getBoundingClientRect();
        const nx = ((e.clientX - b.left) / b.width) * 2 - 1, ny = -((e.clientY - b.top) / b.height) * 2 + 1;
        target.x = nx; target.y = ny;
        ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
        if (ray.ray.intersectPlane(plane, hit)) uniforms.uMouse.value.copy(group.worldToLocal(hit.clone()));
        if (hung.length) {
          const inside = e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
          const hits = inside ? ray.intersectObjects(hung.map(x => x.mesh)) : [];
          hover = hits.length ? hung.findIndex(x => x.mesh === hits[0].object) : -1;
          el.style.cursor = hover >= 0 ? 'pointer' : '';
        }
      };
      const onClick = () => { if (hover >= 0) window.open(hung[hover].url, '_blank', 'noopener,noreferrer'); };
      el.addEventListener('click', onClick);
      const onLeave = () => uniforms.uMouse.value.set(99, 99, 0);
      window.addEventListener('pointermove', onMove, { passive: true });
      el.addEventListener('pointerleave', onLeave);

      const start = performance.now();
      let visible = true, raf = 0, last = start;
      const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } });
      io.observe(el);
      function tick(now: number) {
        raf = 0;
        if (!visible) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        const age = (now - start) / 1000;
        if (!still) {
          uniforms.uTime.value += dt;
          uniforms.uGrow.value = Math.min(1.2, Math.max(0, (age - 0.7) / 3.6) * 1.2);
          group.rotation.y += dt * 0.07;
          camera.position.x += (target.x * 0.5 - camera.position.x) * 0.04;
          camera.position.y += (0.2 + target.y * 0.3 - camera.position.y) * 0.04;
          camera.lookAt(group.position.x * 0.35, 0.3, 0);
        }
        let bestZ = -Infinity, bestI = -1;
        hung.forEach((x, i) => {
          x.g.lookAt(camera.position);
          x.g.getWorldPosition(wp);
          const near = Math.min(1, Math.max(0, (wp.z + 2.2) / 4.4));
          const born = still ? 1 : Math.min(1, Math.max(0, (age - 4.1 - i * 0.22) / 0.9));
          const pop = born < 1 ? 1 + 2.2 * Math.pow(born - 1, 3) + 1.2 * Math.pow(born - 1, 2) : 1;
          const k = pop * (hover === i ? 1.12 : 1) * (0.72 + near * 0.5);
          x.g.scale.lerp(new THREE.Vector3(k, k, k), still ? 1 : 0.18);
          x.img.opacity = Math.min(1, 0.35 + near * 1.1) * Math.min(1, born * 1.5);
          x.frame.opacity = x.img.opacity;
          x.line.opacity = (0.15 + near * 0.45) * born;
          if (wp.z > bestZ) { bestZ = wp.z; bestI = i; }
        });
        if (bestI !== frontIdx) { frontIdx = bestI; front.current?.(bestI); }
        renderer.render(scene, camera);
        if (!still) raf = requestAnimationFrame(tick);
      }
      el.dataset.ready = '1';
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
        window.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); el.removeEventListener('click', onClick);
        disposables.forEach(d => d.dispose());
        geo.dispose(); mat.dispose(); renderer.dispose(); renderer.domElement.remove();
      };
    })();

    return () => { disposed = true; cleanup(); };
  }, [sites, centered]);

  return <div ref={host} className={className} aria-hidden="true" />;
}
