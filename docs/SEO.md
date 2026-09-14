# Static website SEO

This work starts from main `ad5313a07d05f61e829ba6e288a09d433c35505d` on the separate `updates` branch. Release through an `updates` → `main` PR. Do not merge the booking/admin code from `dev` to ship these changes.

## What changed

- A descriptive service/location title and meta description, consistent canonical/Open Graph URLs, and social text metadata.
- Linked `Organization`, `WebSite`, `WebPage` and service catalog data using the existing phone, Facebook identity, profile locality and visible services. No invented street address, hours, service territory, price, geographic coordinates or review-star markup. LocalBusiness rich-result eligibility is not claimed without a verified physical address.
- An indexable main page, crawlable robots.txt and a one-page XML sitemap. Fragments are sections of this same page, not separate sitemap pages. No fabricated modification dates or keyword stuffing.
- Three lossless WebP alternatives with content hashes in filenames. Decoding all three produces exactly the original RGBA pixels and dimensions. They total 3,834,838 bytes instead of 5,758,574 bytes: a 33.4% transfer reduction for these assets. The original files remain available for existing links. Layout, visible text, photography, animation timing and JavaScript are preserved.
- Long-lived immutable caching only for content-hashed WebP filenames. HTML, CSS, JavaScript and unversioned assets revalidate so releases do not leave stale presentation. Health and release-status responses remain uncached and noindex.
- Low fetch priority for hidden hero slides, asynchronous decoding for secondary/lazy images, matching visible/accessibility names on service links, and a focus target for the skip link.

## Checks and release

`website.ps1 check -NoOpen` verifies every packaged public file, health/revision, indexing headers, sitemap content/type, robots policy, WebP type/caching and exclusion of private paths. `node scripts/check-seo.cjs` validates metadata, JSON-LD, canonical/sitemap agreement, section links, asset hashes and exclusion of the dev booking system. `python3 scripts/test-updater.py` runs the real updater against isolated fake network/Docker commands on Linux, including candidate/live indexing failures and rollback. These checks run on updates pushes and main PRs. Only main publishes.

The indexing policy is checked in HTML, Caddy, the launcher, Actions and the installed server updater. Updating only one layer is insufficient. Back up the installed updater, pause its timer, install the reviewed script atomically and restore the prior timer state before the first SEO release. Preserve the dev, company and gateway stacks. Actual live workflow, image and preservation evidence belongs in the private client release record after verification.

## Domain changes and search visibility

The current canonical address is `https://demo.xsolutionsmd.com/`. When a final domain is approved, update the canonical, social URLs, structured-data IDs/URLs, robots sitemap location and sitemap URL together; add permanent redirects from the old public address and update deployment verification/routing for the new hostname. Do not canonicalize to an unconfigured domain.

Indexable does not mean already indexed or guaranteed to rank. Search Console ownership, sitemap submission and live indexing status have not been established by this release. Search engines still choose when to crawl and which canonical to use. The separate dev application remains excluded from indexing.

Implementation follows primary guidance on [titles](https://developers.google.com/search/docs/appearance/title-link), [canonicals](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [local business data](https://developers.google.com/search/docs/appearance/structured-data/local-business), and [review markup](https://developers.google.com/search/docs/appearance/structured-data/review-snippet). Organization markup does not promise a LocalBusiness result; no self-serving review stars or obsolete FAQ rich-result claims are added.
