/* The two chrome marks the site already carries — the Land of Hope lockup
   and the Gacha G — rendered off-screen by the site's own three.js bundle,
   so a chapter can pose them at any angle and draw the result like an image.
   Nothing new is fetched: the bundle and both models are already in assets/. */

const BUNDLE = 'assets/gameui/three-ec08179080.js';
export const MODELS = {
  landofhope: 'assets/landofhope-736112f786.glb',
  gacha: 'assets/gameui/gacha-logo-9ffff48d98.glb'
};

let G = null, T = null, renderer = null, scene = null, cam = null, env = null;
const loaded = {};   // name -> { group, size }

function loadBundle() {
  if (window.__GACHA3__) return Promise.resolve(window.__GACHA3__);
  return new Promise((res, rej) => {
    let s = document.querySelector('script[data-gacha3]');
    if (!s) { s = document.createElement('script'); s.src = BUNDLE; s.setAttribute('data-gacha3', ''); document.head.appendChild(s); }
    s.addEventListener('load', () => (window.__GACHA3__ ? res(window.__GACHA3__) : rej(new Error('three bundle published nothing'))));
    s.addEventListener('error', () => rej(new Error('three bundle failed to load')));
  });
}

function boot() {
  if (renderer) return;
  T = G.THREE;
  const cv = document.createElement('canvas');
  renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(1);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene = new T.Scene();
  env = new T.PMREMGenerator(renderer).fromScene(new G.RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  // the same four lights the site's lockup is lit with
  const L = (i, x, y, z) => { const l = new T.DirectionalLight(0xffffff, i); l.position.set(x, y, z); scene.add(l); return l; };
  L(2.4, -2, 7, 5); L(1.6, -6, 1.5, 4); L(1.0, 5, 2, -5); L(0.45, 0, -4, 5);
  scene.add(new T.AmbientLight(0xffffff, 0.22));
  cam = new T.PerspectiveCamera(28, 16 / 9, 0.1, 100);
}

/** load the named models; resolves when all are ready (rejects are logged, not thrown) */
export async function loadModels(names, onProgress) {
  if (!names.length) return;
  G = await loadBundle();
  boot();
  await Promise.all(names.map(name => new Promise(res => {
    if (loaded[name]) return res();
    new G.GLTFLoader().setMeshoptDecoder(G.MeshoptDecoder).load(MODELS[name], g => {
      const m = g.scene, b = new T.Box3().setFromObject(m), size = b.getSize(new T.Vector3());
      m.position.sub(b.getCenter(new T.Vector3()));
      m.traverse(o => { if (o.isMesh && o.material) { o.material.envMapIntensity = 1.5; o.material.needsUpdate = true; } });
      const group = new T.Group(); group.add(m); group.visible = false; scene.add(group);
      loaded[name] = { group, size };
      // draw it once, small, while the page is still loading: the first render
      // compiles its shaders, and that stall belongs in the loader, not mid-reel
      try { renderModel(name, { w: 64, h: 32 }); } catch (e) { console.warn('[reel] warm', name, e); }
      onProgress && onProgress(name);
      res();
    }, null, e => {
      // settle it anyway: renderModel returns null for it and the chapter plays without the mark
      console.warn('[reel] model', name, e); onProgress && onProgress(name); res();
    });
  })));
}

/**
 * Render a model and return the canvas holding it (draw it straight away —
 * the next call reuses the same canvas). null until the model has loaded.
 *   o.w, o.h     output size in px
 *   o.yaw, o.pitch, o.roll   radians
 *   o.fit        margin around the model (1 = touching the edges; default 1.25)
 *   o.drop       camera height as a share of its distance (default 0.28 — seen from just below, as on the site)
 *   o.exposure   tone-mapping exposure (default 1.05)
 */
export function renderModel(name, o) {
  const M = loaded[name];
  if (!M || !renderer) return null;
  const w = Math.max(2, Math.round(o.w)), h = Math.max(2, Math.round(o.h));
  const cv = renderer.domElement;
  if (cv.width !== w || cv.height !== h) renderer.setSize(w, h, false);
  for (const k in loaded) loaded[k].group.visible = k === name;
  M.group.rotation.set(o.pitch || 0, o.yaw || 0, o.roll || 0, 'YXZ');
  cam.aspect = w / h; cam.updateProjectionMatrix();
  const half = Math.tan(cam.fov * Math.PI / 360);
  const s = M.size, fit = o.fit ?? 1.25, drop = o.drop ?? 0.28;
  const d = Math.max((s.y / 2) / half, (s.x / 2) / (half * cam.aspect)) * fit;
  cam.position.set(0, -drop * d, d); cam.lookAt(0, 0, 0);
  renderer.toneMappingExposure = o.exposure ?? 1.05;
  renderer.render(scene, cam);
  return cv;
}

export function modelReady(name) { return !!loaded[name]; }
