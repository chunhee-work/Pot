/* Every Game UI clip loads only when it is near and stops when it is not. */
(function(){
  function boot(){
    var vs=[].slice.call(document.querySelectorAll('video.gu-v'));
    if(!vs.length){ if((boot.t=(boot.t||0)+1)<120) requestAnimationFrame(boot); return; }
    var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    function load(v){ if(v.dataset.on)return; v.dataset.on='1';
      v.src=v.canPlayType('video/webm; codecs="vp9"')?v.dataset.webm:v.dataset.mp4;
      ['loadeddata','canplay'].forEach(function(e){v.addEventListener(e,function(){if(v.dataset.want)play(v);});});
      v.muted=true; v.load(); }
    function play(v){ if(reduced||!v.dataset.on||!v.paused)return;
      var p=v.play(); if(p&&p.catch)p.catch(function(){}); }
    if(!('IntersectionObserver' in window)){ vs.forEach(function(v){load(v);play(v);}); return; }
    var io=new IntersectionObserver(function(es){ es.forEach(function(en){ var v=en.target;
      if(en.isIntersecting){ v.dataset.want='1'; load(v); play(v); }
      else { delete v.dataset.want; if(v.dataset.on&&!v.paused) v.pause(); } }); },{rootMargin:'300px 0px'});
    vs.forEach(function(v){ io.observe(v); });
  }
  if(document.readyState==='loading') addEventListener('DOMContentLoaded',boot); else boot();
})();
