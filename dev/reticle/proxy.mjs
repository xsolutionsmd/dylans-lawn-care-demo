import http from 'node:http';

export const sdkPath = '/__reticle_local__/sdk.js';
export function validateTarget(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Use an explicit http://127.0.0.1:PORT local application origin.');
  }
  return url;
}

// This is a development preview only. Production never imports this module.
export function createPreview({ upstream, sdk }) {
  const target = validateTarget(upstream);
  const server = http.createServer((req, res) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    if (req.headers.host !== new URL(origin).host ||
        (req.headers.origin && req.headers.origin !== origin) ||
        !req.url.startsWith('/') || req.url.startsWith('//')) {
      res.writeHead(403).end('Local same-origin preview only');
      return;
    }
    if (req.url.split('?')[0] === sdkPath) {
      if (req.method !== 'GET' || req.headers['sec-fetch-site'] === 'cross-site') {
        res.writeHead(403).end(); return;
      }
      try {
        const body = sdk();
        res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8',
          'cache-control': 'no-store', 'cross-origin-resource-policy': 'same-origin',
          'x-content-type-options': 'nosniff' }).end(body);
      } catch {
        res.writeHead(503).end('/* Start Reticle MCP or serve before opening the preview. */');
      }
      return;
    }
    const headers = { ...req.headers, host: target.host, 'accept-encoding': 'identity' };
    if (headers.origin) headers.origin = target.origin;
    if (headers.referer?.startsWith(origin + '/')) headers.referer = target.origin + headers.referer.slice(origin.length);
    delete headers['if-none-match'];
    delete headers['if-modified-since'];
    // Translate only the already-validated local origin, preserving backend Host/CSRF checks.
    const request = http.request({ hostname: target.hostname, port: target.port || 80,
      path: req.url, method: req.method, headers }, response => {
      const out = { ...response.headers };
      if (out.location?.startsWith(target.origin + '/')) out.location = origin + out.location.slice(target.origin.length);
      const html = req.method !== 'HEAD' && response.statusCode === 200 &&
        /text\/html/i.test(out['content-type'] || '');
      if (!html) {
        res.writeHead(response.statusCode, out); response.pipe(res); return;
      }
      if (out['content-encoding'] && out['content-encoding'] !== 'identity') {
        res.writeHead(502).end('Preview needs an uncompressed HTML response.');
        response.resume(); return;
      }
      const chunks = []; let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > 8 * 1024 * 1024) { response.destroy(); res.writeHead(502).end('HTML too large'); }
        else chunks.push(chunk);
      });
      response.on('end', () => {
        if (res.writableEnded) return;
        let body = Buffer.concat(chunks).toString('utf8');
        const script = `<script defer src="${sdkPath}"></script>`;
        body = /<head\b[^>]*>/i.test(body) ? body.replace(/<head\b[^>]*>/i, match => match + script) : script + body;
        delete out['content-length']; delete out.etag; delete out['last-modified'];
        out['cache-control'] = 'no-store';
        // Preserve CSP: incompatible policies must fail visibly, never be weakened.
        res.writeHead(response.statusCode, out).end(body);
      });
      response.on('error', () => { if (!res.writableEnded) res.destroy(); });
    });
    request.on('error', () => { if (!res.headersSent) res.writeHead(502).end('Local app unavailable'); else res.destroy(); });
    req.on('aborted', () => request.destroy());
    req.pipe(request);
  });
  // Same-origin bridge keeps strict connect-src 'self' policies intact (VoiceVault).
  // The bridge still requires Reticle's pairing token; there is no arbitrary destination.
  server.on('upgrade', (req, socket, head) => {
    const host = `127.0.0.1:${server.address().port}`;
    if (req.url !== '/__reticle_local__/bridge' || req.headers.host !== host || req.headers.origin !== `http://${host}`) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
    }
    const bridgeHeaders = { host: '127.0.0.1:4400', connection: 'Upgrade', upgrade: 'websocket', origin: req.headers.origin };
    for (const key of ['sec-websocket-key', 'sec-websocket-version', 'sec-websocket-protocol', 'sec-websocket-extensions']) {
      if (req.headers[key]) bridgeHeaders[key] = req.headers[key];
    }
    const bridge = http.request({ hostname: '127.0.0.1', port: 4400, path: '/reticle', headers: bridgeHeaders });
    bridge.on('upgrade', (response, upstreamSocket, upstreamHead) => {
      let reply = 'HTTP/1.1 101 Switching Protocols\r\n';
      for (let i = 0; i < response.rawHeaders.length; i += 2) reply += `${response.rawHeaders[i]}: ${response.rawHeaders[i + 1]}\r\n`;
      socket.write(reply + '\r\n');
      if (upstreamHead.length) socket.write(upstreamHead);
      if (head.length) upstreamSocket.write(head);
      socket.pipe(upstreamSocket).pipe(socket);
      socket.on('error', () => upstreamSocket.destroy());
      upstreamSocket.on('error', () => socket.destroy());
      socket.on('close', () => upstreamSocket.destroy());
      upstreamSocket.on('close', () => socket.destroy());
    });
    bridge.on('response', response => { response.resume(); socket.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n'); });
    bridge.on('error', () => socket.destroy());
    bridge.end();
  });
  return server;
}
