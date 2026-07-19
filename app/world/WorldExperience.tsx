'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import './world.css';

const ASPECT: Record<string, number> = {
  mountains: 1.778, hq: 1.0, family: 1.406, jetski: 1.25, sailboat: 1.0,
  garden: 1.778, pine: 0.75, seedwave: 0.818, seaplane: 1.333,
};

type Landmark = { key: string; eyebrow: string; title: string; body: string; x: number; z: number; r: number };
const LANDMARKS: Landmark[] = [
  { key: 'hq', eyebrow: 'Headquarters', title: 'Where your app gets built.', body: 'Apps, websites, and specialty AI tools, shipped in weeks, not months.', x: -46, z: -40, r: 24 },
  { key: 'gardens', eyebrow: 'The Gardens', title: 'We grow things that grow themselves.', body: 'Lead engines and automations that keep working after we leave.', x: 54, z: -34, r: 24 },
  { key: 'crew', eyebrow: 'The Crew', title: 'Run it all from your phone.', body: 'Systems so simple your business fits in your pocket. Even the dog gets a day off.', x: 0, z: -86, r: 26 },
];
const TOTAL_SEEDS = 12;

export default function WorldExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const joyRef = useRef<HTMLDivElement>(null);

  const [noWebgl, setNoWebgl] = useState(false);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [seeds, setSeeds] = useState(0);
  const [combo, setCombo] = useState(0);
  const [landmark, setLandmark] = useState<Landmark | null>(null);
  const [muted, setMuted] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [won, setWon] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const api = useRef({ start: () => {}, setMuted: (_m: boolean) => {} });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const root = rootRef.current!;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch { setNoWebgl(true); return; }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (isTouch) root.classList.add('is-touch');
    document.body.style.overflow = 'hidden';

    let W = window.innerWidth, H = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 700);
    camera.position.set(0, 24, 60);
    scene.fog = new THREE.Fog(0xe7c49a, 120, 470); // warm golden-hour haze

    // optional bloom (loaded lazily so the build never depends on it)
    let composer: { render: () => void; setSize: (w: number, h: number) => void } | null = null;
    (async () => {
      try {
        const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
          import('three/examples/jsm/postprocessing/EffectComposer.js' as string),
          import('three/examples/jsm/postprocessing/RenderPass.js' as string),
          import('three/examples/jsm/postprocessing/UnrealBloomPass.js' as string),
          import('three/examples/jsm/postprocessing/OutputPass.js' as string),
        ]);
        const c = new EffectComposer(renderer);
        c.addPass(new RenderPass(scene, camera));
        c.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.07, 0.4, 0.92));
        c.addPass(new OutputPass());
        c.setSize(W, H);
        composer = c as unknown as typeof composer;
      } catch { composer = null; }
    })();

    // ---- textures ----
    const loader = new THREE.TextureLoader();
    const tracked: THREE.Texture[] = [];
    const tex = (name: string) => {
      const t = loader.load(`/world/${name}.webp`);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      tracked.push(t); return t;
    };
    const canvasTex = (draw: (c: CanvasRenderingContext2D, s: number) => void, size = 128) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = size;
      draw(cv.getContext('2d')!, size);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; tracked.push(t); return t;
    };
    const glow = canvasTex((c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,235,150,.85)'); g.addColorStop(1, 'rgba(255,220,120,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    });
    const puff = canvasTex((c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.5, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    });
    const shadowTex = canvasTex((c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    });
    const beamTex = canvasTex((c, s) => {
      const g = c.createLinearGradient(0, s, 0, 0);
      g.addColorStop(0, 'rgba(255,224,150,0.9)'); g.addColorStop(0.45, 'rgba(255,206,120,0.32)'); g.addColorStop(1, 'rgba(255,206,120,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    });

    // ---- sky dome + sun ----
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color('#38538c') }, mid: { value: new THREE.Color('#e79a6a') }, bot: { value: new THREE.Color('#ffd79a') } },
      vertexShader: 'varying vec3 v; void main(){ v=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 v; void main(){ float h=max(normalize(v+vec3(0.,35.,0.)).y,0.0); vec3 c=h<0.28?mix(bot,mid,h/0.28):mix(mid,top,pow((h-0.28)/0.72,0.6)); gl_FragColor=vec4(c,1.0); }',
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), skyMat));

    // low, warm golden-hour sun
    const sunDir = new THREE.Vector3(0.5, 0.14, -0.85).normalize();
    const sun = new THREE.Mesh(new THREE.PlaneGeometry(96, 96),
      new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.0, 0.78, 0.5) }));
    sun.position.copy(sunDir).multiplyScalar(340); scene.add(sun);

    // ---- water: three.js Water (planar reflections) + a procedural ripple normal map ----
    const normalTex = (() => {
      const s = 256, cv = document.createElement('canvas'); cv.width = cv.height = s;
      const ctx = cv.getContext('2d')!; const img = ctx.createImageData(s, s);
      const Hf = (x: number, y: number) => {
        const fx = x / s * Math.PI * 2, fy = y / s * Math.PI * 2;
        return Math.sin(fx * 3) * 0.5 + Math.cos(fy * 4) * 0.4 + Math.sin((fx + fy) * 2 + 1.0) * 0.3 + Math.sin(fx * 6 - fy * 5) * 0.2;
      };
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const nx = Hf((x - 1 + s) % s, y) - Hf((x + 1) % s, y), ny = Hf(x, (y - 1 + s) % s) - Hf(x, (y + 1) % s);
        const len = Math.hypot(nx, ny, 1); const i = (y * s + x) * 4;
        img.data[i] = (nx / len * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / len * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; tracked.push(t); return t;
    })();
    let placeholder: THREE.Mesh | null = new THREE.Mesh(new THREE.PlaneGeometry(620, 620),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#123a4a') }));
    placeholder.rotation.x = -Math.PI / 2; scene.add(placeholder);
    let waterTime: { value: number } | null = null;
    (async () => {
      try {
        const { Water } = await import('three/examples/jsm/objects/Water.js' as string);
        const w = new Water(new THREE.PlaneGeometry(620, 620), {
          textureWidth: isTouch ? 256 : 512, textureHeight: isTouch ? 256 : 512,
          waterNormals: normalTex, sunDirection: sunDir.clone(),
          sunColor: 0xcf9a52, waterColor: 0x123c4e, distortionScale: 2.6, fog: true,
        });
        w.rotation.x = -Math.PI / 2;
        if (placeholder) { scene.remove(placeholder); placeholder.geometry.dispose(); (placeholder.material as THREE.Material).dispose(); placeholder = null; }
        scene.add(w); waterTime = w.material.uniforms['time'];
      } catch { /* keep flat placeholder */ }
    })();
    const surf = (t: number) => Math.sin(t * 1.4) * 0.13; // gentle bob on the (visually flat) water

    // ---- billboards (clay standees + scenery) ----
    const scenery: THREE.Mesh[] = [];
    const flat = (name: string, height: number, x: number, z: number, y = height / 2, bill = true) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(height * (ASPECT[name] || 1), height),
        new THREE.MeshBasicMaterial({ map: tex(name), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
      m.position.set(x, y, z); scene.add(m); if (bill) scenery.push(m); return m;
    };
    flat('hq', 26, -46, -40);
    flat('garden', 12, 54, -34, 5); flat('garden', 10, 48, -30, 4); flat('seedwave', 8, 60, -30, 4);
    flat('family', 17, 0, -86, 8.5);
    flat('seedwave', 7, -9, -83, 3.6); flat('seedwave', 6.4, 10, -84, 3.3);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2, R = 96 + (i % 3) * 8, hgt = 12 + (i % 4) * 3;
      flat('pine', hgt, Math.cos(a) * R, Math.sin(a) * R - 20, hgt / 2);
    }
    for (let i = 0; i < 6; i++) { const a = (-0.5 + i / 5) * 1.7; flat('mountains', 70, Math.sin(a) * 150, -Math.cos(a) * 150 - 30, 22); }
    flat('sailboat', 8, 34, -14, 4);

    const clouds: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i++) {
      const s = 16 + Math.random() * 20;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.62),
        new THREE.MeshBasicMaterial({ map: puff, transparent: true, depthWrite: false, opacity: 0.9 }));
      m.position.set(-150 + Math.random() * 300, 46 + Math.random() * 44, -150 + Math.random() * 220);
      m.renderOrder = 2; scene.add(m); clouds.push(m);
    }

    // ---- collectibles ----
    type Coin = { grp: THREE.Group; halo: THREE.Mesh; beam: THREE.Mesh; x: number; z: number; got: boolean; ph: number };
    const coins: Coin[] = [];
    for (let i = 0; i < TOTAL_SEEDS; i++) {
      const a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 60;
      const x = Math.cos(a) * r, z = Math.sin(a) * r - 20;
      const grp = new THREE.Group();
      const seed = new THREE.Mesh(new THREE.PlaneGeometry(4 * ASPECT.seedwave, 4),
        new THREE.MeshBasicMaterial({ map: tex('seedwave'), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
      seed.position.y = 2.4;
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(5, 5),
        new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(0.5, 0.45, 0.24) }));
      halo.position.y = 2.4;
      grp.add(halo, seed); grp.position.set(x, 0, z); scene.add(grp);
      // navigation beam of light rising from the seed, visible across the whole lake
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 80),
        new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.0, 0.82, 0.42) }));
      beam.position.set(x, 38, z); beam.renderOrder = 3; scene.add(beam);
      coins.push({ grp, halo, beam, x, z, got: false, ph: Math.random() * 6 });
    }

    // ---- player: the seaplane ----
    const ski = flat('seaplane', 10, 0, 0, 12, false);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(13, 8),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.45 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.06; scene.add(shadow);

    type P = { m: THREE.Mesh; life: number; vx: number; vy: number; vz: number };
    const mkPool = (n: number, size: number, mat: THREE.MeshBasicMaterial): P[] => {
      const arr: P[] = [];
      for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat.clone()); m.visible = false; m.renderOrder = 4; scene.add(m); arr.push({ m, life: 0, vx: 0, vy: 0, vz: 0 }); }
      return arr;
    };
    const spray = mkPool(48, 2.6, new THREE.MeshBasicMaterial({ map: puff, transparent: true, depthWrite: false, opacity: 0.9 }));
    const gold = mkPool(24, 3.2, new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.0, 0.8, 0.36) }));
    let sprayNext = 0, goldNext = 0;

    // ---- audio (procedural, unlocked on Play) ----
    let ac: AudioContext | null = null, master: GainNode | null = null, eng: OscillatorNode | null = null,
      engGain: GainNode | null = null, engFilt: BiquadFilterNode | null = null;
    const initAudio = () => {
      if (ac) return;
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ac = new AC(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
      const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const noise = ac.createBufferSource(); noise.buffer = buf; noise.loop = true;
      const nf = ac.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 380;
      const ng = ac.createGain(); ng.gain.value = 0.06; noise.connect(nf).connect(ng).connect(master); noise.start();
      eng = ac.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 60;
      engFilt = ac.createBiquadFilter(); engFilt.type = 'lowpass'; engFilt.frequency.value = 500;
      engGain = ac.createGain(); engGain.gain.value = 0; eng.connect(engFilt).connect(engGain).connect(master); eng.start();
    };
    const chime = (n = 0) => {
      if (!ac || !master) return;
      const base = 620 + Math.min(n, 8) * 70;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(base, ac.currentTime); o.frequency.exponentialRampToValueAtTime(base * 1.5, ac.currentTime + 0.12);
      g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.3);
      o.connect(g).connect(master); o.start(); o.stop(ac.currentTime + 0.32);
    };

    // ---- input ----
    const keys = new Set<string>();
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'shift', ' '].includes(k)) {
        if (down) keys.add(k); else keys.delete(k);
        if (k.startsWith('arrow') || k === ' ') e.preventDefault();
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true), ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

    const joy = { x: 0, y: 0, active: false };
    const joyEl = joyRef.current;
    const knob = joyEl?.querySelector<HTMLElement>('.knob');
    if (joyEl) {
      const rad = 44;
      const move = (cx: number, cy: number) => {
        const r = joyEl.getBoundingClientRect(); let dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
        const len = Math.hypot(dx, dy); if (len > rad) { dx = dx / len * rad; dy = dy / len * rad; }
        joy.x = dx / rad; joy.y = dy / rad; if (knob) knob.style.transform = `translate(${dx}px,${dy}px)`;
      };
      joyEl.addEventListener('pointerdown', (e) => { joy.active = true; joyEl.setPointerCapture(e.pointerId); move(e.clientX, e.clientY); });
      joyEl.addEventListener('pointermove', (e) => { if (joy.active) move(e.clientX, e.clientY); });
      const end = () => { joy.active = false; joy.x = 0; joy.y = 0; if (knob) knob.style.transform = 'translate(0,0)'; };
      joyEl.addEventListener('pointerup', end); joyEl.addEventListener('pointercancel', end);
    }

    // ---- game state ----
    let playing = false;
    let px = 0, pz = 0, py = 16, vy = 0, heading = 0, speed = 0, roll = 0, pitch = 0, orbit = 0;
    let onWater = false, boostAmt = 0, shake = 0;
    let seedN = 0, activeLm: string | null = null, over = false, comboN = 0, lastGot = -99;

    api.current.start = () => { playing = true; initAudio(); };
    api.current.setMuted = (m: boolean) => { if (master) master.gain.value = m ? 0 : 0.5; };

    const fwd = new THREE.Vector3(), camGoal = new THREE.Vector3(), lookGoal = new THREE.Vector3(), cur = new THREE.Vector3(), tgtDir = new THREE.Vector3();
    const clock = new THREE.Clock();
    let raf = 0, first = true;
    const speedEl = root.querySelector<HTMLElement>('.speedlines');
    const addShake = (a: number) => { shake = Math.max(shake, a); };
    const goldBurst = (x: number, y: number, z: number) => {
      for (let i = 0; i < 9; i++) { const p = gold[goldNext % gold.length]; goldNext++; const a = Math.random() * 6.283, s = 7 + Math.random() * 9;
        p.m.visible = true; p.life = 1; p.m.position.set(x, y, z); p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s; p.vy = 7 + Math.random() * 9; }
    };
    const splash = (x: number, z: number) => {
      for (let i = 0; i < 14; i++) { const p = spray[sprayNext % spray.length]; sprayNext++; const a = Math.random() * 6.283, s = 5 + Math.random() * 9;
        p.m.visible = true; p.life = 1.2; p.m.position.set(x, 1.6, z); p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s; p.vy = 7 + Math.random() * 7; }
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      if (waterTime) waterTime.value += dt * 0.55;

      let thr = 0, turn = 0;
      if (keys.has('w') || keys.has('arrowup')) thr += 1;
      if (keys.has('s') || keys.has('arrowdown')) thr -= 1;
      if (keys.has('a') || keys.has('arrowleft')) turn -= 1;
      if (keys.has('d') || keys.has('arrowright')) turn += 1;
      if (joy.active) { thr += -joy.y; turn += joy.x; }
      thr = Math.max(-1, Math.min(1, thr)); turn = Math.max(-1, Math.min(1, turn));
      const boost = playing && (keys.has('shift') || keys.has(' '));

      if (playing) {
        boostAmt += ((boost ? 1 : 0) - boostAmt) * Math.min(1, dt * 4);
        const cruise = 30 + boostAmt * 26;                 // 30..56
        speed += (cruise - speed) * Math.min(1, dt * 1.3);
        heading -= turn * 1.85 * dt;                        // steer at any speed
        roll += ((-turn * 0.55) - roll) * Math.min(1, dt * 6);
        if (onWater) {
          py = 2.6 + surf(t); vy = 0;
          if (thr > 0.2 && speed > 33) { onWater = false; vy = 15; addShake(0.25); }   // take off
        } else {
          vy += thr * 30 * dt - 8 * dt;                     // climb / dive + gentle sink
          vy = Math.max(-42, Math.min(34, vy));
          py += vy * dt;
          if (py <= 2.6) { py = 2.6; if (vy < -6) { splash(px, pz); addShake(Math.min(0.7, -vy * 0.02)); } vy = 0; onWater = true; }  // land on water
          py = Math.min(py, 68);
        }
        pitch += ((onWater ? 0 : Math.max(-0.42, Math.min(0.42, vy * 0.013))) - pitch) * Math.min(1, dt * 5);
        fwd.set(Math.sin(heading), 0, -Math.cos(heading));
        px += fwd.x * speed * dt; pz += fwd.z * speed * dt;
        const rr = Math.hypot(px, pz); if (rr > 120) { px = px / rr * 120; pz = pz / rr * 120; }
      } else { orbit += dt * 0.06; }

      // seaplane transform (billboard yaw-to-camera + pitch + bank)
      ski.position.set(px, py, pz);
      ski.rotation.set(pitch, Math.atan2(camera.position.x - px, camera.position.z - pz), roll);
      const alt = Math.max(0, (py - 2.6) / 60);
      shadow.position.set(px, 0.08, pz);
      const ssc = 1 + alt * 3; shadow.scale.set(ssc, ssc, 1);
      (shadow.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - Math.min(alt, 1));

      // wake spray while taxiing on the water
      if (playing && onWater && speed > 8 && !reduce) {
        const p = spray[sprayNext % spray.length]; sprayNext++;
        p.m.visible = true; p.life = 1;
        p.m.position.set(px - fwd.x * 5 + (Math.random() - 0.5) * 3, 1.6, pz - fwd.z * 5 + (Math.random() - 0.5) * 3);
        p.vx = -fwd.x * 2 + (Math.random() - 0.5) * 5; p.vz = -fwd.z * 2 + (Math.random() - 0.5) * 5; p.vy = 5 + Math.random() * 4;
      }
      for (const p of spray) {
        if (p.life <= 0) continue;
        p.life -= dt * 1.5; if (p.life <= 0) { p.m.visible = false; continue; }
        p.vy -= 12 * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
        p.m.quaternion.copy(camera.quaternion); p.m.scale.setScalar((2 - p.life) * 1.8);
        (p.m.material as THREE.MeshBasicMaterial).opacity = p.life * 0.5;
      }
      for (const p of gold) {
        if (p.life <= 0) continue;
        p.life -= dt * 1.4; if (p.life <= 0) { p.m.visible = false; continue; }
        p.vy -= 10 * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
        p.m.quaternion.copy(camera.quaternion); p.m.scale.setScalar(1 + (1 - p.life) * 2.4);
        (p.m.material as THREE.MeshBasicMaterial).opacity = p.life;
      }

      // chase camera (flight)
      if (playing) {
        fwd.set(Math.sin(heading), 0, -Math.cos(heading));
        const cd = 18 + boostAmt * 4;
        camGoal.set(px - fwd.x * cd, py + 6 - pitch * 8, pz - fwd.z * cd);
        lookGoal.set(px + fwd.x * 10, py + 1.5 + pitch * 10, pz + fwd.z * 10);
        camera.position.lerp(camGoal, Math.min(1, dt * 3.6));
        camera.getWorldDirection(cur);
        tgtDir.copy(lookGoal).sub(camera.position).normalize();
        cur.lerp(tgtDir, Math.min(1, dt * 4.5));
        camera.lookAt(cur.add(camera.position));
        const fov = 56 + boostAmt * 10 + Math.min(speed / 56, 1) * 4;
        camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix();
        camera.rotateZ(roll * 0.22);
      } else {
        camera.position.set(Math.cos(orbit) * 82, 30, Math.sin(orbit) * 82 - 18);
        camera.lookAt(0, 8, -30);
      }
      if (shake > 0.002) { camera.position.x += (Math.random() - 0.5) * shake * 2; camera.position.y += (Math.random() - 0.5) * shake * 2; shake *= (1 - Math.min(1, dt * 5)); }

      for (const cl of clouds) cl.quaternion.copy(camera.quaternion);
      for (const m of scenery) m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z);

      for (const c of coins) {
        if (c.got) continue;
        c.grp.position.y = 2.6 + surf(t) + Math.sin(t * 2 + c.ph) * 0.5;
        c.grp.rotation.y += dt * 1.6;
        c.halo.quaternion.copy(camera.quaternion);
        c.beam.rotation.y = Math.atan2(camera.position.x - c.x, camera.position.z - c.z);
        (c.beam.material as THREE.MeshBasicMaterial).opacity = 0.42 + Math.sin(t * 3 + c.ph) * 0.14;
        if (playing && Math.hypot(px - c.x, pz - c.z) < 6.5) {
          c.got = true; c.grp.visible = false; c.beam.visible = false; seedN++; setSeeds(seedN);
          comboN = (t - lastGot < 3.2) ? comboN + 1 : 1; lastGot = t; setCombo(comboN);
          chime(comboN); goldBurst(px, py, pz); addShake(0.35);
          if (seedN >= TOTAL_SEEDS && !over) { over = true; setWon(true); setTimeout(() => setShowCta(true), 1600); }
        }
      }

      if (playing) {
        let near: Landmark | null = null;
        for (const lm of LANDMARKS) if (Math.hypot(px - lm.x, pz - lm.z) < lm.r) { near = lm; break; }
        const key = near ? near.key : null;
        if (key !== activeLm) { activeLm = key; setLandmark(near); }
      }
      if (speedEl) speedEl.classList.toggle('on', boost && speed > 40);

      if (engGain && engFilt && eng) {
        const sp = Math.min(speed / 56, 1);
        engGain.gain.value += ((playing ? 0.06 + sp * 0.14 : 0) - engGain.gain.value) * Math.min(1, dt * 6);
        eng.frequency.value = 70 + sp * 120; engFilt.frequency.value = 500 + sp * 1600;
      }

      (composer ? composer.render() : renderer.render(scene, camera));
      if (first) { first = false; setReady(true); }
    };
    frame();

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight;
      renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
      composer?.setSize(W, H);
    };
    window.addEventListener('resize', onResize);
    const onVis = () => { if (document.hidden) cancelAnimationFrame(raf); else { clock.getDelta(); frame(); } };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis);
      document.body.style.overflow = '';
      try { eng?.stop(); ac?.close(); } catch { /* noop */ }
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose();
      });
      tracked.forEach((x) => x.dispose()); renderer.dispose();
    };
  }, []);

  function play() { setStarted(true); api.current.start(); }
  function toggleMute() { const m = !muted; setMuted(m); api.current.setMuted(m); }

  async function plant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, data = new FormData(form);
    const name = String(data.get('name') || '').trim(), email = String(data.get('email') || '').trim(), idea = String(data.get('idea') || '').trim();
    if (!email.includes('@')) { setStatus('error'); setMsg('A real email, please.'); return; }
    setStatus('sending'); setMsg('');
    try {
      const res = await fetch('/api/world/plant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, idea }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { setStatus('done'); setMsg(j.message || 'It is planted. Check your inbox.'); form.reset(); }
      else { setStatus('error'); setMsg(j.error || 'Something went sideways. Try again.'); }
    } catch { setStatus('error'); setMsg('Network hiccup. Try again.'); }
  }

  if (noWebgl) {
    return (
      <div className="world-fallback bg-[#0b1a28]">
        <div className="fb-hero" style={{ backgroundImage: 'url(/world/scene-hero.webp)' }}>
          <div className="text-center px-6" style={{ background: 'rgba(8,12,22,.4)', padding: '3rem 2rem', borderRadius: 20 }}>
            <h1 className="font-display font-extrabold text-white text-5xl md:text-7xl leading-none drop-shadow-[0_6px_30px_rgba(0,0,0,0.5)]">The Mustard Seed World</h1>
            <p className="font-sans text-white/90 text-lg mt-5 max-w-lg mx-auto">A studio on the shore of Flathead Lake that builds apps, websites, and AI tools.</p>
            <Link href="/build-queue" className="inline-block mt-7 font-mono font-bold uppercase tracking-wider text-[#161616] bg-gold-400 border-2 border-[#161616] rounded-lg px-6 py-3.5 shadow-[4px_4px_0_0_#161616]">Plant your seed 🌱</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-root" ref={rootRef}>
      <canvas ref={canvasRef} className="game-canvas" />
      <div className="game-vignette" />
      <div className="game-warm" />
      <div className="game-grain" />
      <div className="speedlines" />

      <div className="hud" style={{ opacity: started ? 1 : 0, transition: 'opacity .6s' }}>
        <div className="hud-top">
          <Link href="/" className="hud-brand"><img src="/mascot.png" alt="" /> Modern Mustard Seed</Link>
          <div className="hud-right">
            <button className="hud-chip" style={{ cursor: 'pointer', background: '#F5B700', color: '#161616', border: '2px solid #161616', fontFamily: '"JetBrains Mono",monospace', textTransform: 'uppercase', letterSpacing: '.05em' }} onClick={() => setShowCta(true)}>🌱 Plant your seed</button>
            <button className="hud-btn" onClick={toggleMute} aria-label="Toggle sound">{muted ? '🔇' : '🔊'}</button>
          </div>
        </div>
        <div className="objective">{won ? 'You did it. Now plant your own.' : `Fly through the light beams  ·  ${seeds}/${TOTAL_SEEDS}`}</div>
        <div className="hud-seeds"><span style={{ fontSize: 26 }}>🌱</span><span className="seed-count">{seeds}<small>/{TOTAL_SEEDS}</small></span>{combo > 1 && <span className="combo">🔥 x{combo}</span>}</div>

        <div className={`landmark${landmark ? ' show' : ''}`}>
          {landmark && (<>
            <div className="lm-eyebrow">{landmark.eyebrow}</div>
            <h3>{landmark.title}</h3>
            <p>{landmark.body}</p>
          </>)}
        </div>

        <div className="controls-hint"><b>W A S D</b> to fly · <b>S</b> dive to land · <b>Shift</b> boost</div>
        <div className="joystick" ref={joyRef}><div className="knob" /></div>
      </div>

      <div className={`title-card${started ? ' hide' : ''}`}>
        <div className="tc-eyebrow">Modern Mustard Seed</div>
        <h1>The Mustard<br />Seed World</h1>
        <p className="tc-sub">Fly a little clay seaplane over Flathead Lake, land on the golden water, and chase down the light beams.</p>
        <button className="play-btn" onClick={play} disabled={!ready}>{ready ? '▶  Take off' : 'Loading…'}</button>
        <div className="tc-controls">Fly with <b>W A S D</b> or arrows · <b>Shift</b> to boost · dive to touch the water</div>
      </div>

      <div className={`cta-panel${showCta ? ' show' : ''}`}>
        <div className="cta-card">
          <button className="hud-btn" style={{ position: 'absolute', top: -8, right: -8, zIndex: 2 }} onClick={() => setShowCta(false)} aria-label="Close">✕</button>
          <p className="font-mono text-[11px] text-gold-bright font-bold uppercase tracking-[0.28em] mb-3 text-center">Your turn</p>
          <h2 className="font-display font-extrabold text-white leading-[1.0] text-4xl md:text-6xl text-center drop-shadow-[0_6px_34px_rgba(0,0,0,0.5)]">Plant your seed.</h2>
          <p className="font-sans text-white/90 text-base mt-3 mb-6 text-center">Tell us what you want to grow. Sarah reads every one and usually replies the same day.</p>
          {status === 'done' ? (
            <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-7 text-center">
              <div className="text-4xl mb-2">🌱</div>
              <p className="font-display font-extrabold text-2xl text-[#161616]">It is planted.</p>
              <p className="font-sans text-[#3a3a3a] mt-1">{msg}</p>
              <Link href="/work" className="inline-block mt-4 font-mono text-xs font-bold uppercase tracking-wider text-pop-blue underline underline-offset-4">See what we have grown →</Link>
            </div>
          ) : (
            <form onSubmit={plant} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-6 md:p-7 text-left">
              <div className="grid sm:grid-cols-2 gap-3">
                <input name="name" placeholder="Your name" className="font-sans w-full rounded-lg border-2 border-[#161616] px-4 py-3 text-[#161616] placeholder-[#8a8a8a] focus:outline-none focus:ring-2 focus:ring-gold-400" />
                <input name="email" type="email" required placeholder="you@business.com" className="font-sans w-full rounded-lg border-2 border-[#161616] px-4 py-3 text-[#161616] placeholder-[#8a8a8a] focus:outline-none focus:ring-2 focus:ring-gold-400" />
              </div>
              <input name="idea" placeholder="What do you want to grow?" className="font-sans w-full mt-3 rounded-lg border-2 border-[#161616] px-4 py-3 text-[#161616] placeholder-[#8a8a8a] focus:outline-none focus:ring-2 focus:ring-gold-400" />
              <button type="submit" disabled={status === 'sending'} className="mt-4 w-full font-mono font-bold uppercase tracking-wider text-[#161616] bg-gold-400 border-2 border-[#161616] rounded-lg px-5 py-3.5 shadow-[4px_4px_0_0_#161616] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
                {status === 'sending' ? 'Planting…' : 'Plant it 🌱'}
              </button>
              {status === 'error' && <p className="font-sans text-pop-red text-sm mt-3">{msg}</p>}
              <p className="font-sans text-[13px] text-[#5a5a5a] mt-4">Ready to go all in? <Link href="/build-queue" className="text-pop-blue font-semibold underline underline-offset-2">Start a full project →</Link></p>
            </form>
          )}
        </div>
      </div>

      {!ready && <div className="tc-loading">WARMING UP THE PROPELLER…</div>}
    </div>
  );
}
