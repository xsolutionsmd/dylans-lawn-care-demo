# Dylan dev: Field & Form

September 18, 2026. A complete public dev-site reimagination, explicitly authorized
for `dev-demo.xsolutionsmd.com`. Main remains the separate static site. This is
a demonstration, not evidence of a completed sale or a client-approved launch.

## Brief and verified content

The visitor is a homeowner deciding whether Dylan can care for their property.
The site must show real work, make the services understandable, supply credible
customer evidence, and distinguish a service visit from a price conversation.

Rechecked through the visible business profiles on September 18:

- [Facebook](https://www.facebook.com/dylans.lawncare.58): business introduction,
  phone **410-365-1265**, Reisterstown, MD, and invitation to request an estimate.
- [Owner's August 19 work post](https://www.facebook.com/dylans.lawncare.58/posts/pfbid02jL17Esnxz7Uujaa2F3UTagQV1Bsk9JPvpsNZPLDChqoFZpo2UmRtq1HtpYWc6GvFl):
  lawn care, bush trimming, mulching, tree trimming, landscaping, and the actual
  photos used here. No new territorial, insurance, guarantee or schedule claims.
- [Google Maps](https://www.google.com/maps/place/Dylan%27s+Lawn+Care/data=!4m7!3m6!1s0x89c81712f88a985d:0xd090e253509f15e2!8m2!3d38.804821!4d-77.2369665!16s%2Fg%2F11g18_8x4g!19sChIJXZiK-BIXyIkR4hWfUFPikNA):
  matched phone and Facebook destination; **4.8 / 82 reviews**. Muhammad Ali and
  Andrew McIver excerpts were re-read, with five-star indicators. Muhammad's
  account also supports past snow clearing; future seasonal availability is
  explicitly a question. The map center is not a verified business address.

All five images are derived from the existing Facebook originals, with composition
and factual subject preserved. Full source dimensions and quality-86 WebP preserve
photographic detail; a smaller hero source serves narrow screens. Removing unused
decorative artwork reduces the package size without compromising the new design. No generated
photo is represented as Dylan's work. Font sources are Google Fonts, Newsreader
and DM Sans; their OFL licenses ship with the local font files.

## Actual reference workflow

The installed Inspo hosted MCP, called through the repository's portable Python
helper, returned a photographic shortlist. We inspected both desktop and mobile
images for [Foster + Partners](https://fosterandpartners.com), and retrieved its
design-system data. The reference contributes photographic emphasis, restraint,
and breathing room, not its architecture services or claims. Several other
recommendations were unrelated and were not adopted. Catalogue inclusion is not
conversion evidence.

[Stitch project](https://stitch.withgoogle.com/projects/10457520769386141937)
contains the Field & Form design system, `assets/11926397810779079560`, and one
desktop design generation. The editable HTML was recovered from the visible
design canvas because MCP list_screens returned an empty response. HTML and
screenshot are kept in ignored `.stitch/designs/`; the portable design rules and
project metadata are committed. Generated markup served as a composition
reference; final editable source is plain HTML/CSS/JS under `dist/`.

The generated draft invented service coverage, salting/material details, an email
address, project labels, and a legal business suffix. These were rejected. Its
generated yard images were also rejected. This trial demonstrates why factual
review remains necessary even when the visual draft is useful.

## Implementation choices

- Editorial split hero; real garden photograph, direct phone, booking and estimate
  choices visible early. Each service row links into the matching current service.
- Ruled service rows, asymmetric dark project gallery, exact review excerpts,
  three-step request explanation and practical FAQs. No stock review widget,
  fabricated credentials, fake counters, map embed or tracking dependency.
- Phone layout prioritizes contact and booking, exposes all gallery images through
  native horizontal scrolling, and includes a keyboard-accessible menu and gallery.
- Newsreader normal/italic display with DM Sans interface text. Warm paper,
  evergreen and pale yellow-green, shared with the existing booking interface.
- Quality and visual detail take priority; efficiency improvements preserve them.
  Coordinated transform/opacity entrances, gentle section re-entry reveals, native
  scroll snapping and hover details use IntersectionObserver and passive scroll
  observation. The three-photo hero changes every seven seconds with a slow
  crossfade and subtle settling, suspended offscreen or in a background tab.
  Visible pause/resume controls and system reduced motion cover the experience.
  No animation framework or video download. Content remains available without JS.
- Same public booking controller and API contract, with a bounded service-ID
  preference from the URL. Server-offered services remain authoritative. Existing
  estimate/service duration, idempotency, loading, error and receipt states stay.
- Go backend, owner interface, OAuth, Google connections, database and email
  behavior are unchanged. No real customer submission is part of QA.
- Dev stays noindex. No whole-dev merge into main. Design tools, screenshots,
  instructions and skills stay out of the runtime image through its allowlist.

See [design validation](DESIGN_VALIDATION.md) for measured checks and release state.
