(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* index rows: soft close on top of native <details> */
  if (!reduce) document.querySelectorAll('details.row').forEach(function(d){
    var s = d.querySelector('summary'), b = d.querySelector('.row-body');
    s.addEventListener('click', function(e){
      if (!d.open) return;
      e.preventDefault();
      var a = b.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(8px)'}],{duration:180,easing:'ease-in'});
      a.onfinish = function(){ d.open = false; };
    });
  });
  /* a link to a closed row opens it */
  function openHash(){ var t = location.hash && document.querySelector(location.hash); if (t && t.tagName === 'DETAILS') t.open = true; }
  addEventListener('hashchange', openHash); openHash();

  /* film lightbox: a real modal. Page behind is inert, focus goes to Close and comes back. */
  var lb = document.getElementById('lb'), fr = document.getElementById('lb-if'), from = null, inerted = [];
  function open(b){
    from = b;
    document.getElementById('lb-no').textContent = b.dataset.no || '';
    document.getElementById('lb-name').textContent = b.dataset.name || '';
    fr.title = b.dataset.name || 'Film';
    lb.classList.toggle('vert', b.hasAttribute('data-vert'));
    fr.src = 'https://www.youtube-nocookie.com/embed/' + b.dataset.yt + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
    lb.hidden = false; document.documentElement.classList.add('lb-on');
    Array.prototype.forEach.call(document.body.children, function(n){ if (n !== lb && !n.inert && n.tagName !== 'SCRIPT') { n.inert = true; inerted.push(n); } });
    stopVoice();
    document.getElementById('lb-close').focus();
  }
  function close(){
    if (lb.hidden) return;
    fr.removeAttribute('src'); lb.hidden = true; document.documentElement.classList.remove('lb-on');
    inerted.forEach(function(n){ n.inert = false; }); inerted = [];
    if (from) from.focus();
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-yt]'); if (b) { open(b); return; }
    if (e.target.closest('#lb-close') || e.target === lb) close();
  });
  document.addEventListener('keydown', function(e){
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { e.preventDefault(); document.getElementById('lb-close').focus(); }
  });

  /* voices: one at a time */
  var audio = null, cur = null;
  function stopVoice(){ if (audio) { audio.pause(); audio = null; } if (cur) { cur.setAttribute('aria-pressed','false'); cur = null; } }
  document.querySelectorAll('[data-voice]').forEach(function(b){
    b.addEventListener('click', function(){
      if (cur === b) { stopVoice(); return; }
      stopVoice();
      audio = new Audio('/assets/voice-' + b.dataset.voice + '.mp3'); cur = b; b.setAttribute('aria-pressed','true');
      audio.onended = stopVoice; var p = audio.play(); if (p && p.catch) p.catch(stopVoice);
    });
  });
})();
