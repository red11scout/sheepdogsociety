"use client";

import { useEffect, useRef } from "react";

/**
 * HeroAtmosphere — drifting embers (night) / dust motes in light (dawn)
 * on a single 2D canvas. This is the "alive" layer of the cinematic hero:
 * warm points of light rising slowly, twinkling, catching the eye without
 * ever demanding it. Reverent, not flashy.
 *
 * Cheap by construction: one canvas, additive blending, ~device-scaled
 * particle count, capped DPR. It pauses when scrolled out of view or the
 * tab is hidden, and renders nothing at all under prefers-reduced-motion
 * (the CSS light field alone carries the atmosphere). aria-hidden.
 */
export function HeroAtmosphere() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = false;

    type P = { x: number; y: number; r: number; vx: number; vy: number; t: number; ts: number };
    let parts: P[] = [];

    const isDark = () => document.documentElement.classList.contains("dark");

    const make = (): P => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.4,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -(Math.random() * 0.22 + 0.04),
      t: Math.random() * Math.PI * 2,
      ts: Math.random() * 0.03 + 0.012,
    });

    const seed = () => {
      const n = Math.min(72, Math.max(24, Math.round(w / 20)));
      parts = Array.from({ length: n }, make);
    };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const frame = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const dark = isDark();
      const rgb = dark ? "255, 205, 120" : "176, 138, 70";
      const base = dark ? 0.55 : 0.3;
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.t += p.ts;
        if (p.y < -12) {
          p.y = h + 12;
          p.x = Math.random() * w;
        }
        if (p.x < -12) p.x = w + 12;
        else if (p.x > w + 12) p.x = -12;
        const tw = 0.45 + 0.55 * Math.sin(p.t);
        const a = base * tw;
        const rad = p.r * 6;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        g.addColorStop(0, `rgba(${rgb}, ${a})`);
        g.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    let inView = false;
    const sync = () => {
      if (inView && !document.hidden) start();
      else stop();
    };

    const io = new IntersectionObserver(
      ([e]) => {
        inView = e.isIntersecting;
        sync();
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    const onVis = () => sync();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="nw-atmos" aria-hidden="true" />;
}
