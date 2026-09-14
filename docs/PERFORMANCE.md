# Animation performance

The static website keeps its existing imagery, masks, colors, animation keyframes,
durations, easing, hover expansion, photo wipes and carousel effects. These changes
reduce browser work without adding dependencies or changing the server runtime.

- Scroll entrances reuse stable layout positions. A `ResizeObserver` invalidates
  them when sections, cards, the header or mobile contact bar resize. Window
  resizing, image loading, font readiness and FAQ toggles also invalidate the cache.
  Browsers without `ResizeObserver` retain the original measurement behavior.
- Entrances still replay after a full exit in either direction, keep their existing
  entry threshold and keep focused content visible. Layout changes made while
  motion is paused are measured when motion resumes.
- Hidden carousel cards are repositioned together before one synchronous layout
  read. Drag updates use the latest pointer position once per animation frame;
  releasing or cancelling a gesture cancels any queued movement.
- Decorative headline and FAQ loops pause together when their heading is outside
  the viewport plus a 160-pixel preparation margin, or the browser tab is hidden.
  `animation-play-state` preserves their progress and synchronization. The existing
  page pause control and reduced-motion behavior remain available.

Repeated layout reads can make the browser perform unnecessary synchronous work;
see Google's [layout performance guidance](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing).
The existing visual effects are deliberately retained instead of substituting
approximate animations. See [animation rendering guidance](https://web.dev/articles/animations-guide).

## Verification

Run `node --check dist/app.js`, `node scripts/check-seo.cjs`, and
`./website.ps1 check -NoOpen`. The GitHub container check runs syntax, static-site
integrity and container checks before a main release.

For browser acceptance, check repeated scroll entrances in both directions, rapid
service-card hovering, carousel buttons/keyboard/swipes, pause/resume, FAQ expansion,
mobile resizing and returning to both decorative headings. Check no horizontal
overflow and no console errors. The private client QA harness compares the actual
baseline and candidate pages and counts layout API reads during the same scroll
sequence. Those counts measure avoided work, not an FPS or device-wide speedup.
