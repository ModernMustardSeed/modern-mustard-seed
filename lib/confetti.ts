/**
 * Self-contained confetti burst, no dependency. A one-shot canvas overlay that
 * removes itself after the animation. Client-only (guards on window). Used for
 * the moments worth celebrating in the admin: a rep finishing onboarding, a new
 * client coming aboard.
 */
export function fireConfetti(): void {
  if (typeof window === 'undefined') return;
  const colors = ['#F5B700', '#E0301E', '#1E50C8', '#161616', '#FFD23F', '#FFFDF6'];
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }
  const N = 160;
  const parts = Array.from({ length: N }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 200,
    y: canvas.height / 3 + (Math.random() - 0.5) * 80,
    vx: (Math.random() - 0.5) * 14,
    vy: Math.random() * -14 - 4,
    size: Math.random() * 8 + 4,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  const DURATION = 2600;
  const tick = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fade = t > DURATION - 700 ? Math.max(0, (DURATION - t) / 700) : 1;
    for (const p of parts) {
      p.vy += 0.32; // gravity
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (t < DURATION) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}
