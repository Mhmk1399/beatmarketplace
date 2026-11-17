"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const forms = ["Orbit", "Bloom", "Ribbon"];
type Sculpture = { dispose: () => void; setForm: (index: number) => number; cycleForm: () => number; pulse: () => void };

/** Vector art stays interactive when the optional GPU scene is unavailable. */
function fallbackPaths(form: number) {
  return Array.from({ length: 14 }, (_, ring) => Array.from({ length: 121 }, (_, point) => {
    const a = point / 120 * Math.PI * 2;
    const b = ring / 14 * Math.PI * 2;
    const radius = 112 + Math.cos(b) * 32;
    let x = Math.cos(a) * radius;
    let y = Math.sin(a) * radius * .64 + Math.sin(b) * 30;
    if (form === 1) {
      const bloom = 1 + .19 * Math.cos(a * 5 + b * .45);
      x *= bloom * .85;
      y = Math.sin(a) * radius * bloom * .88 + Math.sin(b) * 20;
    } else if (form === 2) {
      x = Math.cos(a) * (125 + Math.cos(b) * 15);
      y = Math.sin(a * 2) * 52 + Math.sin(b + a) * 30;
    }
    return `${point ? "L" : "M"}${(200 + x).toFixed(2)},${(200 + y).toFixed(2)}`;
  }).join(" ") + "Z");
}

export function FrequencyHero() {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Sculpture | null>(null);
  const formRef = useRef(0);
  const fallbackTapRef = useRef<{ x: number; y: number } | null>(null);
  const [webglReady, setWebglReady] = useState(false);
  const [form, setForm] = useState(0);
  const paths = useMemo(() => fallbackPaths(form), [form]);

  function selectForm(index: number) {
    const next = (index + forms.length) % forms.length;
    formRef.current = next;
    setForm(next);
    sceneRef.current?.setForm(next);
  }

  useEffect(() => {
    const host = hostRef.current;
    const stage = stageRef.current;
    if (!host || !stage) return;
    let alive = true;
    let started = false;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const device = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (device.connection?.saveData) return;
    function load() {
      if (!alive || started) return;
      started = true;
      void import("./FrequencyScene").then(({ createFrequencyScene }) => {
        if (!alive || !host || !stage) return;
        try {
          const scene = createFrequencyScene(host, {
            interactionTarget: stage,
            onState: (ready) => { if (alive) setWebglReady(ready); },
            onFormChange: (index) => { if (alive) { formRef.current = index; setForm(index); } },
          });
          sceneRef.current = scene;
          scene.setForm(formRef.current);
        } catch { setWebglReady(false); }
      }).catch(() => { /* The vector version remains available. */ });
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if ("requestIdleCallback" in window) idleId = window.requestIdleCallback(load, { timeout: 1400 });
      else timeoutId = setTimeout(load, 150);
    }, { rootMargin: "160px" });
    observer.observe(stage);
    return () => {
      alive = false;
      observer.disconnect();
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  function movePointer(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
    event.currentTarget.style.setProperty("--sculpt-x", String(x));
    event.currentTarget.style.setProperty("--sculpt-y", String(y));
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (["Enter", " ", "ArrowRight", "ArrowLeft"].includes(event.key)) {
      event.preventDefault();
      selectForm(formRef.current + (event.key === "ArrowLeft" ? -1 : 1));
    }
  }

  return <section className="frequency-hero" aria-label="Interactive sound sculpture">
    <div className="frequency-hero-halo" aria-hidden="true" />
    <div className="frequency-hero-panel neo-raised-strong" data-renderer={webglReady ? "webgl" : "vector"} data-form={form}>
      <header className="frequency-hero-heading">
        <div><p className="frequency-hero-eyebrow">Sound / Form</p><p className="frequency-hero-subtitle">A feeling you can shape.</p></div>
        <span className="frequency-hero-status"><span aria-hidden="true" />INTERACTIVE</span>
      </header>
      <div ref={stageRef} className="frequency-hero-stage" role="button" tabIndex={0} aria-label={`${forms[form]} sound sculpture. Move your pointer to bend it. Tap or press Enter to change form.`}
        onKeyDown={keyboard} onPointerMove={movePointer}
        onPointerDown={(event) => { if (event.isPrimary) fallbackTapRef.current = { x: event.clientX, y: event.clientY }; }}
        onPointerLeave={(event) => { event.currentTarget.style.setProperty("--sculpt-x", "0"); event.currentTarget.style.setProperty("--sculpt-y", "0"); }}
        onPointerCancel={() => { fallbackTapRef.current = null; }}
        onClick={(event) => {
          const tap = fallbackTapRef.current;
          fallbackTapRef.current = null;
          if (event.detail === 0 || (!sceneRef.current && tap && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < 12)) selectForm(formRef.current + 1);
        }}>
        <div className="frequency-hero-grid" aria-hidden="true" />
        <div className="frequency-hero-focus" aria-hidden="true" />
        <svg className="frequency-hero-vector" viewBox="0 0 400 400" fill="none" aria-hidden="true"><g transform="rotate(-24 200 200)">{paths.map((path, index) => <path key={index} d={path} stroke={index % 3 === 0 ? "var(--accent-bright)" : "var(--accent-text)"} strokeWidth={index % 3 === 0 ? "1.25" : ".7"} opacity={.3 + index / 35} />)}</g></svg>
        <div ref={hostRef} className="frequency-hero-renderer" aria-hidden="true" />
        <span className="frequency-hero-orbit-label frequency-hero-orbit-label-top" aria-hidden="true">MOVE / BEND</span>
        <span className="frequency-hero-orbit-label frequency-hero-orbit-label-bottom" aria-hidden="true">TAP / TRANSFORM</span>
        <span className="frequency-hero-form-mark" aria-hidden="true">0{form + 1}<small>/ 03</small></span>
      </div>
      <div className="frequency-hero-interaction-note"><span className="frequency-hero-gesture-icon" aria-hidden="true">✦</span><p><strong>Your movement. A new perspective.</strong><span>Move to bend. Tap to transform.</span></p><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 4 18 12l-6 1-2 6L8 4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="m16 17 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg></div>
      <div className="frequency-form-selector" aria-label="Sculpture forms">
        {forms.map((name, index) => <button key={name} type="button" onClick={() => selectForm(index)} aria-label={`Show ${name} form`} aria-pressed={form === index}><span aria-hidden="true">0{index + 1}</span>{name}<i aria-hidden="true" /></button>)}
      </div>
    </div>
    <p className="frequency-hero-caption">Made to be explored. Shaped by you.</p>
  </section>;
}
