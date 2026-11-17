import * as THREE from "three";

type SceneOptions = {
  onState: (ready: boolean) => void;
  interactionTarget?: HTMLElement;
  onFormChange?: (index: number) => void;
};

export type FrequencySceneController = {
  dispose: () => void;
  cycleForm: () => number;
  setForm: (index: number) => number;
  pulse: () => void;
};

const formNames = ["orbit", "bloom", "ribbon"];
const tau = Math.PI * 2;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform vec3 uForm;
  uniform float uPulse;
  uniform float uInteraction;
  uniform float uPixelRatio;
  attribute float aAlong;
  attribute float aAcross;
  varying float vTone;
  varying float vLight;
  varying float vSpark;

  void main() {
    float a = aAlong;
    float b = aAcross;
    float t = uTime;
    float flow = sin(a * 5.0 + b * 2.0 - t * 0.65);
    float ripple = flow * 0.045 + sin(a * 11.0 - b * 3.0 + t * 0.35) * 0.018;
    float tube = 0.48 + ripple + sin(a * 3.0 - t * 0.5) * uPulse * 0.095;
    float ring = 1.48 + cos(b) * tube;
    vec3 orbit = vec3(cos(a) * ring, sin(a) * ring, sin(b) * tube);

    float latitude = b * 0.5 - 1.57079632679;
    float lobe = 1.46 + sin(a * 5.0 + t * 0.16) * 0.17 * pow(cos(latitude), 2.0);
    lobe += cos(latitude * 6.0 - t * 0.3) * 0.09;
    vec3 bloom = lobe * vec3(cos(latitude) * cos(a), sin(latitude) * 0.98, cos(latitude) * sin(a));

    vec3 center = vec3(sin(a) * 1.55, sin(a * 2.0) * 0.8, cos(a * 2.0) * 0.4);
    float weave = b + a * 2.0 + t * 0.12;
    vec3 ribbon = center + vec3(cos(weave) * cos(a) * 0.33, cos(weave) * 0.25, sin(weave) * 0.33);
    vec3 p = orbit * uForm.x + bloom * uForm.y + ribbon * uForm.z;

    float steer = cos(a) * uPointer.x + sin(a) * uPointer.y;
    float twist = (p.y * uPointer.x - p.x * uPointer.y) * 0.22;
    mat2 turn = mat2(cos(twist), -sin(twist), sin(twist), cos(twist));
    p.xz = turn * p.xz;
    p.z += steer * (0.32 + uForm.y * 0.16);
    p.x += uPointer.x * cos(p.y * 1.3 + t * 0.12) * 0.16;
    p.y += uPointer.y * sin(p.x * 1.25) * 0.18;
    p += normalize(p + vec3(0.001)) * sin(a * 3.0 + b * 1.5 - t * 2.4) * uPulse * 0.12;
    p *= 1.0 + uPulse * 0.065;
    p.z += sin(a * 4.0 + t * 0.32) * uInteraction * 0.06;

    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    vTone = 0.5 + 0.5 * sin(a + b * 0.35 + t * 0.08);
    vLight = 0.28 + 0.72 * smoothstep(-1.5, 1.35, p.z);
    vSpark = clamp(smoothstep(0.35, 1.0, sin(a * 4.0 - b * 2.0 - t * 0.7)) * 0.45 + uPulse * 0.5, 0.0, 1.0);
    gl_PointSize = clamp(uPixelRatio * (1.7 + vSpark * 0.7) * 6.8 / -viewPosition.z, 0.85, 3.8);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uAccent;
  uniform vec3 uBright;
  uniform vec3 uHighlight;
  uniform vec3 uSignal;
  uniform float uOpacity;
  varying float vTone;
  varying float vLight;
  varying float vSpark;
  void main() {
    vec2 point = (gl_PointCoord - 0.5) * 2.0;
    float radius = dot(point, point);
    if (radius > 1.0) discard;
    vec3 color = mix(uAccent, uHighlight, vLight * 0.72);
    color = mix(color, uBright, vTone * 0.38);
    color = mix(color, uSignal, vSpark * 0.16);
    float alpha = pow(1.0 - radius, 1.5) * uOpacity * vLight;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

const lineFragmentShader = /* glsl */ `
  uniform vec3 uAccent;
  uniform vec3 uBright;
  uniform vec3 uHighlight;
  uniform float uOpacity;
  varying float vTone;
  varying float vLight;
  varying float vSpark;
  void main() {
    vec3 color = mix(uAccent, uHighlight, 0.3 + vTone * 0.6);
    color = mix(color, uBright, vSpark * 0.32);
    gl_FragColor = vec4(color, uOpacity * vLight * (0.7 + vSpark * 0.3));
    #include <colorspace_fragment>
  }
`;

/** GPU-generated sculpture. Pointer/touch input is independent of the music player. */
export function createFrequencyScene(host: HTMLElement, { onState, interactionTarget = host, onFormChange }: SceneOptions): FrequencySceneController {
  let disposed = false;
  let lost = false;
  let inView = false;
  let frame = 0;
  let lastRender = 0;
  let lastFrame = 0;
  let slowFrames = 0;
  let animationTime = 0;
  let renderCost = 0;
  let renderedFrames = 0;
  let currentForm = 0;
  let pulseEnergy = 0;
  let targetX = 0;
  let targetY = 0;
  let interactionEnergy = 0;
  let targetInteraction = 0;
  let pointerDown: { id: number; x: number; y: number; at: number; moved: boolean } | null = null;
  let bounds = interactionTarget.getBoundingClientRect();
  let requestRender = () => {};
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "frequency-hero-canvas";
  canvas.dataset.form = formNames[0];

  function updateBounds() { bounds = interactionTarget.getBoundingClientRect(); }
  function pulse() {
    if (disposed) return;
    pulseEnergy = motion.matches ? 0 : 1;
    requestRender();
  }
  function setForm(index: number) {
    if (disposed || !Number.isFinite(index)) return currentForm;
    currentForm = ((Math.trunc(index) % 3) + 3) % 3;
    canvas.dataset.form = formNames[currentForm];
    onFormChange?.(currentForm);
    pulse();
    return currentForm;
  }
  function cycleForm() { return setForm(currentForm + 1); }
  function isControl(event: PointerEvent) {
    return event.target instanceof Element && Boolean(event.target.closest("button, a, input, select, textarea, [data-scene-control]"));
  }
  function steer(event: PointerEvent) {
    if (!bounds.width || !bounds.height) return;
    targetX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    targetY = Math.max(-1, Math.min(1, 1 - (event.clientY - bounds.top) / bounds.height * 2));
    targetInteraction = 1;
    requestRender();
  }
  function onPointerEnter(event: PointerEvent) {
    if (disposed || isControl(event)) return;
    updateBounds();
    if (event.pointerType !== "touch") steer(event);
  }
  function onPointerMove(event: PointerEvent) {
    if (disposed || isControl(event)) return;
    if (pointerDown?.id === event.pointerId && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 12) pointerDown.moved = true;
    if (event.pointerType === "touch" && pointerDown?.id !== event.pointerId) return;
    steer(event);
  }
  function onPointerDown(event: PointerEvent) {
    if (disposed || !event.isPrimary || event.button !== 0 || isControl(event)) return;
    updateBounds();
    pointerDown = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now(), moved: false };
    steer(event);
    pulse();
  }
  function resetPointer() {
    pointerDown = null;
    targetX = 0;
    targetY = 0;
    targetInteraction = 0;
    requestRender();
  }
  function onPointerUp(event: PointerEvent) {
    if (!pointerDown || pointerDown.id !== event.pointerId) return;
    const tap = !pointerDown.moved && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) <= 12 && performance.now() - pointerDown.at < 650;
    pointerDown = null;
    if (tap) cycleForm();
    if (event.pointerType === "touch") resetPointer();
  }

  interactionTarget.addEventListener("pointerenter", onPointerEnter, { passive: true });
  interactionTarget.addEventListener("pointermove", onPointerMove, { passive: true });
  interactionTarget.addEventListener("pointerdown", onPointerDown, { passive: true });
  interactionTarget.addEventListener("pointerleave", resetPointer, { passive: true });
  interactionTarget.addEventListener("pointercancel", resetPointer, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("scroll", updateBounds, { passive: true });
  window.addEventListener("resize", updateBounds, { passive: true });
  function removeInteraction() {
    interactionTarget.removeEventListener("pointerenter", onPointerEnter);
    interactionTarget.removeEventListener("pointermove", onPointerMove);
    interactionTarget.removeEventListener("pointerdown", onPointerDown);
    interactionTarget.removeEventListener("pointerleave", resetPointer);
    interactionTarget.removeEventListener("pointercancel", resetPointer);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("scroll", updateBounds);
    window.removeEventListener("resize", updateBounds);
  }
  const fallbackController = { cycleForm, setForm, pulse, dispose() { disposed = true; removeInteraction(); } };
  const context = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  if (!context) { onState(false); return fallbackController; }

  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const mobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
  const lowPower = mobile || (device.deviceMemory ?? 8) <= 4 || navigator.hardwareConcurrency <= 4 || Boolean(device.connection?.saveData);
  let targetFps = lowPower ? 24 : 45;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, lowPower ? 1.1 : 1.5);
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: false }); }
  catch { onState(false); return fallbackController; }
  renderer.setClearColor(0, 0);
  renderer.setPixelRatio(pixelRatio);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 30);
  const sculpture = new THREE.Group();
  sculpture.rotation.set(0.65, -0.2, -0.28);
  scene.add(sculpture);
  const theme = getComputedStyle(host);
  const color = (variable: string) => new THREE.Color(theme.getPropertyValue(variable).trim());
  const uniforms = {
    uTime: { value: 0 }, uPointer: { value: new THREE.Vector2() }, uForm: { value: new THREE.Vector3(1, 0, 0) },
    uPulse: { value: 0 }, uInteraction: { value: 0 }, uPixelRatio: { value: pixelRatio }, uOpacity: { value: 0.94 },
    uAccent: { value: color("--accent") }, uBright: { value: color("--accent-bright") }, uHighlight: { value: color("--accent-text") }, uSignal: { value: color("--music-signal") },
  };
  const alongCount = lowPower ? 208 : 352;
  const acrossCount = lowPower ? 28 : 56;
  const particleCount = alongCount * acrossCount;
  const particleGeometry = new THREE.BufferGeometry();
  const along = new Float32Array(particleCount);
  const across = new Float32Array(particleCount);
  for (let index = 0; index < particleCount; index++) {
    along[index] = (index % alongCount) / alongCount * tau;
    // Spread partial draw ranges around the entire form instead of cutting off one side.
    across[index] = ((Math.floor(index / alongCount) * 0.61803398875) % 1) * tau;
  }
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3));
  particleGeometry.setAttribute("aAlong", new THREE.BufferAttribute(along, 1));
  particleGeometry.setAttribute("aAcross", new THREE.BufferAttribute(across, 1));
  const particleMaterial = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.frustumCulled = false;
  sculpture.add(particles);

  const ribbonSegments = lowPower ? 128 : 224;
  const ribbonCount = lowPower ? 16 : 28;
  const ribbonLength = ribbonSegments * ribbonCount * 2;
  const ribbonGeometry = new THREE.BufferGeometry();
  const ribbonAlong = new Float32Array(ribbonLength);
  const ribbonAcross = new Float32Array(ribbonLength);
  for (let ring = 0; ring < ribbonCount; ring++) {
    for (let segment = 0; segment < ribbonSegments; segment++) {
      const index = (ring * ribbonSegments + segment) * 2;
      ribbonAlong[index] = segment / ribbonSegments * tau;
      ribbonAlong[index + 1] = (segment + 1) / ribbonSegments * tau;
      ribbonAcross[index] = ribbonAcross[index + 1] = ((ring * 0.61803398875) % 1) * tau;
    }
  }
  ribbonGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ribbonLength * 3), 3));
  ribbonGeometry.setAttribute("aAlong", new THREE.BufferAttribute(ribbonAlong, 1));
  ribbonGeometry.setAttribute("aAcross", new THREE.BufferAttribute(ribbonAcross, 1));
  const ribbonMaterial = new THREE.ShaderMaterial({ uniforms: { ...uniforms, uOpacity: { value: 0.32 } }, vertexShader, fragmentShader: lineFragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const ribbons = new THREE.LineSegments(ribbonGeometry, ribbonMaterial);
  ribbons.frustumCulled = false;
  sculpture.add(ribbons);
  host.appendChild(canvas);
  canvas.dataset.quality = lowPower ? "low" : "standard";

  function render() {
    if (disposed || lost) return;
    const started = performance.now();
    try {
      renderer.render(scene, camera);
      renderCost = renderCost * 0.96 + (performance.now() - started) * 0.04;
      renderedFrames++;
      if (renderedFrames > 90 && (renderCost > 13 || slowFrames > 8)) {
        targetFps = 24;
        pixelRatio = Math.max(0.85, pixelRatio - 0.15);
        renderer.setPixelRatio(pixelRatio);
        uniforms.uPixelRatio.value = pixelRatio;
        const previous = particleGeometry.drawRange.count === Infinity ? particleCount : particleGeometry.drawRange.count;
        particleGeometry.setDrawRange(0, Math.max(Math.min(particleCount, 3072), Math.floor(previous * 0.78)));
        renderedFrames = 0;
        slowFrames = 0;
        canvas.dataset.quality = "adaptive";
      }
    } catch {
      lost = true;
      canvas.style.visibility = "hidden";
      onState(false);
    }
  }

  function updateSculpture(delta: number, immediate = false) {
    const ease = immediate ? 1 : 1 - Math.exp(-delta * 7);
    uniforms.uPointer.value.x += (targetX - uniforms.uPointer.value.x) * ease;
    uniforms.uPointer.value.y += (targetY - uniforms.uPointer.value.y) * ease;
    const form = uniforms.uForm.value;
    const formEase = immediate ? 1 : 1 - Math.exp(-delta * 4.3);
    form.x += ((currentForm === 0 ? 1 : 0) - form.x) * formEase;
    form.y += ((currentForm === 1 ? 1 : 0) - form.y) * formEase;
    form.z += ((currentForm === 2 ? 1 : 0) - form.z) * formEase;
    interactionEnergy += (targetInteraction - interactionEnergy) * ease;
    pulseEnergy *= immediate ? 0 : Math.exp(-delta * 3.4);
    uniforms.uTime.value = animationTime;
    uniforms.uPulse.value = pulseEnergy;
    uniforms.uInteraction.value = immediate ? 0 : interactionEnergy;
    const pointer = uniforms.uPointer.value;
    const idle = motion.matches ? 0 : animationTime;
    sculpture.rotation.x = 0.65 - pointer.y * 0.28 + Math.sin(idle * 0.11) * 0.035;
    sculpture.rotation.y = -0.2 + pointer.x * 0.5 + Math.sin(idle * 0.13) * 0.12;
    sculpture.rotation.z = -0.28 + pointer.x * 0.1 + Math.sin(idle * 0.08) * 0.035;
  }

  function animate(now: number) {
    frame = 0;
    if (disposed || lost || !inView || document.hidden || motion.matches) return;
    const frameDelay = now - lastFrame;
    lastFrame = now;
    slowFrames = frameDelay > (lowPower ? 65 : 40) ? slowFrames + 1 : Math.max(0, slowFrames - 0.1);
    const interval = 1000 / targetFps;
    const elapsed = now - lastRender;
    if (elapsed >= interval) {
      const delta = Math.min(elapsed / 1000, 0.08);
      animationTime += delta;
      lastRender = now - elapsed % interval;
      updateSculpture(delta);
      render();
    }
    if (!lost) frame = requestAnimationFrame(animate);
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    frame = 0;
    canvas.dataset.motion = motion.matches ? "reduced" : "full";
    if (disposed || lost || !inView || document.hidden) return;
    if (motion.matches) { updateSculpture(0, true); render(); }
    else { lastRender = lastFrame = performance.now(); frame = requestAnimationFrame(animate); }
  }
  requestRender = () => {
    if (disposed || lost || !inView || document.hidden) return;
    // Reduced motion changes the selected form directly, without a background frame loop.
    if (motion.matches) { updateSculpture(0, true); render(); }
    else if (!frame) syncAnimation();
  };

  function resize() {
    if (disposed || lost) return;
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    updateBounds();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = camera.aspect < 1 ? 7.4 / camera.aspect : 7.4;
    camera.updateProjectionMatrix();
    if (inView && !document.hidden) render();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const visibilityObserver = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; syncAnimation(); }, { threshold: 0.02 });
  visibilityObserver.observe(host);
  const onLost = (event: Event) => { event.preventDefault(); lost = true; cancelAnimationFrame(frame); frame = 0; canvas.style.visibility = "hidden"; onState(false); };
  const onRestored = () => { lost = false; canvas.style.visibility = ""; resize(); onState(true); syncAnimation(); };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  document.addEventListener("visibilitychange", syncAnimation);
  motion.addEventListener("change", syncAnimation);
  resize();
  onState(true);

  return {
    cycleForm, setForm, pulse,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      removeInteraction();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", syncAnimation);
      motion.removeEventListener("change", syncAnimation);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      particleGeometry.dispose();
      particleMaterial.dispose();
      ribbonGeometry.dispose();
      ribbonMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
