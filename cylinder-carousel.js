/* Cylinder carousel — ported from the Codrops "Cinematic Scroll Animations" demo 1
   (OGL WebGL cylinder + GSAP ScrollTrigger camera flythrough), scoped to a page section. */
(function () {
  if (customElements.get('cylinder-carousel')) return;

  /* all four are served from this site; ogl is cut down to the seven classes
     used below (52 KB rather than the full 133 KB bundle) */
  const U = {
    ogl: '/assets/vendor/ogl-1.0.11.carousel.mjs',
    gsap: '/assets/vendor/gsap-3.13.0.min.js',
    st: '/assets/vendor/ScrollTrigger-3.13.0.min.js',
    ce: '/assets/vendor/CustomEase-3.13.0.min.js'
  };
  function res(u){var m=window.__resources;return (m&&typeof m[u]==='string'&&m[u])?m[u]:u;}
  function script(u){return new Promise(function(ok,no){var s=document.createElement('script');s.src=res(u);s.async=false;s.onload=ok;s.onerror=no;document.head.appendChild(s);});}
  let depsP = null;
  function deps(){
    /* fetched side by side; async=false keeps the GSAP plugins executing after GSAP itself */
    return depsP || (depsP = Promise.all([
      window.ogl ? window.ogl : import(res(U.ogl)).then(function(m){ return (window.ogl = m); }),
      window.gsap ? null : script(U.gsap),
      window.ScrollTrigger ? null : script(U.st),
      window.CustomEase ? null : script(U.ce)
    ]).then(function(r){
      return [r[0], {gsap:window.gsap}, {ScrollTrigger:window.ScrollTrigger}, {CustomEase:window.CustomEase}];
    }));
  }
  const cylinderVertex = `
  attribute vec2 uv;
  attribute vec3 position;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;

  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
  const cylinderFragment = `
  precision highp float;

  uniform sampler2D tMap;
  uniform float uDarkness;

  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(tMap, vUv);
    tex.rgb *= (1.0 - uDarkness);
    gl_FragColor = tex;
  }
`;
  const particleVertex = `
  attribute vec3 position;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;

  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
  const particleFragment = `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    gl_FragColor = vec4(uColor, uOpacity);
  }
`;

  const imageConfig = { width: 1024, height: 1024 };
  const particleConfig = { numParticles: 12, particleRadius: 3.3, segments: 20, angleSpan: 0.3 };

  function drawImageCover(ctx, img, x, y, w, h) {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = w / h;
    let sourceX = 0, sourceY = 0;
    let sourceWidth = img.naturalWidth, sourceHeight = img.naturalHeight;
    if (imgRatio > canvasRatio) {
      sourceWidth = img.naturalHeight * canvasRatio;
      sourceX = (img.naturalWidth - sourceWidth) / 2;
    } else {
      sourceHeight = img.naturalWidth / canvasRatio;
      sourceY = (img.naturalHeight - sourceHeight) / 2;
    }
    ctx.save();
    ctx.translate(x, y + h);
    ctx.scale(1, -1);
    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, w, h);
    ctx.restore();
  }

  function createCylinderGeometry(Geometry, gl, config) {
    const { radius, height, radialSegments, heightSegments } = config;
    const positions = [], uvs = [], indices = [];
    for (let y = 0; y <= heightSegments; y++) {
      const v = y / heightSegments;
      const yPos = (v - 0.5) * height;
      for (let x = 0; x <= radialSegments; x++) {
        const u = x / radialSegments;
        const theta = u * Math.PI * 2;
        positions.push(Math.cos(theta) * radius, yPos, Math.sin(theta) * radius);
        uvs.push(u, 1 - v);
      }
    }
    for (let y = 0; y < heightSegments; y++) {
      for (let x = 0; x < radialSegments; x++) {
        const a = y * (radialSegments + 1) + x;
        const b = a + radialSegments + 1;
        const c = a + 1;
        const d = b + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
    return new Geometry(gl, {
      position: { size: 3, data: new Float32Array(positions) },
      uv: { size: 2, data: new Float32Array(uvs) },
      index: { data: new Uint16Array(indices) },
    });
  }

  function createParticleGeometry(Geometry, gl, config, index, height) {
    const { numParticles, particleRadius, segments, angleSpan } = config;
    const linePositions = [];
    const startAngle = (index / numParticles) * Math.PI * 2;
    const isTopHalf = index < numParticles / 2;
    const yPosition = isTopHalf
      ? height * 0.7 + Math.random() * height * 0.3
      : -height * 1.0 + Math.random() * height * 0.3;
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const angle = startAngle + angleSpan * t;
      linePositions.push(Math.cos(angle) * particleRadius, yPosition, Math.sin(angle) * particleRadius);
    }
    return {
      geometry: new Geometry(gl, { position: { size: 3, data: new Float32Array(linePositions) } }),
      userData: { baseAngle: startAngle, angleSpan, baseY: yPosition, speed: 0.5 + Math.random() * 1.0, radius: particleRadius },
    };
  }

  class CylinderCarousel extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      this.style.cssText += ';display:block;position:absolute;inset:0;width:100%;height:100%';
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity 1.2s cubic-bezier(.32,.72,0,1)';
      this.appendChild(this.canvas);
      this.dragRot = 0;
      this.dragVel = 0;
      this.bindDrag();
      /* the libraries, the ten portraits and a WebGL context all wait until the
         section is within two screens, instead of competing with the first paint */
      const go = () => { if (this._started) return; this._started = true; if (this.near) this.near.disconnect();
        this.boot().catch((e) => console.warn('[cylinder-carousel]', e)); };
      if (!('IntersectionObserver' in window)) { go(); return; }
      this.near = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) go(); }, { rootMargin: '200% 0px' });
      this.near.observe(this);
    }

    disconnectedCallback() {
      this.dead = true;
      cancelAnimationFrame(this.raf);
      removeEventListener('resize', this.onResize);
      if (this._stSync) removeEventListener('scroll', this._stSync);
      if (this.triggers) this.triggers.forEach((t) => t.kill());
      if (this.io) this.io.disconnect();
      if (this.near) this.near.disconnect();
    }

    get imageList() {
      const v = this.images || this.getAttribute('images') || '';
      return String(v).split(',').map((s) => s.trim()).filter(Boolean);
    }

    bindDrag() {
      const host = this;
      let down = false, lastX = 0;
      const start = (e) => { down = true; lastX = e.clientX; host.style.cursor = 'grabbing'; };
      const move = (e) => {
        if (!down) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        host.dragRot += dx * 0.006;
        host.dragVel = dx * 0.006;
      };
      const end = () => { down = false; host.style.cursor = 'grab'; };
      host.style.cursor = 'grab';
      host.style.touchAction = 'pan-y';
      host.addEventListener('pointerdown', start);
      addEventListener('pointermove', move, { passive: true });
      addEventListener('pointerup', end);
      addEventListener('pointercancel', end);
    }

    async boot() {
      const [ogl, gsapMod, stMod, ceMod] = await deps();
      if (this.dead) return;
      const { Renderer, Camera, Transform, Texture, Program, Mesh, Geometry } = ogl;
      const gsap = gsapMod.gsap || gsapMod.default;
      const ScrollTrigger = stMod.ScrollTrigger || stMod.default;
      const CustomEase = ceMod.CustomEase || ceMod.default;
      gsap.registerPlugin(ScrollTrigger, CustomEase);
      CustomEase.create('cinematicSilk', '0.45, 0.05, 0.55, 0.95');
      CustomEase.create('cinematicSmooth', '0.25, 0.1, 0.25, 1');
      CustomEase.create('cinematicFlow', '0.33, 0, 0.2, 1');
      CustomEase.create('cinematicLinear', '0.4, 0, 0.6, 1');

      const scroller = this.closest('[data-cyl-scroll]') || this.parentElement;
      const capsWrap = scroller.querySelector('[data-cyl-caps]');
      const caps = capsWrap ? [...capsWrap.querySelectorAll('[data-cap]')] : [];

      const cylinderConfig = {
        radius: innerWidth > 768 ? 2.5 : 2.2,
        height: innerWidth > 768 ? 2 : 1.2,
        radialSegments: 64,
        heightSegments: 1,
      };

      const rect = () => ({ w: this.clientWidth || innerWidth, h: this.clientHeight || innerHeight });
      const r0 = rect();

      const renderer = new Renderer({
        canvas: this.canvas,
        width: r0.w,
        height: r0.h,
        dpr: Math.min(devicePixelRatio, 2),
        alpha: true,
        antialias: true,
      });
      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 1);
      gl.disable(gl.CULL_FACE);

      const getResponsiveDimensions = () => {
        const width = innerWidth;
        const isMobile = width < 768;
        const isTablet = width >= 768 && width < 1024;
        const maxRadius = isMobile ? 1.8 : isTablet ? 2.2 : 2.5;
        const cameraZ = isMobile ? 6 : isTablet ? 7 : 8;
        const fov = isMobile ? 50 : 45;
        return { cylinderScale: maxRadius / cylinderConfig.radius, cameraZ, fov, isMobile };
      };
      const dimensions = getResponsiveDimensions();

      const camera = new Camera(gl, { fov: dimensions.fov, aspect: r0.w / r0.h });
      camera.position.set(0, 0, dimensions.cameraZ);
      const cameraAnim = { x: 0, y: 0, z: 8, rotY: 0 };

      const scene = new Transform();
      const geometry = createCylinderGeometry(Geometry, gl, cylinderConfig);

      const srcs = this.imageList;
      const numImages = srcs.length;
      const hardwareLimit = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const safeLimit = innerWidth < 768 ? 2048 : Math.min(hardwareLimit, 8192);
      const atlas = document.createElement('canvas');
      const ctx = atlas.getContext('2d', { willReadFrequently: false, alpha: false });
      const totalWidthOriginal = imageConfig.width * numImages;
      const scale = Math.min(1, safeLimit / totalWidthOriginal);
      atlas.width = Math.floor(totalWidthOriginal * scale);
      atlas.height = Math.floor(imageConfig.height * scale);

      const circumference = 2 * Math.PI * cylinderConfig.radius;
      const textureAspectRatio = imageConfig.height / (imageConfig.width * numImages);
      const heightCorrection = (circumference * textureAspectRatio) / cylinderConfig.height;

      const imgs = await Promise.all(srcs.map((raw) => new Promise((ok, rej) => {
        const src = res(raw);
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.onload = () => ok(im);
        im.onerror = () => rej(new Error('image failed: ' + raw));
        im.src = src;
      })));
      if (this.dead) return;

      imgs.forEach((img, i) => {
        const xPos = Math.floor((i / numImages) * atlas.width);
        const xEnd = Math.floor(((i + 1) / numImages) * atlas.width);
        drawImageCover(ctx, img, xPos, 0, xEnd - xPos, atlas.height);
      });

      const texture = new Texture(gl, {
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE,
        minFilter: gl.LINEAR,
        magFilter: gl.LINEAR,
        generateMipmaps: false,
      });
      texture.image = atlas;
      texture.needsUpdate = true;

      const darkness = parseFloat(this.getAttribute('darkness'));
      const program = new Program(gl, {
        vertex: cylinderVertex,
        fragment: cylinderFragment,
        uniforms: {
          tMap: { value: texture },
          uDarkness: { value: isNaN(darkness) ? 0.3 : darkness },
        },
        cullFace: null,
      });

      const cylinder = new Mesh(gl, { geometry, program });
      cylinder.setParent(scene);
      cylinder.rotation.y = 0.5;
      cylinder.scale.set(dimensions.cylinderScale, dimensions.cylinderScale, dimensions.cylinderScale);
      this.canvas.style.opacity = '1';

      this.onResize = () => {
        const d = getResponsiveDimensions();
        const r = rect();
        renderer.setSize(r.w, r.h);
        camera.perspective({ fov: d.fov, aspect: r.w / r.h });
        if (d.isMobile) cylinder.scale.set(d.cylinderScale, d.cylinderScale * heightCorrection, d.cylinderScale);
        else cylinder.scale.set(d.cylinderScale, d.cylinderScale, d.cylinderScale);
        if (cameraAnim.z === 8 || cameraAnim.z === 7 || cameraAnim.z === 6) cameraAnim.z = d.cameraZ;
      };
      addEventListener('resize', this.onResize);
      this.onResize();

      this.triggers = [];
      const tl = gsap.timeline({
        scrollTrigger: { trigger: scroller, start: 'top top', end: 'bottom bottom', scrub: 1 },
      });
      this.triggers.push(tl.scrollTrigger);

      tl.to(cameraAnim, { x: 0, y: 0, z: dimensions.cameraZ, duration: 1, ease: 'cinematicSilk' })
        .to(cameraAnim, { x: 0, y: 5, z: 5, duration: 1, ease: 'cinematicFlow' })
        .to(cameraAnim, { x: 1.5, y: 2, z: 2, duration: 2, ease: 'cinematicLinear' })
        .to(cameraAnim, { x: 0.5, y: 0, z: 0.8, duration: 3.5, ease: 'power1.inOut' })
        .to(cameraAnim, { x: -6, y: -1, z: dimensions.cameraZ, duration: 1, ease: 'cinematicSmooth' });

      tl.to(cylinder.rotation, { y: '+=28.27', duration: 8.5, ease: 'none' }, 0);

      caps.forEach((textEl, index) => {
        const sectionDuration = 100 / caps.length;
        const start = index * sectionDuration;
        const end = (index + 1) * sectionDuration;
        const t = gsap.timeline({
          scrollTrigger: { trigger: scroller, start: start + '% top', end: end + '% top', scrub: 0.8 },
        });
        this.triggers.push(t.scrollTrigger);
        t.fromTo(textEl, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'cinematicSmooth' })
          .to(textEl, { opacity: 1, duration: 0.6, ease: 'none' })
          .to(textEl, { opacity: 0, duration: 0.2, ease: 'cinematicSmooth' });
      });


      const __stSync = () => ScrollTrigger.update();
      addEventListener('scroll', __stSync, { passive: true });
      this._stSync = __stSync;
      ScrollTrigger.refresh();
      setTimeout(() => ScrollTrigger.refresh(), 800);
      addEventListener('load', () => ScrollTrigger.refresh());
      const particles = [];
      for (let i = 0; i < particleConfig.numParticles; i++) {
        const { geometry: lineGeometry, userData } = createParticleGeometry(Geometry, gl, particleConfig, i, cylinderConfig.height);
        const lineProgram = new Program(gl, {
          vertex: particleVertex,
          fragment: particleFragment,
          uniforms: { uColor: { value: [1.0, 1.0, 1.0] }, uOpacity: { value: 0.0 } },
          transparent: true,
          depthTest: true,
        });
        const particle = new Mesh(gl, { geometry: lineGeometry, program: lineProgram, mode: gl.LINE_STRIP });
        particle.userData = userData;
        particle.setParent(scene);
        particles.push(particle);
      }

      this.visible = true;
      this.io = new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; }, { rootMargin: '20% 0px' });
      this.io.observe(this);

      let lastRotation = 0, velocity = 0, momentum = 0;
      const animate = () => {
        if (this.dead) return;
        this.raf = requestAnimationFrame(animate);
        if (!this.visible) return;
        if (this._stSync) this._stSync();

        camera.position.set(cameraAnim.x, cameraAnim.y, cameraAnim.z);
        camera.lookAt([0, 0, 0]);

        this.dragVel *= 0.93;
        scene.rotation.y = this.dragRot;

        const currentRotation = cylinder.rotation.y + this.dragRot;
        velocity = currentRotation - lastRotation;
        lastRotation = currentRotation;
        momentum = momentum * 0.92 + velocity * 0.15;

        const speed = Math.abs(velocity) * 100;
        const isRotating = Math.abs(velocity) > 0.0001;

        particles.forEach((particle) => {
          const userData = particle.userData;
          const targetOpacity = isRotating ? Math.min(speed * 3, 0.95) : 0;
          const currentOpacity = particle.program.uniforms.uOpacity.value;
          particle.program.uniforms.uOpacity.value = currentOpacity + (targetOpacity - currentOpacity) * 0.15;
          if (isRotating) {
            userData.baseAngle += velocity * userData.speed * 1.5;
            const segments = particleConfig.segments;
            const positions = particle.geometry.attributes.position.data;
            for (let j = 0; j <= segments; j++) {
              const t = j / segments;
              const angle = userData.baseAngle + userData.angleSpan * t;
              positions[j * 3] = Math.cos(angle) * userData.radius;
              positions[j * 3 + 1] = userData.baseY;
              positions[j * 3 + 2] = Math.sin(angle) * userData.radius;
            }
            particle.geometry.attributes.position.needsUpdate = true;
          }
        });

        renderer.render({ scene, camera });
      };
      animate();
    }
  }

  customElements.define('cylinder-carousel', CylinderCarousel);
})();
