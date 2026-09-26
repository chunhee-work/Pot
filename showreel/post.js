/* The lens every frame goes through: the 2D frame is uploaded as a texture
   and finished here — film grain, a vignette, and the three effects chapters
   can call for on a cut: chromatic aberration, a radial shock warp, and a
   white flash. Returns null where WebGL is not available; the 2D canvas is
   then shown as it is. */

const VS = `
attribute vec2 p;
varying vec2 v;
void main(){ v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `
precision highp float;
varying vec2 v;
uniform sampler2D tex;
uniform vec2 res;
uniform float time, ab, flash, warp, grain, vig, expo;
uniform vec2 warpC, shake;
float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
void main(){
  vec2 uv = v + shake / res;
  // shock warp: a ring expanding out from warpC
  if (warp > 0.0) {
    vec2 d = uv - warpC; d.x *= res.x / res.y;
    float r = length(d);
    float ring = warp * 1.4;
    float k = exp(-pow((r - ring) * 9.0, 2.0)) * (1.0 - warp) * 0.045;
    uv -= normalize(d + 1e-5) * k * vec2(res.y / res.x, 1.0);
  }
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  // aberration grows toward the edges, as a lens's does
  float a = (0.0012 + ab * 0.014) * (0.25 + r2 * 2.2);
  vec3 col;
  col.r = texture2D(tex, uv + c * a).r;
  col.g = texture2D(tex, uv).g;
  col.b = texture2D(tex, uv - c * a).b;
  col *= expo;
  // vignette
  col *= mix(1.0, smoothstep(0.95, 0.18, r2 * 1.6), 0.55 * vig);
  // grain, re-rolled every frame, luminance-weighted so blacks stay black
  float n = hash(v * res + fract(time * 13.0) * 97.0) - 0.5;
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col += n * 0.075 * grain * (0.35 + l * 0.9);
  col = mix(col, vec3(1.0, 0.985, 0.955), clamp(flash, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;

export function createPost(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn('[reel] post disabled:', e.message); return null; }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const U = {};
  ['tex', 'res', 'time', 'ab', 'flash', 'warp', 'grain', 'vig', 'expo', 'warpC', 'shake'].forEach(n => (U[n] = gl.getUniformLocation(prog, n)));
  gl.uniform1i(U.tex, 0);

  let lost = false;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; });

  return {
    get lost() { return lost; },
    resize(w, h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); },
    draw(src, fx, time) {
      if (lost) return false;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.time, time);
      gl.uniform1f(U.ab, fx.ab); gl.uniform1f(U.flash, fx.flash); gl.uniform1f(U.warp, fx.warp);
      gl.uniform1f(U.grain, fx.grain); gl.uniform1f(U.vig, fx.vignette); gl.uniform1f(U.expo, fx.exposure);
      gl.uniform2f(U.warpC, fx.warpX, 1 - fx.warpY);
      gl.uniform2f(U.shake, fx.shakeX || 0, -(fx.shakeY || 0));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return true;
    }
  };
}
