// The 3D layer: the Moon (NASA LRO colour map) and Voyager (NASA 3D Resources model), rendered with three.js
// into an offscreen WebGL canvas that film.js draws into the 2D frame.
import * as THREE from 'three';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from '/node_modules/three/examples/jsm/loaders/DRACOLoader.js';

export async function makeGL(W, H) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(W, H, false);
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, W / H, .01, 2000);
  const sun = new THREE.DirectionalLight(0xfff1e0, 3.4); scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0x6f97f4, .35); scene.add(fill, fill.target);
  const amb = new THREE.AmbientLight(0x8090b0, .12); scene.add(amb);

  const tex = await new THREE.TextureLoader().loadAsync('img/moon-map.jpg');
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 80), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }));
  scene.add(moon);

  const draco = new DRACOLoader(); draco.setDecoderPath('/node_modules/three/examples/jsm/libs/draco/gltf/');
  const g = await new GLTFLoader().setDRACOLoader(draco).loadAsync('img/voyager.glb');
  const model = g.scene;
  model.traverse(o => { if (o.isMesh && o.material) { o.material.side = THREE.DoubleSide; if ('envMapIntensity' in o.material) o.material.envMapIntensity = 0; } });
  const box = new THREE.Box3().setFromObject(model), ctr = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const inner = new THREE.Group(); model.position.sub(ctr); inner.add(model); inner.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
  const voy = new THREE.Group(); voy.add(inner); scene.add(voy);

  const V = (a) => new THREE.Vector3(...a);
  return {
    canvas: cv, size: [size.x, size.y, size.z],
    names: (() => { const n = []; model.traverse(o => o.isMesh && n.push(o.name)); return n; })(),
    // state: { moon: {pos, rot, s} | null, voy: {pos, rot:[x,y,z], off:[x,y,z], s} | null, sun:[x,y,z], cam:{pos, look, fov} }
    render(S) {
      moon.visible = !!S.moon; voy.visible = !!S.voy;
      if (!moon.visible && !voy.visible) return false;
      if (S.moon) { moon.position.copy(V(S.moon.pos)); moon.rotation.set(0, S.moon.rot || 0, 0); moon.scale.setScalar(S.moon.s || 1); }
      if (S.voy) {
        voy.position.copy(V(S.voy.pos)); voy.rotation.set(...S.voy.rot, 'YXZ'); voy.scale.setScalar(S.voy.s || 1);
        inner.position.copy(V(S.voy.off || [0, 0, 0]));
      }
      sun.position.copy(V(S.sun || [3, 1, 4])); sun.target.position.set(0, 0, 0);
      fill.position.set(-S.sun?.[0] || -3, -1, -2); fill.target.position.set(0, 0, 0);
      cam.position.copy(V(S.cam?.pos || [0, 0, 0])); cam.fov = S.cam?.fov || 32; cam.updateProjectionMatrix();
      cam.lookAt(V(S.cam?.look || [0, 0, -1]));
      r.render(scene, cam);
      return true;
    },
  };
}
