import * as THREE from 'three';
import { addFramedMesh, createChamferedSlab, createPrecisionMaterials } from './hero-models/types';

export interface SiliconBoardRig {
  root: THREE.Group;
  defaultYaw: number;
  defaultPitch: number;
  cameraZDesktop: number;
  cameraZMobile: number;
  update: (time: number, dt: number, scroll: number, activeSurges: number[], surgeLight: THREE.PointLight) => void;
  dispose: () => void;
}

function createBackplaneTexture(): { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } {
  const w = 1536;
  const h = 896;
  const c1 = document.createElement('canvas');
  c1.width = w;
  c1.height = h;
  const ctx = c1.getContext('2d')!;

  const c2 = document.createElement('canvas');
  c2.width = w;
  c2.height = h;
  const ectx = c2.getContext('2d')!;

  ctx.fillStyle = '#0b121f';
  ctx.fillRect(0, 0, w, h);
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, w, h);

  // Ultra-fine PCB grid
  ctx.strokeStyle = 'rgba(130, 170, 225, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 32; x < w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x, h - 20);
    ctx.stroke();
  }
  for (let y = 32; y < h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(w - 20, y);
    ctx.stroke();
  }

  // Etched micro-circuit traces + perimeter ruler ticks
  const drawTraces = (c: CanvasRenderingContext2D, color: string, lw: number) => {
    c.strokeStyle = color;
    c.lineWidth = lw;
    for (let i = 0; i < 16; i++) {
      const y = 112 + i * 44;
      const jog = 360 + (i % 5) * 155;
      c.beginPath();
      c.moveTo(56, y);
      c.lineTo(jog, y);
      c.lineTo(jog + 28, y + (i % 2 === 0 ? 18 : -18));
      c.lineTo(w - 56, y + (i % 2 === 0 ? 18 : -18));
      c.stroke();
    }
    c.strokeRect(24, 24, w - 48, h - 48);
    for (let x = 64; x < w - 64; x += 48) {
      c.beginPath();
      c.moveTo(x, 24);
      c.lineTo(x, 38);
      c.moveTo(x, h - 24);
      c.lineTo(x, h - 38);
      c.stroke();
    }
  };
  drawTraces(ctx, 'rgba(135, 176, 232, 0.24)', 1.6);
  drawTraces(ectx, 'rgba(105, 155, 225, 0.22)', 1.5);

  const labels: [number, number, string, string][] = [
    [68, 82, '01 // 3x INTAKE_BUS', '#9ec8ff'],
    [455, 82, '02 // ORCHESTRATOR_DIE', '#f5b971'],
    [855, 82, '03 // PARALLEL [RAG · SQL · TOOL]', '#58d8a8'],
    [1225, 82, '04 // 3x EGRESS_OUT', '#f5b971'],
    [68, 220, 'IN_01 · PROMPT', '#8fbdf7'],
    [68, 456, 'IN_02 · CONTEXT', '#8fbdf7'],
    [68, 692, 'IN_03 · SCHEMA', '#8fbdf7'],
    [1318, 220, 'OUT_01 · INSIGHT', '#f5c27a'],
    [1318, 456, 'OUT_02 · CHART', '#f5c27a'],
    [1318, 692, 'OUT_03 · TRACE', '#7cd4fd'],
    [68, h - 46, 'REV 4.5 · GLASS-BOX AGENT SUBSTRATE · MULTI-CHANNEL CONCURRENT PIPELINE', '#7d9bc6'],
  ];
  for (const [lx, ly, txt, col] of labels) {
    const isSmall = txt.includes('IN_0') || txt.includes('OUT_0');
    const font = isSmall
      ? '500 15px "IBM Plex Mono", ui-monospace, monospace'
      : '600 19px "IBM Plex Mono", ui-monospace, monospace';
    ctx.fillStyle = col;
    ctx.font = font;
    ctx.fillText(txt, lx, ly);
    ectx.fillStyle = col;
    ectx.font = font;
    ectx.fillText(txt, lx, ly);
  }

  const map = new THREE.CanvasTexture(c1);
  map.anisotropy = 8;
  map.colorSpace = THREE.SRGBColorSpace;
  const emissiveMap = new THREE.CanvasTexture(c2);
  emissiveMap.anisotropy = 8;
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  return { map, emissiveMap };
}

interface BoardRoute {
  points: THREE.Vector3[];
  segmentLengths: number[];
  totalLength: number;
  color: THREE.Color;
  headColor: THREE.Color;
  surgeStart: number;
  surgeDuration: number;
  sourceIdx: number | null;
  targetIdx: number | null;
  isExit: boolean;
}

function makeBoardRoute(
  coords: [number, number, number][],
  hexColor: number,
  surgeStart: number,
  surgeDuration: number,
  sourceIdx: number | null,
  targetIdx: number | null,
  isExit = false,
): BoardRoute {
  const points = coords.map((c) => new THREE.Vector3(...c));
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const len = points[i].distanceTo(points[i + 1]);
    segmentLengths.push(len);
    totalLength += len;
  }
  const color = new THREE.Color(hexColor);
  const headColor = color.clone().lerp(new THREE.Color(0xfff9ec), 0.62);
  return { points, segmentLengths, totalLength, color, headColor, surgeStart, surgeDuration, sourceIdx, targetIdx, isExit };
}

function sampleBoardRoute(r: BoardRoute, t: number, outPos: THREE.Vector3, outDir: THREE.Vector3) {
  let d = THREE.MathUtils.clamp(t, 0, 1) * r.totalLength;
  for (let i = 0; i < r.segmentLengths.length; i++) {
    const len = r.segmentLengths[i];
    if (d <= len || i === r.segmentLengths.length - 1) {
      const lt = len > 0 ? d / len : 0;
      outPos.lerpVectors(r.points[i], r.points[i + 1], lt);
      outDir.subVectors(r.points[i + 1], r.points[i]).normalize();
      return;
    }
    d -= len;
  }
}

/**
 * Production 3-in × 3-out Silicon Motherboard Rig:
 * - Etched PCB backplane + chamfered silicon packages + instanced SMD pins
 * - Concurrent instanced surge pool (up to 8 independent waves, zero interruption on rapid clicks)
 * - Scroll-driven exploded-view elevation revealing internal trace geometry
 */
export function createSiliconBoardRig(): SiliconBoardRig {
  const root = new THREE.Group();
  const mats = createPrecisionMaterials();
  const geos: THREE.BufferGeometry[] = [];
  const extraMats: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const { map, emissiveMap } = createBackplaneTexture();
  textures.push(map, emissiveMap);

  const boardTopMat = new THREE.MeshPhysicalMaterial({
    map,
    emissive: new THREE.Color(0xffffff),
    emissiveMap,
    emissiveIntensity: 0.55,
    metalness: 0.25,
    roughness: 0.34,
    clearcoat: 0.72,
    clearcoatRoughness: 0.2,
  });
  extraMats.push(boardTopMat);

  const boardGeo = new THREE.BoxGeometry(7.0, 0.14, 3.95);
  geos.push(boardGeo);
  const boardMesh = new THREE.Mesh(boardGeo, [
    mats.darkSteel,
    mats.darkSteel,
    boardTopMat,
    mats.anodized,
    mats.darkSteel,
    mats.darkSteel,
  ]);
  boardMesh.position.y = -0.32;
  const boardEdge = new THREE.LineSegments(new THREE.EdgesGeometry(boardGeo, 20), mats.edgeBlue);
  geos.push(boardEdge.geometry);
  boardMesh.add(boardEdge);
  root.add(boardMesh);

  // Corner titanium mounting standoffs
  const standoffGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.28, 6);
  geos.push(standoffGeo);
  for (const [sx, sz] of [[-3.22, -1.7], [3.22, -1.7], [-3.22, 1.7], [3.22, 1.7]]) {
    const bolt = new THREE.Mesh(standoffGeo, mats.titanium);
    bolt.position.set(sx, -0.32, sz);
    root.add(bolt);
  }

  // 3 Left Intake Edge Connectors + 3 Right Egress Headers
  const portZs = [-1.02, 0.0, 1.02];
  const portHousingGeo = createChamferedSlab(0.24, 0.22, 0.34, 0.02);
  geos.push(portHousingGeo);
  for (const pz of portZs) {
    addFramedMesh(root, portHousingGeo.clone(), mats.darkSteel, mats.edgeBlue, geos)
      .position.set(-3.48, -0.22, pz);
    addFramedMesh(root, portHousingGeo.clone(), mats.titanium, mats.edgeAmber, geos)
      .position.set(3.48, -0.22, pz);
  }

  const modGlowMats: THREE.MeshStandardMaterial[] = [];
  const modEnergies = [0, 0, 0, 0, 0, 0];
  function makeGlow(color: number, base = 0.52) {
    const m = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: base,
      roughness: 0.25,
      metalness: 0.4,
      flatShading: true,
    });
    extraMats.push(m);
    modGlowMats.push(m);
    return m;
  }

  const pinGeo = new THREE.BoxGeometry(0.032, 0.045, 0.075);
  geos.push(pinGeo);
  function addSmdPins(parent: THREE.Object3D, w: number, d: number, countX: number, countZ: number) {
    const total = countX * 2 + countZ * 2;
    const inst = new THREE.InstancedMesh(pinGeo, mats.titanium, total);
    const dummy = new THREE.Object3D();
    let k = 0;
    for (let i = 0; i < countX; i++) {
      const px = -w * 0.42 + (countX > 1 ? (i / (countX - 1)) * w * 0.84 : 0);
      for (const side of [-1, 1]) {
        dummy.position.set(px, -0.08, side * (d / 2 + 0.03));
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        inst.setMatrixAt(k++, dummy.matrix);
      }
    }
    for (let i = 0; i < countZ; i++) {
      const pz = -d * 0.42 + (countZ > 1 ? (i / (countZ - 1)) * d * 0.84 : 0);
      for (const side of [-1, 1]) {
        dummy.position.set(side * (w / 2 + 0.03), -0.08, pz);
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.updateMatrix();
        inst.setMatrixAt(k++, dummy.matrix);
      }
    }
    inst.instanceMatrix.needsUpdate = true;
    parent.add(inst);
  }

  // Track hardware modules for scroll-driven exploded-view lift
  const liftableModules: { group: THREE.Group; baseY: number; liftFactor: number }[] = [];

  // Module 0: Multi-Channel Intake Multiplexer
  const intakeGroup = new THREE.Group();
  intakeGroup.position.set(-2.55, -0.1, 0);
  root.add(intakeGroup);
  liftableModules.push({ group: intakeGroup, baseY: -0.1, liftFactor: 0.42 });
  addFramedMesh(intakeGroup, createChamferedSlab(0.84, 0.24, 1.62, 0.03), mats.anodized, mats.edgeBlue, geos);
  addFramedMesh(intakeGroup, createChamferedSlab(0.62, 0.14, 1.32, 0.025), mats.titanium, mats.edgeSilver, geos)
    .position.y = 0.16;
  addSmdPins(intakeGroup, 0.84, 1.62, 5, 9);
  const intakeGlow = makeGlow(0x9ec8ff, 0.62);
  for (const lz of [-0.42, 0, 0.42]) {
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.24), intakeGlow);
    geos.push(led.geometry);
    led.position.set(0, 0.24, lz);
    intakeGroup.add(led);
  }

  // Module 1: Central Orchestrator Silicon Die
  const hubGroup = new THREE.Group();
  hubGroup.position.set(-0.92, -0.06, 0);
  root.add(hubGroup);
  liftableModules.push({ group: hubGroup, baseY: -0.06, liftFactor: 0.78 });
  addFramedMesh(hubGroup, createChamferedSlab(1.48, 0.24, 1.48, 0.04), mats.anodized, mats.edgeAmber, geos);
  addSmdPins(hubGroup, 1.48, 1.48, 10, 10);

  const frameBarGeo = createChamferedSlab(1.24, 0.14, 0.16, 0.02);
  geos.push(frameBarGeo);
  for (const side of [-0.54, 0.54]) {
    const barZ = new THREE.Mesh(frameBarGeo, mats.titanium);
    barZ.position.set(0, 0.18, side);
    hubGroup.add(barZ);
    const barX = new THREE.Mesh(frameBarGeo, mats.titanium);
    barX.rotation.y = Math.PI / 2;
    barX.position.set(side, 0.18, 0);
    hubGroup.add(barX);
  }
  addFramedMesh(hubGroup, createChamferedSlab(0.84, 0.12, 0.84, 0.02), mats.darkSteel, mats.edgeAmber, geos)
    .position.y = 0.16;
  const hubGlow = makeGlow(0xf5b971, 0.85);
  const hubCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), hubGlow);
  geos.push(hubCrystal.geometry);
  hubCrystal.position.y = 0.42;
  const hubHalo = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.TorusGeometry(0.38, 0.018, 4, 8)), mats.edgeAmber);
  geos.push(hubHalo.geometry);
  hubHalo.rotation.x = Math.PI / 2;
  hubHalo.position.y = 0.36;
  hubGroup.add(hubCrystal, hubHalo);

  // Module 2: Upper RAG Stacked Glass Memory Blades
  const ragGroup = new THREE.Group();
  ragGroup.position.set(0.92, -0.1, -1.1);
  root.add(ragGroup);
  liftableModules.push({ group: ragGroup, baseY: -0.1, liftFactor: 0.62 });
  addFramedMesh(ragGroup, createChamferedSlab(1.36, 0.2, 0.92, 0.03), mats.anodized, mats.edgeBlue, geos);
  addSmdPins(ragGroup, 1.36, 0.92, 8, 4);

  const ragGlow = makeGlow(0x7cd4fd, 0.65);
  const bladeGeo = createChamferedSlab(0.08, 0.72, 0.72, 0.012);
  geos.push(bladeGeo);
  for (let i = 0; i < 4; i++) {
    const bx = -0.42 + i * 0.28;
    const blade = new THREE.Mesh(bladeGeo, mats.glass);
    blade.position.set(bx, 0.44, 0);
    const bEdge = new THREE.LineSegments(new THREE.EdgesGeometry(bladeGeo, 20), mats.edgeBlue);
    geos.push(bEdge.geometry);
    blade.add(bEdge);
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.045, 0.66), ragGlow);
    geos.push(topBar.geometry);
    topBar.position.set(bx, 0.82, 0);
    ragGroup.add(blade, topBar);
  }

  // Module 3: Middle SQL Read-Only Safety Gateway
  const gwGroup = new THREE.Group();
  gwGroup.position.set(0.92, -0.1, 0);
  root.add(gwGroup);
  liftableModules.push({ group: gwGroup, baseY: -0.1, liftFactor: 0.56 });
  addFramedMesh(gwGroup, createChamferedSlab(1.28, 0.18, 0.86, 0.028), mats.anodized, mats.edgeEmerald, geos);
  addSmdPins(gwGroup, 1.28, 0.86, 7, 4);

  const gwGlow = makeGlow(0x58d8a8, 0.72);
  for (const ax of [-0.34, 0.34]) {
    addFramedMesh(gwGroup, createChamferedSlab(0.14, 0.56, 0.14, 0.015), mats.titanium, mats.edgeEmerald, geos)
      .position.set(ax, 0.34, -0.3);
    addFramedMesh(gwGroup, createChamferedSlab(0.14, 0.56, 0.14, 0.015), mats.titanium, mats.edgeEmerald, geos)
      .position.set(ax, 0.34, 0.3);
    addFramedMesh(gwGroup, createChamferedSlab(0.16, 0.12, 0.76, 0.015), mats.titanium, mats.edgeEmerald, geos)
      .position.set(ax, 0.6, 0);
  }
  const curtainMat = new THREE.MeshBasicMaterial({
    color: 0x58d8a8,
    transparent: true,
    opacity: 0.24,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  extraMats.push(curtainMat);
  const curtainGeo = new THREE.PlaneGeometry(0.56, 0.44);
  curtainGeo.rotateY(Math.PI / 2);
  geos.push(curtainGeo);
  const curtain = new THREE.Mesh(curtainGeo, curtainMat);
  curtain.position.set(0, 0.34, 0);
  const gwStrip = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.08), gwGlow);
  geos.push(gwStrip.geometry);
  gwStrip.position.set(0, 0.12, 0);
  gwGroup.add(curtain, gwStrip);

  // Module 4: Lower Tool Accelerator Heatsink Array
  const toolGroup = new THREE.Group();
  toolGroup.position.set(0.92, -0.1, 1.1);
  root.add(toolGroup);
  liftableModules.push({ group: toolGroup, baseY: -0.1, liftFactor: 0.62 });
  addFramedMesh(toolGroup, createChamferedSlab(1.36, 0.2, 0.88, 0.03), mats.anodized, mats.edgeAmber, geos);
  addSmdPins(toolGroup, 1.36, 0.88, 8, 4);
  const toolGlow = makeGlow(0xf5b971, 0.62);
  const finGeo = createChamferedSlab(1.16, 0.28, 0.055, 0.008);
  geos.push(finGeo);
  for (let f = 0; f < 5; f++) {
    const fin = new THREE.Mesh(finGeo, mats.titanium);
    fin.position.set(0, 0.24, -0.28 + f * 0.14);
    toolGroup.add(fin);
  }
  const toolLed = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.04, 0.06), toolGlow);
  geos.push(toolLed.geometry);
  toolLed.position.set(0, 0.12, 0.38);
  toolGroup.add(toolLed);

  // Module 5: Multi-Channel Output Synthesis Dispatcher
  const outGroup = new THREE.Group();
  outGroup.position.set(2.55, -0.1, 0);
  root.add(outGroup);
  liftableModules.push({ group: outGroup, baseY: -0.1, liftFactor: 0.48 });
  addFramedMesh(outGroup, createChamferedSlab(0.92, 0.26, 1.66, 0.035), mats.anodized, mats.edgeAmber, geos);
  addFramedMesh(outGroup, createChamferedSlab(0.68, 0.16, 1.36, 0.025), mats.titanium, mats.edgeSilver, geos)
    .position.y = 0.18;
  addSmdPins(outGroup, 0.92, 1.66, 6, 9);
  const outGlow = makeGlow(0xffcf88, 0.72);
  for (const lz of [-0.44, 0, 0.44]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.24), outGlow);
    geos.push(bar.geometry);
    bar.position.set(0, 0.28, lz);
    outGroup.add(bar);
  }

  // 3-Intake -> Hub -> 3-Parallel -> 3-Egress Dual-Rail Shielded Bus Routes
  const yBus = -0.16;
  const routes: BoardRoute[] = [
    makeBoardRoute([[-4.55, yBus, -1.02], [-3.22, yBus, -1.02], [-3.22, yBus, -0.52], [-2.55, yBus, -0.52]], 0xbbe0ff, 0.0, 0.36, null, 0),
    makeBoardRoute([[-4.55, yBus, 0.0], [-2.55, yBus, 0.0]], 0xd4ecff, 0.03, 0.34, null, 0),
    makeBoardRoute([[-4.55, yBus, 1.02], [-3.22, yBus, 1.02], [-3.22, yBus, 0.52], [-2.55, yBus, 0.52]], 0x9ec8ff, 0.06, 0.36, null, 0),

    makeBoardRoute([[-2.12, yBus, -0.32], [-0.92, yBus, -0.32]], 0xffd290, 0.32, 0.38, 0, 1),
    makeBoardRoute([[-2.12, yBus, 0.32], [-0.92, yBus, 0.32]], 0xa8d4ff, 0.36, 0.38, 0, 1),

    makeBoardRoute([[-0.92, yBus, -0.68], [-0.15, yBus, -0.68], [-0.15, yBus, -1.1], [0.92, yBus, -1.1]], 0x7cd4fd, 0.68, 0.48, 1, 2),
    makeBoardRoute([[-0.18, yBus, 0.0], [0.92, yBus, 0.0]], 0x58d8a8, 0.7, 0.42, 1, 3),
    makeBoardRoute([[-0.92, yBus, 0.68], [-0.15, yBus, 0.68], [-0.15, yBus, 1.1], [0.92, yBus, 1.1]], 0xf5b971, 0.72, 0.48, 1, 4),

    makeBoardRoute([[1.58, yBus, -1.1], [1.98, yBus, -1.1], [1.98, yBus, -0.52], [2.55, yBus, -0.52]], 0x7cd4fd, 1.15, 0.48, 2, 5),
    makeBoardRoute([[1.54, yBus, 0.0], [2.55, yBus, 0.0]], 0x58d8a8, 1.12, 0.42, 3, 5),
    makeBoardRoute([[1.58, yBus, 1.1], [1.98, yBus, 1.1], [1.98, yBus, 0.52], [2.55, yBus, 0.52]], 0xf5b971, 1.18, 0.48, 4, 5),

    makeBoardRoute([[2.98, yBus, -0.52], [3.26, yBus, -0.52], [3.26, yBus, -1.02], [4.72, yBus, -1.02]], 0xffd592, 1.62, 0.56, 5, null, true),
    makeBoardRoute([[2.98, yBus, 0.0], [4.78, yBus, 0.0]], 0xffe4b3, 1.58, 0.54, 5, null, true),
    makeBoardRoute([[2.98, yBus, 0.52], [3.26, yBus, 0.52], [3.26, yBus, 1.02], [4.72, yBus, 1.02]], 0x7cd4fd, 1.66, 0.56, 5, null, true),
  ];

  const upVec = new THREE.Vector3(0, 1, 0);
  const segDir = new THREE.Vector3();
  const segMid = new THREE.Vector3();
  const railGeo = new THREE.BoxGeometry(0.028, 1.0, 0.02);
  geos.push(railGeo);

  for (const r of routes) {
    for (let i = 0; i < r.points.length - 1; i++) {
      const len = r.segmentLengths[i];
      segDir.subVectors(r.points[i + 1], r.points[i]).normalize();
      segMid.lerpVectors(r.points[i], r.points[i + 1], 0.5);
      for (const offset of [-0.04, 0.04]) {
        const rail = new THREE.Mesh(railGeo, mats.titanium);
        rail.position.copy(segMid);
        if (Math.abs(segDir.x) > 0.5) rail.position.z += offset;
        else rail.position.x += offset;
        rail.scale.set(1, len, 1);
        rail.quaternion.setFromUnitVectors(upVec, segDir);
        root.add(rail);
      }
    }
  }

  const idleGeo = new THREE.BoxGeometry(0.056, 0.16, 0.056);
  geos.push(idleGeo);
  const idlePackets = routes.map((route, idx) => {
    const mat = new THREE.MeshBasicMaterial({
      color: route.color,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    extraMats.push(mat);
    const mesh = new THREE.Mesh(idleGeo, mat);
    root.add(mesh);
    return { route, mesh, mat, offset: route.surgeStart * 0.42 + idx * 0.11, speed: 0.24 };
  });

  // Concurrent Multi-Wave Surge Pool (up to 8 overlapping waves, zero interruption)
  const MAX_CONCURRENT_WAVES = 8;
  const TRAIN_LEN = 4;
  const maxSurgeInstances = routes.length * MAX_CONCURRENT_WAVES * TRAIN_LEN;

  const surgeUnitGeo = new THREE.BoxGeometry(0.12, 0.42, 0.095);
  geos.push(surgeUnitGeo);
  const surgeInstMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  extraMats.push(surgeInstMat);

  const surgeInstMesh = new THREE.InstancedMesh(surgeUnitGeo, surgeInstMat, maxSurgeInstances);
  surgeInstMesh.count = 0;
  surgeInstMesh.frustumCulled = false;
  root.add(surgeInstMesh);

  const dummy = new THREE.Object3D();
  const tmpPos = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();
  const tmpColor = new THREE.Color();
  const lightAccum = new THREE.Vector3();
  let smoothScroll = 0;

  return {
    root,
    defaultYaw: -0.34,
    defaultPitch: 0.56,
    cameraZDesktop: 11.4,
    cameraZMobile: 14.6,
    update(time, dt, scroll, activeSurges, surgeLight) {
      smoothScroll += (scroll - smoothScroll) * (1 - Math.exp(-dt * 8));

      // Scroll-driven exploded-view elevation of hardware packages above the PCB
      for (const mod of liftableModules) {
        mod.group.position.y = mod.baseY + smoothScroll * mod.liftFactor;
      }

      hubCrystal.rotation.y = time * 1.1 + smoothScroll * 1.6;
      hubCrystal.rotation.x = time * 0.7;
      hubCrystal.position.y = 0.42 + smoothScroll * 0.34;
      hubHalo.rotation.z = -time * 0.6;
      hubHalo.position.y = 0.36 + smoothScroll * 0.22;

      for (let i = 0; i < modEnergies.length; i++) {
        modEnergies[i] *= Math.exp(-dt * 3.4);
      }

      for (const p of idlePackets) {
        const prog = (((time * p.speed - p.offset) % 1) + 1) % 1;
        sampleBoardRoute(p.route, prog, tmpPos, tmpDir);
        p.mesh.position.copy(tmpPos);
        p.mesh.position.y += 0.04;
        p.mesh.quaternion.setFromUnitVectors(upVec, tmpDir);
        p.mat.opacity = 0.14 + Math.sin(prog * Math.PI) * 0.38;
      }

      let instanceIdx = 0;
      let lightCount = 0;
      lightAccum.set(0, 0, 0);

      for (const t0 of activeSurges) {
        const age = time - t0;
        if (age < 0 || age > 2.8) continue;

        for (const route of routes) {
          const localT = (age - route.surgeStart) / route.surgeDuration;
          if (localT < 0 || localT > 1 + (TRAIN_LEN - 1) * 0.09 + 0.05) continue;

          if (localT >= 0 && localT <= 0.35 && route.sourceIdx !== null) {
            modEnergies[route.sourceIdx] = Math.max(modEnergies[route.sourceIdx], 1.15);
          }
          if (localT >= 0.72 && localT <= 1.2 && route.targetIdx !== null) {
            modEnergies[route.targetIdx] = Math.max(modEnergies[route.targetIdx], 1.4);
          }

          for (let segIdx = 0; segIdx < TRAIN_LEN; segIdx++) {
            if (instanceIdx >= maxSurgeInstances) break;
            const segT = localT - segIdx * 0.088;
            if (segT < 0 || segT > 1) continue;

            sampleBoardRoute(route, segT, tmpPos, tmpDir);
            const env = route.isExit
              ? Math.min(1, segT * 4.5) * (1 - Math.pow(segT, 2.3))
              : Math.sin(segT * Math.PI);
            const isHead = segIdx === 0;
            const falloff = 1 - segIdx * 0.2;
            const brightness = Math.min(1.3, (0.38 + env * 0.95) * falloff * (route.isExit ? 1.25 : 1.0));

            dummy.position.copy(tmpPos);
            dummy.position.y += 0.06;
            dummy.quaternion.setFromUnitVectors(upVec, tmpDir);
            const girth = (isHead ? 1.15 : 0.85) * (1 + env * 0.45);
            const lengthScale = (isHead ? 1.15 : 0.82) * (1 + env * 0.78);
            dummy.scale.set(girth, lengthScale, girth);
            dummy.updateMatrix();

            surgeInstMesh.setMatrixAt(instanceIdx, dummy.matrix);
            tmpColor.copy(isHead ? route.headColor : route.color).multiplyScalar(brightness);
            surgeInstMesh.setColorAt(instanceIdx, tmpColor);
            instanceIdx++;

            if (isHead) {
              lightAccum.add(tmpPos);
              lightCount += 1;
            }
          }
        }
      }

      surgeInstMesh.count = instanceIdx;
      surgeInstMesh.instanceMatrix.needsUpdate = true;
      if (surgeInstMesh.instanceColor) surgeInstMesh.instanceColor.needsUpdate = true;

      if (lightCount > 0) {
        lightAccum.divideScalar(lightCount);
        lightAccum.y += 0.4;
        surgeLight.position.lerp(lightAccum, 1 - Math.exp(-dt * 16));
        surgeLight.intensity = Math.min(28, 16 + activeSurges.length * 4);
      } else {
        surgeLight.intensity *= Math.exp(-dt * 8);
      }

      curtainMat.opacity = 0.22 + modEnergies[3] * 0.62;
      modGlowMats.forEach((m, idx) => {
        m.emissiveIntensity = (idx === 1 ? 0.82 : 0.56) + modEnergies[idx] * 2.5;
      });
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      extraMats.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      mats.dispose();
    },
  };
}
