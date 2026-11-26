/* Projects as title heroes: ?pc=b switches every 8 s (picker below), ?pc=c follows the scroll.
   The page runtime may re-render the section, so everything is looked up fresh each time. */
(function () {
  var d = document.documentElement, $ = function (s) { return document.querySelector(s); }, $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cur = 0, el = 0, last = performance.now(), held = false, DUR = 8000;
  function mode() { return d.getAttribute('data-pc'); }
  function show(i) {
    var its = $$('.ph-it'); if (!its.length) return;
    cur = (i + its.length) % its.length;
    its.forEach(function (it, k) {
      var on = k === cur; it.classList.toggle('is-on', on); it.setAttribute('aria-hidden', on ? 'false' : 'true');
      var sv = it.querySelector('section-video');
      if (sv) { sv.offstage = !on; if (on) { if (sv.play) sv.play(); } else if (sv.pause) sv.pause(); }
    });
    $$('.ph-steps span').forEach(function (s, k) { s.classList.toggle('is-on', k === cur); });
    $$('.ph-tab').forEach(function (b, k) { var on = k === cur; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
  }
  function label(it, txt) { var s = it.querySelector('[data-ph-stage]'); if (s && s.textContent !== txt) s.textContent = txt; }
  function frame(now) {
    var m = mode();
    if (m === 'b' || m === 'c') {
      var its = $$('.ph-it');
      if (its.length) {
        if (!its[cur] || !its[cur].classList.contains('is-on') || its.filter(function (x) { return x.classList.contains('is-on'); }).length !== 1) show(cur);
        /* the next hero's video starts loading one hero early, once the stack is near */
        var sa = its[cur] && its[cur].querySelector('section-video'), sb = its[cur + 1] && its[cur + 1].querySelector('section-video');
        if (sa && sa.wanted && !sa._loaded && sa.play) sa.play();
        if (sa && sa._loaded && sa.onscreen && sa.onscreen() && sb && sb.preload && !sb._early) sb.preload();
        var p = 0;
        if (m === 'b') {
          var st = $('.ph-stage'), r = st && st.getBoundingClientRect(), seen = r && r.bottom > 0 && r.top < innerHeight;
          if (!held && seen && !reduced) el += Math.min(100, now - last);
          p = Math.min(1, el / DUR);
          if (p >= 1) { show(cur + 1); el = 0; p = 0; }
          var tt = $$('.ph-tab .ph-tt'); tt.forEach(function (x, k) { x.style.transform = 'scaleX(' + (k === cur ? p : 0) + ')'; });
        } else {
          var tr = $('[data-ph-track]'), rr = tr.getBoundingClientRect(), span = tr.offsetHeight - innerHeight, f = span > 0 ? Math.min(1, Math.max(0, -rr.top / span)) : 0;
          var x = f * its.length, k = Math.min(its.length - 1, Math.floor(x));
          if (k !== cur) show(k);
          p = Math.min(1, x - k);
        }
        its.forEach(function (it) {
          var fill = it.querySelector('.ph-fill'); if (!fill) return;
          fill.classList.remove('ph-run'); fill.style.setProperty('--p', it.classList.contains('is-on') ? p : 0);
          label(it, cur === its.length - 1 && m === 'c' ? 'Last project' : 'Next: ' + it.getAttribute('data-ph-next'));
        });
      }
    }
    last = now; requestAnimationFrame(frame);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ph-go]'); if (!b) return;
    show(+b.getAttribute('data-ph-go')); el = 0;
  });
  document.addEventListener('pointerover', function (e) { held = !!(e.target.closest && e.target.closest('.ph-stage,.ph-tabs')) && mode() === 'b'; });
  document.addEventListener('focusin', function (e) { var it = e.target.closest && e.target.closest('.ph-it'); if (it && mode() !== 'a') { show(+it.getAttribute('data-ph-i')); el = 0; } });
  /* a description longer than its three-line box scrolls inside it; the fade says there is more */
  function more() { $$('.ph-d').forEach(function (e) { e.classList.toggle('is-more', e.scrollHeight > e.clientHeight + 2); }); }
  addEventListener('load', more); addEventListener('resize', more); setTimeout(more, 1500);
  document.addEventListener('scroll', function (e) { var t = e.target; if (t.classList && t.classList.contains('ph-d')) t.classList.toggle('is-end', t.scrollTop + t.clientHeight >= t.scrollHeight - 2); }, true);
  requestAnimationFrame(frame);
})();
