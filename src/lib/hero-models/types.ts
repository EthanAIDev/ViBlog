import * as THREE from 'three';

export type HeroModelId = 'prism' | 'board' | 'engine';

export interface SystemModelRig {
  root: THREE.Group;
  defaultYaw: number;
  defaultPitch: number;
  cameraZDesktop: number;
  cameraZMobile: number;
  update: (time: number, dt: number, activeSurges: number[], surgeLight: THREE.PointLight) => void;
  dispose: () => void;
}

export interface PrecisionMaterialSet {
  titanium: THREE.MeshStandardMaterial;
  anodized: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  amberMetal: THREE.MeshStandardMaterial;
  edgeBlue: THREE.LineBasicMaterial;
  edgeSilver: THREE.LineBasicMaterial;
  edgeAmber: THREE.LineBasicMaterial;
  edgeEmerald: THREE.LineBasicMaterial;
  dispose: () => void;
}

export function createPrecisionMaterials(): PrecisionMaterialSet {
  const titanium = new THREE.MeshStandardMaterial({
    color: 0x8ea3bf,
    metalness: 0.86,
    roughness: 0.36,
    flatShading: true,
  });
  const anodized = new THREE.MeshStandardMaterial({
    color: 0x253144,
    metalness: 0.58,
    roughness: 0.5,
    flatShading: true,
  });
  const darkSteel = new THREE.MeshStandardMaterial({
    color: 0x3b4d68,
    metalness: 0.82,
    roughness: 0.34,
    flatShading: true,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xbfe0ff,
    metalness: 0.05,
    roughness: 0.08,
    transmission: 0.72,
    thickness: 0.55,
    ior: 1.54,
    transparent: true,
    opacity: 0.78,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.6,
  });
  const amberMetal = new THREE.MeshStandardMaterial({
    color: 0xf4b96c,
    metalness: 0.82,
    roughness: 0.28,
    emissive: 0xc97b28,
    emissiveIntensity: 0.32,
    flatShading: true,
  });
  const edgeBlue = new THREE.LineBasicMaterial({ color: 0x92c0fa, transparent: true, opacity: 0.52 });
  const edgeSilver = new THREE.LineBasicMaterial({ color: 0xdce9ff, transparent: true, opacity: 0.42 });
  const edgeAmber = new THREE.LineBasicMaterial({ color: 0xffcf88, transparent: true, opacity: 0.65 });
  const edgeEmerald = new THREE.LineBasicMaterial({ color: 0x58d8a8, transparent: true, opacity: 0.65 });

  const all = [titanium, anodized, darkSteel, glass, amberMetal, edgeBlue, edgeSilver, edgeAmber, edgeEmerald];
  return {
    titanium,
    anodized,
    darkSteel,
    glass,
    amberMetal,
    edgeBlue,
    edgeSilver,
    edgeAmber,
    edgeEmerald,
    dispose() {
      all.forEach((m) => m.dispose());
    },
  };
}

/** Creates a crisp chamfered rectangular slab centered at origin (dimensions w x h x d). */
export function createChamferedSlab(w: number, h: number, d: number, bevel = 0.03): THREE.ExtrudeGeometry {
  const hw = Math.max(0.01, w / 2 - bevel);
  const hd = Math.max(0.01, d / 2 - bevel);
  const c = Math.min(bevel * 1.4, hw * 0.4, hd * 0.4);
  const shape = new THREE.Shape();
  shape.moveTo(-hw + c, -hd);
  shape.lineTo(hw - c, -hd);
  shape.lineTo(hw, -hd + c);
  shape.lineTo(hw, hd - c);
  shape.lineTo(hw - c, hd);
  shape.lineTo(-hw + c, hd);
  shape.lineTo(-hw, hd - c);
  shape.lineTo(-hw, -hd + c);
  shape.closePath();

  const depth = Math.max(0.01, h - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.center();
  return geo;
}

export function addFramedMesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  edgeMat: THREE.LineBasicMaterial | null,
  geos: THREE.BufferGeometry[],
) {
  geos.push(geo);
  const mesh = new THREE.Mesh(geo, mat);
  parent.add(mesh);
  if (edgeMat) {
    const edgeGeo = new THREE.EdgesGeometry(geo, 22);
    geos.push(edgeGeo);
    const lines = new THREE.LineSegments(edgeGeo, edgeMat);
    lines.scale.setScalar(1.004);
    mesh.add(lines);
  }
  return mesh;
}
