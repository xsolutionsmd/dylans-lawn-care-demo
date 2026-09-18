/* Lightweight progressive enhancement; the page remains readable without JS. */
'use strict';
(() => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#navigation');
  const mobile = matchMedia('(max-width: 800px)');
  const setMenu = (open, restoreFocus = false) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.hidden = mobile.matches && !open;
    if (restoreFocus) toggle.focus();
  };
  toggle.hidden = false;
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setMenu(false, true); });
  document.addEventListener('click', e => { if (!e.target.closest('.header')) setMenu(false); });
  mobile.addEventListener('change', () => setMenu(false));
  setMenu(false);
  document.querySelector('.header-inner').classList.add('nav-enhanced');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.querySelector('.motion-toggle');
  let paused = false;
  let observer;
  const hero = document.querySelector('.hero-photo');
  const scenes = [...document.querySelectorAll('.hero-scene')];
  const bars = [...document.querySelectorAll('.hero-progress i')];
  const heroButton = document.querySelector('.hero-motion');
  let scene = 0;
  let heroVisible = false;
  let sceneTimer;
  function cycleHero() {
    clearTimeout(sceneTimer);
    const off = paused || reduced.matches || document.hidden || !heroVisible;
    hero.classList.toggle('hero-film-paused', off);
    if (off) return;
    sceneTimer = setTimeout(() => {
      scene = (scene + 1) % scenes.length;
      scenes.forEach((el, i) => {
        el.classList.toggle('is-current', i === scene);
        el.setAttribute('aria-hidden', String(i !== scene));
        bars[i].classList.toggle('is-current', i === scene);
      });
      document.querySelector('.photo-index').textContent = String(scene + 1).padStart(2, '0') + ' / OUTSIDE, CARED FOR';
      cycleHero();
    }, 7000);
  }
  document.querySelector('.hero-film-controls').hidden = false;
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    heroVisible = entries[0].isIntersecting; cycleHero();
  }, {threshold:0.15}).observe(hero);
  else heroVisible = true;
  document.addEventListener('visibilitychange', cycleHero);
  heroButton.addEventListener('click', () => { paused = !paused; motionState(); });
  const reveals = [...document.querySelectorAll('.reveal')];
  const motionState = () => {
    const off = paused || reduced.matches;
    document.documentElement.classList.toggle('motion-paused', off);
    document.documentElement.classList.toggle('motion-ready', !off);
    motionButton.textContent = reduced.matches ? 'Reduced motion enabled' : paused ? 'Enable animations' : 'Pause animations';
    motionButton.disabled = reduced.matches;
    motionButton.setAttribute('aria-pressed', String(off));
    heroButton.disabled = reduced.matches;
    heroButton.setAttribute('aria-pressed', String(off));
    heroButton.setAttribute('aria-label', reduced.matches ? 'Reduced motion enabled' : paused ? 'Enable animations' : 'Pause animations');
    heroButton.querySelector('path').setAttribute('d', off ? 'M8 5v14l10-7Z' : 'M9 5v14M15 5v14');
    cycleHero();
    observer?.disconnect();
    if (off || !('IntersectionObserver' in window)) reveals.forEach(el => el.classList.add('is-visible'));
    else {
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        // Replay a gentle entrance when revisiting a section; never bind a page scroll loop.
        entry.target.classList.toggle('is-visible', entry.isIntersecting);
      }), { threshold: 0.08 });
      reveals.forEach(el => observer.observe(el));
    }
  };
  motionButton.hidden = false;
  motionButton.addEventListener('click', () => { paused = !paused; motionState(); });
  reduced.addEventListener('change', motionState);
  motionState();

  const track = document.querySelector('.project-track');
  const cards = [...track.querySelectorAll('.project-card')];
  const prev = document.querySelector('.previous');
  const next = document.querySelector('.next');
  const count = document.querySelector('#project-count');
  const announce = document.querySelector('#project-announcement');
  let index = 0;
  let scrollFrame = 0;
  const position = card => card.offsetLeft - cards[0].offsetLeft;
  const update = () => {
    const end = track.scrollWidth - track.clientWidth;
    const left = track.scrollLeft;
    index = left >= end - 4 ? cards.length - 1 : cards.reduce((best, card, i) => Math.abs(position(card) - left) < Math.abs(position(cards[best]) - left) ? i : best, 0);
    count.textContent = String(index + 1).padStart(2, '0') + ' / 04';
    prev.disabled = left < 4;
    next.disabled = left >= end - 4;
  };
  const go = step => {
    const target = Math.max(0, Math.min(cards.length - 1, index + step));
    track.scrollTo({left:position(cards[target]), behavior: paused || reduced.matches ? 'auto' : 'smooth'});
    announce.textContent = 'Project ' + (target + 1) + ' of 4: ' + cards[target].querySelector('h3').textContent;
  };
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); go(e.key === 'ArrowRight' ? 1 : -1); }
  });
  track.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { update(); scrollFrame = 0; });
  }, {passive:true});
  if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
  document.querySelector('.gallery-controls').hidden = false;
  update();
})();
