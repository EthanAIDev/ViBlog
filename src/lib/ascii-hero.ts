import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createSiliconBoardRig } from './silicon-board';

export interface AsciiHeroHandle {
  setScroll: (scroll: number) => void;
  triggerSurge: () => void;
  dispose: () => void;
}

const GLYPHS = ' .:-=+*#%@';

function createGlyphAtlas(): THREE.CanvasTexture {
  const count = GLYPHS.length;
  const cellW = 64;
  const cellH = 64;
  const canvas = document.createElement('canvas');
  canvas.width = cellW * count;
  canvas.height = cellH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 46px "IBM Plex Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < count; i++) {
    ctx.fillText(GLYPHS[i], i * cellW + cellW * 0.5, cellH * 0.54);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

const POST_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const POST_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uScene;
  uniform sampler2D uAtlas;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uLensRadius;
  uniform float uGlyphCount;
  uniform float uScroll;
  uniform float uLightMode; // 0.0 = dark precision lab, 1.0 = light daylight lab

  varying vec2 vUv;

  float bayer4(vec2 p) {
    vec2 m = mod(floor(p), 4.0);
    int idx = int(m.y) * 4 + int(m.x);
    float v = 0.0;
    if (idx == 0) v = 0.0;
    else if (idx == 1) v = 8.0;
    else if (idx == 2) v = 2.0;
    else if (idx == 3) v = 10.0;
    else if (idx == 4) v = 12.0;
    else if (idx == 5) v = 4.0;
    else if (idx == 6) v = 14.0;
    else if (idx == 7) v = 6.0;
    else if (idx == 8) v = 3.0;
    else if (idx == 9) v = 11.0;
    else if (idx == 10) v = 1.0;
    else if (idx == 11) v = 9.0;
    else if (idx == 12) v = 15.0;
    else if (idx == 13) v = 7.0;
    else if (idx == 14) v = 13.0;
    else v = 5.0;
    return (v + 0.5) / 16.0;
  }

  void main() {
    vec2 fragPx = vUv * uResolution;
    vec2 cellStep = vec2(10.5, 13.44);
    vec2 cellIndex = floor(fragPx / cellStep);
    vec2 cellLocal = fract(fragPx / cellStep);
    vec2 cellCenterPx = (cellIndex + 0.5) * cellStep;
    vec2 cellUv = clamp(cellCenterPx / uResolution, 0.001, 0.999);

    // Borderless soft organic light reveal
    float distMouse = length(fragPx - uMouse);
    float distCellMouse = length(cellCenterPx - uMouse);
    float lensR = max(uLensRadius, 0.001);
    float activeLens = smoothstep(2.0, 42.0, uLensRadius);
    float ditherNoise = (bayer4(cellIndex) - 0.5) * 0.22;
    float softReveal = smoothstep(lensR * 1.2, lensR * 0.2, distMouse) * activeLens;
    float cellDissolve = smoothstep(lensR * 1.1, lensR * 0.3, distCellMouse + ditherNoise * lensR * 0.42) * activeLens;

    vec3 rawScene = texture2D(uScene, vUv).rgb;
    vec4 cellSample = texture2D(uScene, cellUv);
    float lum = dot(cellSample.rgb, vec3(0.299, 0.587, 0.114));
    float dither = (bayer4(cellIndex) - 0.5) * 0.12;
    float shapedLum = clamp(pow(max(lum, 0.0), 0.78) + dither, 0.0, 1.0);

    // Dark-mode glowing ink palette
    vec3 darkCool = vec3(0.54, 0.73, 0.97);
    vec3 darkBright = vec3(0.94, 0.96, 1.0);
    vec3 darkAmber = vec3(1.0, 0.78, 0.48);
    vec3 darkEmerald = vec3(0.38, 0.88, 0.68);

    // Light-mode precision engineering blueprint ink palette
    vec3 lightCool = vec3(0.18, 0.34, 0.58);
    vec3 lightBright = vec3(0.06, 0.12, 0.22);
    vec3 lightAmber = vec3(0.78, 0.42, 0.08);
    vec3 lightEmerald = vec3(0.06, 0.52, 0.36);

    float warmth = clamp((cellSample.r - cellSample.b) * 2.4, 0.0, 1.0);
    float greenness = clamp((cellSample.g - max(cellSample.r, cellSample.b)) * 2.8, 0.0, 1.0);
    float highEnergy = smoothstep(0.62, 0.98, lum);

    vec3 darkGlyph = mix(darkCool, darkBright, smoothstep(0.28, 0.85, shapedLum));
    darkGlyph = mix(darkGlyph, darkAmber, clamp(warmth * 0.88, 0.0, 1.0));
    darkGlyph = mix(darkGlyph, darkEmerald, clamp(greenness * 0.92, 0.0, 1.0));
    darkGlyph = mix(darkGlyph, vec3(1.0, 0.96, 0.88), highEnergy * 0.55);

    vec3 lightGlyph = mix(lightCool, lightBright, smoothstep(0.24, 0.82, shapedLum));
    lightGlyph = mix(lightGlyph, lightAmber, clamp(warmth * 0.9 + highEnergy * 0.45, 0.0, 1.0));
    lightGlyph = mix(lightGlyph, lightEmerald, clamp(greenness * 0.92, 0.0, 1.0));

    vec3 glyphColor = mix(darkGlyph, lightGlyph, uLightMode);

    float glyphIdx = floor(shapedLum * (uGlyphCount - 0.001));
    vec2 atlasUv = vec2((glyphIdx + cellLocal.x) / uGlyphCount, cellLocal.y);
    float glyphAlpha = texture2D(uAtlas, atlasUv).r;
    float activeGate = smoothstep(0.045, 0.13, lum);
    float stylizedMask = glyphAlpha * activeGate * (0.34 + 0.9 * shapedLum);

    float remainingChars = 1.0 - cellDissolve * 0.96;
    float charStrength = stylizedMask * remainingChars;

    vec3 darkAsciiRgb = glyphColor * charStrength + cellSample.rgb * 0.22;
    vec3 lightAsciiRgb = glyphColor;
    vec3 asciiRgb = mix(darkAsciiRgb, lightAsciiRgb, uLightMode);

    float darkAsciiAlpha = clamp(charStrength * 0.95 + lum * 0.42, 0.0, 1.0);
    float lightAsciiAlpha = clamp(charStrength * 0.88, 0.0, 0.92);
    float asciiAlpha = mix(darkAsciiAlpha, lightAsciiAlpha, uLightMode);

    float sceneMask = smoothstep(0.01, 0.055, length(rawScene));
    // In light mode, gently lift the revealed motherboard brightness for daylight architectural look
    vec3 darkRevealed = rawScene * 1.24;
    vec3 lightRevealed = clamp(rawScene * 1.08 + vec3(0.08, 0.11, 0.16), 0.0, 1.0);
    vec3 revealedRgb = mix(darkRevealed, lightRevealed, uLightMode);

    vec3 outRgb = mix(asciiRgb, revealedRgb, softReveal);
    float outAlpha = mix(asciiAlpha, sceneMask, softReveal);

    // Calm left-side readability + smooth scroll fade-out at hero exit
    float leftReadability = smoothstep(0.0, 0.36, vUv.x);
    outAlpha *= mix(0.58, 1.0, leftReadability);
    float scrollFade = 1.0 - smoothstep(0.18, 0.98, uScroll) * 0.82;
    outAlpha *= scrollFade;

    gl_FragColor = vec4(outRgb, clamp(outAlpha, 0.0, 1.0));
  }
`;

export function createAsciiHero(host: HTMLElement, onInteract?: () => void): AsciiHeroHandle {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth <= 760 ? 1.25 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 70);
  camera.position.set(0, 0.65, 11.4);
  camera.lookAt(0, 0, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  envScene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
      obj.material.color.set(0x1b2332);
    }
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshLambertMaterial) {
      obj.material.emissive.set(
        obj.position.z > 8 ? 0xffd29a : obj.position.x > 10 ? 0x8cbbf8 : 0xd6e6fa,
      );
      obj.material.emissiveIntensity *= 0.52;
    }
  });
  const envTarget = pmrem.fromScene(envScene, 0.035);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 1.0;
  envScene.dispose();

  const keyLight = new THREE.DirectionalLight(0xf3f8ff, 2.8);
  keyLight.position.set(-4.5, 6.4, 5.8);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x75aff8, 3.1);
  rimLight.position.set(6.5, 2.8, -4.5);
  scene.add(rimLight);

  const warmFill = new THREE.DirectionalLight(0xf5b971, 1.9);
  warmFill.position.set(-2.0, -4.5, 3.0);
  scene.add(warmFill);

  const cursorLight = new THREE.PointLight(0xe5f1ff, 9.5, 10, 1.8);
  cursorLight.position.set(2.0, 0.5, 4.5);
  scene.add(cursorLight);

  const rigContainer = new THREE.Group();
  rigContainer.position.set(1.48, 0.04, 0);
  scene.add(rigContainer);

  const surgeLight = new THREE.PointLight(0xffcf88, 0, 7.2, 1.6);
  rigContainer.add(surgeLight);

  const rig = createSiliconBoardRig();
  rigContainer.add(rig.root);

  const activeSurges: number[] = [];

  const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });

  const atlas = createGlyphAtlas();
  const postScene = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const readLightTarget = () => (document.documentElement.dataset.theme === 'light' ? 1 : 0);
  let targetLightMode = readLightTarget();
  let smoothLightMode = targetLightMode;

  const themeObserver = new MutationObserver(() => {
    targetLightMode = readLightTarget();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const postUniforms = {
    uScene: { value: renderTarget.texture },
    uAtlas: { value: atlas },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(-9999, -9999) },
    uLensRadius: { value: 0.0 },
    uGlyphCount: { value: GLYPHS.length },
    uScroll: { value: 0.0 },
    uLightMode: { value: smoothLightMode },
  };
  const postGeo = new THREE.PlaneGeometry(2, 2);
  const postMat = new THREE.ShaderMaterial({
    vertexShader: POST_VERTEX,
    fragmentShader: POST_FRAGMENT,
    uniforms: postUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  postScene.add(new THREE.Mesh(postGeo, postMat));

  let width = 1;
  let height = 1;
  let visible = true;
  let disposed = false;
  let raf = 0;
  let time = 0;
  let last = performance.now();
  let interacted = false;

  let pointerInside = false;
  const targetMouse = new THREE.Vector2(0, 0);
  const smoothMouse = new THREE.Vector2(0, 0);
  let lensRadius = 0;
  let scrollVal = 0;
  let smoothScroll = 0;
  let scrollPulseFired = false;

  let dragging = false;
  let downX = 0;
  let downY = 0;
  let lastX = 0;
  let lastY = 0;
  let userYaw = 0;
  let userPitch = 0;
  let velX = 0;
  let velY = 0;
  let movedDist = 0;

  let baseCamZ = rig.cameraZDesktop;

  function markInteracted() {
    if (!interacted) {
      interacted = true;
      onInteract?.();
    }
  }

  function applyLayoutSizing() {
    if (!width || !height) return;
    const isMobile = width <= 760;
    camera.aspect = width / height;
    camera.fov = isMobile ? 46 : 34;
    baseCamZ = isMobile ? rig.cameraZMobile : rig.cameraZDesktop;
    camera.position.z = baseCamZ;
    rigContainer.position.x = isMobile ? 0.0 : 1.48;
    rigContainer.position.y = isMobile ? 0.45 : 0.04;
    rigContainer.scale.setScalar(isMobile ? 0.72 : 0.96);
    camera.updateProjectionMatrix();
  }

  function launchSurge() {
    activeSurges.push(time);
    if (activeSurges.length > 8) activeSurges.shift();
  }

  function updateSize() {
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width;
    height = rect.height;
    const isMobile = width <= 760;
    const dpr = Math.min(devicePixelRatio, isMobile ? 1.25 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    const drawW = Math.max(1, Math.round(width * dpr));
    const drawH = Math.max(1, Math.round(height * dpr));
    renderTarget.setSize(drawW, drawH);
    postUniforms.uResolution.value.set(drawW, drawH);
    applyLayoutSizing();
  }

  const resize = new ResizeObserver(updateSize);
  resize.observe(host);
  updateSize();

  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }, { rootMargin: '120px' });
  intersection.observe(host);

  const canvas = renderer.domElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.touchAction = 'pan-y';
  canvas.style.cursor = 'grab';

  const stage = host.parentElement || host;

  function toDrawCoords(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const dpr = renderer.getPixelRatio();
    const x = (clientX - rect.left) * dpr;
    const y = (rect.height - (clientY - rect.top)) * dpr;
    return {
      x,
      y,
      nx: ((clientX - rect.left) / rect.width) * 2 - 1,
      ny: -(((clientY - rect.top) / rect.height) * 2 - 1),
    };
  }

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') {
      const c = toDrawCoords(e.clientX, e.clientY);
      targetMouse.set(c.x, c.y);
      if (!pointerInside) {
        smoothMouse.copy(targetMouse);
        pointerInside = true;
      }
      cursorLight.position.set(c.nx * 5.2, c.ny * 3.2, 4.8);
    }

    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      movedDist += Math.hypot(dx, dy);
      if (movedDist > 10) markInteracted();
      velX = dx * 0.005;
      velY = dy * 0.004;
      userYaw += velX;
      userPitch = THREE.MathUtils.clamp(userPitch + velY, -0.75, 0.75);
      lastX = e.clientX;
      lastY = e.clientY;
    }
  };

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    dragging = true;
    movedDist = 0;
    downX = lastX = e.clientX;
    downY = lastY = e.clientY;
    velX = 0;
    velY = 0;
    canvas.style.cursor = 'grabbing';
  };

  const onUp = (e: PointerEvent) => {
    if (dragging && movedDist < 7 && Math.hypot(e.clientX - downX, e.clientY - downY) < 7) {
      markInteracted();
      launchSurge();
    }
    dragging = false;
    canvas.style.cursor = 'grab';
  };

  const onLeave = () => {
    pointerInside = false;
    dragging = false;
    canvas.style.cursor = 'grab';
  };

  stage.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  stage.addEventListener('pointerleave', onLeave);
  stage.addEventListener('pointercancel', onLeave);

  if (!reducedMotion) activeSurges.push(0.25);

  function frame(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!visible || document.hidden) return;

    if (!reducedMotion) time += dt;

    // Silky theme transition inside WebGL shader & studio lighting (zero restart/flicker)
    smoothLightMode += (targetLightMode - smoothLightMode) * (1 - Math.exp(-dt * 10));
    postUniforms.uLightMode.value = smoothLightMode;
    scene.environmentIntensity = 1.0 + smoothLightMode * 0.45;
    keyLight.intensity = 2.8 + smoothLightMode * 0.7;

    smoothScroll += (scrollVal - smoothScroll) * (1 - Math.exp(-dt * 8));
    postUniforms.uScroll.value = smoothScroll;

    if (!reducedMotion) {
      if (smoothScroll > 0.22 && !scrollPulseFired) {
        scrollPulseFired = true;
        launchSurge();
      } else if (smoothScroll < 0.06) {
        scrollPulseFired = false;
      }
    }

    if (!dragging) {
      userYaw += velX;
      userPitch = THREE.MathUtils.clamp(userPitch + velY, -0.75, 0.75);
      velX *= 0.9;
      velY *= 0.9;
    }

    const dpr = renderer.getPixelRatio();
    const targetLens = pointerInside ? (width <= 760 ? 145 : 225) * dpr : 0;
    lensRadius += (targetLens - lensRadius) * (1 - Math.exp(-dt * 9));
    smoothMouse.lerp(targetMouse, 1 - Math.exp(-dt * 14));
    postUniforms.uMouse.value.copy(smoothMouse);
    postUniforms.uLensRadius.value = lensRadius;

    while (activeSurges.length > 0 && time - activeSurges[0] > 3.2) {
      activeSurges.shift();
    }

    const isMobile = width <= 760;
    camera.position.z = baseCamZ - smoothScroll * (isMobile ? 1.1 : 1.65);
    camera.position.y = 0.65 + smoothScroll * 0.72;
    camera.lookAt(0, -smoothScroll * 0.35, 0);

    rigContainer.position.y = (isMobile ? 0.45 : 0.04) - smoothScroll * 0.55;
    rigContainer.rotation.y = rig.defaultYaw + Math.sin(time * 0.24) * 0.2 + userYaw + smoothScroll * 0.36;
    rigContainer.rotation.x = rig.defaultPitch + Math.cos(time * 0.2) * 0.05 + userPitch + smoothScroll * 0.28;

    rig.update(time, dt, smoothScroll, activeSurges, surgeLight);

    renderer.setRenderTarget(renderTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(postScene, postCam);
  }

  raf = requestAnimationFrame(frame);

  return {
    setScroll(scroll) {
      scrollVal = THREE.MathUtils.clamp(scroll, 0, 1);
    },
    triggerSurge() {
      markInteracted();
      launchSurge();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
      resize.disconnect();
      intersection.disconnect();
      stage.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('pointercancel', onLeave);
      rig.dispose();
      renderTarget.dispose();
      atlas.dispose();
      postGeo.dispose();
      postMat.dispose();
      pmrem.dispose();
      envTarget.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
