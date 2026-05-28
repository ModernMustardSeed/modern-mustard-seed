'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * LuminousField: a fullscreen Three.js shader plane that paints an
 * atmospheric, drifting field of dawn-sky light blooms and twinkling
 * cloud-white embers against an aubergine void. Calm, never warm.
 */
export default function LuminousField() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(new THREE.Color('#1A1140'), 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        varying vec2 vUv;

        // Hash + value noise + FBM. Cheap, organic.
        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash21(i);
          float b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0));
          float d = hash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        // Twinkling ember layer. Stars on an invisible grid that pulse softly.
        float embers(vec2 p, float time) {
          vec2 grid = floor(p);
          vec2 cell = fract(p);
          float h = hash21(grid);
          // Only about 1 in 25 cells lights up
          if (h < 0.96) return 0.0;
          // Each ember has its own location, size, and phase
          vec2 pos = vec2(hash21(grid + 1.7), hash21(grid + 9.2));
          float d = distance(cell, pos);
          float size = 0.012 + hash21(grid + 4.4) * 0.018;
          float ember = smoothstep(size, 0.0, d);
          float phase = hash21(grid + 6.1) * 6.28;
          float pulse = 0.5 + 0.5 * sin(time * (0.6 + hash21(grid + 8.8) * 1.4) + phase);
          return ember * pulse;
        }

        void main() {
          vec2 uv = vUv;
          vec2 p = uv * 2.0 - 1.0;
          float aspect = uResolution.x / uResolution.y;
          p.x *= aspect;

          float t = uTime * 0.03;

          // Subtle mouse pull on the light source
          vec2 light = (uMouse - 0.5) * 0.6;
          light.x *= aspect;

          // Base aubergine void
          vec3 col = vec3(0.060, 0.040, 0.135);

          // Domain warp gives the blooms an organic motion
          vec2 q = vec2(
            fbm(p * 0.9 + vec2(t * 1.2, t * 0.8)),
            fbm(p * 0.9 + vec2(-t * 1.0, t * 1.4) + vec2(5.2, 1.3))
          );
          float bloom = fbm(p * 1.1 + q * 2.4 + light);

          // Dawn sky palette
          vec3 midSky    = vec3(0.310, 0.572, 0.847);  // #4F92D8
          vec3 cyanLight = vec3(0.498, 0.894, 0.769);  // #7FE4C5
          vec3 deepSky   = vec3(0.165, 0.353, 0.620);  // #2A5A9F

          // Low-frequency atmospheric deep-sky haze
          col += smoothstep(0.30, 0.85, bloom) * deepSky * 0.55;

          // Bright bloom highlights, dawn sky blue
          float peak = pow(smoothstep(0.55, 0.92, bloom), 2.0);
          col += peak * midSky * 0.55;
          col += pow(peak, 3.0) * cyanLight * 0.7;

          // Tiny twinkling embers, cool cloud-white
          float em = embers(p * 18.0 + vec2(0.0, t * 4.0), uTime);
          col += em * vec3(0.90, 0.94, 1.0) * 1.3;

          // Radial vignette pulls focus to center
          float vignette = 1.0 - smoothstep(0.4, 1.4, length(p));
          col *= mix(0.55, 1.0, vignette);

          // A very gentle film grain to break up banding on OLED screens
          float grain = (hash21(p * 800.0 + uTime) - 0.5) * 0.025;
          col += grain;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let mouseTargetX = 0.5;
    let mouseTargetY = 0.5;

    const onMouse = (e: MouseEvent) => {
      mouseTargetX = e.clientX / window.innerWidth;
      mouseTargetY = 1 - e.clientY / window.innerHeight;
    };
    window.addEventListener('mousemove', onMouse);

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const now = performance.now();
      uniforms.uTime.value = (now - start) / 1000;
      uniforms.uMouse.value.x += (mouseTargetX - uniforms.uMouse.value.x) * 0.04;
      uniforms.uMouse.value.y += (mouseTargetY - uniforms.uMouse.value.y) * 0.04;
      renderer.render(scene, camera);
      if (!prefersReducedMotion) raf = requestAnimationFrame(tick);
    };

    if (prefersReducedMotion) {
      // Render one frame and stop
      uniforms.uTime.value = 1.5;
      renderer.render(scene, camera);
    } else {
      tick();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize', onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
