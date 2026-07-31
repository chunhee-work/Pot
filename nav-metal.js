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
       + 0.62 * sin(x * 6.2832 * 1.15 + t * 0.95)
       + 0.30 * sin(x * 6.2832 * 2.40 - t * 0.62)
       + 0.14 * sin((x * 3.1 + y * 1.4) * 6.2832 * 0.7 + t * 1.3);
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
})();
