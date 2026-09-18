# Dev redesign validation

## September 18 owner workspace and smooth request selection

- Chromium and WebKit: 48 public date/card containment cases, plus 70 admin
  viewport/panel combinations at 320, 375, 390, 430, 768, 1024 and 1440px.
- In-place request selection, unchanged document time origin, Back/Forward,
  keyboard activation, retained contact/service/date drafts, different durations,
  invalidated slot selection and reduced-motion indicator checks pass.
- Owner fixture checks add/remove weekly hours, toggle/re-enable a day, open/close
  a request dialog, self-hosted fonts, padded card containment and no overlapping
  time fields/remove buttons. Desktop and mobile screenshots inspected; interactive
  browser review uses an isolated synthetic workspace. No real settings saved.
- Public controller: 23 tests, including submitted kind after switching, pending/
  uncertain/receipt locks, exact idempotent retry and ignored stale responses.
  Existing owner refresh, access (27) and email (16) suites pass unchanged.
- Local `website.ps1 check -NoOpen`: 29 public files, packaging/privacy checks,
  Go race suite and isolated authentication/CSRF/persistence integration pass.
  Explicit admin font routes are tested, including public-listener exclusion and
  directory/license-file exclusion. Fonts/licenses add about 103 KB to source.
- Browser emulation is not a physical iPhone test. No actual customer requests,
  calendar events or emails were created. Final CI and hosted release evidence
  is recorded with the development deployment and private client QA record.

## September 18 broader photography and gallery refinement

The signed-in Facebook review covered the 80-photo grid, cover album and timeline
back to its June 26, 2018 entry. [Photo sources](PHOTO_SOURCES.md) distinguish older
work from recent reposts. Eight selected photographs replace the repetitive four-photo
reel. A lawn-led hero, consistent gallery framing and native full-image dialog retain
the existing design system, booking behavior and motion/pause preferences.

- 48 date/card containment cases still pass in Chromium and WebKit.
- Both engines pass eight-photo count, descriptive gallery announcements, modal
  previous/next and keyboard arrows, focus containment, Escape/focus restoration,
  and dialog bounds at 320, 390 and 1440px. Reduced-motion state passes.
- Desktop design inspected in the interactive browser; mobile modal screenshots
  inspected from the isolated browser suite. Browser emulation is not a physical
  iPhone test. The in-app capture scaling differed from DOM bounds during mobile
  inspection, so the isolated engine captures were used to verify actual framing.
- Public booking suite: 19 passed. Container checks: 29 public files, revision,
  headers and private-file exclusions passed. No live appointments/messages sent.
- Existing animation visibility gates remain; opening the photo viewer also pauses
  the hero sequence. Responsive sources, lazy gallery images and local assets avoid
  third-party media dependencies. No measured device FPS/speed claim is made.

The earlier correction was released to dev as `f9b0a808c9076e5df5c1063112a8857b20baedfa`
through run `35403914125`, with all 19 files verified over HTTPS. This additional
photo refinement follows the same dev-only/manual-release contract below.

## September 18 correction after phone feedback

The earlier Chromium review missed a date control overflowing its own card on
iPhone and did not enforce several explicit presentation preferences. The fix
normalizes native date appearance and inline sizing while preserving type=date;
empty/filled values and all form controls are checked against padded card edges.
The isolated regression suite passed 48 cases in Chromium and WebKit at widths
320, 375, 390, 430, 768 and 1440, in service and estimate modes. This is not a
physical iPhone test. The suite also prevents decorative numbers, visible review
check dates/demo labels and directional text glyphs returning. Public booking's
19 cases and the 19-file packaged-container check passed. The browser suite is
now included in PR/dev checks. See DESIGN_REQUIREMENTS.md for the complete rules.

The correction removes service/process/photo counters, restores the requested
navigation, SVG arrows and clean visitor copy, and removes the location eyebrow.
The complete accessible-photo review is tracked separately before photo changes.

## Original redesign checkpoint

September 18, 2026. Scope: the public homepage and booking presentation on dev,
plus validated service links. See [design decisions](DESIGN_DECISIONS.md).

## Local checks completed

- `./website.ps1 check -NoOpen`: container build, static asset equality/headers,
  Go race tests, and isolated booking integration passed. Bootstrap, cookies,
  CSRF, persisted settings, private owner routes and closed availability covered.
- After the photographic/motion refinements, `./website.ps1 build -NoOpen`
  passed again: 19 public files, revision endpoint and private-file exclusions.
  Skills, design metadata and workflow docs are explicitly checked as unavailable.
- Public booking suite: 19 passed, including supported/unknown URL service IDs.
  Owner refresh, access (27), and email (16) suites passed.
- Deployment recovery suite: 22 passed in Linux. Native Windows execution refuses
  unsupported platform assumptions; the Linux run is the meaningful result.
- Graft suite: 12 tests, one platform skip. JS syntax and Git whitespace checks passed.
- Local asset/link inspection found no missing local targets. Approximately 2.18 MB
  of public files versus 7.36 MB before redesign (about 70% smaller). This is an
  uncompressed package comparison, not a measured visitor transfer or speed score.
  Full-size photos retain source dimensions, and fonts are self-hosted.

## Browser review completed

- Desktop at 1280/1440, tablet at 768, mobile at 390, and narrow 320px layouts.
  No page-level horizontal overflow; visual desktop/mobile review completed.
- Mobile menu: opens, correct expanded state, closes with Escape and home selection. Gallery next
  control and keyboard arrows advance; FAQ opens with readable content.
- Hero photo sequence advances; pause holds the displayed photo. Offscreen
  visibility suspends the sequence. Reduced motion disables it and reveals all
  content. A JavaScript-disabled mobile visit keeps navigation in document flow
  and content readable. Page scaling was reset before screenshot review.
- Service links preselect the intended offered service. Synthetic browser
  submissions cover both service and estimate requests, native required-field
  validation, focused receipt, correct 60/15-minute durations, and truthful
  calendar-pending status. The fixture does not write bookings or call external
  services. Real backend behavior is covered separately by the integration suite.
- Unavailable API: the booking page presents a phone fallback and retry control.
  No real customer request, email, calendar event or phone call was generated.

## Release contract

This source change targets **dev only**. After checks, merge into dev and manually
dispatch `deploy-dev.yml`. Pushing dev does not deploy by itself. Main remains the
separate static site; never merge the whole dev line into main. Verify the released
web and booking revisions, published assets and live UI after deployment. Deployment
completion is recorded separately in the release workflow, not asserted by this
pre-release validation record. Private runtime configuration and data are unchanged.
