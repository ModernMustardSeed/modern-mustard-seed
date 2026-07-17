'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import './world.css';

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// texture aspect (w/h) for each clay cutout
const ASPECT: Record<string, number> = {
  cloud: 1.333, mountains: 1.778, hq: 1.0, family: 1.406, jetski: 1.25,
  sailboat: 1.0, garden: 1.778, pine: 0.75, seedwave: 0.818, water: 1.778,
};

export default function WorldExperience() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [noWebgl, setNoWebgl] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch {
      setNoWebgl(true);
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.6 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(isMobile ? 70 : 58, 1, 0.1, 600);
    scene.fog = new THREE.Fog(0xdfeef0, 42, 240);

    const loader = new THREE.TextureLoader();
    const tracked: THREE.Texture[] = [];
    const tex = (name: string) => {
      const t = loader.load(`/world/${name}.png`);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      tracked.push(t);
      return t;
    };

    // ---- sky dome (vertical gradient, colors lerp dawn -> dusk) ----
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color('#6fb3e0') }, bottom: { value: new THREE.Color('#eaf1ea') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 top; uniform vec3 bottom; varying vec3 vP;' +
        'void main(){ float h = pow(max(normalize(vP + vec3(0.0,30.0,0.0)).y, 0.0), 0.72); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }',
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(360, 32, 16), skyMat);
    scene.add(sky);

    const SKY_STOPS = [
      { p: 0.0, top: '#6fb3e0', bottom: '#e9f1ea' },
      { p: 0.32, top: '#4d9bde', bottom: '#d3e8f3' },
      { p: 0.56, top: '#7cb4dd', bottom: '#ffedcb' },
      { p: 0.8, top: '#eaa257', bottom: '#ffd79c' },
      { p: 1.0, top: '#39335f', bottom: '#dd8a5c' },
    ];
    const cA = new THREE.Color(), cB = new THREE.Color(), cC = new THREE.Color(), cD = new THREE.Color();
    const skyAt = (p: number) => {
      let i = 0; while (i < SKY_STOPS.length - 2 && p > SKY_STOPS[i + 1].p) i++;
      const a = SKY_STOPS[i], b = SKY_STOPS[i + 1];
      const t = clamp((p - a.p) / (b.p - a.p));
      cA.set(a.top).lerp(cB.set(b.top), t);
      cC.set(a.bottom).lerp(cD.set(b.bottom), t);
      (skyMat.uniforms.top.value as THREE.Color).copy(cA);
      (skyMat.uniforms.bottom.value as THREE.Color).copy(cC);
      (scene.fog as THREE.Fog).color.copy(cC);
    };

    // ---- helpers to build clay standees + soft sprites ----
    const standees: { m: THREE.Mesh; base: THREE.Vector3; bobA?: number; bobS?: number; ph?: number }[] = [];
    const sprites: { m: THREE.Mesh; base: THREE.Vector3; kind: string; sp?: number; ph?: number }[] = [];

    const canvasTex = (draw: (c: CanvasRenderingContext2D, s: number) => void, size = 128) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = size;
      const ctx = cv.getContext('2d')!; draw(ctx, size);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; tracked.push(t); return t;
    };
    const puffTex = canvasTex((c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.5, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    });
    const sunTex = canvasTex((c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,250,230,1)'); g.addColorStop(0.35, 'rgba(255,232,160,0.9)'); g.addColorStop(1, 'rgba(255,220,140,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    });
    const birdTex = canvasTex((c, s) => {
      c.clearRect(0, 0, s, s); c.strokeStyle = 'rgba(40,40,50,0.85)'; c.lineWidth = s * 0.06; c.lineCap = 'round';
      c.beginPath(); c.moveTo(s * 0.15, s * 0.55); c.quadraticCurveTo(s * 0.4, s * 0.35, s * 0.5, s * 0.55);
      c.quadraticCurveTo(s * 0.6, s * 0.35, s * 0.85, s * 0.55); c.stroke();
    });

    const flat = (name: string, height: number, pos: [number, number, number],
      opts: { bill?: boolean; bob?: number; color?: string } = {}) => {
      const t = tex(name); const w = height * (ASPECT[name] || 1);
      const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
      if (opts.color) mat.color = new THREE.Color(opts.color);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, height), mat);
      m.position.set(pos[0], pos[1], pos[2]);
      scene.add(m);
      standees.push({ m, base: m.position.clone(), bobA: opts.bob, bobS: opts.bob ? 0.6 + Math.random() * 0.5 : 0, ph: Math.random() * 6 });
      (m as THREE.Mesh & { _bill?: boolean })._bill = opts.bill;
      return m;
    };
    const softSprite = (t: THREE.Texture, size: number, pos: [number, number, number], kind: string,
      opts: { color?: string; sp?: number; opacity?: number } = {}) => {
      const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: kind !== 'sun',
        color: new THREE.Color(opts.color || '#ffffff'), opacity: opts.opacity ?? 1, blending: kind === 'sun' ? THREE.AdditiveBlending : THREE.NormalBlending });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      m.position.set(pos[0], pos[1], pos[2]); m.renderOrder = 20; scene.add(m);
      sprites.push({ m, base: m.position.clone(), kind, sp: opts.sp, ph: Math.random() * 6 });
      return m;
    };

    // ---- ground + water ----
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 500),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#83a05c') }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.2, -70); scene.add(ground);

    const waterTex = tex('water'); waterTex.wrapS = waterTex.wrapT = THREE.MirroredRepeatWrapping; waterTex.repeat.set(3, 3);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 90),
      new THREE.MeshBasicMaterial({ map: waterTex, color: new THREE.Color('#8fb6d8') }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.02, -34); scene.add(water);

    // ---- the world (a continuous lakeshore laid out along -Z) ----
    // mountains: far backdrop, fixed facing camera origin
    flat('mountains', 78, [0, 24, -120]); flat('mountains', 64, [-96, 20, -128]); flat('mountains', 70, [98, 22, -132]);
    // headquarters on the shore
    flat('hq', 24, [-17, 12, -74], { bill: true });
    // pines scattered on the shores + mountainsides
    ([[-34, -78], [30, -86], [-26, -62], [40, -96], [-46, -108], [22, -112], [-14, -120], [52, -120]] as [number, number][])
      .forEach(([x, z], i) => flat('pine', 12 + (i % 3) * 3, [x, (12 + (i % 3) * 3) / 2 - 0.2, z], { bill: true }));
    // gardens near the path
    flat('garden', 11, [-11, 5, -92], { bill: true }); flat('garden', 12, [15, 5.5, -98], { bill: true });
    flat('garden', 9, [2, 4.5, -103], { bill: true });
    // the crew on the shore (destination) + a couple of hopping sprout-kids
    flat('family', 16, [0, 8, -113], { bill: true });
    flat('seedwave', 7, [-9, 3.6, -107], { bill: true, bob: 1.1 });
    flat('seedwave', 6.4, [10, 3.3, -109], { bill: true, bob: 1.3 });
    // lake play: sailboat + jet ski, gently bobbing
    flat('sailboat', 7.5, [19, 3.6, -30], { bill: true, bob: 0.5 });
    const jetski = flat('jetski', 7, [-15, 2.9, -22], { bill: true, bob: 0.7 });

    // ---- soft life: clouds, sun, birds, spray, smoke ----
    const clouds: { m: THREE.Mesh; base: THREE.Vector3; sp: number }[] = [];
    for (let i = 0; i < (isMobile ? 8 : 14); i++) {
      const x = -70 + Math.random() * 140, y = 26 + Math.random() * 34, z = 30 - Math.random() * 110;
      const s = 12 + Math.random() * 16;
      const m = softSprite(puffTex, s, [x, y, z], 'cloud', { opacity: 0.85 });
      clouds.push({ m, base: m.position.clone(), sp: 0.8 + Math.random() * 1.6 });
    }
    softSprite(sunTex, 120, [70, 96, -180], 'sun', { opacity: 0.95 });
    const birds: { m: THREE.Mesh; base: THREE.Vector3; sp: number; ph: number }[] = [];
    if (!reduce) for (let i = 0; i < (isMobile ? 3 : 6); i++) {
      const m = softSprite(birdTex, 2.2, [-40 + Math.random() * 80, 30 + Math.random() * 18, -30 - Math.random() * 70], 'bird', { opacity: 0.9 });
      birds.push({ m, base: m.position.clone(), sp: 3 + Math.random() * 3, ph: Math.random() * 6 });
    }
    // jet-ski spray + chimney smoke
    const spray = softSprite(puffTex, 6, [-15, 2.4, -20], 'spray', { opacity: 0.85 });
    const smokes: { m: THREE.Mesh; ph: number }[] = [];
    for (let i = 0; i < 4; i++) smokes.push({ m: softSprite(puffTex, 3.4, [-14, 20 + i * 3, -74], 'smoke', { color: '#e9e2d4', opacity: 0.5 }), ph: i * 1.5 });

    // ---- camera path ----
    const camPos = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 60, 48), new THREE.Vector3(-5, 44, 22), new THREE.Vector3(-8, 18, -6),
      new THREE.Vector3(7, 15, -32), new THREE.Vector3(-6, 13, -54), new THREE.Vector3(4, 11, -72),
      new THREE.Vector3(0, 10, -83), new THREE.Vector3(0, 10, -86),
    ]);
    const camTgt = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 36, 12), new THREE.Vector3(3, 22, -14), new THREE.Vector3(6, 6, -38),
      new THREE.Vector3(-6, 8, -58), new THREE.Vector3(2, 6, -74), new THREE.Vector3(-2, 6, -95),
      new THREE.Vector3(0, 6, -110), new THREE.Vector3(0, 6, -112),
    ]);
    const pos = new THREE.Vector3(), tgt = new THREE.Vector3();

    // ---- overlay beats + cta ----
    const beats = Array.from(root.querySelectorAll<HTMLElement>('.beat'));
    const ctaEl = root.querySelector<HTMLElement>('.world-cta');
    const formEl = root.querySelector<HTMLElement>('.world-cta form');
    const progress = root.querySelector<HTMLElement>('.world-progress');
    const hint = root.querySelector<HTMLElement>('.world-hint');

    // ---- sizing ----
    const resize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    resize();

    // ---- scroll -> target progress ----
    let targetP = 0;
    let visible = true;
    const onScroll = () => {
      const r = root.getBoundingClientRect();
      targetP = clamp(-r.top / (root.offsetHeight - window.innerHeight));
      visible = r.bottom > 0 && r.top < window.innerHeight;
    };
    onScroll();

    let dp = targetP;
    const clock = new THREE.Clock();
    let raf = 0; let first = true;

    const tmp = new THREE.Vector3();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      dp += (targetP - dp) * (reduce ? 1 : 0.07);
      if (!visible && Math.abs(targetP - dp) < 0.002 && !first) return; // idle when world is off-screen
      const t = clock.getElapsedTime();

      skyAt(dp);
      camPos.getPoint(dp, pos); camTgt.getPoint(dp, tgt);
      if (!reduce) { pos.x += Math.sin(t * 0.25) * 1.2; pos.y += Math.sin(t * 0.4) * 0.5; }
      camera.position.copy(pos); camera.lookAt(tgt); sky.position.copy(pos);

      // standees: y-billboard toward camera + bob
      for (const s of standees) {
        const m = s.m as THREE.Mesh & { _bill?: boolean };
        if (m._bill) m.rotation.y = Math.atan2(camera.position.x - s.base.x, camera.position.z - s.base.z);
        if (s.bobA && !reduce) m.position.y = s.base.y + Math.sin(t * (s.bobS || 1) + (s.ph || 0)) * s.bobA;
      }
      // soft sprites always face camera
      for (const s of sprites) s.m.quaternion.copy(camera.quaternion);
      if (!reduce) {
        for (const c of clouds) { c.m.position.x = c.base.x + Math.sin(t * 0.05 * c.sp + c.base.z) * 6; }
        for (const b of birds) { b.m.position.x = b.base.x + ((t * b.sp) % 90) - 45; b.m.scale.y = 0.7 + Math.abs(Math.sin(t * 6 + b.ph)) * 0.6; }
        waterTex.offset.x = t * 0.012; waterTex.offset.y = Math.sin(t * 0.2) * 0.01;
        if (jetski) { jetski.position.x = -15 + Math.sin(t * 0.6) * 5; spray.position.set(jetski.position.x + 3, 2.6 + Math.sin(t * 8) * 0.2, jetski.position.z + 1); (spray.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.abs(Math.sin(t * 5)) * 0.4; }
        for (const sm of smokes) { const u = ((t * 0.35 + sm.ph) % 4) / 4; sm.m.position.y = 20 + u * 12; (sm.m.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - u); sm.m.scale.setScalar(1 + u * 1.6); }
      }

      // overlay copy
      for (const b of beats) {
        const at = parseFloat(b.dataset.at || '0'), span = parseFloat(b.dataset.span || '0.1');
        b.style.opacity = String(clamp(1 - Math.abs(dp - at) / span));
      }
      if (ctaEl) {
        const o = smooth(0.86, 0.965, dp); ctaEl.style.opacity = String(o);
        if (formEl) formEl.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      }
      if (progress) progress.style.width = `${dp * 100}%`;
      if (hint) hint.style.opacity = String(clamp(1 - dp / 0.06));

      renderer.render(scene, camera);
      if (first) { first = false; setReady(true); }
    };
    frame();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);
    const onVis = () => { if (document.hidden) cancelAnimationFrame(raf); else { clock.getDelta(); frame(); } };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose()); else mat?.dispose();
      });
      tracked.forEach((t) => t.dispose());
      renderer.dispose();
    };
  }, []);

  async function plant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const idea = String(data.get('idea') || '').trim();
    if (!email.includes('@')) { setStatus('error'); setMsg('A real email, please.'); return; }
    setStatus('sending'); setMsg('');
    try {
      const res = await fetch('/api/world/plant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, idea }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) { setStatus('done'); setMsg(json.message || 'It is planted. Check your inbox.'); form.reset(); }
      else { setStatus('error'); setMsg(json.error || 'Something went sideways. Try again.'); }
    } catch { setStatus('error'); setMsg('Network hiccup. Try again.'); }
  }

  if (noWebgl) {
    return (
      <div className="world-fallback bg-[#0b1a28]">
        <div className="fb-hero" style={{ backgroundImage: 'url(/world/scene-hero.png)' }}>
          <div className="text-center px-6" style={{ background: 'rgba(8,12,22,.35)', padding: '3rem 2rem', borderRadius: 20 }}>
            <p className="font-mono text-xs tracking-[0.28em] text-gold-bright uppercase mb-4">Modern Mustard Seed</p>
            <h1 className="font-display font-extrabold text-white text-5xl md:text-7xl leading-none drop-shadow-[0_6px_30px_rgba(0,0,0,0.5)]">The Mustard Seed World</h1>
            <p className="font-sans text-white/90 text-lg mt-5 max-w-lg mx-auto">A studio on the shore of Flathead Lake that builds apps, websites, and AI tools.</p>
            <Link href="/build-queue" className="inline-block mt-7 font-mono font-bold uppercase tracking-wider text-[#161616] bg-gold-400 border-2 border-[#161616] rounded-lg px-6 py-3.5 shadow-[4px_4px_0_0_#161616]">Plant your seed 🌱</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="world" ref={rootRef} style={{ height: '760vh' }}>
      <div className="world-progress" />
      <div className="world-stage">
        <canvas ref={canvasRef} className="world-canvas" />

        <div className="world-overlay">
          <div className="beat" data-at="0.0" data-span="0.13">
            <p className="eyebrow text-[11px] md:text-xs text-white/85 font-bold uppercase mb-5">Modern Mustard Seed</p>
            <h1 className="font-display font-extrabold text-white leading-[0.95] tracking-tight text-[15vw] md:text-[8.5rem]">
              The Mustard<br />Seed World
            </h1>
            <p className="lead font-sans text-white/90 text-lg md:text-2xl mt-6 max-w-xl mx-auto">
              Fly into the little studio on the shore of Flathead Lake.
            </p>
          </div>

          <div className="beat" data-at="0.32" data-span="0.1">
            <p className="eyebrow text-[11px] text-gold-bright font-bold uppercase mb-4">The Lake</p>
            <h2 className="font-display font-extrabold text-white leading-[1.02] text-[9vw] md:text-6xl">We work where it feels like play.</h2>
            <p className="lead font-sans text-white/90 text-base md:text-xl mt-5 max-w-lg mx-auto">Big builds, handled from a jet ski. The best studios make the hard stuff look easy.</p>
          </div>

          <div className="beat" data-at="0.55" data-span="0.09">
            <p className="eyebrow text-[11px] text-gold-bright font-bold uppercase mb-4">Headquarters</p>
            <h2 className="font-display font-extrabold text-white leading-[1.02] text-[9vw] md:text-6xl">Where your app gets built.</h2>
            <p className="lead font-sans text-white/90 text-base md:text-xl mt-5 max-w-lg mx-auto">Apps, websites, and specialty AI tools. Shipped in weeks, not months, from a cabin with a rooftop garden.</p>
            <div className="flex flex-wrap gap-2.5 mt-6 justify-center">
              {['Apps', 'Websites', 'AI Tools'].map((c) => (
                <span key={c} className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#161616] bg-gold-bright border-2 border-[#161616] rounded-full px-3.5 py-1.5 shadow-[3px_3px_0_0_#161616]">{c}</span>
              ))}
            </div>
          </div>

          <div className="beat" data-at="0.72" data-span="0.08">
            <p className="eyebrow text-[11px] text-gold-bright font-bold uppercase mb-4">The Gardens</p>
            <h2 className="font-display font-extrabold text-white leading-[1.02] text-[9vw] md:text-6xl">We grow things that grow themselves.</h2>
            <p className="lead font-sans text-white/90 text-base md:text-xl mt-5 max-w-lg mx-auto">Lead engines, automations, and tools that keep working after we leave. Plant once, harvest for years.</p>
          </div>

          <div className="beat" data-at="0.84" data-span="0.07">
            <p className="eyebrow text-[11px] text-gold-bright font-bold uppercase mb-4">The Crew</p>
            <h2 className="font-display font-extrabold text-white leading-[1.02] text-[9vw] md:text-6xl">Run the whole thing from your phone.</h2>
            <p className="lead font-sans text-white/90 text-base md:text-xl mt-5 max-w-lg mx-auto">Systems so simple your business fits in your pocket. Even the dog gets a day off.</p>
          </div>
        </div>

        {/* CTA */}
        <div className="world-cta">
          <div className="world-cta-inner">
            <p className="eyebrow font-mono text-[11px] text-gold-bright font-bold uppercase tracking-[0.28em] mb-3 text-center">Your turn</p>
            <h2 className="font-display font-extrabold text-white leading-[1.0] text-[13vw] md:text-7xl text-center drop-shadow-[0_6px_34px_rgba(0,0,0,0.5)]">Plant your seed.</h2>
            <p className="lead font-sans text-white/90 text-base md:text-lg mt-4 mb-7 text-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">Tell us what you want to grow. Sarah reads every one and usually replies the same day.</p>

            {status === 'done' ? (
              <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-7 text-center pointer-events-auto">
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
                <button type="submit" disabled={status === 'sending'} className="mt-4 w-full font-mono font-bold uppercase tracking-wider text-[#161616] bg-gold-400 border-2 border-[#161616] rounded-lg px-5 py-3.5 shadow-[4px_4px_0_0_#161616] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60">
                  {status === 'sending' ? 'Planting…' : 'Plant it 🌱'}
                </button>
                {status === 'error' && <p className="font-sans text-pop-red text-sm mt-3">{msg}</p>}
                <p className="font-sans text-[13px] text-[#5a5a5a] mt-4">Ready to go all in? <Link href="/build-queue" className="text-pop-blue font-semibold underline underline-offset-2">Start a full project →</Link></p>
              </form>
            )}
          </div>
        </div>

        <div className="world-hint"><span>SCROLL TO FLY ↓</span></div>
        {!ready && <div className="world-loading" style={{ opacity: ready ? 0 : 1 }}>SHAPING THE CLAY…</div>}
      </div>
    </div>
  );
}
