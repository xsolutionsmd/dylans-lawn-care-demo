import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createPreview, validateTarget, sdkPath } from './proxy.mjs';
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
test('reject remote targets, credentials, paths and non-HTTP origins', () => {
  for (const url of ['https://127.0.0.1:8000', 'http://example.com', 'http://localhost:8000', 'http://u:p@127.0.0.1', 'http://127.0.0.1/path']) assert.throws(() => validateTarget(url));
});
test('SDK failures stay non-successful and foreign WebSocket origins are refused', async t => {
  const preview = createPreview({ upstream: 'http://127.0.0.1:12345', sdk: () => { throw new Error('missing token'); } });
  const port = await listen(preview);
  t.after(() => { preview.closeAllConnections(); preview.close(); });
  assert.equal((await fetch(`http://127.0.0.1:${port}${sdkPath}`)).status, 503);
  const status = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/__reticle_local__/bridge`, {headers: {
      connection: 'Upgrade', upgrade: 'websocket', origin: 'https://evil.example'
    }}, res => {res.resume();resolve(res.statusCode);}).on('error',reject);
  });
  assert.equal(status, 403);
});
test('preview instruments HTML only and preserves application authentication and policy', async t => {
  const app = http.createServer((req, res) => {
    if (req.url === '/api') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ cookie: req.headers.cookie, origin: req.headers.origin, host: req.headers.host })); }
    else { const html = '<html><head></head><body>Hello</body></html>'; res.writeHead(200, { 'content-type': 'text/html', 'content-security-policy': "script-src 'self'", etag: 'old', 'content-length': Buffer.byteLength(html) }); res.end(html); }
  });
  const upstream = await listen(app);
  const preview = createPreview({ upstream: `http://127.0.0.1:${upstream}`, sdk: () => '/* fake SDK for boundary test */' });
  const port = await listen(preview); const origin = `http://127.0.0.1:${port}`;
  t.after(() => { preview.closeAllConnections(); preview.close(); app.closeAllConnections(); app.close(); });
  const html = await fetch(origin); assert.match(await html.text(), /<head><script defer src="\/__reticle_local__\/sdk.js">/);
  assert.equal(html.headers.get('etag'), null); assert.equal(html.headers.get('content-security-policy'), "script-src 'self'");
  const api = await fetch(origin + '/api', { method: 'POST', headers: { cookie: 'session=test', origin }, body: 'test' });
  assert.deepEqual(await api.json(), { cookie: 'session=test', origin: `http://127.0.0.1:${upstream}`, host: `127.0.0.1:${upstream}` });
  const foreignHostStatus = await new Promise((resolve, reject) => {
    http.get(origin, { headers: { host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); }).on('error', reject);
  });
  assert.equal(foreignHostStatus, 403);
  assert.equal((await fetch(origin + sdkPath, { headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await fetch(origin + sdkPath)).headers.get('cache-control'), 'no-store');
});
