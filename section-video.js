/* <section-video src="…" poster="…"> — an ambient backdrop for one section.
   It costs nothing until the section is close: the file is only fetched when
   the band comes within a screen, and playback stops whenever it scrolls out,
   so a video far down the page never competes with the page's first paint. */
(function () {
  if (customElements.get('section-video')) return;

  class SectionVideo extends HTMLElement {
    connectedCallback() {
      if (this._booted) { this.watch(); return; }
      this.video = this.querySelector('video');
      if (!this.video) {
        if ((this._tries = (this._tries || 0) + 1) < 120) requestAnimationFrame(() => this.connectedCallback());
        return;
      }
      this._booted = true;
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.src = this.getAttribute('src');
      this.webm = this.getAttribute('src-webm');
      this.portrait = this.getAttribute('src-portrait');
      this.portraitWebm = this.getAttribute('src-portrait-webm');
      this.watch();
    }

    disconnectedCallback() { if (this.io) this.io.disconnect(); if (this.near) this.near.disconnect(); }

    /* the poster is a still the size of the band, so it waits for the band too */
    poster() {
      const p = this.video.getAttribute('data-poster');
      if (p && !this.video.getAttribute('poster')) this.video.setAttribute('poster', p);
    }

    watch() {
      if (this.io) this.io.disconnect();
      if (this.near) this.near.disconnect();
      if (!('IntersectionObserver' in window)) { this.poster(); this.load(); return; }
      this.near = new IntersectionObserver((entries) => {
        if (entries.some((en) => en.isIntersecting)) { this.poster(); this.near.disconnect(); }
      }, { rootMargin: '150% 0px' });
      this.near.observe(this);
      // a wide margin loads it; a tight one decides whether it should be running
      this.io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          this.wanted = en.isIntersecting;
          if (en.isIntersecting) { if (!this.off() && this.onscreen()) this.load(); this.play(); }
          else this.pause();
        });
      }, { rootMargin: '600px 0px' });
      this.io.observe(this);
    }

    load() {
      if (this._loaded || !this.src) return;
      /* a band close to the top of the page would otherwise start its
         download while the hero is still painting; the poster covers the wait */
      if (document.readyState !== 'complete') {
        this.poster();
        if (!this._waiting) { this._waiting = true; addEventListener('load', () => { if (!this.off() || this._early) this.load(); if (this.wanted) this.play(); }, { once: true }); }
        return;
      }
      this._loaded = true;
      this.poster();
      /* a band taller than it is wide only ever shows the middle of a 16:9
         frame, so it gets a cut made for that shape: sharper, and half the bytes */
      const tall = this.portrait && this.clientHeight > this.clientWidth * 1.1;
      const mp4 = tall ? this.portrait : this.src;
      const webm = tall ? this.portraitWebm : this.webm;
      /* VP9 is the smaller file wherever it decodes and H.264 covers the rest —
         except on Apple devices, where H.264 is the hardware-decoded path and
         VP9 is often decoded in software, at the battery's expense */
      const apple = /Apple/.test(navigator.vendor || '');
      const vp9 = webm && !apple && this.video.canPlayType('video/webm; codecs="vp9"');
      this.video.src = vp9 ? webm : mp4;
      /* Safari will refuse a play() issued before there are frames to show, so
         ask again the moment there are */
      ['loadeddata', 'canplay', 'canplaythrough'].forEach((ev) =>
        this.video.addEventListener(ev, () => { if (this.wanted) this.play(); }));
      this.video.muted = true;      // the property, not just the attribute
      /* an ambient backdrop never stops: force the loop, and restart by hand
         if a browser still reports 'ended' */
      this.video.loop = true;
      this.video.addEventListener('ended', () => { this.video.currentTime = 0; if (this.wanted) this.play(); });
      this.video.load();
    }

    play() {
      /* a still frame is the whole experience under reduced motion */
      /* offstage: a page (the work wheel) can hold a backdrop that is fully faded out */
      if (this.reduced || this.off()) return;
      /* an offstage band (a stacked hero that is not showing) does not fetch its
         file until it comes onstage, so stacked heroes do not all download at once */
      if (!this._loaded) { if (this.wanted && this.onscreen()) this.load(); return; }
      if (!this.video.paused) return;
      const p = this.video.play();
      if (p && p.catch) p.catch(function () {});
    }

    /* offstage: set by the page, or a stacked hero (.ph-it) that is not the one showing */
    off() { if (this.offstage) return true; const it = this.closest('.ph-it'); return !!(it && !it.classList.contains('is-on')); }

    /* a stacked hero waits until its stack is on screen; other bands load within the margin */
    onscreen() { if (!this.closest('.ph-it')) return true; const r = this.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }

    /* fetch ahead without playing: the next hero in a stack, one step early */
    preload() { this._early = true; this.load(); }

    pause() { if (this._loaded && !this.video.paused) this.video.pause(); }
  }

  customElements.define('section-video', SectionVideo);
})();
