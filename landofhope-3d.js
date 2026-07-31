/* Standalone build: classic script; three + addons loaded from inlined blobs at runtime. */
(function(){
function __r(u){var m=window.__resources;return (m&&typeof m[u]==='string'&&m[u])?m[u]:u;}
const THREE_URL='https://unpkg.com/three@0.160.0/build/three.module.js';
const ORBIT_URL='https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
const ROOM_URL='https://unpkg.com/three@0.160.0/examples/jsm/environments/RoomEnvironment.js';
let THREE, OrbitControls, RoomEnvironment;
async function loadThree(){
  if(THREE) return;
  const threeUrl=__r(THREE_URL);
  THREE=await import(threeUrl);
  const patch=async(u)=>{
    const txt=await (await fetch(__r(u))).text();
    const fixed=txt.replace(/from\s+['"](three|\.\.\/\.\.\/\.\.\/build\/three\.module\.js)['"]/g,'from '+JSON.stringify(threeUrl));
    return import(URL.createObjectURL(new Blob([fixed],{type:'text/javascript'})));
  };
  const [o,r]=await Promise.all([patch(ORBIT_URL),patch(ROOM_URL)]);
  OrbitControls=o.OrbitControls; RoomEnvironment=r.RoomEnvironment;
}

const loadOpentype = () => new Promise((resolve, reject) => {
  if (window.opentype) return resolve(window.opentype);
  const s = document.createElement("script");
  s.src = __r("https://unpkg.com/opentype.js@1.3.4/dist/opentype.min.js");
  s.onload = () => resolve(window.opentype);
  s.onerror = reject;
  document.head.appendChild(s);
});

function shapesFromOpentypePath(path) {
  const contours = [];
  let cur = [];
  path.commands.forEach(cmd => {
    if (cmd.type === "M" && cur.length) { contours.push(cur); cur = []; }
    cur.push(cmd);
  });
  if (cur.length) contours.push(cur);

  const built = contours.map(cmds => {
    const shape = new THREE.Shape();
    cmds.forEach(cmd => {
      switch (cmd.type) {
        case "M": shape.moveTo(cmd.x, -cmd.y); break;
        case "L": shape.lineTo(cmd.x, -cmd.y); break;
        case "C": shape.bezierCurveTo(cmd.x1, -cmd.y1, cmd.x2, -cmd.y2, cmd.x, -cmd.y); break;
        case "Q": shape.quadraticCurveTo(cmd.x1, -cmd.y1, cmd.x, -cmd.y); break;
        case "Z": shape.closePath(); break;
      }
    });
    const pts = shape.getPoints(8);
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
      area += p1.x * p2.y - p2.x * p1.y;
    }
    area /= 2;
    const box = new THREE.Box2().setFromPoints(pts);
    return { shape, area, box };
  });

  built.sort((a, b) => Math.abs(b.area) - Math.abs(a.area));
  const outers = [];
  const eps = 0.5;
  built.forEach(b => {
    const parent = outers.find(o =>
      Math.sign(o.area) !== Math.sign(b.area) &&
      o.box.min.x - eps <= b.box.min.x && o.box.max.x + eps >= b.box.max.x &&
      o.box.min.y - eps <= b.box.min.y && o.box.max.y + eps >= b.box.max.y
    );
    if (parent) parent.shape.holes.push(b.shape);
    else outers.push(b);
  });
  return outers.map(o => o.shape);
}

function buildWordMesh(font, text, fontSize, material, bevelSize) {
  const path = font.getPath(text, 0, 0, fontSize, { kerning: true });
  const shapes = shapesFromOpentypePath(path);

  const extrudeSettings = {
    depth: fontSize * 0.34,
    bevelEnabled: true,
    bevelThickness: bevelSize,
    bevelSize: bevelSize,
    bevelSegments: 6,
    curveSegments: 16,
  };

  const geo = new THREE.ExtrudeGeometry(shapes, extrudeSettings);
  geo.computeBoundingBox();
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.advance = font.getAdvanceWidth(text, fontSize, { kerning: true });
  mesh.userData.bbox = geo.boundingBox;
  return mesh;
}

function addFlourish(centerX, y, halfWidth, material) {
  const s = new THREE.Shape();
  const w = halfWidth;
  s.moveTo(-w, 0);
  s.bezierCurveTo(-w * 0.55, -0.10, -w * 0.15, -0.10, 0, 0.0);
  s.bezierCurveTo(w * 0.15, 0.10, w * 0.55, 0.10, w, 0);
  s.lineTo(w, -0.045);
  s.bezierCurveTo(w * 0.55, 0.055, w * 0.15, 0.055, 0, -0.045);
  s.bezierCurveTo(-w * 0.15, -0.145, -w * 0.55, -0.145, -w, -0.045);
  s.lineTo(-w, 0);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 4, curveSegments: 12,
  });
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(centerX, y, 0.02);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const curlGeo = new THREE.TorusGeometry(0.05, 0.016, 8, 20, Math.PI * 1.4);
  const leftCurl = new THREE.Mesh(curlGeo, material);
  leftCurl.position.set(centerX - w - 0.01, y - 0.05, 0.02);
  leftCurl.rotation.z = Math.PI * 0.15;
  leftCurl.castShadow = true;
  const rightCurl = new THREE.Mesh(curlGeo, material);
  rightCurl.position.set(centerX + w + 0.01, y - 0.05, 0.02);
  rightCurl.rotation.z = Math.PI * 1.0;
  rightCurl.castShadow = true;

  const grp = new THREE.Group();
  grp.add(mesh, leftCurl, rightCurl);
  return grp;
}

class LandOfHope3D extends HTMLElement {
  connectedCallback() {
    if (this._booted) return;
    this._booted = true;
    this.style.display = "block";
    this.style.background = "transparent";
    this.build().catch(e => console.warn("[landofhope-3d]", e));
  }

  disconnectedCallback() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    if (this.ro) this.ro.disconnect();
    if (this.renderer) this.renderer.dispose();
  }

  async build() {
    await loadThree();
    const scene = new THREE.Scene();

    // Negative height puts the camera below the lockup so it is seen from
    // underneath — the hero angle. The target stays at the origin, so this is
    // a pitch, not a pan; OrbitControls re-derives its spherical from the live
    // camera position each frame, so dragging still works from here.
    const CAM_HEIGHT = -0.40;
    const camera = new THREE.PerspectiveCamera(28, 16 / 9, 0.1, 100);
    camera.position.set(0, CAM_HEIGHT, 9.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer = renderer;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;background:transparent";
    this.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-2, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -6; key.shadow.camera.right = 6;
    key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
    key.shadow.bias = -0.0015;
    key.shadow.radius = 4;
    scene.add(key);

    const streak = new THREE.DirectionalLight(0xffffff, 1.6);
    streak.position.set(-6, 1.5, 4);
    scene.add(streak);

    const rim = new THREE.DirectionalLight(0xffffff, 1.0);
    rim.position.set(5, 2, -5);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(0, -4, 5);
    scene.add(fill);

    scene.add(new THREE.AmbientLight(0xffffff, 0.22));

    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), shadowMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.35;
    ground.receiveShadow = true;
    scene.add(ground);

    const chromeMat = new THREE.MeshPhysicalMaterial({
      color: 0xe9e9e9,
      metalness: 1.0,
      roughness: 0.22,
      clearcoat: 0.5,
      clearcoatRoughness: 0.18,
      reflectivity: 1.0,
      envMapIntensity: 1.5,
    });

    const group = new THREE.Group();
    scene.add(group);

    const applySize = (w, h) => {
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    applySize(this.clientWidth, this.clientHeight);
    this.ro = new ResizeObserver(entries => {
      const box = entries[0].contentRect;
      cancelAnimationFrame(this._sizeRaf);
      this._sizeRaf = requestAnimationFrame(() => applySize(box.width, box.height));
    });
    this.ro.observe(this);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enableZoom = this.getAttribute("zoom") === "true";
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.minPolarAngle = Math.PI * 0.15;
    controls.target.set(0, 0, 0);

    // Slow left-right pan. SPIN_RANGE and SPIN_SPEED are the original values —
    // the sweep itself is unchanged. START_ANGLE is the rotation.y the logo holds
    // the moment it first comes into view; the phase offset places the sine there
    // so the pan begins from that angle instead of wherever the clock happened to be.
    const SPIN_RANGE = 0.35;
    const SPIN_SPEED = 0.00025;
    const START_ANGLE = 0;
    const SPIN_PHASE = Math.asin(Math.max(-1, Math.min(1, START_ANGLE / SPIN_RANGE)));
    let spinT0 = null;
    group.rotation.y = START_ANGLE;   // held until the pan starts

    let autoRotate = true;
    renderer.domElement.addEventListener("pointerdown", () => { autoRotate = false; });

    let visible = true;
    this.io = new IntersectionObserver(es => {
      visible = es[0].isIntersecting;
      // Start the pan the first time the logo actually enters the viewport.
      // Doing it here rather than on the first animation frame matters: `visible`
      // is seeded true, so a frame runs before the observer's first callback and
      // would otherwise start the clock at component init — reintroducing the
      // load-time dependency this is meant to remove.
      if (visible && spinT0 === null) spinT0 = performance.now();
    }, { rootMargin: "15% 0px" });
    this.io.observe(this);

    const animate = () => {
      if (this.dead) return;
      this.raf = requestAnimationFrame(animate);
      if (!visible) return;
      if (autoRotate && spinT0 !== null) {
        group.rotation.y = Math.sin((performance.now() - spinT0) * SPIN_SPEED + SPIN_PHASE) * SPIN_RANGE;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const opentype = await loadOpentype();
    const font = await opentype.load(__r(this.getAttribute("font") || "assets/Cinzel-Bold.ttf"));
    if (this.dead) return;

    const LARGE = 1.0;
    const SMALL = 0.62;
    const BEVEL_LARGE = 0.028;
    const BEVEL_SMALL = 0.020;

    const land = buildWordMesh(font, "LAND", LARGE, chromeMat, BEVEL_LARGE);
    const of = buildWordMesh(font, "OF", SMALL, chromeMat, BEVEL_SMALL);
    const hope = buildWordMesh(font, "HOPE", LARGE, chromeMat, BEVEL_LARGE);

    const landW = land.userData.advance;
    const ofW = of.userData.advance;
    const hopeW = hope.userData.advance;
    const gapW = LARGE * 0.16;

    const totalW = landW + gapW + ofW + gapW + hopeW;
    let cursor = -totalW / 2;

    land.position.x = cursor; cursor += landW + gapW;
    of.position.x = cursor; of.position.y = (land.userData.bbox.max.y - of.userData.bbox.max.y) * 0.55;
    cursor += ofW + gapW;
    hope.position.x = cursor;

    group.add(land, of, hope);

    const dropY = land.userData.bbox.min.y - LARGE * 0.09;
    group.add(addFlourish(land.position.x + landW / 2, dropY, landW / 2.05, chromeMat));
    group.add(addFlourish(hope.position.x + hopeW / 2, dropY, hopeW / 2.05, chromeMat));

    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.position.x -= center.x;
    group.position.y -= center.y;

    const size = box.getSize(new THREE.Vector3());
    const vFovRad = camera.fov * Math.PI / 180;
    const distForHeight = (size.y / 2) / Math.tan(vFovRad / 2);
    const distForWidth = (size.x / 2) / (Math.tan(vFovRad / 2) * camera.aspect);
    camera.position.z = Math.max(distForHeight, distForWidth) * 1.28;
    controls.update();

    this.dispatchEvent(new CustomEvent("ready"));
  }
}

if (!customElements.get("landofhope-3d")) customElements.define("landofhope-3d", LandOfHope3D);
})();
