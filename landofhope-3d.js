/* The Land of Hope lockup, turning slowly, seen from just below.

   It used to be built at runtime: opentype fetched from a CDN, the wordmark
   extruded glyph by glyph, then lit with four lights, an environment probe
   and a shadow catcher to make it read as chrome. It is a model now, with
   its own lighting baked in, so all of that is gone — and with it the three
   CDN modules the old build pulled down. One of those was the whole trouble
   behind the Game UI mark: three writes the string "160" into
   window.__THREE__ as its own duplicate-import guard, and this component's
   copy was what claimed it. Nothing here loads a second three any more.

   The camera is the one thing carried across exactly. The old fit worked out
   to 28° at 15.68 degrees below the lockup, standing 1.2834 times its width
   away; both are written here against the model's own size, so they hold at
   whatever scale a model happens to be authored at. */
(function () {
  if (customElements.get('landofhope-3d')) return;
  var BUNDLE = 'assets/gameui/three-ec08179080.js';
  var MODEL = 'assets/landofhope-736112f786.glb';

  var FOV = 28;
  var FIT = 1.28;        // the old fit's margin, unchanged
  var DROP = 0.2807;     // camera height as a share of its distance — 15.68° below
  var SPIN_RANGE = 0.35, SPIN_SPEED = 0.00025;

  function load(cb) {
    if (window.__GACHA3__) return cb();
    var s = document.querySelector('script[data-gacha3]');
    if (!s) {
      s = document.createElement('script');
      s.src = BUNDLE; s.setAttribute('data-gacha3', '');
      document.head.appendChild(s);
    }
    s.addEventListener('load', function () { if (window.__GACHA3__) cb(); });
  }

  class LandOfHope3D extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      this.style.display = 'block';
      this.style.background = 'transparent';
      var self = this;
      var go = function () {
        load(function () { try { self.build(); } catch (e) { console.warn('[landofhope-3d]', e); } });
      };
      /* not before it is close — the model is 1.3MB and this sits well down
         the page */
      if (!('IntersectionObserver' in window)) return go();
      new IntersectionObserver(function (es, io) {
        if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); go(); }
      }, { rootMargin: '900px 0px' }).observe(this);
    }

    disconnectedCallback() {
      this.dead = true;
      cancelAnimationFrame(this.raf);
      if (this.ro) this.ro.disconnect();
      if (this.io) this.io.disconnect();
      if (this.beat) clearInterval(this.beat);
      if (this.renderer) { try { this.renderer.dispose(); } catch (e) {} }
    }

    build() {
      var G = window.__GACHA3__, T = G.THREE, self = this;
      /* reuse a canvas if the runtime has already rebuilt one into place,
         rather than stacking a second one behind it */
      var cv = this.querySelector('canvas');
      if (!cv) {
        cv = document.createElement('canvas');
        cv.style.cssText = 'display:block;width:100%;height:100%;background:transparent';
        this.appendChild(cv);
      }
      var r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
      this.renderer = r;
      r.setClearColor(0x000000, 0);
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      r.toneMapping = T.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.05;

      var sc = new T.Scene();
      /* Polished metal is only ever as good as what it has to reflect, so the
         room and the four lights come back exactly as the extruded lockup had
         them. The shadow catcher does not: the camera sits below the plane it
         used to fall on, so it was costing a 2048px shadow map to render
         something nobody could see. */
      sc.environment = new T.PMREMGenerator(r).fromScene(new G.RoomEnvironment(), 0.04).texture;
      var key = new T.DirectionalLight(0xffffff, 2.4); key.position.set(-2, 7, 5); sc.add(key);
      var streak = new T.DirectionalLight(0xffffff, 1.6); streak.position.set(-6, 1.5, 4); sc.add(streak);
      var rim = new T.DirectionalLight(0xffffff, 1.0); rim.position.set(5, 2, -5); sc.add(rim);
      var fill = new T.DirectionalLight(0xffffff, 0.45); fill.position.set(0, -4, 5); sc.add(fill);
      sc.add(new T.AmbientLight(0xffffff, 0.22));
      var cam = new T.PerspectiveCamera(FOV, 16 / 7, 0.1, 100);
      var group = new T.Group(); sc.add(group);
      var half = Math.tan(FOV * Math.PI / 360), box = null;

      function place() {
        var w = self.clientWidth, h = self.clientHeight;
        if (!w || !h) return;
        r.setSize(w, h, false);
        cam.aspect = w / h; cam.updateProjectionMatrix();
        if (!box) return;
        var byHeight = (box.y / 2) / half;
        var byWidth = (box.x / 2) / (half * cam.aspect);
        var d = Math.max(byHeight, byWidth) * FIT;
        cam.position.set(0, -DROP * d, d);
        cam.lookAt(0, 0, 0);
      }
      place();
      this.ro = new ResizeObserver(function () {
        cancelAnimationFrame(self._sizeRaf);
        self._sizeRaf = requestAnimationFrame(place);
      });
      this.ro.observe(this);

      var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      var spin = 0, drag = false, px = 0, dragAt = 0, spinT0 = null, seen = true;
      var base = 0;
      var live = false, raf = 0, ticks = 0, seenTicks = -1;

      cv.style.cursor = 'grab';
      cv.style.touchAction = 'pan-y';
      cv.addEventListener('pointerdown', function (e) {
        drag = true; px = e.clientX; dragAt = performance.now();
        spinT0 = null;                 // the pan yields while a hand is on it
        cv.style.cursor = 'grabbing';
        try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      });
      cv.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var dx = e.clientX - px; px = e.clientX; dragAt = performance.now();
        spin += dx * 0.006;
      });
      /* Letting go neither snaps it back nor freezes it. The angle it was
         left at becomes the middle of the sweep and the pan picks up again
         from there, so it drifts on from where the hand left it instead of
         travelling back to where it started. */
      function up() {
        if (drag) { base = spin; spinT0 = performance.now(); }
        drag = false; cv.style.cursor = 'grab';
      }
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'blur']
        .forEach(function (n) { addEventListener(n, up, true); });

      this.io = new IntersectionObserver(function (es) {
        seen = es[0].isIntersecting;
        /* the pan starts the first time it is actually looked at, not
           whenever the page happened to finish loading */
        if (seen && spinT0 === null) spinT0 = performance.now();
        if (seen && live) kick();
      }, { rootMargin: '15% 0px' });
      this.io.observe(this);

      /* the same watchdog the Game UI mark carries: iOS drops the frame
         stream around scroll momentum and does not always hand it back */
      this.beat = setInterval(function () {
        if (self.dead || !live || document.visibilityState === 'hidden') { seenTicks = -1; return; }
        if (drag && performance.now() - dragAt > 2500) up();
        if (ticks !== seenTicks) { seenTicks = ticks; return; }
        var b = self.getBoundingClientRect();
        if (b.bottom > -200 && b.top < innerHeight + 200) { seen = true; raf = 0; kick(); }
      }, 1500);
      function kick() { if (!raf) raf = requestAnimationFrame(loop); }

      function loop() {
        raf = 0;
        if (self.dead || !live || !seen) return;
        ticks++;
        if (!drag && !reduced && spinT0 !== null)
          spin = base + Math.sin((performance.now() - spinT0) * SPIN_SPEED) * SPIN_RANGE;
        group.rotation.y = spin;
        r.render(sc, cam);
        raf = requestAnimationFrame(loop);
      }

      new G.GLTFLoader().setMeshoptDecoder(G.MeshoptDecoder).load(MODEL, function (g) {
        if (self.dead) return;
        var m = g.scene, b = new T.Box3().setFromObject(m), s = b.getSize(new T.Vector3());
        m.position.sub(b.getCenter(new T.Vector3()));
        m.traverse(function (o) { if (o.isMesh && o.material) {
          o.material.envMapIntensity = 1.5;   // as the old chrome ran it
          o.material.needsUpdate = true; } });
        group.add(m);
        box = s; place();
        live = true; kick();
        self.dispatchEvent(new CustomEvent('ready'));
      }, null, function (e) { console.warn('[landofhope-3d] model', e); });
    }
  }
  customElements.define('landofhope-3d', LandOfHope3D);
})();
