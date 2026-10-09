import * as THREE from 'three';

/**
 * The hero garden, in one of two compositions.
 *
 * quiet: the film on a card with real thickness, a few engraved blooms held at
 * depth in a paper haze, and a slow handful of blossoms falling through.
 * wreath: the same card, with a ring of engraved flowers circling it slowly in
 * 3D, passing behind and in front of the film.
 *
 * Both lean toward the pointer, settle on scroll and pause offscreen. Loaded on
 * idle, after the headline has painted. Returns its controls.
 */
export type GardenControls = { dispose: () => void; setPaused: (paused: boolean) => void };
export type GardenVariant = 'quiet' | 'wreath';

const INK = 0x141210;
const MUSTARD = 0xf5b700;
const PAPER = 0xfcfaf3;
const FILM_ASPECT = 1024 / 572;

function roundedShape(w: number, h: number, r: number) {
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
  return s;
}

function roundedRect(w: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(roundedShape(w, h, r), 12);
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (p.getX(i) + w / 2) / w;
    uv[i * 2 + 1] = (p.getY(i) + h / 2) / h;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

type Bloom = {
  mesh: THREE.Mesh;
  base: THREE.Vector3;
  size: number;
  spin: number;
  phase: number;
  delay: number;
  hover: number;
  angle: number;
  orbit: number;
};
type Petal = { x: number; y: number; z: number; vy: number; sway: number; phase: number; rx: number; ry: number; rz: number; s: number };

export function mountGarden(host: HTMLElement, video: HTMLVideoElement, onReady: () => void, variant: GardenVariant = 'quiet'): GardenControls {
  const phone = host.clientWidth < 640;
  const wreath = variant === 'wreath';
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  // Paper haze: far blooms soften toward the page instead of sitting flat on it.
  const fog = new THREE.Fog(PAPER, 10, 20);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(d: T) => (disposables.push(d), d);

  // The film card: a slab with real thickness, an ink face, the film, and the
  // mustard plate offset behind it. Fog is off so the film never hazes.
  const W = 4.4;
  const H = W / FILM_ASPECT;
  const card = new THREE.Group();
  const filmTex = track(new THREE.VideoTexture(video));
  filmTex.colorSpace = THREE.SRGBColorSpace;
  const slabGeo = track(new THREE.ExtrudeGeometry(roundedShape(W + 0.16, H + 0.16, 0.2), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 12 }));
  slabGeo.translate(0, 0, -0.12);
  const ink = track(new THREE.MeshBasicMaterial({ color: INK, fog: false }));
  const slab = new THREE.Mesh(slabGeo, ink);
  const plateGeo = track(new THREE.ExtrudeGeometry(roundedShape(W + 0.16, H + 0.16, 0.2), { depth: 0.08, bevelEnabled: false, curveSegments: 12 }));
  const plate = new THREE.Mesh(plateGeo, track(new THREE.MeshBasicMaterial({ color: MUSTARD, fog: false })));
  plate.position.set(0.26, -0.26, -0.3);
  const screen = new THREE.Mesh(track(roundedRect(W, H, 0.14)), track(new THREE.MeshBasicMaterial({ map: filmTex, fog: false })));
  screen.position.z = 0.025;
  card.add(plate, slab, screen);
  card.rotation.set(-0.08, -0.2, 0.025);
  scene.add(card);

  // A soft contact shadow on the paper, behind the card.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d');
  if (sctx) {
    const grad = sctx.createRadialGradient(64, 64, 6, 64, 64, 64);
    grad.addColorStop(0, 'rgba(20,18,16,0.5)');
    grad.addColorStop(1, 'rgba(20,18,16,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 128, 128);
  }
  const shadow = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1, 1)),
    track(new THREE.MeshBasicMaterial({ map: track(new THREE.CanvasTexture(shadowCanvas)), transparent: true, depthWrite: false, opacity: 0, fog: false })),
  );
  shadow.position.set(0.5, -0.55, -1.2);
  shadow.scale.set(W * 1.45, H * 1.5, 1);
  shadow.renderOrder = -10;
  scene.add(shadow);

  // Engraved flowers, from the Mustard Studio botanicals.
  const loader = new THREE.TextureLoader();
  const texture = (src: string) => {
    const t = track(loader.load(src));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const dahlia = texture('/storybook/ms-mustard-dahlia-cut-640.webp');
  const cosmos = texture(phone ? '/storybook/ms-ivory-cosmos-cut-640.webp' : '/storybook/ms-ivory-cosmos-cut-1024.webp');
  const blossom = texture('/storybook/ms-mustard-blossom-cut-256.webp');
  const plane = track(new THREE.PlaneGeometry(1, 1));
  const bloomMat = (map: THREE.Texture) => track(new THREE.MeshBasicMaterial({ map, alphaToCoverage: true }));
  const mats = { dahlia: bloomMat(dahlia), cosmos: bloomMat(cosmos), blossom: bloomMat(blossom) };

  const blooms: Bloom[] = [];
  const addBloom = (mat: THREE.Material, x: number, y: number, z: number, size: number, i: number, orbit = 0) => {
    const mesh = new THREE.Mesh(plane, mat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(0.0001);
    scene.add(mesh);
    blooms.push({ mesh, base: new THREE.Vector3(x, y, z), size, spin: (i % 2 ? -1 : 1) * (0.03 + (i % 5) * 0.008), phase: i * 1.7, delay: 0.35 + i * 0.07, hover: 0, angle: i * 0.9, orbit });
  };

  // The wreath: blooms evenly spaced on a tilted ellipse around the card.
  // Tilted steeply, so the near arc passes under the film and the far arc rises
  // behind it like a halo: the flowers circle the faces without covering them.
  const RING_X = phone ? 3.0 : 3.5;
  const RING_Z = 2.5;
  const RING_TILT = 0.82;
  if (wreath) {
    const pattern: [keyof typeof mats, number][] = [
      ['dahlia', 1.25], ['blossom', 0.55], ['cosmos', 1.05], ['blossom', 0.48],
      ['dahlia', 0.85], ['cosmos', 0.75], ['blossom', 0.6], ['dahlia', 1.05],
      ['cosmos', 1.15], ['blossom', 0.5], ['dahlia', 0.75], ['cosmos', 0.85],
    ];
    const n = phone ? 10 : pattern.length;
    for (let i = 0; i < n; i++) {
      const [kind, size] = pattern[i];
      addBloom(mats[kind], 0, 0, 0, size * (phone ? 0.9 : 1), i, (i / n) * Math.PI * 2);
    }
  } else {
    const layout: [keyof typeof mats, number, number, number, number][] = phone
      ? [
          ['dahlia', 2.25, 1.3, -1.4, 1.9],
          ['cosmos', -2.3, -1.2, 0.8, 1.45],
          ['dahlia', -2.6, 1.6, -4.2, 1.2],
        ]
      : [
          ['dahlia', 2.6, 1.4, -1.6, 2.25],
          ['cosmos', -2.65, -1.2, 1.0, 1.7],
          ['dahlia', -3.1, 1.75, -4.6, 1.35],
          ['cosmos', 3.5, -1.45, -3.8, 1.15],
          ['blossom', -1.2, 2.1, -6.5, 0.8],
        ];
    layout.forEach(([kind, x, y, z, size], i) => addBloom(mats[kind], x, y, z, size, i));
  }

  // A slow handful of blossoms falling through, shaded darker as they turn edge-on.
  const PETALS = phone ? 6 : wreath ? 8 : 12;
  const petalMat = track(new THREE.MeshBasicMaterial({ map: blossom, side: THREE.DoubleSide, alphaToCoverage: true }));
  const petals = new THREE.InstancedMesh(plane, petalMat, PETALS);
  petals.frustumCulled = false;
  scene.add(petals);
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const seedPetal = (top: boolean): Petal => ({
    x: rand(-4.8, 4.8),
    y: top ? rand(3.6, 4.6) : rand(-2.5, 4),
    z: rand(-3.5, 2.2),
    vy: rand(0.12, 0.22),
    sway: rand(0.12, 0.3),
    phase: rand(0, Math.PI * 2),
    rx: rand(0.35, 0.9),
    ry: rand(0.25, 0.7),
    rz: rand(-0.5, 0.5),
    s: rand(0.32, 0.52),
  });
  const petalState: Petal[] = Array.from({ length: PETALS }, () => seedPetal(false));
  const dummy = new THREE.Object3D();
  const normal = new THREE.Vector3();
  const tint = new THREE.Color();
  for (let i = 0; i < PETALS; i++) petals.setColorAt(i, tint.setScalar(1));

  // Input: pointer lean, scroll settle, hover bloom, and on the wreath a click spins the ring.
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const ndc = new THREE.Vector2(-9, -9);
  const ray = new THREE.Raycaster();
  let ringBoost = 0;
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
  const onDown = () => {
    ringBoost = 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  host.addEventListener('pointerleave', onLeave);
  host.addEventListener('pointerdown', onDown);

  let fitZ = 10;
  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitW = (W * (wreath ? 1.75 : 1.55)) / (2 * half * camera.aspect);
    const fitH = (H * (wreath ? 2.7 : 2.05)) / (2 * half);
    fitZ = Math.max(fitW, fitH);
    fog.near = fitZ + 2;
    fog.far = fitZ + 13;
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
  let ring = 0;
  let readyFired = false;

  const tick = (now: number) => {
    frameId = 0;
    if (paused || !visible || document.hidden) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
    const r = host.getBoundingClientRect();
    const scroll = clamp01(-r.top / Math.max(r.height, 1));

    const arrive = easeOutCubic(clamp01(t / 1.8));
    camera.position.set(pointer.x * 0.5, -pointer.y * 0.3 + scroll * 0.6, fitZ + (1 - arrive) * 1.2);
    camera.lookAt(0, scroll * 0.4, 0);

    const rise = easeOutBack(clamp01(t / 1.1));
    card.scale.setScalar(0.86 + 0.14 * rise);
    card.rotation.y = -0.2 + pointer.x * 0.22 + Math.sin(t * 0.35) * 0.025;
    card.rotation.x = -0.08 + pointer.y * 0.12 + scroll * 0.3;
    card.position.y = Math.sin(t * 0.6) * 0.05 + scroll * 0.5;
    const shadowMat = shadow.material as THREE.MeshBasicMaterial;
    shadowMat.opacity = 0.32 * rise;
    shadow.position.x = 0.5 - pointer.x * 0.25;
    shadow.position.y = -0.55 + card.position.y * 0.4 + pointer.y * 0.15;

    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(blooms.map((b) => b.mesh), false)[0];
    host.style.cursor = hit ? 'pointer' : '';

    ringBoost *= Math.exp(-dt * 1.4);
    ring += dt * (0.075 + ringBoost * 1.6);

    for (const b of blooms) {
      const k = easeOutBack(clamp01((t - b.delay) / 0.9));
      const over = hit?.object === b.mesh ? 1 : 0;
      b.hover += (over - b.hover) * Math.min(1, dt * 8);
      b.angle += (b.spin + b.hover * 1.2 + ringBoost * 0.8) * dt;
      b.mesh.scale.setScalar(Math.max(0.0001, b.size * k * (1 + b.hover * 0.16)));
      if (wreath) {
        const a = b.orbit + ring;
        const x = Math.cos(a) * RING_X;
        const z = Math.sin(a) * RING_Z;
        const lift = Math.sin(t * 0.6 + b.phase) * 0.08;
        b.mesh.position.set(x, -z * Math.sin(RING_TILT) + lift + scroll * 0.6, z * Math.cos(RING_TILT) - 0.3 + (1 - k) * -3);
      } else {
        b.mesh.position.set(b.base.x, b.base.y + Math.sin(t * 0.5 + b.phase) * 0.1 + scroll * (1.2 - b.base.z * 0.2), b.base.z + (1 - k) * -3);
      }
      b.mesh.lookAt(camera.position.x * 0.3, camera.position.y * 0.3, camera.position.z);
      b.mesh.rotateZ(b.angle);
    }

    const fade = clamp01((t - 0.8) / 1.5);
    for (let i = 0; i < PETALS; i++) {
      const p = petalState[i];
      p.y -= p.vy * dt;
      p.x += Math.sin(t * 0.6 + p.phase) * p.sway * dt;
      if (p.y < -3.6) petalState[i] = seedPetal(true);
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(t * p.rx + p.phase, t * p.ry, p.rz + Math.sin(t * 0.7 + p.phase) * 0.35);
      dummy.scale.setScalar(p.s * fade);
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
      normal.set(0, 0, 1).applyQuaternion(dummy.quaternion);
      petals.setColorAt(i, tint.setScalar(0.74 + 0.26 * Math.abs(normal.z)));
    }
    petals.instanceMatrix.needsUpdate = true;
    if (petals.instanceColor) petals.instanceColor.needsUpdate = true;

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
      host.removeEventListener('pointerdown', onDown);
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
