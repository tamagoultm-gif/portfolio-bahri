/* ==========================================================
   Interactions — Bahri Hammami portfolio
   Scroll reveal · 3D tilt · cursor spotlight · sliding nav pill
   ========================================================== */

(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  document.addEventListener('DOMContentLoaded', function () {
    initRevealObserver();
    initTabPill();
    if (!reduced && canHover) {
      initSpotlight();
      initTilt();
    }
  });

  /* ---------- Scroll-triggered reveal ---------- */
  function initRevealObserver() {
    var targets = document.querySelectorAll('.reveal, .placeholder');
    if (!targets.length) return;

    // Stagger by position within the DOM so grids/lists cascade in.
    targets.forEach(function (el, i) {
      el.style.transitionDelay = (i % 6) * 70 + 'ms';
    });

    if (!('IntersectionObserver' in window) || reduced) {
      targets.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Cursor-follow ambient glow ---------- */
  function initSpotlight() {
    var glow = document.createElement('div');
    glow.className = 'spotlight';
    document.body.appendChild(glow);

    var raf = null;
    document.addEventListener('mousemove', function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        document.body.style.setProperty('--mx', e.clientX + 'px');
        document.body.style.setProperty('--my', e.clientY + 'px');
        glow.classList.add('active');
        raf = null;
      });
    });
    document.addEventListener('mouseleave', function () {
      glow.classList.remove('active');
    });
  }

  /* ---------- 3D tilt on hover ---------- */
  function initTilt() {
    var selectors = '.photo-circle, .photo-half, .placeholder, .card';
    var els = document.querySelectorAll(selectors);

    els.forEach(function (el) {
      el.classList.add('tilt');
      var rect;

      el.addEventListener('mouseenter', function () {
        rect = el.getBoundingClientRect();
        el.classList.add('tilting');
      });

      el.addEventListener('mousemove', function (e) {
        if (!rect) rect = el.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;   // 0 → 1
        var py = (e.clientY - rect.top) / rect.height;    // 0 → 1
        var maxDeg = 10;
        var ry = (px - 0.5) * maxDeg * 2;
        var rx = (0.5 - py) * maxDeg * 2;
        el.style.transform =
          'perspective(800px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' +
          ry.toFixed(2) + 'deg) scale(1.035)';
      });

      el.addEventListener('mouseleave', function () {
        el.classList.remove('tilting');
        el.style.transform = '';
        rect = null;
      });
    });
  }

  /* ---------- Sliding pill behind the active nav tab ---------- */
  function initTabPill() {
    document.querySelectorAll('.tabs').forEach(function (tabs) {
      var active = tabs.querySelector('a.active');
      if (!active) return;

      var pill = document.createElement('span');
      pill.className = 'tab-pill';
      tabs.insertBefore(pill, tabs.firstChild);

      var place = function () {
        pill.style.width = active.offsetWidth + 'px';
        pill.style.transform = 'translateX(' + active.offsetLeft + 'px)';
      };

      requestAnimationFrame(place);
      window.addEventListener('resize', place);
    });
  }
  /* ---------- Public hooks (used after dynamic content, e.g. projects loaded from the API) ---------- */
  window.__reinitReveal = initRevealObserver;
  window.__reinitTilt = function () {
    if (!reduced && canHover) initTilt();
  };
})();
