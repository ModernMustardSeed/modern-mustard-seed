'use client';

import { useEffect, useRef } from 'react';
import type * as THREE_NS from 'three';

/**
 * The paper Riviera, built in real 3D with Three.js.
 *
 * Every cut-paper piece is a plane standing at its own depth in a shoebox
 * diorama: the paper wall, the sun, clouds, gulls, the cliff village, four
 * torn bands of sea, the sailboat, the sand bar and the Mustards. A warm
 * directional light casts each piece's real silhouette onto the layers
 * behind it (a depth material with the cutout's alpha), which is what makes
 * it read as paper and not as stickers. The pieces drop onto the set on load,
 * the sea and the boat move at a handmade four frames a second, and the
 * camera follows the pointer and drifts with the scroll.
 *
 * Three.js is imported only in the browser after first paint; until the first
 * frame renders, the flat paper plate behind the canvas is what people see,
 * and it is also the fallback when WebGL is unavailable. With reduced motion
 * the set is assembled and rendered once, still.
 */

type Piece = {
  src: string;
  /** Width in world units; height follows the image. */
  w: number;
  x: number;
  y: number;
  z: number;
  /** Drop-in order. */
  at: number;
  kind?: 'wave' | 'sail' | 'gull' | 'cloud';
  phase?: number;
  /** Vertical squash, so a band of sea stays a band. */
  sy?: number;
};

const ART = '/art/paper/';

const PIECES: Piece[] = [
  { src: 'sun-480.webp', w: 2.6, x: 2.4, y: 3.4, z: -5.2, at: 0.15 },
  { src: 'clouds-900.webp', w: 8, x: 3.2, y: 5.7, z: -5.0, at: 0.25, kind: 'cloud' },
  { src: 'cliff-700.webp', w: 5.4, x: 7.2, y: -0.4, z: -4.2, at: 0.35 },
  { src: 'gulls-700.webp', w: 3.2, x: 4.2, y: 2.4, z: -3.6, at: 0.5, kind: 'gull' },
  { src: 'wave-1600.webp', w: 30, x: -1, y: -4.6, z: -3.0, at: 0.55, kind: 'wave', phase: 0, sy: 0.55 },
  { src: 'sail-360.webp', w: 1.2, x: 1.6, y: -3.0, z: -2.5, at: 0.85, kind: 'sail' },
  { src: 'wave-1600.webp', w: 30, x: 1.5, y: -5.6, z: -2.0, at: 0.65, kind: 'wave', phase: 1.3, sy: 0.55 },
  { src: 'wave-1600.webp', w: 30, x: -2, y: -6.6, z: -1.0, at: 0.75, kind: 'wave', phase: 2.6, sy: 0.55 },
  { src: 'wave-1600.webp', w: 30, x: 0.8, y: -7.7, z: 0.0, at: 0.95, kind: 'wave', phase: 3.9, sy: 0.6 },
  { src: 'wave-1600.webp', w: 30, x: -1.2, y: -9.2, z: 0.6, at: 1.0, kind: 'wave', phase: 5.1, sy: 0.6 },
  { src: 'sand-900.webp', w: 7.2, x: 6.4, y: -6.1, z: 1.0, at: 1.05 },
  { src: 'lounge-760.webp', w: 5.0, x: 6.6, y: -3.9, z: 1.4, at: 1.2 },
];

/** A soft paper-fibre texture for the back wall, drawn once on a canvas. */
function paperTexture(THREE: typeof THREE_NS) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#efe3cc';
  g.fillRect(0, 0, 512, 512);
  const img = g.getImageData(0, 0, 512, 512);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 16;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n * 0.8;
  }
  g.putImageData(img, 0, 0);
  g.globalAlpha = 0.05;
  g.strokeStyle = '#0b3b44';
  for (let i = 0; i < 260; i++) {
    g.beginPath();
    const x = rnd() * 512, y = rnd() * 512, a = rnd() * Math.PI;
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * (6 + rnd() * 18), y + Math.sin(a) * (6 + rnd() * 18));
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const easeBack = (t: number) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

export default function PaperRiviera3D({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    const start = async () => {
      const THREE = await import('three');
      if (disposed) return;
      let renderer: THREE_NS.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      } catch {
        return; // No WebGL: the flat plate stays.
      }
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

      scene.add(new THREE.HemisphereLight(0xfffaf0, 0xf2e6cf, 2.3));
      const sun = new THREE.DirectionalLight(0xfff4e2, 1.6);
      sun.position.set(-7, 9, 12);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.radius = 6;
      sun.shadow.bias = -0.0008;
      const sc = sun.shadow.camera as THREE_NS.OrthographicCamera;
      sc.left = -18; sc.right = 18; sc.top = 11; sc.bottom = -12; sc.near = 1; sc.far = 40;
      scene.add(sun);

      const wallTex = paperTexture(THREE);
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 34), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 1 }));
      wall.position.set(0, 0, -6.2);
      wall.receiveShadow = true;
      scene.add(wall);

      const deepMat = new THREE.MeshStandardMaterial({ color: 0x0e5f63, roughness: 1 });
      const deep = new THREE.Mesh(new THREE.PlaneGeometry(70, 20), deepMat);
      deep.position.set(0, -17.6, -3.2);
      deep.receiveShadow = true;
      scene.add(deep);

      const loader = new THREE.TextureLoader();
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      type Live = { mesh: THREE_NS.Mesh; piece: Piece; base: THREE_NS.Vector3 };
      const live: Live[] = [];
      const textures: THREE_NS.Texture[] = [wallTex];
      const materials: THREE_NS.Material[] = [wall.material as THREE_NS.Material, deepMat];
      const geometries: THREE_NS.BufferGeometry[] = [wall.geometry, deep.geometry];

      await Promise.all(PIECES.map(async (p) => {
        const tex = await loader.loadAsync(ART + p.src).catch(() => null);
        if (!tex || disposed) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAniso;
        textures.push(tex);
        const img = tex.image as { width: number; height: number };
        const geo = new THREE.PlaneGeometry(p.w, ((p.w * img.height) / img.width) * (p.sy ?? 1));
        const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.95, side: THREE.DoubleSide });
        const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.customDepthMaterial = depth;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(p.x, p.y, p.z);
        scene.add(mesh);
        geometries.push(geo); materials.push(mat, depth);
        live.push({ mesh, piece: p, base: new THREE.Vector3(p.x, p.y, p.z) });
      }));
      if (disposed) return;

      // Fit the set to the frame: a wide screen sees it straight on, a tall one from further back.
      let aspect = 1;
      const resize = () => {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        aspect = w / h;
        renderer.setSize(w, h, false);
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      };
      resize();

      let px = 0, py = 0, tx = 0, ty = 0, scrollT = 0;
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width) * 2 - 1;
        ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      };
      const onScroll = () => {
        const r = el.getBoundingClientRect();
        scrollT = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
      };
      if (!still) {
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('scroll', onScroll, { passive: true });
      }
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      let visible = true;
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
      io.observe(el);

      const t0 = performance.now();
      let frame = 0;
      let lastBoil = -1;
      const boil = new Map<THREE_NS.Mesh, { x: number; y: number; r: number }>();

      const draw = (now: number) => {
        const t = still ? 99 : (now - t0) / 1000;
        px += (tx - px) * 0.06;
        py += (ty - py) * 0.06;

        const dist = aspect >= 1.2 ? 26 : aspect >= 0.8 ? 32 : 40;
        camera.position.set(px * 1.6 + (aspect < 0.8 ? 3.4 : 0), 0.3 - py * 0.9 + scrollT * 1.2, dist - scrollT * 3);
        camera.lookAt(aspect < 0.8 ? 3.4 : 0.4, -0.4 + scrollT * 0.6, -2);

        // Stop-motion: new hand-placed offsets four times a second.
        const step = Math.floor(t * 4);
        if (step !== lastBoil) {
          lastBoil = step;
          for (const l of live) boil.set(l.mesh, { x: (Math.random() - 0.5) * 0.03, y: (Math.random() - 0.5) * 0.03, r: (Math.random() - 0.5) * 0.012 });
        }
        const ts = step / 4;
        for (const l of live) {
          const p = l.piece;
          const k = Math.min(1, Math.max(0, (t - p.at) / 0.9));
          const drop = still ? 0 : (1 - easeBack(k)) * 7;
          const b = still ? { x: 0, y: 0, r: 0 } : boil.get(l.mesh)!;
          let dx = 0, dy = 0, rz = 0;
          if (p.kind === 'wave') { dx = Math.sin(ts * 1.1 + (p.phase ?? 0)) * 0.35; dy = Math.sin(ts * 1.6 + (p.phase ?? 0)) * 0.08; }
          if (p.kind === 'sail') { dx = Math.sin(ts * 0.35) * 0.9; dy = Math.sin(ts * 1.6 + 1.3) * 0.1; rz = Math.sin(ts * 1.4) * 0.05; }
          if (p.kind === 'gull') { dx = ((ts * 0.25) % 6) - 3; dy = Math.sin(ts * 2) * 0.12; }
          if (p.kind === 'cloud') { dx = Math.sin(ts * 0.08) * 0.8; }
          l.mesh.position.set(l.base.x + dx + b.x, l.base.y + dy + b.y + drop, l.base.z);
          l.mesh.rotation.z = rz + b.r + (still ? 0 : (1 - k) * -0.2);
          l.mesh.visible = k > 0 || still;
        }
        renderer.render(scene, camera);
        if (!el.dataset.ready) el.dataset.ready = '1';
      };

      const loop = (now: number) => {
        frame = requestAnimationFrame(loop);
        if (visible) draw(now);
      };
      if (still) draw(performance.now());
      else frame = requestAnimationFrame(loop);

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('scroll', onScroll);
        ro.disconnect();
        io.disconnect();
        textures.forEach((x) => x.dispose());
        materials.forEach((x) => x.dispose());
        geometries.forEach((x) => x.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
    };

    // Wait for the page to finish its first paint before pulling in Three.js.
    const idle = (cb: () => void) => {
      const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout: 1200 });
      else window.setTimeout(cb, 300);
    };
    if (document.readyState === 'complete') idle(() => { void start(); });
    else window.addEventListener('load', () => idle(() => { void start(); }), { once: true });

    return () => { disposed = true; cleanup(); };
  }, []);

  return <div ref={host} className={className} />;
}
