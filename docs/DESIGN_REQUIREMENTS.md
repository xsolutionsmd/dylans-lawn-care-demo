# Persistent website design requirements

Read this entire file before visual changes, along with DESIGN_DECISIONS.md,
CONTENT_SOURCES.md and PHOTO_SOURCES.md. These constraints survive redesigns and
reference selection. Current source summaries explicitly supersede dated UI records.

- No decorative numbering on sections, services, process cards, photo labels or
  visible gallery counters. Factual phone/date/duration/review values remain.
- No visitor-visible demo/preview/concept wording or review-verification date.
  Keep verification dates in source documentation and preserve dev noindex.
- No location eyebrow above the homepage headline, duplicate hero rating or
  moving promotional ribbon. Keep copy and footer compact and purposeful.
- Navigation: Services, Reviews, Our work, Let's talk. Keep booking easy to reach.
- Use inline SVG arrows with currentColor, consistent proportions and alignment;
  do not use directional Unicode glyphs that can render as phone emoji.
- Prefer real lawn/landscape work over house-dominated photographs. Select from
  the full reviewed collection, considering quality, variety and date. Preserve
  provenance and avoid invented coverage, services, credentials or testimonials.
- Elegant repeated motion and section re-entry, smooth hover states, reduced
  motion, pause controls and suspension when hidden/offscreen. Quality and
  performance support each other; do not flatten the design merely to save bytes.
- Test individual fields within the card's padded content box, not just the page
  width. Retain native date picking and input labels, keyboard and focus behavior.
- The owner portal shares the accepted public palette and typography, while
  preserving familiar navigation and control placement. Weekly time fields and
  their remove button each need their own space at narrow phone widths.
- Booking/estimate selection is an in-place sliding control, with preserved
  contact/service/date drafts, browser history and reduced motion. Refresh slots
  for the new duration; never reinterpret a pending or already saved request.

## Browser regression check

Optional development dependencies; never copied into runtime images:

```powershell
npm install --prefix .local/browser-tests --no-save --package-lock=false --ignore-scripts playwright@1.63.0
$env:PLAYWRIGHT_SKIP_BROWSER_GC='1'
node .local/browser-tests/node_modules/playwright/cli.js install chromium webkit
$env:PLAYWRIGHT_MODULE=(Resolve-Path '.local/browser-tests/node_modules/playwright').Path
node scripts/test-browser-layout.cjs
```

The isolated suite checks empty/filled date fields, all form controls versus card
padding, six viewport widths, service/estimate modes, presentation constraints and
gallery behavior in Chromium and WebKit. It never submits bookings or contacts
external services. WebKit on a development computer is not physical iPhone Safari;
do not describe it as a handset test. Continue visual review of the actual page.

Before a substantial redesign, reconcile the whole client feedback record and
write a requirement/source checklist. Inspiration does not override these rules.
