import * as THREE from 'three';

/**
 * The hero seed. One mustard seed drops onto the page, wiggles, and bursts:
 * thousands of engraved mustard blossoms spiral out of it and settle into a
 * single great flower laid on the golden angle, with the seed at its heart.
 * "The smallest of all seeds becomes the largest of garden plants."
 *
 * At rest the flower breathes and turns slowly. It tilts toward the pointer,
 * the blossoms under the cursor lift, and a click sends a ripple through it.
 * Every blossom is moved on the GPU, so the whole flower is one draw call.
 * Loaded on idle, after the headline has painted. Returns its controls.
 */
export type GardenControls = { dispose: () => void; setPaused: (paused: boolean) => void };

const INK = 0x141210;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const R = 2.4; // radius of the great flower, world units
const DROP = 0.7; // seconds for the seed to land
const POP = 1.45; // the moment it bursts
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// Where the flower sits in the stage, as fractions of width and height, and
// how much of the shorter side it spans. The film card holds the lower left.
function placement(w: number, h: number) {
  if (w < 640) return { fx: 0.6, fy: 0.38, span: 0.6 };
  if (w > h * 1.2) return { fx: 0.6, fy: 0.42, span: 0.72 };
  return { fx: 0.58, fy: 0.4, span: 0.68 };
}

export function mountGarden(host: HTMLElement, onReady: () => void): GardenControls {
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

  const flower = new THREE.Group();
  scene.add(flower);

  const blossomTex = track(new THREE.TextureLoader().load('/storybook/ms-mustard-blossom-cut-256.webp'));
  blossomTex.colorSpace = THREE.SRGBColorSpace;
  blossomTex.anisotropy = 4;

  // The blossoms, placed on the golden angle: tiny at the heart, fuller at the rim.
  const COUNT = phone ? 520 : 900;
  const target = new Float32Array(COUNT * 3);
  const look = new Float32Array(COUNT * 4);
  const c = R / Math.sqrt(COUNT);
  for (let i = 0; i < COUNT; i++) {
    // The rim loosens: the outer blossoms scatter a little, so the edge reads grown, not cut.
    const rim = Math.max(0, i / COUNT - 0.78) / 0.22;
    const r = c * Math.sqrt(i + 4) * (1 + rim * (Math.random() * 0.22));
    const a = i * GOLDEN + rim * (Math.random() - 0.5) * 0.5;
    const n = Math.min(1, r / R);
    // A shallow cup, the rim leaning toward the viewer like a real flower head.
    target.set([Math.cos(a) * r, Math.sin(a) * r, n * n * 0.35], i * 3);
    const size = c * (1.7 + n * 0.8) * (0.85 + Math.random() * 0.3) * (1 - rim * 0.25);
    look.set([size, Math.random() * Math.PI * 2, Math.random(), n * 0.55 + Math.random() * 0.12], i * 4);
  }
  const quad = track(new THREE.PlaneGeometry(1, 1));
  const geo = track(new THREE.InstancedBufferGeometry());
  geo.index = quad.index;
  geo.setAttribute('position', quad.attributes.position);
  geo.setAttribute('uv', quad.attributes.uv);
  geo.setAttribute('aTarget', new THREE.InstancedBufferAttribute(target, 3));
  geo.setAttribute('aLook', new THREE.InstancedBufferAttribute(look, 4));
  geo.instanceCount = COUNT;

  const uniforms = {
    uTime: { value: 0 },
    uBloom: { value: -1 }, // seconds since the seed burst
    uPointer: { value: new THREE.Vector4(0, 0, 0, 0) }, // flower-local x, y, unused, strength
    uRipple: { value: new THREE.Vector4(0, 0, 0, -99) }, // flower-local x, y, unused, start time
    uMap: { value: blossomTex },
    uButter: { value: new THREE.Color(0xffe39a) },
    uDeep: { value: new THREE.Color(0xb7860f) },
  };
  const blossoms = new THREE.Mesh(
    geo,
    track(
      new THREE.ShaderMaterial({
        uniforms,
        alphaToCoverage: true,
        side: THREE.DoubleSide,
        vertexShader: /* glsl */ `
          uniform float uTime; uniform float uBloom;
          uniform vec4 uPointer; uniform vec4 uRipple;
          attribute vec3 aTarget;
          attribute vec4 aLook; // size, spin, tone, delay
          varying vec2 vUv; varying float vTone; varying float vDepth;
          const float R = ${R.toFixed(2)};
          void main(){
            float r = length(aTarget.xy);
            float n = r / R;
            float p = clamp((uBloom - aLook.w) / 1.5, 0.0, 1.0);
            float e = p >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * p);
            // Out of the seed on a swirl: the angle unwinds as each blossom lands.
            float swirl = (1.0 - e) * 2.4;
            float cs = cos(swirl), sn = sin(swirl);
            vec2 xy = vec2(aTarget.x * cs - aTarget.y * sn, aTarget.x * sn + aTarget.y * cs) * e;
            float z = aTarget.z * e + sin(p * 3.14159) * (0.25 + n * 0.9);

            // At rest: a slow breath that rolls out from the heart.
            z += sin(uTime * 1.1 - r * 2.2) * 0.035 * e;

            // The cursor lifts what it passes over.
            vec2 dp = aTarget.xy - uPointer.xy;
            float lift = uPointer.w * exp(-dot(dp, dp) / 0.45);
            z += lift * 0.42;

            // A click sends one ring out through the flower.
            float age = uTime - uRipple.w;
            float d = length(aTarget.xy - uRipple.xy);
            float ring = exp(-pow((d - age * 3.2) * 1.6, 2.0)) * exp(-age * 0.9);
            z += ring * 0.5;

            float grow = smoothstep(0.0, 0.45, p) * (1.0 + sin(clamp(p * 1.4, 0.0, 1.0) * 3.14159) * 0.25);
            float s = aLook.x * grow * (1.0 + lift * 0.3 + ring * 0.35);
            float a = aLook.y + (1.0 - e) * 5.0 + ring * 1.2;
            vec2 local = position.xy * s;
            local = vec2(local.x * cos(a) - local.y * sin(a), local.x * sin(a) + local.y * cos(a));

            vec4 mv = modelViewMatrix * vec4(xy + local, z, 1.0);
            vUv = uv;
            vTone = aLook.z;
            vDepth = n;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap; uniform vec3 uButter; uniform vec3 uDeep;
          varying vec2 vUv; varying float vTone; varying float vDepth;
          void main(){
            // Just the flower head of the engraved cut, not its stem.
            vec2 uv = vec2(0.1, 0.36) + vUv * vec2(0.8, 0.64);
            vec4 t = texture2D(uMap, uv);
            vec3 c = t.rgb;
            float lum = dot(c, vec3(0.299, 0.587, 0.114));
            // Deeper gold at the heart, a scatter of pale butter toward the rim.
            c = mix(c, uDeep * (0.5 + lum * 0.7), (1.0 - vDepth) * 0.35);
            c = mix(c, uButter * (0.3 + lum * 0.8), step(0.88 + (1.0 - vDepth) * 0.1, vTone) * 0.55);
            gl_FragColor = vec4(c, smoothstep(0.3, 0.65, t.a));
            #include <colorspace_fragment>
          }
        `,
      }),
    ),
  );
  blossoms.frustumCulled = false;
  flower.add(blossoms);

  // The seed: a small engraved sphere, ochre with hatched shade and an ink edge.
  const seedR = 0.2;
  const seed = new THREE.Group();
  const seedGeo = track(new THREE.SphereGeometry(seedR, 48, 32));
  const seedBody = new THREE.Mesh(
    seedGeo,
    track(
      new THREE.ShaderMaterial({
        uniforms: { uLight: { value: new THREE.Color(0xe9b13a) }, uDark: { value: new THREE.Color(0x8a5a10) }, uInk: { value: new THREE.Color(INK) } },
        vertexShader: /* glsl */ `
          varying vec3 vN;
          void main(){
            vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uLight; uniform vec3 uDark; uniform vec3 uInk;
          varying vec3 vN;
          void main(){
            float l = clamp(dot(normalize(vN), normalize(vec3(-0.5, 0.65, 0.6))), 0.0, 1.0);
            vec3 c = mix(uDark, uLight, smoothstep(0.05, 0.85, l));
            // Engraved hatching in the shadow side, the way the botanicals are drawn.
            float rows = (gl_FragCoord.x + gl_FragCoord.y) / 3.2;
            float hatch = step(0.55, fract(rows)) * (1.0 - smoothstep(0.1, 0.55, l));
            c = mix(c, uInk, hatch * 0.35);
            // A small highlight.
            c += pow(l, 18.0) * 0.35;
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    ),
  );
  const seedEdge = new THREE.Mesh(seedGeo, track(new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })));
  seedEdge.scale.setScalar(1.09);
  seed.add(seedEdge, seedBody);
  seed.position.z = 0.15;
  flower.add(seed);

  // The seed's shadow on the paper before it bursts.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const sctx = shadowCanvas.getContext('2d');
  if (sctx) {
    const g = sctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, 'rgba(20,18,16,0.5)');
    g.addColorStop(1, 'rgba(20,18,16,0)');
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, 64, 64);
  }
  const shadow = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1, 1)),
    track(new THREE.MeshBasicMaterial({ map: track(new THREE.CanvasTexture(shadowCanvas)), transparent: true, depthWrite: false, opacity: 0 })),
  );
  shadow.position.set(0.06, -0.26, -0.05);
  shadow.scale.set(0.55, 0.16, 1);
  flower.add(shadow);

  // Input: the flower tilts toward the pointer, lifts under it, and ripples on a click.
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, on: 0 };
  let inside = false;
  const ndc = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const flowerPlane = new THREE.Plane();
  const hit = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const local = new THREE.Vector3();
  const onPointer = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    inside = Math.abs(pointer.tx) <= 1 && Math.abs(pointer.ty) <= 1;
  };
  const onLeave = () => {
    inside = false;
  };
  const toFlower = (x: number, y: number) => {
    ndc.set(x, -y);
    ray.setFromCamera(ndc, camera);
    normal.set(0, 0, 1).applyQuaternion(flower.quaternion);
    flowerPlane.setFromNormalAndCoplanarPoint(normal, flower.position);
    if (!ray.ray.intersectPlane(flowerPlane, hit)) return null;
    return flower.worldToLocal(local.copy(hit));
  };
  const onDown = (e: PointerEvent) => {
    onPointer(e);
    if (t < POP + 1.2) return;
    const p = toFlower(pointer.tx, pointer.ty);
    if (p && p.length() < R * 1.3) uniforms.uRipple.value.set(p.x, p.y, 0, t);
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  host.addEventListener('pointerleave', onLeave);
  host.addEventListener('pointerdown', onDown);

  const home = new THREE.Vector3();
  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const { fx, fy, span } = placement(w, h);
    const visibleH = (2 * R * h) / (span * Math.min(w, h));
    const dist = visibleH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    home.set((fx - 0.5) * visibleH * camera.aspect, (0.5 - fy) * visibleH, 0);
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
  let spin = 0;
  let readyFired = false;

  const tick = (now: number) => {
    frameId = 0;
    if (paused || !visible || document.hidden) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
    pointer.on += ((inside && t > POP + 1.2 ? 1 : 0) - pointer.on) * Math.min(1, dt * 4);
    const r = host.getBoundingClientRect();
    const scroll = clamp01(-r.top / Math.max(r.height, 1));

    // The flower: home position, a slow turn, a lean toward the pointer, a settle on scroll.
    spin += dt * 0.045;
    flower.position.set(home.x, home.y + scroll * 0.8, 0);
    flower.rotation.set(-0.12 + pointer.y * 0.22 + scroll * 0.5, pointer.x * 0.3, spin);

    // The seed: drops in, lands with a squash, wiggles, then swells into the heart.
    const drop = clamp01(t / DROP);
    const fall = drop < 1 ? 1 - drop * drop : 0;
    const land = Math.max(0, t - DROP);
    const bounce = Math.exp(-land * 7) * Math.abs(Math.sin(land * 14)) * 0.18;
    const wiggle = t > DROP + 0.25 && t < POP ? Math.sin((t - DROP) * 38) * 0.18 * clamp01((t - DROP - 0.25) * 4) : 0;
    const swell = t < POP ? 1 + clamp01((t - POP + 0.35) / 0.35) * 0.35 : 1.35 - Math.min(0.15, (t - POP) * 0.3);
    const squash = 1 - Math.exp(-land * 9) * 0.3 * (drop >= 1 ? 1 : 0);
    seed.position.set(0, fall * 3.2 + bounce, 0.15);
    seed.rotation.set(0, 0, wiggle - spin);
    seed.scale.set(swell * (2 - squash), swell * squash, swell);
    const shadowMat = shadow.material as THREE.MeshBasicMaterial;
    shadowMat.opacity = clamp01(drop * 1.5) * (1 - clamp01((t - POP) * 2)) * 0.6;
    shadow.visible = shadowMat.opacity > 0.001;

    uniforms.uTime.value = t;
    uniforms.uBloom.value = t - POP;
    const p = pointer.on > 0.01 ? toFlower(pointer.x, pointer.y) : null;
    if (p) uniforms.uPointer.value.set(p.x, p.y, 0, pointer.on);
    else uniforms.uPointer.value.w = 0;

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
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      canvas.remove();
    },
  };
}
