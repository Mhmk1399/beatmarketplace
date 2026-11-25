import * as THREE from "three";

type BackdropOptions = { section: HTMLElement; motion: MediaQueryList; onState: (ready: boolean) => void };
export type HeroBackdropController = { dispose: () => void; syncMotion: () => void };

const ribbonCount = 5;
const modalSelector = '[aria-modal="true"], dialog[open]';
const qualityTiers = [
  { name: "standard", dpr: 1.2, pixels: 1_350_000, fraction: 1, idleFps: 30, activeFps: 60 },
  { name: "low", dpr: 1, pixels: 640_000, fraction: .67, idleFps: 30, activeFps: 30 },
  { name: "adaptive", dpr: .8, pixels: 360_000, fraction: .44, idleFps: 20, activeFps: 30 },
] as const;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uMorph;
  uniform float uPulse;
  uniform float uAspect;
  uniform float uMobile;
  uniform float uPixelRatio;
  uniform vec2 uPointer;
  attribute float aStyle;
  varying float vLight;
  varying float vTone;
  varying float vQuiet;
  varying float vCore;
  varying float vStyle;

  // The tangent comes from the same phases as the path, with no neighboring vertex samples.
  void ribbonPath(float s, float band, out vec3 center, out vec2 direction) {
    float time = uTime * .15;
    float shape = sin(uMorph * 2.094395);
    if (band < .5) {
      float a = s * 6.8 - time + uScroll * 2.8;
      float b = s * 12.6 + uMorph - uScroll;
      center = vec3(-1.45 + s * 2.90, -.76 + sin(a) * .21 + sin(b) * .042 + uScroll * .17, .16 * cos(a));
      direction = vec2(2.90, cos(a) * 1.428 + cos(b) * .5292);
    } else if (band < 1.5 || band > 3.5) {
      float echo = step(3.5, band);
      float a = s * 6.283185 - .85 + uScroll * .52 + echo * .54;
      float wobble = a * 2.0 + time + uScroll * 1.8;
      float radiusX = mix(.73, .84, uMobile) - echo * .20 + shape * .06;
      float radiusY = mix(.64, .40, uMobile) - echo * .13;
      float x = mix(.59, .04, uMobile) - echo * .24 + cos(a) * radiusX + sin(wobble) * .12;
      float y = mix(.34, .39, uMobile) - echo * .22 + sin(a) * radiusY + cos(wobble) * .07 - uScroll * .15;
      center = vec3(x, y, sin(a + time) * .24 - echo * .12);
      direction = vec2(-sin(a) * radiusX + cos(wobble) * .24, cos(a) * radiusY - sin(wobble) * .14);
    } else {
      float lower = step(2.5, band);
      float a = s * 7.7 + time + band + uScroll * 2.0;
      float arch = sin(s * 3.141593);
      float base = mix(1.0, -.42, lower);
      float height = mix(-.33, .42, lower);
      center = vec3(-1.42 + s * 2.84, base + sin(a) * .13 + arch * height + lower * uScroll * .13, cos(a) * .13 - lower * .15);
      direction = vec2(2.84, cos(a) + cos(s * 3.141593) * height * 3.141593);
    }
  }

  void main() {
    float s = position.x;
    float b = position.y;
    float band = position.z;
    vec3 p;
    vStyle = aStyle;
    vTone = .5 + .5 * sin(s * 6.0 + band * 1.3 + uScroll + uTime * .16);

    if (aStyle > 1.5) {
      // Small particles follow the overall perspective with a slower counter-drift.
      float phase = s * 21.0 + b * 12.5;
      p = vec3(s * 2.4 - 1.2, b, sin(phase) * .2);
      p.x += sin(phase + uTime * .23) * .042 + uPointer.x * .08;
      p.y += cos(phase + uTime * .18) * .037 + uScroll * .13 + uPointer.y * .09;
      vCore = .10 + .32 * (sin(phase + uTime * .65) * .5 + .5);
      vLight = .36 + .44 * vCore;
      gl_PointSize = (1.45 + vCore * 3.9) * uPixelRatio;
    } else {
      vec2 direction;
      ribbonPath(s, band, p, direction);
      vec2 tangent = normalize(vec2(direction.x * uAspect, direction.y) + vec2(.0001));
      vec2 normal = vec2(-tangent.y / uAspect, tangent.x);
      float twist = s * 9.0 + band * 1.61 + uScroll * 2.4 + uMorph * .48 + uPointer.x * .7 + uTime * .11;
      float broad = 1.0 - step(2.5, band);
      float width = mix(.13, .25, broad) * (1.0 + sin(s * 8.2 + uScroll * 1.9) * .14);
      float spread = b * width;
      p.xy += normal * (spread * cos(twist) + sin(s * 11.0 - uTime * 1.8 + band) * uPulse * .044);
      p.z += spread * sin(twist) * 1.6;
      p.x += uPointer.x * (.085 + p.z * .10);
      p.y += uPointer.y * (.055 + p.z * .10);
      float core = max(0.0, 1.0 - abs(b));
      vCore = core * core * core;
      vLight = (.48 + .52 * cos(twist + b * 2.0) * .5) * mix(.66, 1.0, broad);
      float sparkle = smoothstep(.85, 1.0, sin(s * 92.0 + b * 27.0 + band * 3.2 + uTime * 1.1));
      gl_PointSize = mix(1.35 + vCore * 1.3 + sparkle * .85, 12.0 + sparkle * 4.5, aStyle) * uPixelRatio;
    }

    p.xy /= 1.0 - p.z * .13;
    gl_Position = vec4(p.xy, p.z * .1, 1.0);
    float edges = max(smoothstep(.5, 1.0, abs(p.y)), smoothstep(.58, 1.0, abs(p.x)));
    float openSide = smoothstep(-.1, .65, p.x) * (1.0 - uMobile);
    vQuiet = mix(mix(.24, .44, uMobile), 1.0, max(edges, openSide));
  }
`;

const fragmentShared = /* glsl */ `
  uniform vec3 uAccent;
  uniform vec3 uBright;
  uniform vec3 uHighlight;
  varying float vLight;
  varying float vTone;
  varying float vQuiet;
  varying float vCore;
  varying float vStyle;

  vec3 ribbonColor() {
    vec3 color = mix(uAccent, uBright, vTone * .83);
    return mix(color, uHighlight, vCore * .45);
  }
`;

const particleFragment = /* glsl */ `
  ${fragmentShared}
  void main() {
    vec2 p = (gl_PointCoord - .5) * 2.0;
    float radius = dot(p, p);
    if (radius >= 1.0) discard;
    float falloff = 1.0 - radius;
    float alpha = falloff * falloff * (.87 + vCore * .49);
    if (vStyle > 1.5) alpha = falloff * falloff * (.40 + vCore * .41);
    else if (vStyle > .5) alpha = falloff * falloff * falloff * .23;
    gl_FragColor = vec4(ribbonColor(), alpha * vQuiet * (.44 + vLight));
    #include <colorspace_fragment>
  }
`;

const lineFragment = /* glsl */ `
  ${fragmentShared}
  void main() {
    gl_FragColor = vec4(ribbonColor(), vQuiet * (.085 + vCore * .37) * vLight);
    #include <colorspace_fragment>
  }
`;

function buildPoints(lowPower: boolean) {
  const along = lowPower ? 116 : 166;
  const rows = lowPower ? 9 : 14;
  const count = along * rows * ribbonCount + 360;
  const position = new Float32Array(count * 3);
  const style = new Float32Array(count);
  const fraction = (value: number) => value % 1;
  for (let index = 0; index < 360; index++) {
    const offset = index * 3;
    if (index % 3 === 0) {
      position[offset] = fraction(index * .618034);
      position[offset + 1] = fraction(index * .414214) * 2 - 1;
      style[index] = 2;
    } else {
      position[offset] = fraction(index * .754878);
      position[offset + 1] = Math.sin(index * 2.4) * .12;
      position[offset + 2] = index % ribbonCount;
      style[index] = 1;
    }
  }
  for (let row = 0; row < rows; row++) for (let band = 0; band < ribbonCount; band++) for (let step = 0; step < along; step++) {
    const offset = (360 + ((row * ribbonCount + band) * along + step)) * 3;
    position[offset] = (step + (row % 2) * .42) / along;
    position[offset + 1] = fraction(row * .618034 + .5) * 2 - 1;
    position[offset + 2] = band;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("aStyle", new THREE.BufferAttribute(style, 1));
  return { geometry, rowSize: along * ribbonCount, rows };
}

function buildLines(lowPower: boolean) {
  const segments = lowPower ? 80 : 124;
  const strands = lowPower ? [0, -.78, .78, -.4, .4] : [0, -.82, .82, -.42, .42, -.63, .63, -.2, .2];
  const count = (segments + 1) * strands.length * ribbonCount;
  const position = new Float32Array(count * 3);
  const indices = new Uint16Array(segments * strands.length * ribbonCount * 2);
  let vertex = 0;
  let index = 0;
  for (const across of strands) for (let band = 0; band < ribbonCount; band++) for (let step = 0; step <= segments; step++) {
    position[vertex * 3] = step / segments;
    position[vertex * 3 + 1] = across;
    position[vertex * 3 + 2] = band;
    if (step < segments) { indices[index++] = vertex; indices[index++] = vertex + 1; }
    vertex++;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("aStyle", new THREE.BufferAttribute(new Float32Array(count), 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return { geometry, strandSize: segments * ribbonCount * 2, strands: strands.length };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The hero and listening room share one canvas, two draw calls and no post-processing. */
export function createHeroBackdropScene(host: HTMLElement, { section, motion, onState }: BackdropOptions): HeroBackdropController {
  const canvas = document.createElement("canvas");
  canvas.className = "hero-backdrop-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const context = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power", failIfMajorPerformanceCaveat: true });
  if (!context) return { dispose() {}, syncMotion() {} };
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: false }); }
  catch { return { dispose() {}, syncMotion() {} }; }

  // Cache the media preference so it is never read on the animation path.
  let reducedMotion = motion.matches;
  const device = navigator as Navigator & { deviceMemory?: number };
  const lowPower = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768 || (device.deviceMemory ?? 8) <= 4 || navigator.hardwareConcurrency <= 4;
  let quality = lowPower ? 1 : 0;
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const theme = getComputedStyle(host);
  const color = (name: string) => new THREE.Color(theme.getPropertyValue(name).trim());
  const uniforms = {
    uTime: { value: 0 }, uScroll: { value: 0 }, uMorph: { value: 0 }, uPulse: { value: 0 },
    uAspect: { value: 1 }, uMobile: { value: 0 }, uPixelRatio: { value: 1 }, uPointer: { value: new THREE.Vector2() },
    uAccent: { value: color("--hero-ribbon-violet") }, uBright: { value: color("--hero-ribbon-pink") }, uHighlight: { value: color("--hero-ribbon-highlight") },
  };

  const points = buildPoints(lowPower);
  const lines = buildLines(lowPower);
  const material = { uniforms, vertexShader, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending };
  const pointMaterial = new THREE.ShaderMaterial({ ...material, fragmentShader: particleFragment });
  const lineMaterial = new THREE.ShaderMaterial({ ...material, fragmentShader: lineFragment });
  const pointMesh = new THREE.Points(points.geometry, pointMaterial);
  const lineMesh = new THREE.LineSegments(lines.geometry, lineMaterial);
  pointMesh.frustumCulled = lineMesh.frustumCulled = false;
  scene.add(lineMesh, pointMesh);
  host.appendChild(canvas);

  let disposed = false;
  let lost = false;
  let ready = false;
  let inView = false;
  let blocked = Boolean(document.querySelector(modalSelector));
  let frame = 0;
  let lastFrame = 0;
  let lastDraw = 0;
  let renderDeadline = 0;
  let activeUntil = 0;
  let time = 0;
  let targetX = 0;
  let targetY = 0;
  let targetScroll = 0;
  let targetMorph = 0;
  let pulse = 0;
  let slowFrames = 0;
  let sampleFrames = 0;
  let renderCost = 0;
  let top = 0;
  let left = 0;
  let width = 1;
  let height = 1;
  let activePointer: number | null = null;

  function applyQuality() {
    const tier = qualityTiers[quality];
    const ratio = Math.min(window.devicePixelRatio || 1, tier.dpr, Math.sqrt(tier.pixels / (width * height)));
    const pointCount = 360 + points.rowSize * Math.max(2, Math.round(points.rows * tier.fraction));
    points.geometry.setDrawRange(0, pointCount);
    lines.geometry.setDrawRange(0, lines.strandSize * Math.max(2, Math.round(lines.strands * tier.fraction)));
    if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    uniforms.uPixelRatio.value = ratio;
    canvas.dataset.points = String(pointCount);
    canvas.dataset.quality = tier.name;
  }

  function showFallback() {
    lost = true;
    ready = false;
    canvas.style.visibility = "hidden";
    sync();
    onState(false);
  }

  renderer.debug.onShaderError = showFallback;

  function draw(delta: number) {
    const ease = 1 - Math.exp(-delta * 8);
    const pointer = uniforms.uPointer.value;
    pointer.set(pointer.x + (targetX - pointer.x) * ease, pointer.y + (targetY - pointer.y) * ease);
    uniforms.uScroll.value += (targetScroll - uniforms.uScroll.value) * ease * .8;
    uniforms.uMorph.value += (targetMorph - uniforms.uMorph.value) * ease * .55;
    pulse *= Math.exp(-delta * 2.9);
    uniforms.uPulse.value = pulse;
    uniforms.uTime.value = time;
    try {
      const start = performance.now();
      renderer.render(scene, camera);
      renderCost = renderCost * .92 + (performance.now() - start) * .08;
      if (!ready && !lost) { ready = true; onState(true); }
    } catch { showFallback(); }
  }

  function animate(now: number) {
    frame = 0;
    if (disposed || lost || !inView || document.hidden || blocked || reducedMotion) return;
    if (now - lastFrame > (quality === 0 ? 35 : 48)) slowFrames++;
    lastFrame = now;
    if (++sampleFrames >= 72) {
      const overloaded = slowFrames > 10 || renderCost > 9;
      if (overloaded && quality < qualityTiers.length - 1) {
        quality++;
        applyQuality();
      } else if (overloaded && (slowFrames > 24 || renderCost > 14)) {
        // Keep native browsing responsive on devices that cannot sustain even the lowest budget.
        showFallback();
        return;
      }
      sampleFrames = slowFrames = 0;
    }

    const tier = qualityTiers[quality];
    const interval = 1000 / (now < activeUntil ? tier.activeFps : tier.idleFps);
    if (now - renderDeadline >= interval - 1.5) {
      const delta = Math.min(.065, Math.max(0, now - lastDraw) * .001);
      renderDeadline = Math.max(renderDeadline + interval, now - interval * .25);
      lastDraw = now;
      time += delta;
      draw(delta);
    }
    if (!lost) frame = requestAnimationFrame(animate);
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    canvas.dataset.motion = lost ? "lost" : blocked ? "covered" : document.hidden ? "hidden" : !inView ? "offscreen" : reducedMotion ? "reduced" : "running";
    if (disposed || lost || !inView || document.hidden || blocked || reducedMotion) return;
    lastFrame = lastDraw = renderDeadline = performance.now();
    slowFrames = sampleFrames = renderCost = 0;
    frame = requestAnimationFrame(animate);
  }

  function syncMotion() { reducedMotion = motion.matches; sync(); }

  function scroll() {
    targetScroll = clamp((window.innerHeight * .18 + window.scrollY - top) / (height * .86), 0, 1);
    activeUntil = performance.now() + 550;
  }

  function resize() {
    if (disposed || lost) return;
    const bounds = section.getBoundingClientRect();
    top = bounds.top + window.scrollY;
    left = bounds.left;
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    uniforms.uAspect.value = width / height;
    uniforms.uMobile.value = width < 768 ? 1 : 0;
    applyQuality();
    scroll();
  }

  function steer(event: PointerEvent) {
    if (lost || reducedMotion || (event.pointerType === "touch" && activePointer !== event.pointerId)) return;
    targetX = clamp((event.clientX - left) / width * 2 - 1, -1, 1);
    targetY = clamp(1 - (event.clientY + window.scrollY - top) / height * 2, -1, 1);
    activeUntil = performance.now() + 650;
  }

  function pointerDown(event: PointerEvent) {
    if (lost || reducedMotion || !event.isPrimary || event.button !== 0 || (event.target instanceof Element && event.target.closest("a, button, input, select, textarea, [role='button']"))) return;
    activePointer = event.pointerId;
    pulse = 1;
    targetMorph++;
    steer(event);
  }

  function resetPointer() { activePointer = null; targetX = targetY = 0; }
  function pointerUp(event: PointerEvent) { if (event.pointerType === "touch") resetPointer(); }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(section);
  const intersection = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) blocked = Boolean(document.querySelector(modalSelector));
    sync();
  }, { threshold: .01 });
  intersection.observe(section);
  const modalObserver = new MutationObserver(() => {
    if (!inView) return;
    const next = Boolean(document.querySelector(modalSelector));
    if (next !== blocked) { blocked = next; sync(); }
  });
  modalObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "aria-modal"] });
  const onLost = (event: Event) => { event.preventDefault(); showFallback(); };
  const onRestored = () => { lost = false; canvas.style.visibility = ""; resize(); sync(); };
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
  uniforms.uScroll.value = targetScroll;

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
    points.geometry.dispose(); pointMaterial.dispose(); lines.geometry.dispose(); lineMaterial.dispose();
    renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  } };
}
