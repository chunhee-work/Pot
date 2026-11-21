/* One source of truth for work history. Home (#skills .sk-exp), About (.wk-list)
   and the CV (#exp, #edu) all render from EXPERIENCE below, so they can't drift.
   The pages also carry the same markup as a no-JS fallback; tests/experience.mjs
   checks the three stay identical to what this file renders. */
(function () {
  var EXPERIENCE = {
    roles: [
      {
        org: 'Fortifi Sdn Bhd',
        when: 'Mar 2025 — now',
        note: 'Promoted twice in 18 months',
        steps: [
          { title: 'Product Manager', brand: 'oeru', when: 'Sep 2026 — now', current: true,
            detail: 'Building Danial and Finn (in development) and the in-house AI tools, working directly with the CEO.' },
          { title: 'Creative Lead', brand: 'The Chill Gallery & Gacha', when: 'Mar 2026',
            detail: 'Land of Hope, brand films, Gacha’s screens.' },
          { title: 'Social Media Manager', brand: 'OwnershipCoin', when: 'Mar 2025',
            detail: 'Sole marketer across four brands; reports to the founder, owns budget.' }
        ]
      },
      { org: 'Joe Chia · Phyn Studio', title: 'Designer & Production Assistant', when: '2023 — 2024',
        detail: 'Client brief to delivery inside live production workflows, including the atmos LNY build.' },
      { org: 'Citychemo Manufacturing Sdn Bhd', title: 'Purchasing & Merchandising', when: '2018 — 2019',
        brands: 'Bad Lab Men Care & Good Virtues Co. (GVC)',
        detail: 'Suppliers, production schedules and costing.' }
    ],
    education: [
      { school: 'SML Academy', course: 'Fashion & Apparel Design', when: '2019 — 2022',
        detail: 'Research → concept → materials → production.' }
    ]
  };

  /* Impact: real numbers only, and only Chun Hee has them. Until they are in,
     each role shows a clearly marked TODO slot, on previews only, so the live
     site and the printed CV never show a placeholder. */
  var IMPACT = {
    'Product Manager': [],
    'Creative Lead': [],
    'Social Media Manager': [],
    'Designer & Production Assistant': [],
    'Purchasing & Merchandising': []
  };
  var LIVE_HOST = 'chunhee-portfolio.vercel.app';
  var showTodo = location.hostname !== LIVE_HOST && !/[?&]impact=0\b/.test(location.search);

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function impactHtml(title, cls) {
    var nums = IMPACT[title] || [];
    if (nums.length) {
      return '<dl class="' + cls + '">' + nums.map(function (n) {
        return '<div><dt>' + esc(n.value) + '</dt><dd>' + esc(n.label) + '</dd></div>';
      }).join('') + '</dl>';
    }
    if (!showTodo) return '';
    return '<p class="' + cls + ' imp-todo" data-todo="impact"><b>Impact · TODO</b> Chun Hee to add 1–3 real numbers for this role.</p>';
  }

  /* Home: compact, newest first, education marked as such */
  function home() {
    var r = EXPERIENCE.roles, f = r[0], now = f.steps[0];
    var path = f.steps.slice().reverse().map(function (s) { return esc(s.title) + ' (' + esc(s.when.split(' — ')[0]) + ')'; }).join(' → ');
    var out = '<li><time>' + esc(now.when) + '</time><b>' + esc(now.title) + ' · ' + esc(f.org) + '</b><span>' + path + '</span></li>';
    r.slice(1).forEach(function (x) {
      out += '<li><time>' + esc(x.when) + '</time><b>' + esc(x.title) + '</b><span>' + esc(x.org) + '</span></li>';
    });
    EXPERIENCE.education.forEach(function (e) {
      out += '<li class="exp-edu"><time>' + esc(e.when) + '</time><b>' + esc(e.course) + '</b><span>Education · ' + esc(e.school) + '</span></li>';
    });
    return out;
  }

  /* About: every step is its own row on the timeline */
  function about() {
    var out = '';
    EXPERIENCE.roles.forEach(function (x, i) {
      if (x.steps) {
        x.steps.forEach(function (s, j) {
          out += '<li' + (j ? ' class="wk-sub"' : '') + '><time>' + esc(s.when) + '</time><div><b>' + esc(s.title) + '</b><span>' +
            esc(x.org) + ' · ' + esc(s.brand) + '</span>' + impactHtml(s.title, 'wk-imp') + '</div></li>';
        });
      } else {
        out += '<li><time>' + esc(x.when) + '</time><div><b>' + esc(x.title) + '</b><span>' + esc(x.org) +
          (x.brands ? ' · ' + esc(x.brands) : '') + '</span>' + impactHtml(x.title, 'wk-imp') + '</div></li>';
      }
    });
    EXPERIENCE.education.forEach(function (e) {
      out += '<li class="wk-edu"><time>' + esc(e.when) + '</time><div><b>' + esc(e.course) + '</b><span>Education · ' + esc(e.school) + '</span></div></li>';
    });
    return out;
  }

  /* CV: one block per employer with the detail line */
  function cv() {
    var out = '<h2>Experience</h2>';
    EXPERIENCE.roles.forEach(function (x) {
      if (x.steps) {
        out += '<div class="item"><div class="when">' + esc(x.when) + '</div><div class="what"><h3>' + esc(x.org) + ' <em>·</em> ' + esc(x.note.charAt(0).toLowerCase() + x.note.slice(1)) + '</h3><ul>' +
          x.steps.slice().reverse().map(function (s) {
            return '<li><b>' + esc(s.when.split(' — ')[0]) + ' · ' + esc(s.title) + ' · ' + esc(s.brand) + '</b> — ' + esc(s.detail) + impactHtml(s.title, 'cv-imp') + '</li>';
          }).join('') + '</ul></div></div>';
      } else {
        out += '<div class="item"><div class="when">' + esc(x.when) + '</div><div class="what"><h3>' + esc(x.title) + ' <em>·</em> ' + esc(x.org) + '</h3><p>' +
          (x.brands ? esc(x.brands) + ': ' + esc(x.detail.charAt(0).toLowerCase() + x.detail.slice(1)) : esc(x.detail)) + '</p>' + impactHtml(x.title, 'cv-imp') + '</div></div>';
      }
    });
    return out;
  }
  function cvEdu() {
    return '<h2>Education</h2>' + EXPERIENCE.education.map(function (e) {
      return '<p><b style="color:var(--ink)">' + esc(e.course) + '</b><br>' + esc(e.school) + ' · ' + esc(e.when) + '<br>' + esc(e.detail) + '</p>';
    }).join('');
  }

  var TARGETS = [
    ['#skills .sk-exp ol', home],
    ['#about .wk-list', about],
    ['[data-exp="cv"]', cv],
    ['[data-exp="cv-edu"]', cvEdu]
  ];
  function apply() {
    TARGETS.forEach(function (t) {
      document.querySelectorAll(t[0]).forEach(function (el) {
        var html = t[1]();
        if (el.__exp === html && el.innerHTML === html) return;
        el.innerHTML = html; el.__exp = el.innerHTML;
      });
    });
  }
  window.EXPERIENCE = EXPERIENCE;
  window.__renderExperience = { home: home, about: about, cv: cv, cvEdu: cvEdu, apply: apply };

  /* the .dc page runtime can rebuild sections after load, so re-apply for a while */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  addEventListener('load', apply);
  var n = 0; (function tick() { apply(); if (++n < 40) setTimeout(tick, 250); })();
})();
