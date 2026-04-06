/* ═══════════════════════════════════════════════════════════
   MCM 2026 — main.js
   Production-ready. No dependencies.
══════════════════════════════════════════════════════════ */

'use strict';

/* ── Capability flags ──────────────────────────────────── */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.replace('no-js', 'js');

/* ── Topbar: pin on scroll ─────────────────────────────── */
const topbar    = document.getElementById('topbar');
const bottomNav = document.getElementById('bottomNav');

const onScroll = () => {
  const y     = window.scrollY;
  const atTop = y <= 10;

  // Topbar: muestra fondo al bajar
  topbar.classList.toggle('pinned', !atTop);

  // Bottom nav: aparece al bajar, desaparece solo al volver al tope
  if (bottomNav) {
    bottomNav.classList.toggle('is-visible', !atTop);
  }
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll(); // run on load

/* ── Active nav link on scroll ─────────────────────────── */
const sections   = [...document.querySelectorAll('section[id], .hero[id]')];
const navLinks   = [...document.querySelectorAll('.topbar__nav-link')];
const bottomItems = [...document.querySelectorAll('.bottom-nav__item[data-section]')];

const activateSection = (id) => {
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
  bottomItems.forEach(a => a.classList.toggle('active', a.dataset.section === id));
};

const sectionObs = new IntersectionObserver(
  entries => {
    entries.forEach(e => { if (e.isIntersecting) activateSection(e.target.id); });
  },
  { threshold: 0.3 }
);
sections.forEach(s => sectionObs.observe(s));

/* ── Reveal animations ─────────────────────────────────── */
const revealEls = [...document.querySelectorAll('.reveal-up, .reveal-clip')];

if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  const revealObs = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          revealObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
  );
  revealEls.forEach(el => revealObs.observe(el));
} else {
  // Reduced motion or no IO support — show everything immediately
  revealEls.forEach(el => el.classList.add('in'));
}

/* ── Countdown ─────────────────────────────────────────── */
const pad = n => String(n).padStart(2, '0');

function updateCountdown() {
  const now    = new Date();
  let target   = new Date(now.getFullYear(), 2, 22, 6, 0, 0); // March 22
  if (now >= target) target.setFullYear(target.getFullYear() + 1);

  const diff = target - now;

  if (diff <= 0) {
    const el = document.getElementById('countdown');
    if (el) el.innerHTML = '<p style="color:var(--c-orange);font-weight:700;font-size:18px;font-family:var(--f-display)">¡EN MARCHA!</p>';
    return;
  }

  const days  = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins  = Math.floor((diff % 3_600_000)  / 60_000);
  const secs  = Math.floor((diff % 60_000)     / 1_000);

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && el.textContent !== val) el.textContent = val;
  };

  set('cd-days',  pad(days));
  set('cd-hours', pad(hours));
  set('cd-mins',  pad(mins));
  set('cd-secs',  pad(secs));
}
updateCountdown();
setInterval(updateCountdown, 1000);

/* ── Animated number counters ──────────────────────────── */
function animateCounter(el, from, to, duration = 1200) {
  if (prefersReducedMotion) { el.textContent = to; return; }
  const start = performance.now();
  const range = to - from;
  const tick  = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + range * ease);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ── Route tabs ────────────────────────────────────────── */
const routeTabs = [...document.querySelectorAll('.route-tab')];
routeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    routeTabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    // Swap map content here when real maps are available
  });
  // Keyboard support for tab panel
  tab.addEventListener('keydown', e => {
    const idx = routeTabs.indexOf(tab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      routeTabs[(idx + 1) % routeTabs.length].focus();
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      routeTabs[(idx - 1 + routeTabs.length) % routeTabs.length].focus();
    }
  });
});

/* ── Category scroll dots ──────────────────────────────── */
const catInner = document.querySelector('.cat-scroll-inner');
const dotsContainer = document.getElementById('catDots');
const CAT_COUNT = 5;

if (catInner && dotsContainer) {
  // Build dots
  for (let i = 0; i < CAT_COUNT; i++) {
    const d = document.createElement('div');
    d.className = `cat-dot${i === 0 ? ' active' : ''}`;
    d.setAttribute('aria-hidden', 'true');
    dotsContainer.appendChild(d);
  }

  const dots = [...dotsContainer.querySelectorAll('.cat-dot')];

  const updateDots = () => {
    // Only active on mobile (when scroll-snap is in effect)
    if (window.innerWidth >= 1024) return;
    const scrollLeft = catInner.scrollLeft;
    const cardWidth  = catInner.scrollWidth / CAT_COUNT;
    const active     = Math.round(scrollLeft / cardWidth);
    dots.forEach((d, i) => d.classList.toggle('active', i === active));
  };

  catInner.addEventListener('scroll', updateDots, { passive: true });
}

/* ── Service Worker registration ───────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(() => { /* SW not critical — fail silently */ });
  });
}

/* ── Respect prefers-color-scheme (future hook) ─────────── */
// Currently we're full dark, but leaving hook for future light mode
// window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', ...)
