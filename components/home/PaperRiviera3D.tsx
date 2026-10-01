'use client';

import { useEffect, useRef } from 'react';
import type * as THREE_NS from 'three';

/**
 * The paper Riviera, built as a real 3D diorama with Three.js.
 *
 * Every piece is designed on a poster frame (x -16..16, y -10..10, the shape
 * of a 1440x900 screen) and stands at its own depth. Each layer is scaled up
 * by its distance from the camera, so a far mountain keeps the size it was
 * designed at instead of shrinking; what depth adds is the parallax when the
 * camera moves and the real shadow each cut-out throws on the layers behind
 * it. Far layers (the mountains) and the nearest ones (the bougainvillea and
 * the dune) are softly blurred like a lens focused on the beach. Paper curls
 * a little, the sun rakes in low from the left, the camera glides in when the
 * set has loaded, and the sea, boat and gulls move at a handmade four frames
 * a second.
 *
 * Three.js loads after first paint; the flat paper plate behind the canvas
 * shows until the first frame and is the fallback without WebGL. With reduced
 * motion the set is rendered once, still.
 */

type Piece = {
  src: string;
  /** Centre and width in poster units. */
  x: number;
  y: number;
  w: number;
  /** Depth: 0 is the picture plane, negative is further back, positive nearer. */
  z: number;
  /** Drop-in order, seconds. */
  at: number;
  kind?: 'wave' | 'sail' | 'gull' | 'cloud';
  phase?: number;
  /** Vertical squash, so a band of sea stays a band. */
  sy?: number;
  /** Lens blur in texture pixels. */
  blur?: number;
  /** Paper curl, as a fraction of the width. */
  curl?: number;
};

const ART = '/art/paper/';

const PIECES: Piece[] = [
  { src: 'sun-480.webp', x: 3.2, y: 5.4, w: 4.6, z: -12, at: 0.1 },
  { src: 'clouds-900.webp', x: 7.5, y: 8.2, w: 15, z: -11, at: 0.2, kind: 'cloud' },
  { src: 'hills-1600.webp', x: 2, y: -0.6, w: 44, z: -10, at: 0.25, blur: 2.2, curl: 0.01 },
  { src: 'cliff-700.webp', x: 12.6, y: -0.8, w: 10.5, z: -7, at: 0.35, curl: 0.03 },
  { src: 'gulls-700.webp', x: 6.5, y: 3.6, w: 5.2, z: -6, at: 0.5, kind: 'gull' },
  { src: 'wave-1600.webp', x: -1, y: -4.3, w: 46, z: -5, at: 0.5, kind: 'wave', phase: 0, sy: 0.5, curl: 0.006 },
  { src: 'sail-360.webp', x: 3.4, y: -2.6, w: 2.2, z: -3.6, at: 0.8, kind: 'sail' },
  { src: 'wave-1600.webp', x: 2, y: -5.7, w: 46, z: -4, at: 0.58, kind: 'wave', phase: 1.3, sy: 0.5, curl: 0.006 },
  { src: 'wave-1600.webp', x: -2, y: -7.1, w: 46, z: -3, at: 0.66, kind: 'wave', phase: 2.6, sy: 0.52, curl: 0.006 },
  { src: 'wave-1600.webp', x: 1, y: -8.5, w: 46, z: -2, at: 0.74, kind: 'wave', phase: 3.9, sy: 0.55, curl: 0.006 },
  { src: 'wave-1600.webp', x: -1.5, y: -10, w: 46, z: -1, at: 0.82, kind: 'wave', phase: 5.1, sy: 0.6, curl: 0.006 },
  { src: 'sand-900.webp', x: 10.4, y: -8.4, w: 12, z: -0.4, at: 0.95, curl: 0.02 },
  { src: 'lounge-760.webp', x: 10.6, y: -4.9, w: 7.8, z: 0, at: 1.1, curl: 0.015 },
  { src: 'dune-1100.webp', x: -12.5, y: -9.2, w: 15, z: 3.2, at: 1.25, blur: 1.6, curl: 0.03 },
  { src: 'bougain-1100.webp', x: 10.2, y: 6.9, w: 12.5, z: 4, at: 1.35, blur: 2.4, curl: 0.04 },
];

const D = 42; // Camera distance from the picture plane at rest.

/** A soft paper-fibre texture for the back wall, drawn once on a canvas. */
function paperTexture(THREE: typeof THREE_NS) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f3e8d2';
  g.fillRect(0, 0, 512, 512);
  const img = g.getImageData(0, 0, 512, 512);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 12;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n * 0.8;
  }
  g.putImageData(img, 0, 0);
  g.globalAlpha = 0.04;
  g.strokeStyle = '#0b3b44';
  for (let i = 0; i < 240; i++) {
    g.beginPath();
    const x = rnd() * 512, y = rnd() * 512, a = rnd() * Math.PI;
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * (6 + rnd() * 18), y + Math.sin(a) * (6 + rnd() * 18));
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 4);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Load an image and, for a blurred layer, bake the lens blur into a canvas. */
async function pieceTexture(THREE: typeof THREE_NS, src: string, blur: number) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  await img.decode();
  if (!blur) {
    const t = new THREE.Texture(img);
    t.needsUpdate = true;
    return { tex: t, w: img.naturalWidth, h: img.naturalHeight, pad: 0 };
  }
  const pad = Math.ceil(blur * 3);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth + pad * 2;
  c.height = img.naturalHeight + pad * 2;
  const g = c.getContext('2d')!;
  g.filter = `blur(${blur}px)`;
  g.drawImage(img, pad, pad);
  const t = new THREE.CanvasTexture(c);
  return { tex: t as THREE_NS.Texture, w: c.width, h: c.height, pad };
}

const easeBack = (t: number) => { const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

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
      const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);

      scene.add(new THREE.HemisphereLight(0xfffaf0, 0xf1e4cb, 2.1));
      const sun = new THREE.DirectionalLight(0xfff0d8, 2.0);
      sun.position.set(-34, 14, 30);
      sun.target.position.set(0, -2, -6);
      scene.add(sun.target);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.radius = 5;
      sun.shadow.bias = -0.0006;
      const sc = sun.shadow.camera as THREE_NS.OrthographicCamera;
      sc.left = -40; sc.right = 40; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 120;
      scene.add(sun);

      const textures: THREE_NS.Texture[] = [];
      const materials: THREE_NS.Material[] = [];
      const geometries: THREE_NS.BufferGeometry[] = [];

      // The back wall and the deep sea are scaled like every other layer.
      const WALL_Z = -14;
      const wallTex = paperTexture(THREE);
      textures.push(wallTex);
      const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 1 });
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), wallMat);
      wall.receiveShadow = true;
      scene.add(wall);
      const deepMat = new THREE.MeshStandardMaterial({ color: 0x0e5f63, roughness: 1 });
      const deep = new THREE.Mesh(new THREE.PlaneGeometry(140, 40), deepMat);
      deep.receiveShadow = true;
      scene.add(deep);
      materials.push(wallMat, deepMat);
      geometries.push(wall.geometry, deep.geometry);

      type Live = { mesh: THREE_NS.Mesh; piece: Piece };
      const live: Live[] = [];

      await Promise.all(PIECES.map(async (p) => {
        const loaded = await pieceTexture(THREE, ART + p.src, p.blur ?? 0).catch(() => null);
        if (!loaded || disposed) return;
        const { tex, w: iw, h: ih, pad } = loaded;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        textures.push(tex);
        // A blurred texture carries padding; widen the plane so the art keeps its designed size.
        const width = p.w * (iw / (iw - pad * 2));
        const h = ((width * ih) / iw) * (p.sy ?? 1);
        const geo = new THREE.PlaneGeometry(width, h, 24, 1);
        // Curl: bow the sheet gently, edges falling back.
        const curl = (p.curl ?? 0) * width;
        if (curl) {
          const pos = geo.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            const u = pos.getX(i) / (width / 2);
            pos.setZ(i, -curl * u * u);
          }
          geo.computeVertexNormals();
        }
        const soft = !!p.blur;
        const mat = new THREE.MeshStandardMaterial({
          map: tex, roughness: 0.95, side: THREE.DoubleSide,
          alphaTest: soft ? 0.02 : 0.5, transparent: soft, depthWrite: !soft,
        });
        const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.customDepthMaterial = depth;
        mesh.castShadow = true;
        mesh.receiveShadow = !soft;
        if (soft) mesh.renderOrder = p.z;
        scene.add(mesh);
        geometries.push(geo);
        materials.push(mat, depth);
        live.push({ mesh, piece: p });
      }));
      if (disposed) return;

      // The window onto the poster: wide screens see it whole, phones see the beach end of it.
      const view = { cx: 0, cy: 0 };
      let aspect = 1.6;
      const resize = () => {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        aspect = w / h;
        renderer.setSize(w, h, false);
        let W: number, H: number;
        if (aspect >= 1.6) { W = 32; H = W / aspect; view.cx = 0; view.cy = -0.4; }
        else if (aspect >= 0.9) { H = 20; W = H * aspect; view.cx = Math.min(16 - W / 2, 2.5); view.cy = 0; }
        else { W = 15; H = W / aspect; view.cx = 16 - W / 2 - 0.5; view.cy = -10 + H / 2 - 0.2; }
        camera.aspect = aspect;
        camera.fov = (2 * Math.atan(H / 2 / D) * 180) / Math.PI;
        camera.updateProjectionMatrix();
      };
      resize();

      /** Where a poster point at depth z must sit so it looks the size it was designed. */
      const place = (obj: THREE_NS.Object3D, x: number, y: number, z: number) => {
        const k = (D - z) / D;
        obj.position.set(view.cx + (x - view.cx) * k, view.cy + (y - view.cy) * k, z);
        obj.scale.setScalar(k);
      };

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
      let lastStep = -1;
      const boil = new Map<THREE_NS.Mesh, { x: number; y: number; r: number }>();

      const draw = (now: number) => {
        const t = still ? 99 : (now - t0) / 1000;
        px += (tx - px) * 0.05;
        py += (ty - py) * 0.05;

        // The set comes out of its box: the camera starts close and glides back to rest.
        const intro = still ? 1 : easeOut(Math.min(1, t / 2.6));
        const dz = (1 - intro) * -9 + scrollT * 5;
        camera.position.set(view.cx + px * 2.2, view.cy - py * 1.1 - scrollT * 1.5 - (1 - intro) * 1.5, D + dz);
        camera.lookAt(view.cx + px * 0.5, view.cy - py * 0.25 - scrollT * 1.5, 0);

        place(wall, view.cx, view.cy, WALL_Z);
        place(deep, 0, -30.6, -5.2);

        const step = Math.floor(t * 4);
        if (step !== lastStep) {
          lastStep = step;
          for (const l of live) boil.set(l.mesh, { x: (Math.random() - 0.5) * 0.04, y: (Math.random() - 0.5) * 0.04, r: (Math.random() - 0.5) * 0.01 });
        }
        const ts = step / 4;
        for (const l of live) {
          const p = l.piece;
          const k = Math.min(1, Math.max(0, (t - p.at) / 0.9));
          const drop = still ? 0 : (1 - easeBack(k)) * 9;
          const b = still ? { x: 0, y: 0, r: 0 } : boil.get(l.mesh)!;
          let dx = 0, dy = 0, rz = 0;
          if (p.kind === 'wave') { dx = Math.sin(ts * 1.1 + (p.phase ?? 0)) * 0.5; dy = Math.sin(ts * 1.6 + (p.phase ?? 0)) * 0.12; }
          if (p.kind === 'sail') { dx = Math.sin(ts * 0.3) * 1.4; dy = Math.sin(ts * 1.6 + 1.3) * 0.16; rz = Math.sin(ts * 1.4) * 0.05; }
          if (p.kind === 'gull') { dx = ((ts * 0.3) % 8) - 4; dy = Math.sin(ts * 2) * 0.2; }
          if (p.kind === 'cloud') { dx = Math.sin(ts * 0.08) * 1.2; }
          place(l.mesh, p.x + dx + b.x, p.y + dy + b.y + drop, p.z);
          l.mesh.rotation.z = rz + b.r + (still ? 0 : (1 - k) * -0.25);
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
