/* The opening of /process, hosted on the home page.
   <process-stars> is the fly-through starfield, <process-sphere> the particle
   sphere. Clicking the sphere fires the intro clip, scatters the sphere across
   the viewport and hands over to /process, which opens straight into the
   stages — so the two pages read as one move. */
(function () {
  if (customElements.get('process-sphere')) return;

  const INTRO = 'assets/process/intro.mp3';
  const BGM = 'assets/process/bgm.mp3';
  const DEPART = 900;      /* a backstop; the scatter normally leaves first */
  const SCATTER = 0.7;     /* seconds of particles before the page hands over */
  const rand = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  /* ── starfield ────────────────────────────────────────────────────── */
  class ProcessStars extends HTMLElement {
    connectedCallback() {
      if (this._booted) { this.dead = false; requestAnimationFrame(this.loop); return; }
      this.cv = this.querySelector('canvas');
      if (!this.cv) {
        if ((this._tries = (this._tries || 0) + 1) < 120) requestAnimationFrame(() => this.connectedCallback());
        return;
      }
      this._booted = true;
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.boost = 1; this.boostTo = 1;
      this.ctx = this.cv.getContext('2d');
      this.DPR = Math.min(1.5, devicePixelRatio || 1);
      this.N = 620; this.seed = 0; this.last = 0; this.st = [];
      for (let i = 0; i < this.N; i++) { const s = {}; this.spawn(s, true); this.st.push(s); }
      this.neb = [];
      for (let i = 0; i < 3; i++) this.neb.push({ x: rand(i * 13 + 41), y: 0.12 + rand(i * 13 + 42) * 0.72,
        r: 0.42 + rand(i * 13 + 43) * 0.38, a: 0.045 + rand(i * 13 + 44) * 0.028, ph: rand(i * 13 + 45) * 6.2832 });

      this.visible = true;
      if ('IntersectionObserver' in window) {
        this.visible = false;
        this.io = new IntersectionObserver((es) => es.forEach((en) => { this.visible = en.isIntersecting; }),
          { rootMargin: '200px 0px' });
        this.io.observe(this);
      }
      this.loop = this.loop.bind(this);
      this.size();          /* never leave the backing store at its 300x150 default */
      requestAnimationFrame(this.loop);
    }

    disconnectedCallback() { this.dead = true; cancelAnimationFrame(this.raf); }

    /* the sphere has gone; push through the field so the wait reads as travel */
    warp() { this.boostTo = 9; }

    spawn(s, init) {
      this.seed++;
      const a = rand(this.seed * 7 + 1) * 6.2832, r = Math.sqrt(rand(this.seed * 7 + 2)) * 1.35;
      s.x = Math.cos(a) * r; s.y = Math.sin(a) * r * 0.78;
      s.z = init ? 0.05 + rand(this.seed * 7 + 3) * 0.95 : 0.72 + rand(this.seed * 7 + 3) * 0.28;
      s.sz = 0.5 + rand(this.seed * 7 + 4) * 1.05;
      s.tw = 0.4 + rand(this.seed * 7 + 5) * 1.5; s.ph = rand(this.seed * 7 + 6) * 6.2832;
      s.big = rand(this.seed * 7 + 8) < 0.16;
    }

    size() {
      const w = Math.round(this.clientWidth * this.DPR), h = Math.round(this.clientHeight * this.DPR);
      if (w && (this.cv.width !== w || this.cv.height !== h)) { this.cv.width = w; this.cv.height = h; }
    }

    loop(t) {
      if (this.dead) return;
      const dt = this.last ? Math.min(0.05, (t - this.last) / 1000) : 0;
      this.last = t;
      this.size();
      if (!this.visible && this.boostTo === 1) { this.raf = requestAnimationFrame(this.loop); return; }
      this.boost += (this.boostTo - this.boost) * Math.min(1, dt * 2.4);
      const ctx = this.ctx, W = this.cv.width, H = this.cv.height;
      if (!W || !H) { this.raf = requestAnimationFrame(this.loop); return; }
      ctx.clearRect(0, 0, W, H);
      const sec = t / 1000, CX = W / 2, CY = H / 2, FOV = 0.5 * W;

      for (const nb of this.neb) {
        const na = nb.a * (0.8 + 0.2 * Math.sin(sec * 0.05 + nb.ph));
        const nr = nb.r * Math.max(W, H), nx = nb.x * W, ny = nb.y * H;
        const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
        g.addColorStop(0, 'rgba(205,208,222,' + na.toFixed(4) + ')');
        g.addColorStop(1, 'rgba(205,208,222,0)');
        ctx.fillStyle = g; ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
      }

      ctx.fillStyle = '#fff';
      const VZ = 0.0145;
      for (const s of this.st) {
        if (dt && !this.reduced) s.z -= VZ * dt * this.boost;
        const kk = FOV / Math.max(0.02, s.z);
        const px = CX + s.x * kk, py = CY + s.y * kk;
        if (s.z <= 0.05 || px < -30 || px > W + 30 || py < -30 || py > H + 30) { this.spawn(s, false); continue; }
        const near = 1 - s.z;
        const al = (0.22 + 0.78 * near * near) * (0.74 + 0.26 * Math.sin(sec * s.tw * 2 + s.ph));
        const rr = s.sz * this.DPR * (1.1 + 2.1 * near);
        if (s.big && near > 0.35) { ctx.globalAlpha = al * 0.22; ctx.beginPath(); ctx.arc(px, py, rr * 3, 0, 6.2832); ctx.fill(); }
        ctx.globalAlpha = al;
        ctx.beginPath(); ctx.arc(px, py, rr, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  /* ── particle sphere ──────────────────────────────────────────────── */
  const N = 2400;

  class ProcessSphere extends HTMLElement {
    connectedCallback() {
      if (this._booted) {
        if (this.mode !== 'snap') { this.done = false; requestAnimationFrame(this.frame); }
        addEventListener('pageshow', this.onShow);
        return;
      }
      this.canvas = this.querySelector('canvas');
      if (!this.canvas) {
        if ((this._tries = (this._tries || 0) + 1) < 120) requestAnimationFrame(() => this.connectedCallback());
        return;
      }
      this._booted = true;
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.baseCss = this.canvas.getAttribute('style') || 'width:100%;height:100%;display:block';
      this.ctx = this.canvas.getContext('2d');
      this.DPR = Math.min(2, devicePixelRatio || 1);
      this.reset();

      this.onMove = (e) => { const r = this.getBoundingClientRect();
        this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top; };
      this.onLeave = () => { this.mouse.x = -1e4; this.mouse.y = -1e4; };
      this.addEventListener('mousemove', this.onMove);
      this.addEventListener('mouseleave', this.onLeave);

      /* coming back through the history cache restores the page mid-scatter —
         the sphere has to be rebuilt or the visitor lands on an empty screen */
      this.onShow = (e) => { if (e.persisted) { this.reset(); requestAnimationFrame(this.frame); } };
      addEventListener('pageshow', this.onShow);

      this.visible = true;
      if ('IntersectionObserver' in window) {
        this.visible = false;
        this.io = new IntersectionObserver((es) => es.forEach((en) => {
          this.visible = en.isIntersecting;
          if (en.isIntersecting) this.warmDestination();
        }), { rootMargin: '200px 0px' });
        this.io.observe(this);
      } else {
        this.warmDestination();
      }
      this.addEventListener('pointerenter', () => this.warmDestination());
      this.frame = this.frame.bind(this);
      this.size();          /* never leave the backing store at its 300x150 default */
      requestAnimationFrame(this.frame);
    }

    disconnectedCallback() {
      this.done = true;
      cancelAnimationFrame(this.raf);
      if (this.io) this.io.disconnect();
      removeEventListener('pageshow', this.onShow);
      this.removeEventListener('mousemove', this.onMove);
      this.removeEventListener('mouseleave', this.onLeave);
    }

    /* Bring the destination into this document. Nothing unloads, so the cue
       carries straight through; a failure here just falls back to a normal
       navigation, which costs the sound but never the page. */
    async arrive() {
      if (this._arrived) return;
      this._arrived = true;
      const href = this.href;
      try {
        const res = await fetch(href, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(res.status);
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        if (!doc.getElementById('stages')) throw new Error('unexpected document');

        const stash = document.createElement('div');
        stash.id = '__home-stash';
        stash.style.display = 'none';
        while (document.body.firstChild) stash.appendChild(document.body.firstChild);
        document.body.appendChild(stash);

        /* DOMParser parses with scripting disabled, so a <noscript> fallback
           comes through as real elements — its "hide the opening" rule would
           apply here, where scripting is very much enabled */
        doc.querySelectorAll('style').forEach((el) => {
          if (el.closest('noscript')) return;
          const s = document.createElement('style');
          s.textContent = el.textContent;
          s.dataset.arrived = '1';
          document.head.appendChild(s);
        });
        doc.body.childNodes.forEach((n) => {
          if (n.nodeName === 'SCRIPT' || n.nodeName === 'NOSCRIPT') return;
          document.body.appendChild(document.importNode(n, true));
        });

        window.__cueRunning = true;   // the cue is already sounding in this document
        doc.querySelectorAll('script').forEach((el) => {
          const s = document.createElement('script');
          s.textContent = el.textContent;
          document.body.appendChild(s);
        });

        history.pushState({ arrived: true }, '', href);
        scrollTo(0, 0);
        addEventListener('popstate', function back() {
          removeEventListener('popstate', back);
          location.href = '/';
        });
      } catch (e) {
        console.warn('[portal]', e);
        location.href = href;
      }
    }

    /* pull the destination and the clip into cache before the click needs them */
    warmDestination() {
      if (this._warmed) return;
      this._warmed = true;
      const a = this.closest('a[data-sphere-portal]');
      const href = a && a.getAttribute('href');
      [href, INTRO].forEach((u) => {
        if (!u) return;
        const l = document.createElement('link');
        l.rel = 'prefetch'; l.href = u;
        document.head.appendChild(l);
      });
    }

    reset() {
      clearTimeout(this.bail);
      this.canvas.style.cssText = this.baseCss;
      this.rot = 0; this.last = 0; this.snapT = 0;
      this.mode = 'idle'; this.blast = false; this.done = false;
      this.mouse = { x: -1e4, y: -1e4 };
      this.pts = [];
      const ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
        this.pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r,
          s: 0.8 + rand(i + 3) * 1.5, al: 0.35 + rand(i + 5) * 0.65,
          ox: 0, oy: 0, vx: 0, vy: 0, burst: false, dead: false, delay: rand(i + 7) });
      }
    }

    size() {
      const cv = this.canvas;
      if (this.blast) {
        const w = Math.round(innerWidth * this.DPR), h = Math.round(innerHeight * this.DPR);
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
        return;
      }
      const w = Math.round(this.clientWidth * this.DPR);
      if (w && cv.width !== w) { cv.width = w; cv.height = w; }
      this.R = cv.width * 0.40; this.CX = cv.width / 2; this.CY = cv.height / 2;
    }

    launch(href) {
      if (this.mode === 'snap') return;
      this.t0 = performance.now();

      /* A browser will not let a freshly navigated page make a sound until the
         visitor touches it, so the clip cannot survive a navigation — it is cut
         at the moment the document is replaced. The cue therefore starts here,
         on the click that authorises it, and the destination is brought into
         *this* document instead of being navigated to. Nothing unloads, so
         nothing stops: the clip plays itself out and the score follows it. */
      try {
        const clip = new Audio(INTRO);
        clip.volume = 1;
        const cp = clip.play();
        if (cp && cp.catch) cp.catch(function () {});

        setTimeout(function () {
          const bgm = new Audio(BGM);
          bgm.loop = true; bgm.volume = 0;
          const bp = bgm.play();
          if (bp && bp.catch) bp.catch(function () {});
          const t0 = performance.now();
          (function fade(n) {
            const k = Math.max(0, Math.min(1, (n - t0) / 1800));
            bgm.volume = 0.85 * k;
            if (k < 1) requestAnimationFrame(fade);
          })(t0);
        }, 1000);
      } catch (e) {}

      if (this.reduced) { location.href = href; return; }
      const r = this.getBoundingClientRect();
      this.href = href;
      this.blast = true;
      this.canvas.style.cssText =
        'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999;pointer-events:none;display:block';
      this.size();
      this.CX = (r.left + r.width / 2) * this.DPR;
      this.CY = (r.top + r.height / 2) * this.DPR;
      this.R = r.width * this.DPR * 0.40;
      this.mode = 'snap'; this.snapT = 0;
      const stars = document.querySelector('process-stars');
      if (stars && stars.warp) stars.warp();
      this.bail = setTimeout(() => this.arrive(), DEPART);
    }

    frame(now) {
      if (this.done) return;
      const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0;
      this.last = now;
      this.size();
      if (!this.visible && this.mode !== 'snap') { this.raf = requestAnimationFrame(this.frame); return; }
      const ctx = this.ctx, cv = this.canvas, DPR = this.DPR;
      if (!cv.width) { this.raf = requestAnimationFrame(this.frame); return; }
      if (!this.reduced && this.mode !== 'snap') this.rot += dt * 0.22;
      ctx.clearRect(0, 0, cv.width, cv.height);
      const cR = Math.cos(this.rot), sR = Math.sin(this.rot);
      let alive = 0;

      for (let i = 0; i < N; i++) {
        const p = this.pts[i];
        const x = p.x * cR + p.z * sR, z = -p.x * sR + p.z * cR, y = p.y;
        const persp = 1.6 / (1.6 - z * 0.62);
        const sx = this.CX + x * this.R * persp, sy = this.CY + y * this.R * persp;

        if (this.mode === 'snap') {
          if (p.dead) continue;
          const t = this.snapT - p.delay * 0.45;
          if (t > 0) {
            if (!p.burst) {
              p.burst = true;
              const bx = sx - this.CX, by = sy - this.CY, bl = Math.hypot(bx, by) || 1;
              const sp = 520 + rand(i + 11) * 1150;
              p.vx = bx / bl * sp + (rand(i + 17) - 0.5) * 180;
              p.vy = by / bl * sp + (rand(i + 19) - 0.5) * 180;
            }
            p.ox += p.vx * dt * DPR; p.oy += p.vy * dt * DPR;
            if (sx + p.ox < -90 || sx + p.ox > cv.width + 90 ||
                sy + p.oy < -90 || sy + p.oy > cv.height + 90) { p.dead = true; continue; }
          }
        } else {
          const dx = sx / DPR - this.mouse.x, dy = sy / DPR - this.mouse.y, d = Math.hypot(dx, dy);
          if (d < 74 && d > 0.001) { const f = (74 - d) / 74; p.ox += dx / d * f * 4.6 * DPR; p.oy += dy / d * f * 4.6 * DPR; }
          p.ox *= 0.86; p.oy *= 0.86;
        }

        alive++;
        const front = (z + 1) / 2;
        ctx.globalAlpha = p.al * (p.burst ? 0.9 : (0.28 + 0.72 * front));
        ctx.fillStyle = '#fff';
        const rad = p.s * DPR * (0.55 + 0.75 * front) * persp;
        ctx.beginPath(); ctx.arc(sx + p.ox, sy + p.oy, rad, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (this.mode === 'snap') {
        this.snapT += dt;
        if (alive === 0 || this.snapT > SCATTER) {
          this.done = true;
          clearTimeout(this.bail);
          try { window.__depart = Math.round(performance.now() - this.t0); } catch (e) {}
          this.arrive();
          return;
        }
      }
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  customElements.define('process-stars', ProcessStars);
  customElements.define('process-sphere', ProcessSphere);

  /* the sphere sits inside a real anchor, so it still works without script */
  addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('a[data-sphere-portal]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const sphere = a.querySelector('process-sphere');
    if (!sphere || !sphere.launch) return;
    e.preventDefault();
    sphere.launch(a.getAttribute('href'));
  }, true);
})();
