import * as THREE from 'three';

/**
 * The hero field. The film plays on a card that floats over an engraved
 * mustard field running to the horizon, under an engraved sun, while a whole
 * sky of blossoms, petals, dahlias and cosmos falls through it at real depth.
 * The field sways in one wind; the cursor is a breeze that parts the flowers,
 * a click or tap throws a gust, and scrolling picks the wind up. Everything
 * that moves in numbers is computed on the GPU, so a few thousand flowers cost
 * a handful of draw calls. Loaded on idle, after the headline has painted.
 */
export type GardenControls = { dispose: () => void; setPaused: (paused: boolean) => void };

const INK = 0x141210;
const MUSTARD = 0xf5b700;
const PAPER = 0xfcfaf3;
const HORIZON = 0xf4eedb;
const GROUND = 0xe9e3c2;
const SUN = 0xe8ecd0;
const STEM = 0x56603a;
const FILM_ASPECT = 1024 / 572;
const GROUND_Y = -2.25;
const TAU = Math.PI * 2;

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// Shared GLSL: the one wind every stalk and petal answers to.
const WIND_GLSL = /* glsl */ `
  uniform float uTime;
  uniform float uWind;
  uniform float uIntro;
  uniform vec4 uBreeze;   // pointer on the field: x, z, strength, unused
  uniform vec4 uPointer;  // pointer in the air: x, y, z, strength
  uniform vec4 uBurst;    // gust origin x, y, z and the time it fired
  uniform vec2 uFog;      // fog near, far (view depth)

  vec2 sway(vec3 root, float phase) {
    float gust = sin(uTime * 0.42 + root.x * 0.11 - root.z * 0.19);
    float x = sin(uTime * 1.15 + root.x * 0.47 + root.z * 0.31 + phase) * 0.07
            + gust * 0.13 * uWind;
    float z = cos(uTime * 0.9 + root.x * 0.23 + phase * 1.7) * 0.05;
    vec2 d = root.xz - uBreeze.xy;
    float f = uBreeze.z * exp(-dot(d, d) / 1.4);
    x += sign(d.x) * f * 0.55;
    z += sign(d.y) * f * 0.25;
    float age = uTime - uBurst.w;
    if (age > 0.0) {
      vec2 b = root.xz - uBurst.xz;
      float k = exp(-dot(b, b) / 14.0) * (1.0 - exp(-age * 8.0)) * exp(-age * 0.9) * 1.6;
      x += sign(b.x) * k * 0.7;
    }
    return vec2(x, z);
  }

  float fogAt(vec4 mv) {
    return smoothstep(uFog.x, uFog.y, -mv.z);
  }
`;

const FIELD_FRAG_HEAD = /* glsl */ `
  uniform vec3 uFogColor;
`;

function makeUniforms() {
  return {
    uTime: { value: 0 },
    uWind: { value: 1 },
    uIntro: { value: 0 },
    uFall: { value: 0 },
    uDrift: { value: 0 },
    uBreeze: { value: new THREE.Vector4(0, -99, 0, 0) },
    uPointer: { value: new THREE.Vector4(0, 0, 0, 0) },
    uBurst: { value: new THREE.Vector4(0, 0, 0, -99) },
    uFog: { value: new THREE.Vector2(9, 34) },
    uFogColor: { value: new THREE.Color(HORIZON) },
  };
}
type Shared = ReturnType<typeof makeUniforms>;

type Bloom = { mesh: THREE.Mesh; base: THREE.Vector3; size: number; spin: number; phase: number; delay: number; hover: number; angle: number; kick: number };

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
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 140);
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(d: T) => (disposables.push(d), d);
  const shared: Shared = makeUniforms();
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

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

  // Sky: paper overhead, warm cream at the horizon, and an engraved sun.
  const skyUniforms = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uHorizon: { value: 0.5 },
    uSunShift: { value: new THREE.Vector2(0, 0) },
    uTop: { value: new THREE.Color(PAPER) },
    uLow: { value: new THREE.Color(HORIZON) },
    uSun: { value: new THREE.Color(SUN) },
    uLine: { value: new THREE.Color(MUSTARD) },
  };
  const skyGeo = track(new THREE.BufferGeometry());
  skyGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const sky = new THREE.Mesh(
    skyGeo,
    track(
      new THREE.ShaderMaterial({
        uniforms: skyUniforms,
        depthWrite: false,
        depthTest: false,
        vertexShader: /* glsl */ `void main(){ gl_Position = vec4(position.xy, 1.0, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec2 uRes; uniform float uHorizon; uniform vec2 uSunShift;
          uniform vec3 uTop; uniform vec3 uLow; uniform vec3 uSun; uniform vec3 uLine;
          void main(){
            vec2 uv = gl_FragCoord.xy / uRes;
            vec3 c = mix(uLow, uTop, smoothstep(uHorizon, uHorizon + 0.55, uv.y));
            float aspect = uRes.x / uRes.y;
            vec2 sp = vec2(0.6, 0.6) + uSunShift;
            vec2 q = (uv - sp) * vec2(aspect, 1.0);
            float r = 0.3;
            float d = length(q) - r;
            float aa = fwidth(d) * 1.2;
            float disk = 1.0 - smoothstep(-aa, aa, d);
            // Engraved shading: horizontal rules that thicken toward the bottom of the sun.
            float rows = uv.y * uRes.y / 7.0;
            float lineW = mix(0.08, 0.42, clamp((sp.y + r - uv.y) / (2.0 * r), 0.0, 1.0));
            float rule = 1.0 - smoothstep(lineW - 0.1, lineW + 0.1, abs(fract(rows) - 0.5) * 2.0);
            rule *= smoothstep(0.0, 0.5, (sp.y - uv.y) / r + 0.35);
            vec3 sun = mix(uSun, uLine, rule * 0.28);
            c = mix(c, sun, disk);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    ),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  scene.add(sky);

  // Ground: a pale field with engraved furrows that fade into the horizon haze.
  const ground = new THREE.Mesh(
    track(new THREE.PlaneGeometry(140, 90, 1, 1)),
    track(
      new THREE.ShaderMaterial({
        uniforms: { ...shared, uGround: { value: new THREE.Color(GROUND) }, uInk: { value: new THREE.Color(STEM) } },
        vertexShader: /* glsl */ `
          uniform vec2 uFog;
          varying vec3 vWorld; varying float vFog;
          void main(){
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            vec4 mv = viewMatrix * w;
            vFog = smoothstep(uFog.x * 0.6, uFog.y * 1.15, -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uGround; uniform vec3 uInk; uniform vec3 uFogColor;
          varying vec3 vWorld; varying float vFog;
          void main(){
            float q = vWorld.z * 3.2 + sin(vWorld.x * 0.33) * 0.3;
            float w = fwidth(q);
            float d = abs(fract(q + 0.5) - 0.5);
            float line = (1.0 - smoothstep(0.0, w * 1.4, d - 0.03)) * (1.0 - smoothstep(0.12, 0.35, w));
            vec3 c = mix(uGround, uInk, line * 0.07);
            c = mix(c, uFogColor, vFog);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    ),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, GROUND_Y, -30);
  ground.renderOrder = -900;
  scene.add(ground);

  // The meadow: engraved mustard stalks planted to the horizon. Each one is an
  // ink stem plus the blossom cut, sharing one set of per-stalk attributes.
  const STALKS = phone ? 1000 : 2400;
  const roots = new Float32Array(STALKS * 3);
  const stalk = new Float32Array(STALKS * 4);
  for (let i = 0; i < STALKS; i++) {
    // A third of the field crowds the foreground so the bottom of the frame is all flowers.
    const depth = i % 3 === 0 ? Math.random() * 0.2 : Math.pow(Math.random(), 0.72);
    const z = 3.6 - depth * 30;
    const spread = 2.2 + (13 - z) * 0.42;
    const x = rand(-spread, spread);
    let stem = rand(0.4, 1.3);
    let head = rand(0.42, 0.8);
    // Keep the front row from climbing over the film.
    if (z > -1.2 && Math.abs(x) < 2.7) {
      stem = rand(0.2, 0.42);
      head = rand(0.42, 0.62);
    }
    roots.set([x, GROUND_Y, z], i * 3);
    stalk.set([stem, head, Math.random() * TAU, Math.random()], i * 4);
  }
  const aRoot = new THREE.InstancedBufferAttribute(roots, 3);
  const aStalk = new THREE.InstancedBufferAttribute(stalk, 4);

  const STALK_GLSL = /* glsl */ `
    attribute vec3 aRoot;
    attribute vec4 aStalk;   // stem height, head size, phase, tone
    varying float vFog;
    float growOf(vec3 root) {
      float near = clamp((3.6 - root.z) / 30.0, 0.0, 1.0);
      return smoothstep(0.0, 1.0, uIntro * 1.7 - near * 0.7);
    }
    vec3 stemPoint(float f, vec2 s, float h) {
      return aRoot + vec3(s.x * f * f, h * f, s.y * f * f);
    }
  `;

  const stemGeo = track(new THREE.InstancedBufferGeometry());
  const stemPlane = track(new THREE.PlaneGeometry(1, 1, 1, 6));
  stemPlane.translate(0, 0.5, 0);
  stemGeo.index = stemPlane.index;
  stemGeo.setAttribute('position', stemPlane.attributes.position);
  stemGeo.setAttribute('aRoot', aRoot);
  stemGeo.setAttribute('aStalk', aStalk);
  stemGeo.instanceCount = STALKS;
  const stems = new THREE.Mesh(
    stemGeo,
    track(
      new THREE.ShaderMaterial({
        uniforms: { ...shared, uColor: { value: new THREE.Color(STEM) } },
        vertexShader: WIND_GLSL + STALK_GLSL + /* glsl */ `
          void main(){
            float g = growOf(aRoot);
            vec2 s = sway(aRoot, aStalk.z) * aStalk.x;
            vec3 p = stemPoint(position.y, s, aStalk.x * g);
            vec4 mv = viewMatrix * vec4(p, 1.0);
            mv.x += position.x * 0.016 * (1.0 - position.y * 0.6) * (0.6 + aStalk.y);
            vFog = fogAt(mv);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: FIELD_FRAG_HEAD + /* glsl */ `
          uniform vec3 uColor; varying float vFog;
          void main(){
            gl_FragColor = vec4(mix(uColor, uFogColor, vFog), 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    ),
  );
  stems.frustumCulled = false;
  scene.add(stems);

  const headGeo = track(new THREE.InstancedBufferGeometry());
  const headPlane = track(new THREE.PlaneGeometry(1, 1));
  headPlane.translate(0.02, 0.5, 0);
  headGeo.index = headPlane.index;
  headGeo.setAttribute('position', headPlane.attributes.position);
  headGeo.setAttribute('uv', headPlane.attributes.uv);
  headGeo.setAttribute('aRoot', aRoot);
  headGeo.setAttribute('aStalk', aStalk);
  headGeo.instanceCount = STALKS;
  const heads = new THREE.Mesh(
    headGeo,
    track(
      new THREE.ShaderMaterial({
        uniforms: { ...shared, uMap: { value: blossom }, uIvory: { value: new THREE.Color(0xffe7a3) } },
        alphaToCoverage: true,
        vertexShader: WIND_GLSL + STALK_GLSL + /* glsl */ `
          varying vec2 vUv; varying float vTone;
          void main(){
            float g = growOf(aRoot);
            vec2 s = sway(aRoot, aStalk.z) * aStalk.x;
            vec3 tip = stemPoint(1.0, s, aStalk.x * g);
            vec4 mv = viewMatrix * vec4(tip, 1.0);
            float a = -s.x * 0.9 + sin(aStalk.z * 3.0) * 0.3;
            vec2 local = position.xy * aStalk.y * g;
            mv.xy += vec2(local.x * cos(a) - local.y * sin(a), local.x * sin(a) + local.y * cos(a));
            vUv = uv;
            vTone = aStalk.w;
            vFog = fogAt(mv);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: FIELD_FRAG_HEAD + /* glsl */ `
          uniform sampler2D uMap; uniform vec3 uIvory;
          varying vec2 vUv; varying float vFog; varying float vTone;
          void main(){
            vec4 t = texture2D(uMap, vUv);
            vec3 c = t.rgb;
            // About one stalk in seven flowers pale butter instead of mustard.
            float lum = dot(c, vec3(0.299, 0.587, 0.114));
            c = mix(c, uIvory * (0.45 + lum * 0.75), step(0.86, vTone) * 0.8);
            c = mix(c, uFogColor, vFog);
            gl_FragColor = vec4(c, smoothstep(0.25, 0.6, t.a));
            #include <colorspace_fragment>
          }
        `,
      }),
    ),
  );
  heads.frustumCulled = false;
  scene.add(heads);

  // The falling sky: blossoms, loose petals, dahlias and cosmos, all GPU driven.
  const FALL_GLSL = /* glsl */ `
    uniform float uFall;
    uniform float uDrift;
    uniform vec3 uBox;     // half width, height, top
    attribute vec4 aSeed;  // x (0..1), z, phase (0..1), fall speed
    attribute vec4 aSpin;  // spin xyz, sway
    attribute vec4 aRect;  // uv rect u0, v0, u1, v1
    attribute float aSize;
    varying vec2 vUv; varying float vShade; varying float vFog;
    mat3 rot(vec3 a){
      float cx = cos(a.x), sx = sin(a.x), cy = cos(a.y), sy = sin(a.y), cz = cos(a.z), sz = sin(a.z);
      return mat3(cy*cz, cy*sz, -sy,
                  sx*sy*cz - cx*sz, sx*sy*sz + cx*cz, sx*cy,
                  cx*sy*cz + sx*sz, cx*sy*sz - sx*cz, cx*cy);
    }
    void main(){
      float ph = aSeed.z;
      float h = uBox.y;
      float y = uBox.z - mod(ph * h + uFall * aSeed.w, h);
      float x = (aSeed.x * 2.0 - 1.0) * uBox.x
              + sin(uTime * 0.7 + ph * 6.2832) * aSpin.w
              + uDrift * aSeed.w * 0.4;
      x = mod(x + uBox.x, uBox.x * 2.0) - uBox.x;
      vec3 c = vec3(x, y, aSeed.y);

      vec3 d = c - uPointer.xyz;
      d.z *= 0.45;
      float f = uPointer.w * exp(-dot(d, d) / 1.3);
      c += normalize(d + vec3(0.0, 0.001, 0.0)) * f * 0.85;

      float age = uTime - uBurst.w;
      if (age > 0.0) {
        vec3 b = c - uBurst.xyz;
        float k = exp(-dot(b, b) / 10.0) * (1.0 - exp(-age * 9.0)) * exp(-age * 0.55) * 4.2;
        c += normalize(b + vec3(0.0, 0.01, 0.0)) * k + vec3(0.0, k * 0.35, 0.0);
      }

      float spinBoost = 1.0 + (uWind - 1.0) * 0.6;
      mat3 R = rot(aSpin.xyz * uTime * spinBoost + ph * vec3(6.2832, 12.566, 18.85));
      float grow = smoothstep(0.0, 1.0, (uIntro - ph * 0.45) * 2.2);
      float aspect = (aRect.z - aRect.x) / (aRect.w - aRect.y);
      vec3 local = R * vec3(position.x * aspect, position.y, 0.0) * aSize * grow;
      vec3 n = R * vec3(0.0, 0.0, 1.0);
      vShade = 0.8 + 0.2 * abs(n.z);
      vec4 mv = modelViewMatrix * vec4(c + local, 1.0);
      vFog = fogAt(mv);
      vUv = mix(aRect.xy, aRect.zw, uv);
      gl_Position = projectionMatrix * mv;
    }
  `;
  const FALL_FRAG = FIELD_FRAG_HEAD + /* glsl */ `
    uniform sampler2D uMap;
    varying vec2 vUv; varying float vShade; varying float vFog;
    void main(){
      vec4 t = texture2D(uMap, vUv);
      vec3 c = mix(t.rgb * vShade, uFogColor, vFog * 0.6);
      gl_FragColor = vec4(c, smoothstep(0.25, 0.6, t.a));
      #include <colorspace_fragment>
    }
  `;
  const box = { value: new THREE.Vector3(9, 10, 6.2) };
  const PETAL_RECT: [number, number, number, number] = [0.4, 0.66, 0.62, 0.97];
  const FULL_RECT: [number, number, number, number] = [0, 0, 1, 1];
  const fallers: THREE.Mesh[] = [];
  const addFall = (map: THREE.Texture, count: number, pick: () => { rect: [number, number, number, number]; size: number }) => {
    const seed = new Float32Array(count * 4);
    const spin = new Float32Array(count * 4);
    const rect = new Float32Array(count * 4);
    const size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const z = 4.2 - Math.pow(Math.random(), 0.85) * 20;
      seed.set([Math.random(), z, Math.random(), rand(0.32, 0.72)], i * 4);
      spin.set([rand(0.4, 1.6) * (Math.random() < 0.5 ? -1 : 1), rand(0.3, 1.2), rand(-0.5, 0.5), rand(0.15, 0.6)], i * 4);
      const p = pick();
      rect.set(p.rect, i * 4);
      size[i] = p.size;
    }
    const geo = track(new THREE.InstancedBufferGeometry());
    const quad = track(new THREE.PlaneGeometry(1, 1));
    geo.index = quad.index;
    geo.setAttribute('position', quad.attributes.position);
    geo.setAttribute('uv', quad.attributes.uv);
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
    geo.setAttribute('aSpin', new THREE.InstancedBufferAttribute(spin, 4));
    geo.setAttribute('aRect', new THREE.InstancedBufferAttribute(rect, 4));
    geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 1));
    geo.instanceCount = count;
    const mesh = new THREE.Mesh(
      geo,
      track(
        new THREE.ShaderMaterial({
          uniforms: { ...shared, uMap: { value: map }, uBox: box },
          vertexShader: WIND_GLSL + FALL_GLSL,
          fragmentShader: FALL_FRAG,
          side: THREE.DoubleSide,
          alphaToCoverage: true,
        }),
      ),
    );
    mesh.frustumCulled = false;
    mesh.renderOrder = 200;
    scene.add(mesh);
    fallers.push(mesh);
  };
  addFall(blossom, phone ? 240 : 560, () =>
    Math.random() < 0.6 ? { rect: FULL_RECT, size: rand(0.26, 0.56) } : { rect: PETAL_RECT, size: rand(0.14, 0.26) },
  );
  addFall(dahlia, phone ? 18 : 44, () => ({ rect: FULL_RECT, size: rand(0.3, 0.62) }));
  addFall(cosmos, phone ? 18 : 44, () => ({ rect: FULL_RECT, size: rand(0.3, 0.58) }));

  // The film card: a fine cloth of a screen that ripples in the same wind, an
  // ink frame drawn into it, and the mustard plate offset behind.
  const W = 4.4;
  const H = W / FILM_ASPECT;
  const B = 0.075;
  const card = new THREE.Group();
  const filmTex = track(new THREE.VideoTexture(video));
  filmTex.colorSpace = THREE.SRGBColorSpace;
  const cardGeo = track(new THREE.PlaneGeometry(W + B * 2, H + B * 2, 48, 28));
  const cardUniforms = (plate: boolean) => ({
    uTime: shared.uTime,
    uWind: shared.uWind,
    uMap: { value: filmTex },
    uOuter: { value: new THREE.Vector2(W / 2 + B, H / 2 + B) },
    uInner: { value: new THREE.Vector2(W / 2, H / 2) },
    uInk: { value: new THREE.Color(INK) },
    uPlate: { value: new THREE.Color(MUSTARD) },
    uMode: { value: plate ? 1 : 0 },
    uGloss: { value: 0 },
  });
  const cardShader = (plate: boolean) =>
    track(
      new THREE.ShaderMaterial({
        uniforms: cardUniforms(plate),
        alphaToCoverage: true,
        vertexShader: /* glsl */ `
          uniform float uTime; uniform float uWind;
          varying vec2 vLocal; varying vec2 vUv; varying float vSlope;
          void main(){
            vec3 p = position;
            float k = 0.05 * (0.6 + uWind * 0.4);
            float a = p.x * 1.05 - uTime * 1.6;
            p.z += sin(a) * k + sin(p.y * 1.8 + uTime * 1.15) * 0.022;
            vSlope = cos(a) * 1.05 * k;
            vLocal = position.xy;
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap; uniform vec2 uOuter; uniform vec2 uInner;
          uniform vec3 uInk; uniform vec3 uPlate; uniform int uMode; uniform float uGloss;
          varying vec2 vLocal; varying vec2 vUv; varying float vSlope;
          float box(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
          void main(){
            float dOut = box(vLocal, uOuter, 0.2);
            float aa = fwidth(dOut);
            float alpha = 1.0 - smoothstep(-aa, aa, dOut);
            vec3 c;
            if (uMode == 1) {
              c = uPlate;
            } else {
              float dIn = box(vLocal, uInner, 0.13);
              float ai = fwidth(dIn);
              vec2 fuv = (vLocal + uInner) / (2.0 * uInner);
              vec3 film = texture2D(uMap, clamp(fuv, 0.0, 1.0)).rgb;
              c = mix(film, uInk, smoothstep(-ai, ai, dIn));
              float sheen = exp(-pow((vLocal.x + vLocal.y * 0.7 - uGloss) * 0.9, 2.0)) * 0.07;
              c += sheen * (1.0 - smoothstep(-ai, ai, dIn));
            }
            c *= 1.0 + vSlope * 1.6;
            gl_FragColor = vec4(c, alpha);
            #include <colorspace_fragment>
          }
        `,
      }),
    );
  const plateMat = cardShader(true);
  const screenMat = cardShader(false);
  const plate = new THREE.Mesh(cardGeo, plateMat);
  plate.position.set(0.24, -0.24, -0.08);
  const screen = new THREE.Mesh(cardGeo, screenMat);
  card.add(plate, screen);
  card.rotation.set(-0.08, -0.22, 0.03);
  card.renderOrder = 150;
  scene.add(card);

  // A soft shadow on the field, so the card reads as floating over it.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d');
  if (sctx) {
    const grad = sctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(20,18,16,0.55)');
    grad.addColorStop(1, 'rgba(20,18,16,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 128, 128);
  }
  const shadowTex = track(new THREE.CanvasTexture(shadowCanvas));
  const shadow = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1, 1)),
    track(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 })),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.1, GROUND_Y + 0.01, 0.2);
  shadow.scale.set(W * 1.15, 2.2, 1);
  shadow.renderOrder = -800;
  scene.add(shadow);

  // The engraved hero blooms around the card. They open on hover and spin on a gust.
  const plane = track(new THREE.PlaneGeometry(1, 1));
  const layout: [THREE.Texture, number, number, number, number][] = phone
    ? [
        [dahlia, 2.3, 1.35, -1.6, 2.0],
        [cosmos, -2.35, -1.15, 0.9, 1.45],
        [dahlia, -2.5, 1.45, -2.4, 1.05],
        [cosmos, 2.2, -1.35, -0.8, 0.95],
      ]
    : [
        [dahlia, 2.55, 1.45, -1.8, 2.3],
        [cosmos, -2.6, -1.15, 1.1, 1.7],
        [dahlia, -2.9, 1.55, -2.8, 1.2],
        [cosmos, 3.1, -1.15, -0.6, 1.2],
        [cosmos, -0.9, 2.15, -3.6, 0.9],
        [dahlia, 3.5, 0.35, 1.6, 0.6],
      ];
  const blooms: Bloom[] = layout.map(([map, x, y, z, size], i) => {
    const mesh = new THREE.Mesh(plane, track(new THREE.MeshBasicMaterial({ map, alphaToCoverage: true })));
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return { mesh, base: new THREE.Vector3(x, y, z), size, spin: (i % 2 ? -1 : 1) * (0.05 + i * 0.012), phase: i * 1.7, delay: 0.5 + i * 0.1, hover: 0, angle: i * 0.9, kick: 0 };
  });

  // Input: the cursor is a breeze, a click is a gust, scrolling raises the wind.
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, on: 0 };
  const ndc = new THREE.Vector2(-9, -9);
  const ray = new THREE.Raycaster();
  const airPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const fieldPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GROUND_Y);
  const hitAir = new THREE.Vector3();
  const hitField = new THREE.Vector3();
  let inside = false;
  const onPointer = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    inside = Math.abs(pointer.tx) <= 1 && Math.abs(pointer.ty) <= 1;
    ndc.set(pointer.tx, -pointer.ty);
  };
  const onLeave = () => {
    pointer.tx = 0;
    pointer.ty = 0;
    inside = false;
    ndc.set(-9, -9);
  };
  const onDown = (e: PointerEvent) => {
    onPointer(e);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(airPlane, hitAir)) return;
    shared.uBurst.value.set(hitAir.x, hitAir.y, 0, t);
    for (const b of blooms) b.kick = 1;
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
    renderer.getDrawingBufferSize(skyUniforms.uRes.value);
    camera.aspect = w / h;
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitW = (W * 1.55) / (2 * half * camera.aspect);
    const fitH = (H * 2.05) / (2 * half);
    fitZ = Math.max(fitW, fitH);
    box.value.x = Math.max(9, 9 * camera.aspect);
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
  let lastScrollY = window.scrollY;
  let wind = 1;
  const far = new THREE.Vector3();
  const aim = new THREE.Vector2();

  const tick = (now: number) => {
    frameId = 0;
    if (paused || !visible || document.hidden) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    const ease = Math.min(1, dt * 4);
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;
    pointer.on += ((inside ? 1 : 0) - pointer.on) * Math.min(1, dt * 3);
    const r = host.getBoundingClientRect();
    const scroll = clamp01(-r.top / Math.max(r.height, 1));
    const sy = window.scrollY;
    const scrollSpeed = Math.abs(sy - lastScrollY) / Math.max(dt, 0.001);
    lastScrollY = sy;
    const windTarget = 1 + Math.min(scrollSpeed / 900, 2.2);
    wind += (windTarget - wind) * Math.min(1, dt * (windTarget > wind ? 3 : 0.8));

    // Camera: a slow dolly in over the field on arrival, then pointer lean and scroll rise.
    const intro = clamp01(t / 2.4);
    const dolly = easeOutCubic(intro);
    camera.position.set(pointer.x * 0.55, 0.15 - (1 - dolly) * 0.7 - pointer.y * 0.3 + scroll * 0.7, fitZ + (1 - dolly) * 2.4);
    camera.lookAt(0, -0.05 + scroll * 0.45, 0);
    camera.updateMatrixWorld();

    // Shared uniforms.
    shared.uTime.value = t;
    shared.uWind.value = wind;
    shared.uIntro.value = clamp01(t / 2.6);
    shared.uFall.value += dt * (0.55 + (wind - 1) * 0.9);
    shared.uDrift.value += dt * (wind - 1) * 1.4;
    ray.setFromCamera(aim.set(pointer.x, -pointer.y), camera);
    if (ray.ray.intersectPlane(airPlane, hitAir)) shared.uPointer.value.set(hitAir.x, hitAir.y, 0, pointer.on);
    if (ray.ray.intersectPlane(fieldPlane, hitField)) shared.uBreeze.value.set(hitField.x, hitField.z, pointer.on, 0);
    else shared.uBreeze.value.z = 0;
    far.set(camera.position.x, camera.position.y, -400).project(camera);
    skyUniforms.uHorizon.value = far.y * 0.5 + 0.5;
    skyUniforms.uSunShift.value.set(-pointer.x * 0.015, pointer.y * 0.01 - scroll * 0.06);

    // The card rises into place and leans with the pointer.
    const rise = easeOutBack(clamp01((t - 0.15) / 1.3));
    card.scale.setScalar(0.84 + 0.16 * rise);
    card.rotation.y = -0.22 + pointer.x * 0.26 + Math.sin(t * 0.5) * 0.03;
    card.rotation.x = -0.08 + pointer.y * 0.15 + scroll * 0.35;
    card.position.y = 0.12 + Math.sin(t * 0.8) * 0.07 + scroll * 0.5 - (1 - rise) * 0.8;
    screenMat.uniforms.uGloss.value = pointer.x * 2.6 + Math.sin(t * 0.35) * 0.6;
    const lift = card.position.y - 0.12;
    shadow.scale.set(W * (1.15 - lift * 0.15), 2.2 - lift * 0.3, 1);
    (shadow.material as THREE.MeshBasicMaterial).opacity = 0.5 * rise * (1 - scroll);

    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(blooms.map((b) => b.mesh), false)[0];
    host.style.cursor = hit ? 'pointer' : '';

    for (const b of blooms) {
      const k = easeOutBack(clamp01((t - b.delay) / 0.9));
      const over = hit?.object === b.mesh ? 1 : 0;
      b.hover += (over - b.hover) * Math.min(1, dt * 8);
      b.kick *= Math.exp(-dt * 1.6);
      b.mesh.scale.setScalar(Math.max(0.0001, b.size * k * (1 + b.hover * 0.18 + b.kick * 0.08)));
      b.angle += (b.spin * wind + b.hover * 1.4 + b.kick * 4) * dt;
      b.mesh.position.set(b.base.x + Math.sin(t * 0.4 + b.phase) * 0.05 * wind, b.base.y + Math.sin(t * 0.7 + b.phase) * 0.12 + scroll * (1.2 - b.base.z * 0.25), b.base.z + (1 - k) * -4);
      b.mesh.lookAt(camera.position.x * 0.3, camera.position.y * 0.3, camera.position.z);
      b.mesh.rotateZ(b.angle);
    }

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
