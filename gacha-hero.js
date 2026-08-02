/* The Game UI opening: the mark turning in a field of dust.
   Both canvases live in the markup — the runtime rebuilds anything this file
   creates, so nothing here creates a node. Neither the renderer nor the model
   is fetched until the section is close. */
(function () {
  if (customElements.get('gacha-hero')) return;
  var THREE_SRC = 'assets/gameui/three-219c2a1f8e.js';
  var MODEL = 'assets/gameui/gacha-logo-22e7cf0f05.glb';

  function dust(cv) {
    var x = cv.getContext('2d'), N = 1500, p = [], i;
    var rnd = function () { return Math.random(); };
    for (i = 0; i < N; i++) p.push({ x: rnd(), y: rnd(), r: 0.25 + rnd() * 0.6,
      a: 0.15 + rnd() * 0.75, s: 0.005 + rnd() * 0.025, ph: rnd() * 6.2832 });
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var seen = true, raf;
    if ('IntersectionObserver' in window)
      new IntersectionObserver(function (es) { es.forEach(function (e) {
        seen = e.isIntersecting; if (seen) raf = requestAnimationFrame(draw); }); },
        { rootMargin: '200px 0px' }).observe(cv);
    function draw(t) {
      if (!seen) return;
      var W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      if (!W || !H) { raf = requestAnimationFrame(draw); return; }
      x.clearRect(0, 0, W, H);
      for (i = 0; i < N; i++) {
        var q = p[i];
        if (!reduced) { q.y -= q.s / 60; if (q.y < -0.02) q.y = 1.02; }
        var tw = 0.55 + 0.45 * Math.sin(t / 1000 * 1.2 + q.ph);
        var g = x.createRadialGradient(q.x * W, q.y * H, 0, q.x * W, q.y * H, q.r * 2.6);
        g.addColorStop(0, 'rgba(120,229,219,' + (q.a * tw * 0.9).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(78,205,196,0)');
        x.fillStyle = g;
        x.beginPath(); x.arc(q.x * W, q.y * H, q.r * 2.6, 0, 6.2832); x.fill();
        x.fillStyle = 'rgba(190,246,240,' + (q.a * tw).toFixed(3) + ')';
        x.beginPath(); x.arc(q.x * W, q.y * H, q.r, 0, 6.2832); x.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
  }

  function mark(cv, host) {
    var T = window.__THREE__.THREE, GL = window.__THREE__.GLTFLoader,
        MD = window.__THREE__.MeshoptDecoder, RE = window.__THREE__.RoomEnvironment;
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(innerWidth < 760 ? 1.5 : 2, devicePixelRatio || 1));
    r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
    r.outputColorSpace = T.SRGBColorSpace;
    var sc = new T.Scene();
    sc.environment = new T.PMREMGenerator(r).fromScene(new RE(), 0.04).texture;
    var k = new T.DirectionalLight(0xffffff, 2.1); k.position.set(2.4, 3, 2.6); sc.add(k);
    /* the rim is the pack's own teal, so the metal edges catch the same light */
    var rim = new T.DirectionalLight(0x4ECDC4, 2.6); rim.position.set(-2.6, 1, -2); sc.add(rim);
    var fill = new T.DirectionalLight(0x7ae0d8, 1.1); fill.position.set(1.2, -2, 1.5); sc.add(fill);
    var cam = new T.PerspectiveCamera(26, 1, 0.1, 100), piv = new T.Group(); sc.add(piv);
    function size() { var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    addEventListener('resize', size);
    var spin = 0.62, vel = 0, drag = false, px = 0, last = 0, live = false, seen = true;
    new GL().setMeshoptDecoder(MD).load(MODEL, function (g) {
      var m = g.scene, b = new T.Box3().setFromObject(m), s = b.getSize(new T.Vector3());
      m.position.sub(b.getCenter(new T.Vector3()));
      piv.add(m); piv.rotation.x = 0.09;
      size();
      cam.position.set(0, 0, Math.max(s.x, s.y) / (2 * Math.tan(26 * Math.PI / 360)) * 1.5);
      cam.lookAt(0, 0, 0);
      host.setAttribute('data-live', '1');
      live = true; requestAnimationFrame(loop);
    });
    host.addEventListener('pointerdown', function (e) {
      drag = true; px = e.clientX; vel = 0; host.setAttribute('data-touched', '1');
      try { host.setPointerCapture(e.pointerId); } catch (_) {}
    });
    host.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - px; px = e.clientX;
      spin += dx * 0.01; vel = Math.max(-9, Math.min(9, dx * 0.6));
    });
    function up() { drag = false; }
    host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
    if ('IntersectionObserver' in window)
      new IntersectionObserver(function (es) { es.forEach(function (e) {
        seen = e.isIntersecting; if (seen && live) requestAnimationFrame(loop); }); },
        { rootMargin: '150px 0px' }).observe(host);
    function loop(t) {
      if (!live || !seen) { last = 0; return; }
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
      if (!drag) { var target = reduced ? 0 : 0.26;
        vel += (target - vel) * Math.min(1, dt * 1.6); spin += vel * dt; }
      piv.rotation.y = spin;
      r.render(sc, cam);
      requestAnimationFrame(loop);
    }
  }

  class GachaHero extends HTMLElement {
    connectedCallback() {
      if (this._on) return;
      this.d = this.querySelector('canvas[data-gdust]');
      this.m = this.querySelector('canvas[data-gmark]');
      if (!this.d || !this.m) {
        if ((this._t = (this._t || 0) + 1) < 120) requestAnimationFrame(() => this.connectedCallback());
        return;
      }
      this._on = true;
      dust(this.d);
      var self = this;
      var go = function () {
        if (self._boot) return; self._boot = true;
        if (window.__THREE__) return mark(self.m, self);
        var s = document.createElement('script');
        s.src = THREE_SRC; s.onload = function () { mark(self.m, self); };
        document.head.appendChild(s);
      };
      if (!('IntersectionObserver' in window)) return go();
      new IntersectionObserver(function (es, io) {
        if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); go(); }
      }, { rootMargin: '500px 0px' }).observe(this);
    }
  }
  customElements.define('gacha-hero', GachaHero);
})();
