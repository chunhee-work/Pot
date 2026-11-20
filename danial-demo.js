/* Try Danial: send one photo, voice note or short video to /api/danial and show what he understood. */
(function () {
  var dz = document.getElementById('dz'); if (!dz) return;
  var input = document.getElementById('dz-file'), prev = document.getElementById('dz-prev');
  var state = document.getElementById('dz-state'), res = document.getElementById('dz-res');
  var und = document.getElementById('dz-und'), rep = document.getElementById('dz-rep');
  var again = document.getElementById('dz-again');
  var MAX = 3 * 1024 * 1024, busy = false, url = null, live = null;

  var MSG = {
    not_live: 'The demo is switched off right now. The screenshots above show the real product.',
    too_big: 'That file is over 3 MB. Try a smaller photo or a shorter clip.',
    unsupported_file: 'He reads photos, voice notes and MP4, MOV or WebM video.',
    slow_down: 'That is a lot of files. Give him a few minutes.',
    demo_full_today: 'The demo has reached its limit for today. Come back tomorrow.',
    nothing_heard: 'He could not hear any words in that voice note.',
    could_not_watch: 'He could not read that video. Try a shorter MP4.'
  };
  function say(text, cls) { state.hidden = false; state.className = 'try-state' + (cls ? ' ' + cls : ''); state.textContent = text; res.hidden = true; }
  function kindOf(f) { var t = f.type || ''; return t.indexOf('image/') === 0 ? 'image' : t.indexOf('audio/') === 0 ? 'audio' : t.indexOf('video/') === 0 ? 'video' : null; }

  function show(f, kind) {
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(f); prev.textContent = '';
    var el = document.createElement(kind === 'image' ? 'img' : kind);
    el.src = url;
    if (kind === 'image') el.alt = 'The file you sent'; else { el.controls = true; if (kind === 'video') { el.muted = true; el.playsInline = true; } }
    prev.appendChild(el); prev.hidden = false;
  }
  function b64(buf) {
    var bytes = new Uint8Array(buf), out = '', step = 0x8000;
    for (var i = 0; i < bytes.length; i += step) out += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    return btoa(out);
  }
  /* photos are shrunk in the browser so a phone picture fits the limit */
  function shrink(f) {
    return new Promise(function (ok) {
      if (f.type === 'image/gif' || f.size < 900 * 1024) return ok(f);
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { ok(b || f); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { ok(f); };
      img.src = URL.createObjectURL(f);
    });
  }

  function send(f) {
    if (busy || !f) return;
    var kind = kindOf(f);
    if (!kind) return say(MSG.unsupported_file, 'err');
    show(f, kind);
    if (live && live[kind] === false) return say(MSG.not_live, 'err');
    busy = true;
    say(kind === 'image' ? 'Danial is looking' : kind === 'audio' ? 'Danial is listening' : 'Danial is watching', 'busy');
    (kind === 'image' ? shrink(f) : Promise.resolve(f)).then(function (blob) {
      if (blob.size > MAX) throw { error: 'too_big' };
      return blob.arrayBuffer().then(function (buf) {
        return fetch('/api/danial', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: kind, mime: (blob.type || f.type).split(';')[0], data: b64(buf) }) });
      });
    }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (j) {
        if (!j.ok) throw j;
        und.textContent = j.understood; rep.textContent = j.reply;
        state.hidden = true; res.hidden = false;
      })
      .catch(function (e) { say(MSG[e && e.error] || 'Something went wrong on his side. Try again in a moment.', 'err'); })
      .then(function () { busy = false; input.value = ''; });
  }

  input.addEventListener('change', function () { send(input.files[0]); });
  ['dragenter', 'dragover'].forEach(function (n) { dz.addEventListener(n, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (n) { dz.addEventListener(n, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
  dz.addEventListener('drop', function (e) { send(e.dataTransfer.files[0]); });
  again.addEventListener('click', function () { prev.hidden = true; prev.textContent = ''; say('Waiting for a file.'); input.focus(); });

  fetch('/api/danial').then(function (r) { return r.json(); }).then(function (j) {
    live = j.live || null;
    if (live && !live.image && !live.audio && !live.video) say(MSG.not_live);
  }).catch(function () {});
})();
