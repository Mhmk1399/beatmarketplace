import * as THREE from "three";

type BackdropOptions = { section: HTMLElement; motion: MediaQueryList; onState: (ready: boolean) => void };
export type HeroBackdropController = { dispose: () => void; syncMotion: () => void };

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uMorph;
  uniform float uPulse;
  uniform float uAspect;
  uniform float uMobile;
  uniform float uPixelRatio;
  uniform vec2 uPointer;
  attribute float aAlong;
  attribute float aAcross;
  attribute float aRibbon;
  attribute float aGlow;
  varying float vLight;
  varying float vTone;
  varying float vQuiet;
  varying float vCore;
  varying float vGlow;

  vec3 ribbonPath(float s, float ribbon) {
    float t = uTime * 0.13;
    float scrub = uScroll;
    float morph = uMorph;
    if (ribbon < 0.5) {
      float x = -1.35 + s * 2.7;
      float y = mix(-0.73, -0.84, uMobile) + sin(s * 5.7 - t + scrub * 2.3) * 0.17;
      y += sin(s * 11.0 + morph * 0.7 - scrub) * 0.045;
      y += scrub * 0.12 - uPointer.y * 0.035;
      return vec3(x, y, sin(s * 5.0 + t) * 0.15);
    }
    if (ribbon < 1.5) {
      float a = s * 6.0 - 0.65 + scrub * 0.46;
      float center = mix(0.58, 0.0, uMobile);
      float x = center + cos(a) * (mix(0.72, 0.86, uMobile) + morph * 0.055);
      float y = mix(0.25, -0.08, uMobile) + sin(a) * (mix(0.86, 0.63, uMobile) + sin(morph) * 0.06);
      x += sin(a * 2.0 + t + scrub * 3.0) * (0.13 + scrub * 0.06);
      y += cos(a * 3.0 - t) * 0.09 - scrub * 0.14;
      return vec3(x, y, sin(a * 1.5 + t) * 0.26);
    }
    float x = -1.3 + s * 2.7;
    float y = 1.03 + sin(s * 7.4 + t + scrub * 2.4) * 0.15;
    y -= pow(sin(s * 3.14159), 2.0) * 0.36;
    return vec3(x, y, cos(s * 6.0 - t) * 0.12);
  }

  void main() {
    float s = aAlong;
    float b = aAcross;
    vec3 center = ribbonPath(s, aRibbon);
    vec2 direction = ribbonPath(s + 0.003, aRibbon).xy - ribbonPath(s - 0.003, aRibbon).xy;
    vec2 tangent = normalize(vec2(direction.x * uAspect, direction.y) + vec2(0.0001));
    vec2 normal = vec2(-tangent.y / uAspect, tangent.x);
    float twist = s * 9.0 + aRibbon * 1.7 + uScroll * 2.6 + uMorph * 0.45;
    twist += uPointer.x * 0.65 + uTime * 0.075;
    float width = aRibbon < 0.5 ? 0.25 : aRibbon < 1.5 ? 0.22 : 0.19;
    width *= 1.0 + sin(s * 9.0 + uScroll * 2.0) * 0.16;
    float cross = b * width;
    vec3 p = center;
    p.xy += normal * cross * cos(twist);
    p.z += cross * sin(twist) * 1.8;
    p.xy += normal * sin(s * 13.0 + b * 3.0 - uTime * 0.7) * 0.009;
    p.x += uPointer.x * (0.04 + sin(s * 4.0 + aRibbon) * 0.055);
    p.y += uPointer.y * cos(s * 3.0 + aRibbon) * 0.07;
    p.xy += normal * sin(s * 10.0 - uTime * 1.7) * uPulse * 0.035;
    p.xy *= 1.0 / (1.0 - p.z * 0.12);
    gl_Position = vec4(p.xy, p.z * 0.1, 1.0);

    float edge = max(smoothstep(0.48, 0.94, abs(p.y)), smoothstep(0.54, 1.05, abs(p.x)));
    float right = smoothstep(-0.35, 0.35, p.x);
    vQuiet = mix(0.34, 1.0, max(right, edge));
    if (uMobile > 0.5) vQuiet = mix(0.48, 1.0, max(smoothstep(0.40, 0.95, abs(p.x)), smoothstep(0.42, 0.92, abs(p.y))));
    vCore = pow(max(0.0, 1.0 - abs(b)), 5.0);
    vLight = 0.34 + 0.66 * (0.5 + 0.5 * cos(twist + b * 2.0));
    vTone = 0.5 + 0.5 * sin(s * 5.0 + aRibbon * 1.4 + uScroll + uTime * 0.055);
    vGlow = aGlow;
    float sparkle = pow(max(0.0, sin(s * 61.0 + b * 15.0 + aRibbon * 7.0)), 12.0);
    float fineSize = clamp(1.4 + vCore * 1.05 + sparkle * 1.8, 1.0, 5.0) * uPixelRatio;
    gl_PointSize = mix(fineSize, mix(17.0, 13.0, uMobile) * uPixelRatio, aGlow);
  }
`;

const particleFragment = /* glsl */ `
  uniform vec3 uAccent;
  uniform vec3 uBright;
  uniform vec3 uHighlight;
  uniform float uOpacity;
  varying float vLight;
  varying float vTone;
  varying float vQuiet;
  varying float vCore;
  varying float vGlow;
  void main() {
    vec2 p = (gl_PointCoord - 0.5) * 2.0;
    float radius = dot(p, p);
    if (radius > 1.0) discard;
    vec3 color = mix(uAccent, uBright, vTone * 0.8);
    color = mix(color, uHighlight, vCore * 0.38);
    float fineAlpha = pow(1.0 - radius, 1.3) * (0.65 + vCore * 0.6);
    float haloAlpha = exp(-radius * 4.8) * (1.0 - radius) * 0.095;
    float alpha = mix(fineAlpha, haloAlpha, vGlow) * uOpacity * vQuiet * (0.55 + vLight * 0.6);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

const lineFragment = /* glsl */ `
  uniform vec3 uAccent;
  uniform vec3 uBright;
  uniform vec3 uHighlight;
  uniform float uOpacity;
  varying float vLight;
  varying float vTone;
  varying float vQuiet;
  varying float vCore;
  void main() {
    vec3 color = mix(uAccent, uBright, vTone);
    color = mix(color, uHighlight, vCore * 0.36);
    gl_FragColor = vec4(color, uOpacity * vQuiet * (0.30 + vCore * 0.7) * vLight);
    #include <colorspace_fragment>
  }
`;

/** Three ribbons occupy the hero edges. Their only input is the user's movement. */
export function createHeroBackdropScene(host: HTMLElement, { section, motion, onState }: BackdropOptions): HeroBackdropController {
  const canvas = document.createElement("canvas");
  canvas.className = "hero-backdrop-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const context = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  if (!context) { onState(false); return { dispose() {}, syncMotion() {} }; }
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: false }); }
  catch { onState(false); return { dispose() {}, syncMotion() {} }; }

  // Cache the preference: reading MediaQueryList.matches in every RAF can consume
  // Chromium's pending change notification and prevent animation from resuming.
  let reducedMotion = motion.matches;
  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const lowPower = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768 || (device.deviceMemory ?? 8) <= 4 || navigator.hardwareConcurrency <= 4 || Boolean(device.connection?.saveData);
  let pixelRatio = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.35);
  let targetFps = lowPower ? 24 : 36;
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const theme = getComputedStyle(host);
  const color = (name: string) => new THREE.Color(theme.getPropertyValue(name).trim());
  const uniforms = {
    uTime: { value: 0 }, uScroll: { value: .12 }, uMorph: { value: 0 }, uPulse: { value: 0 },
    uAspect: { value: 1 }, uMobile: { value: lowPower ? 1 : 0 }, uPixelRatio: { value: pixelRatio }, uPointer: { value: new THREE.Vector2() },
    uAccent: { value: color("--hero-ribbon-violet") }, uBright: { value: color("--hero-ribbon-pink") }, uHighlight: { value: color("--hero-ribbon-highlight") }, uOpacity: { value: .9 },
  };

  const ribbonCount = 3;
  const alongCount = lowPower ? 176 : 304;
  const acrossCount = lowPower ? 22 : 38;
  const finePointCount = alongCount * acrossCount * ribbonCount;
  const pointCount = finePointCount + Math.floor(finePointCount / 24);
  const along = new Float32Array(pointCount);
  const across = new Float32Array(pointCount);
  const ribbon = new Float32Array(pointCount);
  const glow = new Float32Array(pointCount);
  let fineIndex = 0;
  for (let index = 0; index < pointCount; index++) {
    if (index % 25 === 24) {
      // Sparse soft sprites supply the luminous core without a bloom render pass.
      const halo = Math.floor(index / 25);
      along[index] = (Math.floor(halo / ribbonCount) * .61803398875) % 1;
      across[index] = Math.sin(halo * 2.4) * .08;
      ribbon[index] = halo % ribbonCount;
      glow[index] = 1;
    } else {
      const point = Math.floor(fineIndex / ribbonCount);
      along[index] = (point % alongCount) / (alongCount - 1);
      const cross = ((Math.floor(point / alongCount) * .61803398875) % 1) * 2 - 1;
      across[index] = Math.sign(cross) * Math.pow(Math.abs(cross), 1.35);
      ribbon[index] = fineIndex % ribbonCount;
      fineIndex++;
    }
  }
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pointCount * 3), 3));
  pointGeometry.setAttribute("aAlong", new THREE.BufferAttribute(along, 1));
  pointGeometry.setAttribute("aAcross", new THREE.BufferAttribute(across, 1));
  pointGeometry.setAttribute("aRibbon", new THREE.BufferAttribute(ribbon, 1));
  pointGeometry.setAttribute("aGlow", new THREE.BufferAttribute(glow, 1));
  const pointMaterial = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader: particleFragment, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(pointGeometry, pointMaterial);
  points.frustumCulled = false;
  scene.add(points);

  const segments = lowPower ? 112 : 192;
  const strands = lowPower ? 9 : 16;
  const lineCount = segments * strands * ribbonCount * 2;
  const lineAlong = new Float32Array(lineCount);
  const lineAcross = new Float32Array(lineCount);
  const lineRibbon = new Float32Array(lineCount);
  let offset = 0;
  for (let strand = 0; strand < strands; strand++) for (let segment = 0; segment < segments; segment++) for (let layer = 0; layer < ribbonCount; layer++) {
    const b = (strand / (strands - 1) * 2 - 1);
    lineAlong[offset] = segment / segments;
    lineAlong[offset + 1] = (segment + 1) / segments;
    lineAcross[offset] = lineAcross[offset + 1] = b;
    lineRibbon[offset] = lineRibbon[offset + 1] = layer;
    offset += 2;
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lineCount * 3), 3));
  lineGeometry.setAttribute("aAlong", new THREE.BufferAttribute(lineAlong, 1));
  lineGeometry.setAttribute("aAcross", new THREE.BufferAttribute(lineAcross, 1));
  lineGeometry.setAttribute("aGlow", new THREE.BufferAttribute(new Float32Array(lineCount), 1));
  lineGeometry.setAttribute("aRibbon", new THREE.BufferAttribute(lineRibbon, 1));
  const lineMaterial = new THREE.ShaderMaterial({ uniforms: { ...uniforms, uOpacity: { value: .37 } }, vertexShader, fragmentShader: lineFragment, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  lines.frustumCulled = false;
  scene.add(lines);
  host.appendChild(canvas);

  let disposed = false;
  let lost = false;
  let inView = false;
  let blocked = Boolean(document.querySelector('[aria-modal="true"]'));
  let frame = 0;
  let lastFrame = 0;
  let lastRender = 0;
  let time = 0;
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;
  let targetScroll = .12;
  let targetMorph = 0;
  let pulse = 0;
  let renderCost = 0;
  let frameCount = 0;
  let slowFrames = 0;
  let sectionTop = 0;
  let sectionLeft = 0;
  let sectionWidth = 1;
  let sectionHeight = 1;
  let activePointer: number | null = null;
  canvas.dataset.quality = lowPower ? "low" : "standard";
  canvas.dataset.points = String(pointCount);

  function render() {
    if (disposed || lost) return;
    const start = performance.now();
    try {
      renderer.render(scene, camera);
      renderCost = renderCost * .96 + (performance.now() - start) * .04;
      if (++frameCount > 120 && (renderCost > 12 || slowFrames > 10)) {
        targetFps = 24;
        pixelRatio = Math.max(.8, pixelRatio - .15);
        renderer.setPixelRatio(pixelRatio);
        uniforms.uPixelRatio.value = pixelRatio;
        const previous = pointGeometry.drawRange.count === Infinity ? pointCount : pointGeometry.drawRange.count;
        const count = Math.max(3072, Math.floor(previous * .78));
        pointGeometry.setDrawRange(0, count);
        canvas.dataset.points = String(count);
        canvas.dataset.quality = "adaptive";
        frameCount = 0;
        slowFrames = 0;
      }
    } catch { lost = true; canvas.style.visibility = "hidden"; onState(false); }
  }
  function update(delta: number, immediate = false) {
    const ease = immediate ? 1 : 1 - Math.exp(-delta * 6.5);
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;
    uniforms.uPointer.value.set(currentX, currentY);
    uniforms.uScroll.value += (targetScroll - uniforms.uScroll.value) * ease;
    uniforms.uMorph.value += (targetMorph - uniforms.uMorph.value) * ease * .65;
    pulse *= Math.exp(-delta * 3.4);
    uniforms.uPulse.value = immediate ? 0 : pulse;
    uniforms.uTime.value = time;
  }
  function canRun() { return !disposed && !lost && inView && !document.hidden && !blocked && !reducedMotion; }
  function animate(now: number) {
    frame = 0;
    if (!canRun()) return;
    const frameDelay = now - lastFrame;
    lastFrame = now;
    slowFrames = frameDelay > (lowPower ? 65 : 42) ? slowFrames + 1 : Math.max(0, slowFrames - .1);
    const interval = 1000 / targetFps;
    const elapsed = now - lastRender;
    if (elapsed >= interval) {
      const delta = Math.min(.08, elapsed / 1000);
      lastRender = now - elapsed % interval;
      time += delta;
      update(delta);
      render();
    }
    if (!lost) frame = requestAnimationFrame(animate);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    canvas.dataset.motion = lost ? "lost" : blocked ? "covered" : document.hidden ? "hidden" : !inView ? "offscreen" : reducedMotion ? "reduced" : "running";
    if (disposed || lost || !inView || document.hidden || blocked) return;
    if (reducedMotion) { update(0, true); render(); }
    else { lastRender = lastFrame = performance.now(); frame = requestAnimationFrame(animate); }
  }
  function syncMotion() { reducedMotion = motion.matches; sync(); }
  function scroll() {
    const top = sectionTop - window.scrollY;
    targetScroll = Math.max(0, Math.min(1, (window.innerHeight * .18 - top) / (sectionHeight * .9)));
    canvas.dataset.scroll = targetScroll.toFixed(3);
  }
  function resize() {
    if (disposed || lost) return;
    const bounds = section.getBoundingClientRect();
    sectionTop = bounds.top + window.scrollY;
    sectionLeft = bounds.left;
    sectionWidth = Math.max(1, bounds.width);
    sectionHeight = Math.max(1, bounds.height);
    const hostBounds = host.getBoundingClientRect();
    if (!hostBounds.width || !hostBounds.height) return;
    renderer.setSize(hostBounds.width, hostBounds.height, false);
    uniforms.uAspect.value = hostBounds.width / hostBounds.height;
    uniforms.uMobile.value = hostBounds.width < 768 ? 1 : 0;
    scroll();
    if (inView && !blocked && !document.hidden) { if (reducedMotion) update(0, true); render(); }
  }
  function steer(event: PointerEvent) {
    if (reducedMotion || (event.pointerType === "touch" && activePointer !== event.pointerId)) return;
    targetX = Math.max(-1, Math.min(1, (event.clientX - sectionLeft) / sectionWidth * 2 - 1));
    targetY = Math.max(-1, Math.min(1, 1 - (event.clientY - (sectionTop - window.scrollY)) / sectionHeight * 2));
    canvas.dataset.pointer = `${targetX.toFixed(2)},${targetY.toFixed(2)}`;
  }
  function pointerDown(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || reducedMotion || (event.target instanceof Element && event.target.closest("a, button, input, select, textarea, [role='button']"))) return;
    activePointer = event.pointerId;
    pulse = 1;
    targetMorph = (targetMorph + 1) % 3;
    canvas.dataset.variant = String(targetMorph);
    steer(event);
  }
  function resetPointer() { activePointer = null; targetX = targetY = 0; }
  function pointerUp(event: PointerEvent) { if (event.pointerType === "touch") resetPointer(); }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const intersection = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }, { threshold: .01 });
  intersection.observe(section);
  const modalObserver = new MutationObserver(() => {
    const next = Boolean(document.querySelector('[aria-modal="true"]'));
    if (next !== blocked) { blocked = next; sync(); }
  });
  modalObserver.observe(document.body, { childList: true });
  const onLost = (event: Event) => { event.preventDefault(); lost = true; canvas.style.visibility = "hidden"; sync(); onState(false); };
  const onRestored = () => { lost = false; canvas.style.visibility = ""; resize(); onState(true); sync(); };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  section.addEventListener("pointermove", steer, { passive: true });
  section.addEventListener("pointerdown", pointerDown, { passive: true });
  section.addEventListener("pointerup", pointerUp, { passive: true });
  section.addEventListener("pointercancel", resetPointer, { passive: true });
  section.addEventListener("pointerleave", resetPointer, { passive: true });
  window.addEventListener("scroll", scroll, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", sync);
  resize();
  onState(true);

  return { syncMotion, dispose() {
    disposed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect(); intersection.disconnect(); modalObserver.disconnect();
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
    section.removeEventListener("pointermove", steer);
    section.removeEventListener("pointerdown", pointerDown);
    section.removeEventListener("pointerup", pointerUp);
    section.removeEventListener("pointercancel", resetPointer);
    section.removeEventListener("pointerleave", resetPointer);
    window.removeEventListener("scroll", scroll);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", sync);
    pointGeometry.dispose(); pointMaterial.dispose(); lineGeometry.dispose(); lineMaterial.dispose();
    renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  } };
}
