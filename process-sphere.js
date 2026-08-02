/* <process-sphere> — the home page's portal into /process.
   Same particle sphere the destination opens on, so the click reads as one
   continuous move: the sphere scatters here and reforms over there. */
(function () {
  if (customElements.get('process-sphere')) return;

  const N = 2400;
  const rand = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  class ProcessSphere extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.style.cssText += ';display:block;position:relative;cursor:pointer';

      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = 'width:100%;height:100%;display:block';
      this.canvas.setAttribute('aria-hidden', 'true');
      this.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');

      this.DPR = Math.min(2, devicePixelRatio || 1);
      this.rot = 0; this.last = 0; this.snapT = 0;
      this.mode = 'idle'; this.blast = false; this.done = false;
      this.mouse = { x: -1e4, y: -1e4 };
      this.build();

      this.onMove = (e) => { const r = this.getBoundingClientRect();
        this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top; };
      this.onLeave = () => { this.mouse.x = -1e4; this.mouse.y = -1e4; };
      this.addEventListener('mousemove', this.onMove);
      this.addEventListener('mouseleave', this.onLeave);

      // only run while the section is on screen — the home page has other canvases
      this.visible = true;
      if ('IntersectionObserver' in window) {
        this.visible = false;
        this.io = new IntersectionObserver((es) => {
          es.forEach((en) => { this.visible = en.isIntersecting; });
        }, { rootMargin: '200px 0px' });
        this.io.observe(this);
      }
      this.frame = this.frame.bind(this);
      requestAnimationFrame(this.frame);
    }

    disconnectedCallback() {
      this.done = true;
      cancelAnimationFrame(this.raf);
      if (this.io) this.io.disconnect();
      this.removeEventListener('mousemove', this.onMove);
      this.removeEventListener('mouseleave', this.onLeave);
    }

    build() {
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

    /* scatter the sphere across the whole viewport, then hand over to /process */
    launch(href) {
      if (this.mode === 'snap') return;
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
      // never strand the visitor if the animation stalls
      this.bail = setTimeout(() => { location.href = href; }, 1400);
    }

    frame(now) {
      if (this.done) return;
      const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0;
      this.last = now;
      if (!this.visible && this.mode !== 'snap') { this.raf = requestAnimationFrame(this.frame); return; }

      this.size();
      const ctx = this.ctx, cv = this.canvas, DPR = this.DPR;
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
        if (alive === 0 || this.snapT > 1.05) {
          this.done = true;
          clearTimeout(this.bail);
          location.href = this.href;
          return;
        }
      }
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  customElements.define('process-sphere', ProcessSphere);

  /* the sphere lives inside a real <a>, so it works without JS; with JS the
     link waits for the scatter to finish */
  addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('a[data-sphere-portal]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const sphere = a.querySelector('process-sphere');
    if (!sphere || !sphere.launch) return;
    e.preventDefault();
    sphere.launch(a.getAttribute('href'));
  }, true);
})();
