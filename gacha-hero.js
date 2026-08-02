/* The Game UI opening: the mark turning in a field of dust.
   Both canvases live in the markup — the runtime rebuilds anything this file
   creates, so nothing here creates a node. Neither the renderer nor the model
   is fetched until the section is close. */
(function () {
  if (customElements.get('gacha-hero')) return;
  var THREE_SRC = 'assets/gameui/three-ec08179080.js';
  var MODEL = 'assets/gameui/gacha-logo-e2d628a514.glb';

  /* Nothing here runs unless the address ends in ?dbg — it exists so a
     device I cannot reach can say what it is doing. Open the page with
     ?dbg and the panel reports it. */
  var D = { step: 'idle' }, DBG = /[?&]dbg\b/.test(location.search);
  function fail(why) { D.step = 'FAILED'; D.why = String(why); }
  addEventListener('error', function (e) {
    if (D.step !== 'live') fail((e.message || 'error') + ' @' +
      String(e.filename || '').split('/').pop() + ':' + e.lineno);
  });
  if (DBG) setInterval(function () {
    var host = document.querySelector('gacha-hero'),
        cv = host && host.querySelector('canvas[data-gmark]'),
        im = host && host.querySelector('img[data-gstill]'),
        p = document.getElementById('gdbg');
    if (!p) {
      p = document.createElement('pre'); p.id = 'gdbg';
      p.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;margin:0;padding:10px 12px;' +
        'max-width:calc(100vw - 16px);background:rgba(0,0,0,.86);color:#4ecdc4;font:11px/1.5 ui-monospace,' +
        'Menlo,monospace;border:1px solid #4ecdc4;border-radius:8px;white-space:pre-wrap;pointer-events:none';
      document.body.appendChild(p);
    }
    p.textContent = [
      'step      ' + D.step + (D.why ? ' — ' + D.why : ''),
      'frames    ' + (D.ticks || 0) + '   spin ' + (D.spin || 0).toFixed(2) + '   ' +
        ((D.ticks || 0) > 0 && D.moving ? 'TURNING' : 'NOT TURNING'),
      'canvas    opacity ' + (cv ? getComputedStyle(cv).opacity : '-') +
        '   still opacity ' + (im ? getComputedStyle(im).opacity : '-'),
      'seen ' + D.seen + '  drag ' + D.drag + '  reduce-motion ' + D.reduced,
      'ctx lost ' + (D.lost || 0) + '  restored ' + (D.restored || 0) + '  dpr ' + (devicePixelRatio || 1),
      'gl        ' + (D.gl || '-'),
      'model     ' + (D.model || '-') + '   heroes ' + document.querySelectorAll('gacha-hero').length +
        '/' + document.querySelectorAll('canvas[data-gmark]').length + '  boots ' + (D.boots || 0),
      'ua        ' + navigator.userAgent.slice(0, 78),
    ].join('\n');
  }, 500);

  /* The field is the whole section's sky, so the canvas is around 4900px
     tall. Building 1500 radial gradients across that every frame cost 8ms on
     a desktop and far more on a phone — enough on its own to hold the page
     under 30fps, which is what made the mark in front of it look stopped.
     The glow is one sprite now, drawn once and blitted per grain, over a
     backing store at 0.65 scale. Soft blobs do not need real pixels. */
  var GRAIN = 0.65;
  function grainSprite() {
    var S = 64, c = document.createElement('canvas'), g;
    c.width = c.height = S;
    g = c.getContext('2d').createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(190,246,240,1)');
    g.addColorStop(0.30, 'rgba(190,246,240,1)');
    g.addColorStop(0.34, 'rgba(120,229,219,.86)');
    g.addColorStop(1, 'rgba(78,205,196,0)');
    c.getContext('2d').fillStyle = g;
    c.getContext('2d').fillRect(0, 0, S, S);
    return c;
  }

  function dust(cv) {
    var x = cv.getContext('2d'), N = 1500, p = [], i, spr = grainSprite();
    var rnd = function () { return Math.random(); };
    for (i = 0; i < N; i++) p.push({ x: rnd(), y: rnd(), r: 0.25 + rnd() * 0.6,
      a: 0.15 + rnd() * 0.75, s: 0.0007 + rnd() * 0.003, ph: rnd() * 6.2832 });
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var seen = true, raf = 0, prev = 0;
    if ('IntersectionObserver' in window)
      new IntersectionObserver(function (es) { es.forEach(function (e) {
        seen = e.isIntersecting; if (seen) { prev = 0; if (!raf) raf = requestAnimationFrame(draw); } }); },
        { rootMargin: '200px 0px' }).observe(cv);
    function draw(t) {
      raf = 0;
      if (!seen || !cv.isConnected) return;
      var CW = cv.clientWidth, CH = cv.clientHeight;
      var W = Math.round(CW * GRAIN), H = Math.round(CH * GRAIN);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      if (!W || !H) { raf = requestAnimationFrame(draw); return; }
      /* the drift is per second, not per frame — tied to frames it crawls to
         a stop on exactly the devices that are already struggling */
      var dt = prev ? Math.min(0.25, (t - prev) / 1000) : 0; prev = t;
      x.clearRect(0, 0, W, H);
      for (i = 0; i < N; i++) {
        var q = p[i];
        if (!reduced) { q.y -= q.s * dt; if (q.y < -0.02) q.y = 1.02; }
        var d = q.r * 6.4 * GRAIN;
        x.globalAlpha = q.a * (0.55 + 0.45 * Math.sin(t / 1000 * 1.2 + q.ph));
        x.drawImage(spr, q.x * W - d / 2, q.y * H - d / 2, d, d);
      }
      x.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
  }

  /* A neutral grey studio rather than three's RoomEnvironment. That room has
     coloured walls, and every polished face was picking their green up out of
     the reflection — worst inside the C, where the recess sees nothing else.
     Three white panels instead, aimed from the same upper-left as the beam,
     so what the metal reflects and what lights it agree. */
  function studio(T, r) {
    var s = new T.Scene();
    s.add(new T.Mesh(new T.SphereGeometry(6, 24, 16),
      new T.MeshBasicMaterial({ side: T.BackSide, color: 0x0d0d0d })));
    function panel(w, h, x, y, z, i) {
      var p = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: 0xffffff }));
      p.position.set(x, y, z); p.lookAt(0, 0, 0);
      p.material.color.multiplyScalar(i); s.add(p);
    }
    panel(6, 6, -3.2, 3.4, 3.0, 1.0);    // key softbox
    panel(5, 5, 3.4, -1.0, 2.2, 0.34);   // fill
    panel(7, 4, -1.0, -2.6, -3.2, 0.20); // low bounce
    return new T.PMREMGenerator(r).fromScene(s, 0.03).texture;
  }

  /* The runtime can rebuild this section's markup, which hands the element a
     brand new canvas and boots the whole thing a second time. The renderer
     from the first pass is then drawing into a node nobody can see, still
     holding a WebGL context — and iOS budgets those tightly enough that the
     second one gets refused. Whatever came before is torn down first. */
  var CUR = null;
  function retire() {
    if (!CUR) return;
    var old = CUR; CUR = null;
    try { old.stop(); } catch (e) {}
    try { old.r.dispose(); } catch (e) {}
    try { old.r.forceContextLoss(); } catch (e) {}
  }

  function mark(cv, host) {
    if (CUR && CUR.cv !== cv) retire();
    if (CUR && CUR.cv === cv) return;   // already running on this canvas
    /* iOS keeps a small budget of live WebGL contexts and this page already
       spends several. If one cannot be had, or the system takes it back
       later, the still underneath is what the visitor sees — the section is
       never empty because of it. */
    D.step = 'webgl context';
    var probe = null;
    try { probe = cv.getContext('webgl2') || cv.getContext('webgl'); } catch (e) {}
    if (!probe) { fail('no webgl context'); return; }
    D.gl = probe.getParameter(probe.VERSION) + ' · ' +
      (probe.getParameter(probe.UNMASKED_RENDERER_WEBGL) || probe.getParameter(probe.RENDERER));
    function showStill(on) {
      var s = host.querySelector('img[data-gstill]');
      if (s) s.style.opacity = on ? '1' : '0';
      cv.style.opacity = on ? '0' : '1';
    }
    /* iOS hands WebGL contexts back to the system under memory pressure and
       this page holds several. Losing one used to be the end of it — the
       still came up and stayed. Safari does restore the context when the
       loss is cancelled, and three rebuilds its own state on that event, so
       all this has to do is put the canvas back and start the loop again. */
    cv.addEventListener('webglcontextlost', function (e) {
      e.preventDefault(); D.lost = (D.lost || 0) + 1; showStill(true);
    });
    cv.addEventListener('webglcontextrestored', function () {
      D.restored = (D.restored || 0) + 1;
      if (live) { showStill(false); kick(); }
    });
    var W = window.__GACHA3__ || {};
    var T = W.THREE, GL = W.GLTFLoader, MD = W.MeshoptDecoder;
    if (!T || !GL || !MD) {
      fail('bundle missing ' + (!T ? 'THREE' : !GL ? 'GLTFLoader' : 'MeshoptDecoder'));
      return;
    }
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    D.step = 'renderer';
    var r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(innerWidth < 760 ? 1.5 : 2, devicePixelRatio || 1));
    r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.20;
    r.outputColorSpace = T.SRGBColorSpace;
    var sc = new T.Scene();
    D.step = 'environment';
    sc.environment = studio(T, r);
    D.step = 'scene';
    /* The beam stays fixed in the world and pointed at the origin — the mark
       turns through it, so each fold lights as it comes round and falls dark
       as it leaves. The softbox behind it is what puts the sweep of highlight
       across the flat faces; without it the metal reads as grey card. */
    sc.add(new T.AmbientLight(0xd6dbde, 0.14));
    var spot = new T.SpotLight(0xfff6ea, 45, 0, 0.34, 0.50, 1.5);
    spot.position.set(-2.6, 4.0, 3.4); spot.target.position.set(0, 0, 0);
    sc.add(spot); sc.add(spot.target);
    var fill = new T.DirectionalLight(0xdce6ee, 0.55); fill.position.set(2.6, -0.6, 2.0); sc.add(fill);
    var rim = new T.DirectionalLight(0xaebccc, 0.5); rim.position.set(-2.8, 0.4, -2.4); sc.add(rim);
    var cam = new T.PerspectiveCamera(26, 1, 0.1, 100), piv = new T.Group(); sc.add(piv);
    function size() { var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    addEventListener('resize', size);
    var spin = 0.62, vel = 0, drag = false, px = 0, last = 0, live = false, seen = true, raf = 0;
    new GL().setMeshoptDecoder(MD).load(MODEL, function (g) {
      var m = g.scene, b = new T.Box3().setFromObject(m), s = b.getSize(new T.Vector3());
      m.position.sub(b.getCenter(new T.Vector3()));
      m.traverse(function (o) { if (o.isMesh && o.material) {
        o.material.envMapIntensity = 1.10;
        o.material.roughness = 0.62;      // brushed, not mirrored — a mirror at
        o.material.needsUpdate = true; } }); // this size is just noise
      piv.add(m); piv.rotation.x = 0.09;
      size();
      cam.position.set(0, 0, Math.max(s.x, s.y) / (2 * Math.tan(26 * Math.PI / 360)) * 2.15);
      cam.lookAt(0, 0, 0);
      host.setAttribute('data-live', '1');
      var still = host.querySelector('img[data-gstill]');
      if (still) still.style.transition = 'opacity .8s';
      showStill(false);
      live = true; D.step = 'live'; attempts = 0; kick();
    }, function (p) { if (p.total) D.model = Math.round(p.loaded / p.total * 100) + '%'; },
       function (e) { fail('model: ' + (e && e.message ? e.message : e)); });
    D.step = 'loading model';
    cv.style.cursor = 'grab';
    host.addEventListener('pointerdown', function (e) {
      drag = true; px = e.clientX; vel = 0; dragAt = performance.now();
      host.setAttribute('data-touched', '1');
      cv.style.cursor = 'grabbing';
      try { host.setPointerCapture(e.pointerId); } catch (_) {}
    });
    host.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - px; px = e.clientX;
      spin += dx * 0.01; vel = Math.max(-9, Math.min(9, dx * 0.6));
    });
    function up() { drag = false; cv.style.cursor = 'grab'; }
    host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
    /* A finger that starts on the mark and ends as a page scroll does not
       always give the element its own pointerup back. Losing that one event
       leaves drag stuck on, and a stuck drag means the turn never resumes —
       so the window gets to end a drag as well. */
    ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'blur']
      .forEach(function (n) { addEventListener(n, up, true); });
    if ('IntersectionObserver' in window)
      new IntersectionObserver(function (es) { es.forEach(function (e) {
        seen = e.isIntersecting; if (seen && live) kick(); }); },
        { rootMargin: '150px 0px' }).observe(host);

    /* Every way this can stop turning without anything throwing: the frame
       loop dropped (iOS suspends rAF around scroll momentum and page
       restores, and does not always hand it back), the observer's flag went
       stale, or the drag above got stuck. The watchdog does not care which —
       if no frame has been drawn since the last check and the hero is on
       screen by its own measurement, it starts the loop again. */
    var ticks = 0, seenTicks = -1, dragAt = 0;
    var beat = setInterval(function () {
      /* the runtime swapped the markup out from under us — hand the context
         back rather than sit on it */
      if (!cv.isConnected) { retire(); return; }
      if (!live || document.visibilityState === 'hidden') { seenTicks = -1; return; }
      if (drag && performance.now() - dragAt > 2500) up();
      if (ticks !== seenTicks) { seenTicks = ticks; return; }
      var box = host.getBoundingClientRect();
      if (box.bottom > -200 && box.top < innerHeight + 200) { seen = true; raf = 0; kick(); }
    }, 1500);
    CUR = { cv: cv, r: r, stop: function () {
      live = false; clearInterval(beat);
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    } };
    /* The frame is booked in one place and the token is the proof. Both the
       model landing and the observer want to start the loop, and on a slow
       device the gap between booking a frame and running it is long enough
       for the second caller to book another — two loops, and the mark turns
       at twice the speed it was written for. */
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }

    function loop(t) {
      raf = 0;
      if (!live || !seen) { last = 0; return; }
      ticks++;
      /* The ceiling on dt is a guard against one huge step after the page
         comes back from the background. At 0.05 it was also capping every
         frame slower than 20fps, so a phone running at 8 turned the mark at
         two fifths speed and one running at 4 looked stopped altogether.
         0.25 still swallows the return-from-background jump — 3.7° at most —
         without punishing a device for being slow. */
      var dt = last ? Math.min(0.25, (t - last) / 1000) : 0; last = t;
      if (DBG) { D.moving = spin !== D.spin; D.ticks = ticks; D.spin = spin;
        D.seen = seen; D.drag = drag; D.reduced = reduced; }
      /* Reduce-motion slows the turn rather than stopping it. What that
         setting exists to prevent is large-area movement — parallax, drift,
         zoom — which is why the dust behind holds still under it. One small
         object turning at a constant rate in a fixed frame is not that, and
         a mark frozen mid-rotation reads as a page that failed to load. */
      if (!drag) { var target = reduced ? 0.10 : 0.26;
        vel += (target - vel) * Math.min(1, dt * 1.6); spin += vel * dt; }
      piv.rotation.y = spin;
      r.render(sc, cam);
      raf = requestAnimationFrame(loop);
    }
  }

  var DUSTCV = null, attempts = 0;
  function boot(host, cv) {
    if (attempts > 5) return;              // budget for boots that never went live
    attempts++; D.boots = (D.boots || 0) + 1;
    try { mark(cv, host); } catch (e) { fail('mark: ' + (e && e.message ? e.message : e)); }
  }

  /* Custom-element callbacks are not a reliable place to notice that the
     runtime swapped the section's markup: a moved element gets no second
     connectedCallback, and a replaced one leaves the first renderer holding
     a context nobody can see. This watches the document instead — whatever
     canvas is on the page right now is the one that gets driven. */
  function supervise() {
    var host = document.querySelector('gacha-hero');
    if (!host) return;
    var d = (host.closest('section') || document).querySelector('canvas[data-gdust]'),
        cv = host.querySelector('canvas[data-gmark]');
    if (d && d !== DUSTCV) { DUSTCV = d; dust(d); }
    if (cv && window.__GACHA3__ && !(CUR && CUR.cv === cv && cv.isConnected)) boot(host, cv);
  }
  setInterval(supervise, 2000);

  class GachaHero extends HTMLElement {
    connectedCallback() {
      if (this._on) return;
      /* the dust is the whole section's sky now, not the hero's own */
      this.d = (this.closest('section') || document).querySelector('canvas[data-gdust]');
      this.m = this.querySelector('canvas[data-gmark]');
      if (!this.d || !this.m) {
        D.step = 'waiting for the canvases';
        if ((this._t = (this._t || 0) + 1) < 120) requestAnimationFrame(() => this.connectedCallback());
        else fail('canvases never appeared');
        return;
      }
      this._on = true; D.step = 'armed';
      DUSTCV = this.d; dust(this.d);
      var self = this;
      var go = function () {
        if (self._boot) return; self._boot = true;
        D.step = 'loading three';
        /* Not window.__THREE__. Three writes the string "160" into that
           global as its own duplicate-import guard, partway through any
           build — including the copy the Land of Hope section imports from
           unpkg. Whichever of the two got there first, this saw a truthy
           value, skipped loading the bundle it actually needs, and then
           found no THREE on it. Hence a mark that rendered a still and
           nothing else. The bundle publishes its own namespace now.
           Both ways in are guarded, so a throw is reported rather than lost. */
        if (window.__GACHA3__) return boot(self, self.m);
        var s = document.querySelector('script[data-gacha3]');
        if (!s) {
          s = document.createElement('script');
          s.src = THREE_SRC; s.setAttribute('data-gacha3', '');
          s.onerror = function () { fail('three failed to load'); };
          document.head.appendChild(s);
        }
        s.addEventListener('load', function () {
          if (!window.__GACHA3__) return fail('bundle loaded but published nothing');
          boot(self, self.m);
        });
      };
      if (!('IntersectionObserver' in window)) return go();
      new IntersectionObserver(function (es, io) {
        if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); go(); }
      }, { rootMargin: '1400px 0px' }).observe(this);
    }
  }
  customElements.define('gacha-hero', GachaHero);
})();
