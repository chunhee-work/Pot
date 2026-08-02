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
      this.watch();
    }

    disconnectedCallback() { if (this.io) this.io.disconnect(); }

    watch() {
      if (this.io) this.io.disconnect();
      if (!('IntersectionObserver' in window)) { this.load(); return; }
      // a wide margin loads it; a tight one decides whether it should be running
      this.io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { this.load(); this.play(); }
          else this.pause();
        });
      }, { rootMargin: '600px 0px' });
      this.io.observe(this);
    }

    load() {
      if (this._loaded || !this.src) return;
      this._loaded = true;
      /* VP9 is the smaller file wherever it decodes; H.264 covers the rest */
      const vp9 = this.webm && this.video.canPlayType('video/webm; codecs="vp9"');
      this.video.src = vp9 ? this.webm : this.src;
      this.video.load();
    }

    play() {
      /* a still frame is the whole experience under reduced motion */
      if (this.reduced || !this._loaded) return;
      const p = this.video.play();
      if (p && p.catch) p.catch(function () {});
    }

    pause() { if (this._loaded && !this.video.paused) this.video.pause(); }
  }

  customElements.define('section-video', SectionVideo);
})();
