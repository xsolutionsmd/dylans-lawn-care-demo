'use strict';
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
const mobileMedia = window.matchMedia('(max-width: 800px)');
function setMenu(open, returnFocus = false) {
  menuToggle.setAttribute('aria-expanded', String(open));
  navigation.hidden = mobileMedia.matches && !open;
  if (returnFocus) menuToggle.focus();
}
function resetMenu() { setMenu(false); }
menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
document.querySelector('.header').addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') setMenu(false, true); });
document.addEventListener('click', event => { if (!event.target.closest('.header')) setMenu(false); });
mobileMedia.addEventListener('change', resetMenu);
resetMenu();

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionToggle = document.querySelector('.motion-toggle');
document.querySelectorAll('.section-heading>div:first-child,.faq>div:first-child').forEach(element => element.classList.add('reveal', 'reveal-from-left'));
document.querySelectorAll('.section-heading>p,.review-summary,.faq-list').forEach(element => element.classList.add('reveal', 'reveal-from-right'));
const reveals = document.querySelectorAll('.reveal');
const scrollReveals = [...reveals].map(element => ({ element, trigger: element }));
scrollReveals.push({ element: document.querySelector('.hero-scenes'), trigger: document.querySelector('.hero-photo') });
const header = document.querySelector('.header');
const mobileContact = document.querySelector('.mobile-contact');
const canObserveLayout = 'ResizeObserver' in window;
let revealGeometry = [];
let geometryDirty = true;
let headerHeight = 0;
let mobileContactHeight = 0;
let revealFrame = 0;
let userPausedMotion = false;
const motionIsPaused = () => userPausedMotion || motionPreference.matches;
const heroScenes = [...document.querySelectorAll('.hero-scene')];
const heroBars = [...document.querySelectorAll('.hero-film-bars i')];
let currentScene = 0;
let heroVisible = true;
let sceneTimer;
function updateHeroRotation() {
  clearTimeout(sceneTimer);
  if (motionIsPaused() || !heroVisible || document.hidden) return;
  sceneTimer = setTimeout(() => {
    const previous = currentScene;
    currentScene = (currentScene + 1) % heroScenes.length;
    heroScenes.forEach((scene, i) => {
      scene.classList.toggle('is-current', i === currentScene);
      scene.classList.toggle('is-previous', i === previous);
      heroBars[i].classList.toggle('is-current', i === currentScene);
    });
    updateHeroRotation();
  }, 6200);
}

// The controls are progressive enhancements; without JS every photo is visible.
const reel = document.querySelector('.project-reel');
const stage = reel.querySelector('.reel-stage');
const cards = [...reel.querySelectorAll('.reel-card')];
const dots = [...reel.querySelectorAll('.reel-dots button')];
const playButton = reel.querySelector('.reel-play');
const announcement = reel.querySelector('.reel-announcement');
let currentProject = 0;
let reelPaused = false;
let reelVisible = false;
let pointerOverReel = false;
let rotationTimer;
let gesture = null;
let dragFrame = 0;
let dragOffset = 0;

function updateRotation() {
  clearTimeout(rotationTimer);
  const stopped = reelPaused || motionIsPaused();
  playButton.setAttribute('aria-label', stopped ? 'Play project rotation' : 'Pause project rotation');
  playButton.querySelector('span').textContent = stopped ? '▷' : 'Ⅱ';
  playButton.disabled = motionIsPaused();
  if (motionIsPaused()) playButton.setAttribute('aria-label', 'Project rotation paused with page motion');
  if (!stopped && reelVisible && !pointerOverReel && !document.hidden && !gesture) {
    rotationTimer = setTimeout(() => showProject(currentProject + 1), 4600);
  }
}

function showProject(index, manual = false) {
  currentProject = (index + cards.length) % cards.length;
  if (manual) reelPaused = true;
  const positions = cards.map((card, i) => {
    let offset = (i - currentProject + cards.length) % cards.length;
    if (offset > cards.length / 2) offset -= cards.length;
    const distance = Math.abs(offset);
    const previousOffset = Number(card.dataset.position);
    // Reposition hidden cards behind the reel, never across the visible center.
    if (distance > 1 && Math.abs(previousOffset) === 1) offset = previousOffset * 2;
    const reposition = distance <= 1 && (Math.abs(previousOffset) > 1 || previousOffset * offset < 0);
    return { card, i, offset, distance, reposition };
  });
  // Establish all hidden starting positions in one layout pass before animating.
  positions.forEach(({ card, offset, reposition }) => {
    if (reposition) {
      card.style.transition = 'none';
      card.style.setProperty('--offset', offset * 2);
      card.style.setProperty('--distance', 2);
      card.style.setProperty('--card-opacity', 0);
    }
  });
  if (positions.some(({ reposition }) => reposition)) stage.getBoundingClientRect();
  positions.forEach(({ card, i, offset, distance, reposition }) => {
    if (reposition) card.style.transition = '';
    card.style.setProperty('--offset', offset);
    card.style.setProperty('--distance', distance);
    card.style.setProperty('--card-opacity', distance > 1 ? 0 : 1);
    card.style.setProperty('--card-order', cards.length - distance);
    card.style.setProperty('--brightness', distance ? .72 : 1);
    card.dataset.position = offset;
    card.setAttribute('aria-hidden', String(i !== currentProject));
    dots[i].setAttribute('aria-current', String(i === currentProject));
  });
  if (manual) announcement.textContent = `Project ${currentProject + 1} of ${cards.length}: ${cards[currentProject].dataset.title}.`;
  updateRotation();
}

showProject(0);
reel.classList.add('is-ready');
reel.querySelector('.reel-controls').hidden = false;
reel.querySelector('.reel-prev').addEventListener('click', () => showProject(currentProject - 1, true));
reel.querySelector('.reel-next').addEventListener('click', () => showProject(currentProject + 1, true));
dots.forEach((dot, i) => dot.addEventListener('click', () => showProject(i, true)));
playButton.addEventListener('click', () => { reelPaused = !reelPaused; updateRotation(); });
stage.addEventListener('keydown', event => {
  const destinations = { ArrowLeft: currentProject - 1, ArrowRight: currentProject + 1, Home: 0, End: cards.length - 1 };
  if (!(event.key in destinations)) return;
  event.preventDefault();
  showProject(destinations[event.key], true);
});
reel.addEventListener('focusin', event => {
  if (event.target !== playButton) { reelPaused = true; updateRotation(); }
});
reel.addEventListener('pointerenter', event => {
  if (event.pointerType === 'mouse') { pointerOverReel = true; updateRotation(); }
});
reel.addEventListener('pointerleave', event => {
  if (event.pointerType === 'mouse') { pointerOverReel = false; updateRotation(); }
});

// Native vertical scrolling stays available while horizontal drags move the reel.
function resetDrag() {
  cancelAnimationFrame(dragFrame);
  dragFrame = 0;
  stage.classList.remove('is-dragging');
  stage.style.setProperty('--drag', '0px');
}

stage.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0) return;
  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
  stage.setPointerCapture(event.pointerId);
  updateRotation();
});
stage.addEventListener('pointermove', event => {
  if (!gesture || event.pointerId !== gesture.id) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
    gesture.horizontal = true;
    stage.classList.add('is-dragging');
  }
  if (gesture.horizontal) {
    dragOffset = Math.max(-150, Math.min(150, dx * .45));
    if (!dragFrame) dragFrame = requestAnimationFrame(() => {
      dragFrame = 0;
      stage.style.setProperty('--drag', `${dragOffset}px`);
    });
  }
});
function finishGesture(event) {
  if (!gesture || event.pointerId !== gesture.id) return;
  const dx = event.clientX - gesture.x;
  const swipe = event.type === 'pointerup' && gesture.horizontal && Math.abs(dx) > 40;
  gesture = null;
  resetDrag();
  if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  if (swipe) showProject(currentProject + (dx < 0 ? 1 : -1), true);
  else updateRotation();
}
stage.addEventListener('pointerup', finishGesture);
stage.addEventListener('pointercancel', finishGesture);
stage.addEventListener('lostpointercapture', event => {
  if (gesture && gesture.id === event.pointerId) { gesture = null; resetDrag(); updateRotation(); }
});

// Keep each illustration's synchronized layers together. Offscreen/hidden loops
// retain their progress, so returning to a heading resumes the same animation.
const decorativeMotion = [...document.querySelectorAll('.hero .headline-lawn,.faq-punctuation')]
  .map(element => ({ element, trigger: element.closest('h1,h2'), visible: true }));
function updateDecorativeMotion() {
  decorativeMotion.forEach(({ element, visible }) => {
    element.classList.toggle('is-motion-idle', document.hidden || !visible);
  });
}

if ('IntersectionObserver' in window) {
  const decorationObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      decorativeMotion.find(({ trigger }) => trigger === entry.target).visible = entry.isIntersecting;
    });
    updateDecorativeMotion();
  }, { rootMargin: '160px 0px' });
  decorativeMotion.forEach(({ trigger }) => decorationObserver.observe(trigger));
  new IntersectionObserver(entries => {
    heroVisible = entries[0].isIntersecting;
    updateHeroRotation();
  }, { threshold: .15 }).observe(document.querySelector('.hero-photo'));
  new IntersectionObserver(entries => {
    reelVisible = entries[0].isIntersecting;
    updateRotation();
  }, { threshold: .2 }).observe(stage);
} else {
  reelVisible = true;
  updateRotation();
}
document.addEventListener('visibilitychange', updateRotation);
document.addEventListener('visibilitychange', updateHeroRotation);
document.addEventListener('visibilitychange', updateDecorativeMotion);
updateDecorativeMotion();

// Layout offsets stay stable while an entrance translates, rotates or clips its element.
function layoutTop(element) {
  let top = 0;
  for (let node = element; node; node = node.offsetParent) {
    top += node.offsetTop;
    if (node.offsetParent) top += node.offsetParent.clientTop;
  }
  return top;
}

function updateScrollReveals() {
  cancelAnimationFrame(revealFrame);
  revealFrame = 0;
  if (motionIsPaused()) {
    scrollReveals.forEach(({ element }) => element.classList.remove('is-pending'));
    return;
  }
  // Hovering service cards, expanding FAQs and resizing can change layout.
  // Ordinary scrolling cannot, so reuse those bounds until layout invalidates them.
  // Older browsers without ResizeObserver retain the original measurement path.
  if (geometryDirty || !canObserveLayout) {
    headerHeight = header.offsetHeight;
    mobileContactHeight = mobileContact.offsetHeight;
    revealGeometry = scrollReveals.map(({ element, trigger }) => {
      const top = layoutTop(trigger);
      const height = trigger.offsetHeight;
      return { element, top, bottom: top + height, height };
    });
    geometryDirty = false;
  }
  const viewportTop = window.scrollY + headerHeight;
  const viewportBottom = window.scrollY + window.innerHeight - mobileContactHeight;
  const viewportHeight = Math.max(0, viewportBottom - viewportTop);
  const focusedElement = document.activeElement;
  revealGeometry.forEach(({ element, top, bottom, height }) => {
    const visible = Math.min(bottom, viewportBottom) - Math.max(top, viewportTop);
    const entryDistance = Math.min(height * .1, viewportHeight * .1);
    if (element.contains(focusedElement) || visible >= entryDistance) {
      element.classList.remove('is-pending');
    } else if (bottom <= viewportTop || top >= viewportBottom) {
      // Rearm only after a full exit, in either scroll direction.
      element.classList.add('is-pending');
    }
  });
}

function scheduleScrollReveals() {
  if (!revealFrame && !motionIsPaused()) revealFrame = requestAnimationFrame(updateScrollReveals);
}
function invalidateRevealGeometry() {
  geometryDirty = true;
  scheduleScrollReveals();
}
window.addEventListener('scroll', scheduleScrollReveals, { passive: true });
window.addEventListener('resize', invalidateRevealGeometry);
window.addEventListener('load', invalidateRevealGeometry);
document.addEventListener('focusin', scheduleScrollReveals);
document.querySelectorAll('.faq-list details').forEach(details => details.addEventListener('toggle', invalidateRevealGeometry));
document.fonts?.ready.then(invalidateRevealGeometry);
if (canObserveLayout) {
  const layoutObserver = new ResizeObserver(invalidateRevealGeometry);
  const layoutElements = new Set([
    document.body, header, mobileContact,
    ...document.querySelectorAll('main,main>section,.service-grid'),
    ...scrollReveals.map(({ trigger }) => trigger)
  ]);
  layoutElements.forEach(element => layoutObserver.observe(element));
}

function updatePageMotion() {
  geometryDirty = true;
  document.body.classList.toggle('motion-paused', motionIsPaused());
  motionToggle.querySelector('.motion-label').textContent = motionPreference.matches ? 'Motion off' : userPausedMotion ? 'Play motion' : 'Pause motion';
  motionToggle.querySelector('.motion-icon').textContent = motionIsPaused() ? '▷' : 'Ⅱ';
  motionToggle.disabled = motionPreference.matches;
  updateScrollReveals();
  updateRotation();
  updateHeroRotation();
}
motionToggle.hidden = false;
motionToggle.addEventListener('click', () => { userPausedMotion = !userPausedMotion; updatePageMotion(); });
motionPreference.addEventListener('change', updatePageMotion);
updatePageMotion();

document.documentElement.classList.add('motion-enabled');
