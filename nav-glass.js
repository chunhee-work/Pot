// Liquid glass for the nav pill.
//
// Ported from the paper-design liquid-glass component: a blurred, saturated
// backdrop, a white sheen, inset highlights along the top-left and bottom-right,
// and an SVG turbulence + displacement filter for refraction. Written against
// the DOM directly because this document has no build step and no npm.
//
// Two departures from the original, both forced by where this nav actually sits:
//
// 1. The filter is injected from JS rather than written into the template. The
//    template is parsed into React, which drops SVG filter attributes it does
//    not recognise in lowercase form (baseFrequency, numOctaves, stdDeviation
//    and friends), leaving a filter that silently does nothing.
//
// 2. feDisplacementMap scale drops from 200 to 9, and the refracting layer is
//    inset from the rim. The original runs on a large dock; on a 64px-tall pill
//    a big displacement drags the backdrop past the rounded edge and tears it.
//
// The tint is dark, not light. This nav is fixed over a page that alternates
// between #f5f4f0 and near-black roughly half and half, so a light glass would
// force the link colour to flip mid-scroll. A dark tint keeps one text colour
// legible over both grounds; only its density adapts.

(function () {
  var FILTER_ID = 'glass-distortion';

  function injectFilter() {
    if (document.getElementById(FILTER_ID)) return;
    var host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    host.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<filter id="' + FILTER_ID + '" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">' +
          '<feTurbulence type="fractalNoise" baseFrequency="0.004 0.012" numOctaves="1" seed="17" result="turbulence"/>' +
          '<feComponentTransfer in="turbulence" result="mapped">' +
            '<feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5"/>' +
            '<feFuncG type="gamma" amplitude="0" exponent="1" offset="0"/>' +
            '<feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5"/>' +
          '</feComponentTransfer>' +
          '<feGaussianBlur in="turbulence" stdDeviation="2" result="softMap"/>' +
          '<feSpecularLighting in="softMap" surfaceScale="4" specularConstant="0.7" specularExponent="100" lighting-color="white" result="specLight">' +
            '<fePointLight x="-120" y="-120" z="220"/>' +
          '</feSpecularLighting>' +
          '<feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage"/>' +
          '<feDisplacementMap in="SourceGraphic" in2="softMap" scale="9" xChannelSelector="R" yChannelSelector="G"/>' +
        '</filter>' +
      '</svg>';
    document.body.appendChild(host);
  }

  // Density of the tint over each ground. Over a dark section the page supplies
  // the contrast already, so the glass can thin out and read as glass; over the
  // off-white sections it has to carry the link text on its own.
  var OVER_LIGHT = 0.62;
  var OVER_DARK = 0.34;

  function mountGlass(host) {
    if (!host) return null;
    injectFilter();

    var refract = document.createElement('span');
    refract.setAttribute('aria-hidden', 'true');
    refract.style.cssText =
      'position:absolute;inset:5px;border-radius:999px;z-index:0;pointer-events:none;' +
      '-webkit-backdrop-filter:url(#' + FILTER_ID + ');backdrop-filter:url(#' + FILTER_ID + ')';

    var sheen = document.createElement('span');
    sheen.setAttribute('aria-hidden', 'true');
    sheen.style.cssText =
      'position:absolute;inset:0;border-radius:inherit;z-index:1;pointer-events:none;' +
      'background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.02) 46%,rgba(255,255,255,.09))';

    host.insertBefore(sheen, host.firstChild);
    host.insertBefore(refract, host.firstChild);

    var alpha = OVER_LIGHT, target = OVER_LIGHT;
    var probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;pointer-events:none;opacity:0';
    document.body.appendChild(probe);

    function groundBehind() {
      // Sample the page directly under the pill's centre. The nav is skipped by
      // walking out of it, so this reads what the glass is actually over.
      var r = host.getBoundingClientRect();
      var el = document.elementFromPoint(
        Math.round(r.left + r.width / 2),
        Math.round(r.top + r.height + 12)
      );
      var n = el;
      while (n && n !== document.documentElement) {
        if (host.contains(n)) { n = host.parentElement; continue; }
        var c = getComputedStyle(n).backgroundColor;
        var m = c && c.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/);
        if (m && (m[4] === undefined || +m[4] > 0.5)) {
          return (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) < 128 ? 'dark' : 'light';
        }
        n = n.parentElement;
      }
      return 'light';
    }

    var last = 0;
    return {
      frame: function (now) {
        // The ground only changes on scroll; four samples a second is plenty and
        // keeps elementFromPoint off the critical path.
        if (now - last < 250) return;
        last = now;
        target = groundBehind() === 'dark' ? OVER_DARK : OVER_LIGHT;
        if (Math.abs(alpha - target) < 0.004) return;
        alpha += (target - alpha) * 0.16;
        host.style.background = 'rgba(17,17,16,' + alpha.toFixed(3) + ')';
      },
      destroy: function () {
        refract.remove();
        sheen.remove();
        probe.remove();
      },
    };
  }

  window.mountGlass = mountGlass;
})();
