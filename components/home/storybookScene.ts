import * as THREE from 'three';

/**
 * The hero garden. The film plays on a tilted card in the middle; engraved
 * dahlias and cosmos float around it at real depth, mustard blossoms tumble
 * through, and the whole scene leans toward the pointer and settles on scroll.
 * Loaded on idle, after the headline has painted. Returns its controls.
 */
export type GardenControls = { dispose: () => void; setPaused: (paused: boolean) => void };

const INK = 0x141210;
const MUSTARD = 0xf5b700;
const FILM_ASPECT = 1024 / 572;

function roundedRect(w: number, h: number, r: number) {
  const x = -w / 2;
  const y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 12);
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (p.getX(i) - x) / w;
    uv[i * 2 + 1] = (p.getY(i) - y) / h;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

type Bloom = { mesh: THREE.Mesh; base: THREE.Vector3; size: number; spin: number; phase: number; delay: number; hover: number; angle: number };
type Petal = { x: number; y: number; z: number; vy: number; sway: number; phase: number; rx: number; ry: number; rz: number; s: number };

export function mountGarden(host: HTMLElement, video: HTMLVideoElement, onReady: () => void): GardenControls {
  const phone = host.clientWidth < 640;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(d: T) => (disposables.push(d), d);

  // The film card: ink frame, the playing film, and a mustard plate offset behind it.
  const W = 4.4;
  const H = W / FILM_ASPECT;
  const card = new THREE.Group();
  const filmTex = track(new THREE.VideoTexture(video));
  filmTex.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(track(roundedRect(W + 0.14, H + 0.14, 0.2)), track(new THREE.MeshBasicMaterial({ color: MUSTARD })));
  plate.position.set(0.24, -0.24, -0.06);
  const frame = new THREE.Mesh(track(roundedRect(W + 0.14, H + 0.14, 0.2)), track(new THREE.MeshBasicMaterial({ color: INK })));
  const screen = new THREE.Mesh(track(roundedRect(W, H, 0.14)), track(new THREE.MeshBasicMaterial({ map: filmTex })));
  screen.position.z = 0.012;
  card.add(plate, frame, screen);
  card.rotation.set(-0.08, -0.22, 0.03);
  scene.add(card);

  // Engraved flowers, from the Mustard Studio botanicals.
  const loader = new THREE.TextureLoader();
  const texture = (src: string) => {
    const t = track(loader.load(src));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  const dahlia = texture('/storybook/ms-mustard-dahlia-cut-640.webp');
  const cosmos = texture('/storybook/ms-ivory-cosmos-cut-640.webp');
  const blossom = texture('/storybook/ms-mustard-blossom-cut-256.webp');
  const plane = track(new THREE.PlaneGeometry(1, 1));

  const layout: [THREE.Texture, number, number, number, number][] = phone
    ? [
        [dahlia, 2.3, 1.35, -1.6, 2.1],
        [cosmos, -2.35, -1.25, 0.9, 1.5],
        [dahlia, -2.5, 1.45, -2.4, 1.1],
        [cosmos, 2.2, -1.5, -0.8, 1.0],
      ]
    : [
        [dahlia, 2.55, 1.45, -1.8, 2.4],
        [cosmos, -2.6, -1.25, 1.1, 1.75],
        [dahlia, -2.9, 1.55, -2.8, 1.25],
        [cosmos, 3.1, -1.25, -0.6, 1.25],
        [dahlia, 0.6, -2.15, -3.4, 1.0],
        [cosmos, -0.9, 2.15, -3.6, 0.9],
        [dahlia, 3.5, 0.35, 1.6, 0.62],
      ];
  const blooms: Bloom[] = layout.map(([map, x, y, z, size], i) => {
    const mesh = new THREE.Mesh(plane, track(new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, alphaTest: 0.01 })));
    mesh.renderOrder = Math.round(z * 10) + 100;
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return { mesh, base: new THREE.Vector3(x, y, z), size, spin: (i % 2 ? -1 : 1) * (0.05 + i * 0.012), phase: i * 1.7, delay: 0.25 + i * 0.09, hover: 0, angle: i * 0.9 };
  });

  // Mustard blossoms tumbling through the scene. The flip is what reads as depth.
  const PETALS = phone ? 14 : 30;
  const petalMat = track(new THREE.MeshBasicMaterial({ map: blossom, transparent: true, depthWrite: false, side: THREE.DoubleSide, alphaTest: 0.02 }));
  const petals = new THREE.InstancedMesh(plane, petalMat, PETALS);
  petals.renderOrder = 300;
  scene.add(petals);
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const seedPetal = (p: Partial<Petal>, top: boolean): Petal => ({
    x: rand(-5.5, 5.5),
    y: top ? rand(3.4, 5) : rand(-3.5, 4),
    z: rand(-3, 2.6),
    vy: rand(0.22, 0.48),
    sway: rand(0.15, 0.45),
    phase: rand(0, Math.PI * 2),
    rx: rand(0.6, 1.8),
    ry: rand(0.4, 1.4),
    rz: rand(-0.6, 0.6),
    s: rand(0.26, 0.5),
    ...p,
  });
  const petalState: Petal[] = Array.from({ length: PETALS }, () => seedPetal({}, false));
  const dummy = new THREE.Object3D();

  // Input: pointer lean, scroll settle, hover bloom.
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const ndc = new THREE.Vector2(-9, -9);
  const ray = new THREE.Raycaster();
  const onPointer = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    ndc.set(pointer.tx, -pointer.ty);
  };
  const onLeave = () => {
    pointer.tx = 0;
    pointer.ty = 0;
    ndc.set(-9, -9);
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  host.addEventListener('pointerleave', onLeave);

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitW = (W * 1.55) / (2 * half * camera.aspect);
    const fitH = (H * 2.05) / (2 * half);
    camera.position.z = Math.max(fitW, fitH);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let visible = true;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) kick();
  });
  io.observe(host);

  let paused = false;
  let frameId = 0;
  let last = performance.now();
  let t = 0;
  let readyFired = false;

  const tick = (now: number) => {
    frameId = 0;
    if (paused || !visible || document.hidden) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 4);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 4);
    const r = host.getBoundingClientRect();
    const scroll = clamp01(-r.top / Math.max(r.height, 1));

    camera.position.x = pointer.x * 0.55;
    camera.position.y = -pointer.y * 0.35 + scroll * 0.6;
    camera.lookAt(0, scroll * 0.4, 0);

    const intro = easeOutBack(clamp01(t / 1.1));
    card.scale.setScalar(0.82 + 0.18 * intro);
    card.rotation.y = -0.22 + pointer.x * 0.28 + Math.sin(t * 0.5) * 0.03;
    card.rotation.x = -0.08 + pointer.y * 0.16 + scroll * 0.35;
    card.position.y = Math.sin(t * 0.8) * 0.06 + scroll * 0.5;

    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(blooms.map((b) => b.mesh), false)[0];
    host.style.cursor = hit ? 'pointer' : '';

    for (const b of blooms) {
      const k = easeOutBack(clamp01((t - b.delay) / 0.9));
      const over = hit?.object === b.mesh ? 1 : 0;
      b.hover += (over - b.hover) * Math.min(1, dt * 8);
      b.mesh.scale.setScalar(Math.max(0.0001, b.size * k * (1 + b.hover * 0.18)));
      b.angle += (b.spin + b.hover * 1.4) * dt;
      b.mesh.position.set(b.base.x, b.base.y + Math.sin(t * 0.7 + b.phase) * 0.12 + scroll * (1.2 - b.base.z * 0.25), b.base.z + (1 - k) * -4);
      b.mesh.lookAt(camera.position.x * 0.3, camera.position.y * 0.3, camera.position.z);
      b.mesh.rotateZ(b.angle);
    }

    for (let i = 0; i < PETALS; i++) {
      const p = petalState[i];
      p.y -= p.vy * dt;
      p.x += Math.sin(t * 0.9 + p.phase) * p.sway * dt;
      if (p.y < -4) petalState[i] = seedPetal({}, true);
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(t * p.rx + p.phase, t * p.ry, p.rz + Math.sin(t + p.phase) * 0.4);
      dummy.scale.setScalar(p.s * clamp01((t - 0.6) / 1.2));
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
    if (!readyFired) {
      readyFired = true;
      onReady();
    }
    frameId = requestAnimationFrame(tick);
  };

  function kick() {
    if (frameId || paused) return;
    last = performance.now();
    frameId = requestAnimationFrame(tick);
  }
  const onVis = () => !document.hidden && kick();
  document.addEventListener('visibilitychange', onVis);
  kick();

  return {
    setPaused(next) {
      paused = next;
      if (!next) kick();
    },
    dispose() {
      paused = true;
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', onPointer);
      host.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
      ro.disconnect();
      io.disconnect();
      petals.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      canvas.remove();
    },
  };
}
