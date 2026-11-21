(function () {
// Liquid-metal rim for the nav pill.
//
// Ported from the paper-design liquid-metal shader's uniform set — repetition 4,
// softness .5, red/blue shift .3, angle 45, scale 8 — but written straight against
// WebGL so the page keeps its zero-dependency, no-build shape. Same reason the logo
// is raw three.js and the dust layer is raw canvas 2D.
//
// The metal is only ever visible as the pill's edge: a solid plate sits on top of
// the canvas inset by a hair, so link text never has to fight moving chrome.

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `precision mediump float;
uniform vec2  u_res;
uniform float u_time;
uniform float u_polish;
uniform float u_freq;

const float REPETITION = 2.1;
const float SOFTNESS   = 0.5;
const float SHIFT_R    = 0.30;
const float SHIFT_B    = 0.30;

// The pill is ~13:1, and only a hair of its perimeter is ever visible, so the
// field is mapped for a long thin tube rather than the square the original
// shader assumes. Across the height it is a cross-section gradient — that is
// what gives a chrome tube its bright top and dark underside. Along the length
// it is two slow travelling waves, so highlights slide from cap to cap instead
// of the whole rim flashing at once.
float field(vec2 uv, float t) {
  float x = uv.x, y = uv.y;
  return y * 2.30
       + 0.62 * sin(x * 6.2832 * 1.15 * u_freq + t * 0.95)
       + 0.30 * sin(x * 6.2832 * 2.40 * u_freq - t * 0.62)
       + 0.14 * sin((x * 3.1 * u_freq + y * 1.4) * 6.2832 * 0.7 + t * 1.3);
}

// One colour channel, phase-shifted. Softness blends between hard-edged bands
// (mirror-like) and a smooth gradient (molten).
float band(float f, float phase) {
  float v = sin(f * 6.2832 * REPETITION * 0.5 + phase) * 0.5 + 0.5;
  float hard = smoothstep(0.40, 0.60, v);
  return mix(hard, v, SOFTNESS);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time;
  float f = field(uv, t);

  vec3 col = vec3(
    band(f, t + SHIFT_R),
    band(f, t),
    band(f, t - SHIFT_B)
  );

  // Metal, not rainbow: deepen the darks, then pull most of the way back to grey
  // so only a thin iridescence survives at the band edges.
  col = pow(col, vec3(1.45));
  col = mix(vec3(dot(col, vec3(0.3333))), col, 0.42);
  col = (col - 0.5) * u_polish + 0.5;
  col = clamp(col * 0.90 + 0.07, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || 'shader compile failed');
  }
  return sh;
}

function mountMetalRim(host, opts) {
  const o = opts || {};
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;border-radius:inherit';
  host.insertBefore(canvas, host.firstChild);

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { canvas.remove(); return null; }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return null; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uPolish = gl.getUniformLocation(prog, 'u_polish');
  const uFreq = gl.getUniformLocation(prog, 'u_freq');
  const REF_W = 575;
  const POLISH = o.polish == null ? 0.8 : o.polish;

  // The pill is a couple of pixels of visible rim, so it never needs full DPR.
  const DPR_CAP = 1.5;
  let w = 0, h = 0;
  const resize = () => {
    const dpr = Math.min(DPR_CAP, devicePixelRatio || 1);
    const nw = Math.max(1, Math.round(host.clientWidth * dpr));
    const nh = Math.max(1, Math.round(host.clientHeight * dpr));
    if (nw === w && nh === h) return;
    w = nw; h = nh;
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uFreq, Math.max(0.34, host.clientWidth / REF_W));
  };
  resize();

  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(host); else addEventListener('resize', resize);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BASE = o.speed == null ? 0.6 : o.speed;
  let speed = BASE, clock = 0, last = 0, dead = false;

  const draw = (now) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    clock += dt * speed;
    gl.uniform1f(uTime, clock);
    gl.uniform1f(uPolish, POLISH);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  if (reduced) {
    // One frame, held. Nothing moves, but the rim still reads as metal.
    clock = 2.1;
    gl.uniform1f(uTime, clock);
    gl.uniform1f(uPolish, POLISH);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return {
    canvas,
    // Driven by the page's existing rAF loop rather than starting a second one.
    frame(now) {
      if (dead || reduced || document.hidden) return;
      resize();
      draw(now);
    },
    setSpeed(v) { speed = v; },
    base: BASE,
    destroy() {
      dead = true;
      if (ro) ro.disconnect(); else removeEventListener('resize', resize);
      canvas.remove();
    },
  };
}

  window.mountMetalRim = mountMetalRim;

/* ── which way the row can still go ───────────────────────────────────
   Below ~620px the seven items are wider than the pill, and a rounded edge
   cutting a word in half reads as a mistake rather than as an invitation.
   The stylesheet fades whichever edge has more behind it; this only has to
   say which. The CSS default is a right-hand fade, so the resting state is
   already correct if this never runs. */
(function () {
  const EDGE = 6;              // a couple of pixels of slack for sub-pixel scroll
  function mark(row) {
    const over = row.scrollWidth - row.clientWidth;
    if (over <= EDGE) { row.dataset.edge = 'none'; return; }
    const left = row.scrollLeft > EDGE;
    const right = row.scrollLeft < over - EDGE;
    row.dataset.edge = left && right ? 'lr' : left ? 'l' : 'r';
  }

  function watch() {
    document.querySelectorAll('nav[data-metal] [data-navscroll]').forEach((row) => {
      if (row.__edged) return;
      row.__edged = true;
      const update = () => mark(row);
      row.addEventListener('scroll', update, { passive: true });
      if (typeof ResizeObserver === 'function') new ResizeObserver(update).observe(row);
      else addEventListener('resize', update);
      update();
    });
  }

  /* the runtime builds the nav from its own template, so the row can arrive
     after this file does — and can be replaced later by a re-render */
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', watch);
  else watch();
  addEventListener('load', watch);
  let tries = 0;
  (function poll() { watch(); if (++tries < 90) requestAnimationFrame(poll); })();
})();
})();

/* Phones: the pill only has room for Projects / About / CV / Contact, so a tap on
   Projects opens a small sheet with the three case studies and the full list.
   Wider screens keep the plain link (the case studies sit in the pill there). */
(function () {
  var MQ = '(max-width:520px)', sheet = null, from = null;
  var LINKS = [['/land-of-hope', 'Land of Hope'], ['/the-chill-gallery', 'The Chill Gallery'], ['/oeru', 'oeru'], ['/projects', 'All projects']];
  function css() {
    if (document.getElementById('pmenu-css')) return;
    var s = document.createElement('style'); s.id = 'pmenu-css';
    s.textContent = '.pmenu{position:fixed;top:84px;left:50%;transform:translate(-50%,-6px);z-index:95;width:min(320px,calc(100vw - 32px));padding:8px;border-radius:22px;background:#141413;border:1px solid rgba(244,242,236,.12);box-shadow:0 18px 40px rgba(0,0,0,.55);opacity:0;visibility:hidden;transition:opacity .25s,transform .3s cubic-bezier(.16,1,.3,1),visibility .25s;font-family:inherit}' +
      '.pmenu.on{opacity:1;visibility:visible;transform:translate(-50%,0)}' +
      '.pmenu a{display:flex;align-items:center;justify-content:space-between;min-height:48px;padding:0 16px;border-radius:14px;color:#f4f2ec;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:.01em}' +
      '.pmenu a+a{border-top:1px solid rgba(244,242,236,.07)}.pmenu a:last-child{color:#a8a69e;font-size:13.5px}' +
      '.pmenu a:focus-visible,.pmenu a:hover{background:rgba(244,242,236,.06);outline:none}' +
      '.pmenu a::after{content:"\\2197";color:#8a887f;font-size:14px}' +
      '@media (prefers-reduced-motion:reduce){.pmenu{transition:none}}';
    document.head.appendChild(s);
  }
  function build() {
    if (sheet) return sheet;
    css();
    sheet = document.createElement('div'); sheet.className = 'pmenu'; sheet.id = 'pmenu';
    sheet.setAttribute('role', 'menu'); sheet.setAttribute('aria-label', 'Projects');
    sheet.innerHTML = LINKS.map(function (l) { return '<a role="menuitem" href="' + l[0] + '">' + l[1] + '</a>'; }).join('');
    document.body.appendChild(sheet);
    return sheet;
  }
  function isTrigger(a) {
    return a && a.closest && a.closest('nav[data-metal]') && /^\/(#wheel)?$|^\/projects$/.test(a.getAttribute('href') || '') && /Projects/.test(a.textContent);
  }
  function show(a) {
    build(); from = a; sheet.classList.add('on'); a.setAttribute('aria-expanded', 'true');
    var f = sheet.querySelector('a'); if (f) f.focus({ preventScroll: true });
  }
  function hide(back) {
    if (!sheet || !sheet.classList.contains('on')) return;
    sheet.classList.remove('on');
    if (from) { from.setAttribute('aria-expanded', 'false'); if (back) from.focus({ preventScroll: true }); }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (sheet && sheet.contains(e.target)) { hide(false); return; }
    if (isTrigger(a) && matchMedia(MQ).matches) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (sheet && sheet.classList.contains('on')) hide(true); else show(a);
      return;
    }
    hide(false);
  }, true);
  addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(true); });
  addEventListener('scroll', function () { hide(false); }, { passive: true });
  addEventListener('resize', function () { if (!matchMedia(MQ).matches) hide(false); });
  function mark() {
    document.querySelectorAll('nav[data-metal] a').forEach(function (a) {
      if (isTrigger(a) && !a.hasAttribute('aria-haspopup')) { a.setAttribute('aria-haspopup', 'true'); a.setAttribute('aria-controls', 'pmenu'); a.setAttribute('aria-expanded', 'false'); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark); else mark();
  addEventListener('load', mark);
})();

/* Contact, from any page. On a page that has the contact block, the click lands
   on it at once (no glide that a late layout shift can cut short) and checks
   again for a couple of seconds while images and fonts settle. Pages without
   the block go to /#contact, and the home page lands it the same way on load.
   The check stops as soon as the visitor scrolls on their own. */
(function () {
  var SEL = 'a[href="/#contact"],a[href="#contact"],a[data-scroll="#contact"]';
  var timers = [], user = false;
  function stopChecks() { timers.forEach(clearTimeout); timers = []; }
  ['wheel', 'touchstart', 'keydown'].forEach(function (ev) {
    addEventListener(ev, function (e) { if (ev !== 'keydown' || /^(Arrow|Page|Home|End|\s)/.test(e.key)) { user = true; stopChecks(); } }, { passive: true, capture: true });
  });
  function shown(el) { return el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; }
  function reveal(el) {
    el.querySelectorAll('[data-reveal]').forEach(function (r) { r.setAttribute('data-rv', '1'); r.style.opacity = '1'; r.style.transform = 'none'; });
  }
  function place(el) {
    var y = Math.max(0, el.getBoundingClientRect().top + scrollY);
    try { scrollTo({ top: y, behavior: 'instant' }); } catch (e) { scrollTo(0, y); }
  }
  function land(el) {
    stopChecks(); user = false;
    reveal(el); place(el);
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    try { el.focus({ preventScroll: true }); } catch (e) {}
    [120, 400, 900, 1600, 2600, 4000].forEach(function (t) {
      timers.push(setTimeout(function () {
        if (user || !shown(el)) return;
        if (Math.abs(el.getBoundingClientRect().top) > 2) place(el);
      }, t));
    });
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest(SEL);
    if (!a) return;
    var el = document.getElementById('contact');
    if (!shown(el)) return;            /* no contact block here: let /#contact load */
    e.preventDefault(); e.stopImmediatePropagation();
    if (location.hash !== '#contact') { try { history.pushState(null, '', '#contact'); } catch (er) {} }
    land(el);
  }, true);
  function fromHash() {
    if (location.hash !== '#contact') return;
    var el = document.getElementById('contact');
    if (shown(el)) land(el);
  }
  var nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
  if (!nav || nav.type === 'navigate') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fromHash); else fromHash();
    addEventListener('load', function () { if (!user) fromHash(); });
  }
})();

/* The capsule stays out of the way of the content: it slides up while the
   visitor scrolls down, and comes back on any scroll up, near the top, or when
   it takes keyboard focus. While a lightbox or dialog is open it is hidden, so
   the dialog's own title and Close sit on top with nothing over them. */
(function () {
  var root = document.documentElement;
  if (!document.getElementById('navhide-css')) {
    var s = document.createElement('style'); s.id = 'navhide-css';
    s.textContent = 'nav[data-metal]{transition:transform .38s cubic-bezier(.16,1,.3,1),opacity .25s,visibility .25s}' +
      'html.nav-off nav[data-metal]:not(:focus-within){transform:translate(-50%,calc(-100% - 30px))!important;opacity:0;visibility:hidden}' +
      'html.lb-on nav[data-metal],html.dlg-on nav[data-metal]{opacity:0!important;visibility:hidden!important;pointer-events:none}' +
      'html.nav-off .pmenu{opacity:0;visibility:hidden}html::before{transition:opacity .3s}html.nav-off::before{opacity:0}' +
      '[data-lightbox],#lb{z-index:200!important}' +
      '@media (prefers-reduced-motion:reduce){nav[data-metal]{transition:none}}';
    document.head.appendChild(s);
  }
  var lastY = scrollY, acc = 0, ticking = false;
  function menuOpen() { var m = document.getElementById('pmenu'); return m && m.classList.contains('on'); }
  function update() {
    ticking = false;
    var y = scrollY, d = y - lastY; lastY = y;
    if (y < 120) { acc = 0; root.classList.remove('nav-off'); return; }
    if ((d > 0) !== (acc > 0)) acc = 0;
    acc += d;
    if (acc > 24 && !menuOpen()) root.classList.add('nav-off');
    else if (acc < -24) root.classList.remove('nav-off');
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  /* any dialog in the page marks itself open: the main page's lightbox uses
     visibility, the other pages toggle html.lb-on themselves */
  function watchDialogs() {
    var box = document.querySelector('[data-lightbox]');
    if (!box || box.__navWatch) return;
    box.__navWatch = true;
    var sync = function () { root.classList.toggle('dlg-on', box.style.visibility === 'visible'); };
    new MutationObserver(sync).observe(box, { attributes: true, attributeFilter: ['style'] });
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchDialogs); else watchDialogs();
  addEventListener('load', watchDialogs);
  var n = 0; (function again() { watchDialogs(); if (++n < 40) setTimeout(again, 250); })();
})();
