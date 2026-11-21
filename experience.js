/* One source of truth for work history. Home (#skills .sk-exp), About (#about .wk)
   and the CV ([data-exp]) all render from EXPERIENCE below, row for row, so the
   roles and dates are the same everywhere. The pages also carry the same markup
   as a no-JS fallback; tests/experience.mjs checks all three against this file.

   impact: real numbers only, from Chun Hee, e.g. { value: '…', label: '…' }.
   An empty list renders nothing at all. */
(function () {
  var EXPERIENCE = {
    roles: [
      { title: 'Product Manager', org: 'Fortifi Sdn Bhd', brand: 'oeru', when: 'Sep 2026 — now', current: true,
        detail: 'Building Danial and Finn (in development) and the in-house AI tools, working directly with the CEO.', impact: [] },
      { title: 'Creative Lead', org: 'Fortifi Sdn Bhd', brand: 'The Chill Gallery & Gacha', when: 'Mar 2026 — Sep 2026',
        detail: 'Land of Hope, brand films, Gacha’s screens.', impact: [] },
      { title: 'Social Media Manager', org: 'Fortifi Sdn Bhd', brand: 'OwnershipCoin', when: 'Mar 2025 — Mar 2026',
        detail: 'Sole marketer across four brands; reported to the founder, owned the budget.', impact: [] },
      { title: 'Designer & Production Assistant', org: 'Joe Chia · Phyn Studio', when: '2023 — 2024',
        detail: 'Client brief to delivery inside live production workflows, including the atmos LNY build.', impact: [] },
      { title: 'Purchasing & Merchandising', org: 'Citychemo Manufacturing Sdn Bhd', brand: 'Bad Lab Men Care & Good Virtues Co. (GVC)', when: '2018 — 2019',
        detail: 'Suppliers, production schedules and costing.', impact: [] }
    ],
    education: [
      { course: 'Fashion & Apparel Design', school: 'SML Academy', when: '2019 — 2022',
        detail: 'Research → concept → materials → production.' }
    ]
  };

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function where(r) { return esc(r.org) + (r.brand ? ' · ' + esc(r.brand) : ''); }
  function impact(r, cls) {
    if (!r.impact || !r.impact.length) return '';
    return '<dl class="' + cls + '">' + r.impact.map(function (n) {
      return '<div><dt>' + esc(n.value) + '</dt><dd>' + esc(n.label) + '</dd></div>';
    }).join('') + '</dl>';
  }

  /* Home */
  function home() {
    return EXPERIENCE.roles.map(function (r) {
      return '<li><time>' + esc(r.when) + '</time><b>' + esc(r.title) + '</b><span>' + where(r) + '</span>' + impact(r, 'exp-imp') + '</li>';
    }).join('');
  }
  function homeEdu() {
    return EXPERIENCE.education.map(function (e) {
      return '<li><time>' + esc(e.when) + '</time><b>' + esc(e.course) + '</b><span>' + esc(e.school) + '</span></li>';
    }).join('');
  }

  /* About: the timeline */
  function about() {
    return EXPERIENCE.roles.map(function (r) {
      return '<li><time>' + esc(r.when) + '</time><div><b>' + esc(r.title) + '</b><span>' + where(r) + '</span>' + impact(r, 'wk-imp') + '</div></li>';
    }).join('');
  }
  function aboutEdu() {
    return EXPERIENCE.education.map(function (e) {
      return '<li><time>' + esc(e.when) + '</time><div><b>' + esc(e.course) + '</b><span>' + esc(e.school) + '</span></div></li>';
    }).join('');
  }

  /* CV */
  function cv() {
    return '<h2>Experience</h2>' + EXPERIENCE.roles.map(function (r) {
      return '<div class="item"><div class="when">' + esc(r.when) + '</div><div class="what"><h3>' + esc(r.title) + ' <em>·</em> ' + where(r) + '</h3><p>' +
        esc(r.detail) + '</p>' + impact(r, 'cv-imp') + '</div></div>';
    }).join('');
  }
  function cvEdu() {
    return '<h2>Education</h2>' + EXPERIENCE.education.map(function (e) {
      return '<p><b style="color:var(--ink)">' + esc(e.course) + '</b><br>' + esc(e.school) + ' · ' + esc(e.when) + '<br>' + esc(e.detail) + '</p>';
    }).join('');
  }

  var TARGETS = [
    ['[data-exp="home"]', home],
    ['[data-exp="home-edu"]', homeEdu],
    ['[data-exp="about"]', about],
    ['[data-exp="about-edu"]', aboutEdu],
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
  window.__renderExperience = { home: home, homeEdu: homeEdu, about: about, aboutEdu: aboutEdu, cv: cv, cvEdu: cvEdu, apply: apply };

  /* the .dc page runtime can rebuild sections after load, so re-apply for a while */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  addEventListener('load', apply);
  var n = 0; (function tick() { apply(); if (++n < 40) setTimeout(tick, 250); })();
})();
