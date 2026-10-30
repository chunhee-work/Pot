/* Every Game UI clip loads only when it is near and stops when it is not. */
(function(){
  function boot(){
    var vs=[].slice.call(document.querySelectorAll('video.gu-v'));
    if(!vs.length){ if((boot.t=(boot.t||0)+1)<120) requestAnimationFrame(boot); return; }
    var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* Apple hardware decodes H.264 natively; VP9 there is often a software decode */
    var apple=/Apple/.test(navigator.vendor||'');
    function poster(v){ if(v.dataset.poster&&!v.getAttribute('poster')) v.setAttribute('poster',v.dataset.poster); }
    function load(v){ if(v.dataset.on)return; v.dataset.on='1'; poster(v);
      v.src=(!apple&&v.canPlayType('video/webm; codecs="vp9"'))?v.dataset.webm:v.dataset.mp4;
      ['loadeddata','canplay'].forEach(function(e){v.addEventListener(e,function(){if(v.dataset.want)play(v);});});
      v.muted=true; v.load(); }
    function play(v){ if(reduced||!v.dataset.on||!v.paused)return;
      var p=v.play(); if(p&&p.catch)p.catch(function(){}); }
    if(!('IntersectionObserver' in window)){ vs.forEach(function(v){load(v);play(v);}); return; }
    /* stills arrive a screen and a half early, so a fast scroll never meets an empty frame */
    var near=new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting){ poster(en.target); near.unobserve(en.target); } }); },{rootMargin:'150% 0px'});
    vs.forEach(function(v){ near.observe(v); });
    var io=new IntersectionObserver(function(es){ es.forEach(function(en){ var v=en.target;
      if(en.isIntersecting){ v.dataset.want='1'; load(v); play(v); }
      else { delete v.dataset.want; if(v.dataset.on&&!v.paused) v.pause(); } }); },{rootMargin:'300px 0px'});
    vs.forEach(function(v){ io.observe(v); });
  }
  if(document.readyState==='loading') addEventListener('DOMContentLoaded',boot); else boot();
})();
