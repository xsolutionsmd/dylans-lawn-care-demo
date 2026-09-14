// Check the published static package, without sending data to external services.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../dist');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const origin = 'https://demo.xsolutionsmd.com/';
const meta = name => html.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`))?.[1];
assert.match(html, /<html lang="en">/);
assert.match(html, /<title>Lawn Care &amp; Landscaping in Reisterstown, MD \| Dylan’s<\/title>/);
assert.equal(meta('robots'), 'index, follow, max-image-preview:large');
assert.ok(meta('description').includes('410-365-1265'));
assert.equal(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1], origin);
assert.equal(meta('og:url'), origin);
assert.equal(meta('og:site_name'), 'Dylan’s Lawn Care');
assert.equal((html.match(/<h1\b/g) || []).length, 1);
assert.match(html, /<main id="main" tabindex="-1">/);
const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert.equal(graph['@context'], 'https://schema.org');
assert.deepEqual(graph['@graph'].map(item => item['@type']), ['Organization', 'WebSite', 'WebPage']);
const business = graph['@graph'][0];
assert.equal(business.telephone, '+14103651265');
assert.equal(business.sameAs[0], 'https://www.facebook.com/dylans.lawncare.58');
assert.equal(business.hasOfferCatalog.itemListElement.length, 3);
assert.ok(!/"(?:aggregateRating|review|streetAddress|geo|openingHours|priceRange)"/.test(JSON.stringify(graph)), 'Do not invent unverified business details or claim self-serving review stars.');
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
assert.match(robots, /^Allow: \/$/m);
assert.ok(!/^Disallow:\s*\/\s*$/m.test(robots));
assert.ok(robots.includes(`Sitemap: ${origin}sitemap.xml`));
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]), [origin]);
assert.ok(!sitemap.includes('<lastmod>'), 'Do not fabricate modification dates.');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
for (const [, fragment] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(fragment), `Missing section ${fragment}`);
for (const [, asset] of (html + fs.readFileSync(path.join(root, 'styles.css'), 'utf8')).matchAll(/(?:src="|url\(')(assets\/[^"')]+)/g)) {
  assert.ok(fs.existsSync(path.join(root, asset)), `Missing asset ${asset}`);
}
for (const name of fs.readdirSync(path.join(root, 'assets')).filter(name => name.endsWith('.webp'))) {
  const digest = createHash('sha256').update(fs.readFileSync(path.join(root, 'assets', name))).digest('hex').slice(0, 12);
  assert.ok(name.includes(`.${digest}.webp`), `Asset filename must match content: ${name}`);
}
assert.ok(!fs.existsSync(path.join(root, 'book.html')) && !fs.existsSync(path.resolve(root, '../booking')), 'Keep the booking system on dev.');
console.log('SEO checks passed: metadata, linked business data, crawl policy, sitemap, section links, fingerprinted assets and static-only scope.');
