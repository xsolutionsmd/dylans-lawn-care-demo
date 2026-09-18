# Dev redesign validation

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
