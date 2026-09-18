# Reticle local runtime verification

Reticle 3.1.0 is optional development tooling for this application's existing stack.
It adds DOM, console, route and fetch/XHR observations to a local preview. It does
not replace application tests, source inspection, visual review or the release gate.
Production HTML, assets, images and servers contain no Reticle instrumentation.

## Start

Use Node 22+ on the host alongside the normal container launcher. From this repo:

```sh
npm --prefix dev/reticle ci --ignore-scripts --no-fund --no-audit
node dev/reticle/run.mjs serve
node dev/reticle/run.mjs preview --upstream http://127.0.0.1:4178 --port 4488
```

On Windows use `npm.cmd` if PowerShell blocks npm.ps1. Use the actual local port
printed by the app launcher. Open the 4488 address in the browser. The
preview stays in the foreground; Ctrl+C stops it. MCP normally starts the daemon
on demand, so `serve` is only needed for a manual first run. No cloud account or
model key is needed. The daemon binds loopback port 4400; do not share that port
with another application. No `.reticle.json` project identity is installed: these
previews intentionally share the local bridge, with sessions selected by exact URL.

## Codex

The local setup installs a project-scoped `.codex/config.toml` entry. For a fresh
clone, add the following with absolute paths for this checkout; keep the config
ignored and preserve other MCP entries:

```toml
[mcp_servers.reticle]
command = "node"
args = ["/absolute/repository/dev/reticle/run.mjs", "mcp"]
cwd = "/absolute/repository"
startup_timeout_sec = 30
tool_timeout_sec = 60
```

Open a fresh trusted Codex project session after configuring it. The current task's
tool list does not hot-reload. `node dev/reticle/run.mjs status` checks the bridge.
The wrapper disables telemetry and sets an explicit state directory to suppress
upstream's automatic changes to other editors' approval settings. Do not run
upstream `init`, global installer, cloud login/link/sync or model-powered explore
as part of normal verification.

## Verification loop

1. Start the intended checkout's local app; verify Git branch/revision and URL.
2. Start its preview. List `reticle_session {action:"list"}` and select the exact
   preview URL's sessionId; never assume the first session is this project.
3. Inspect with `reticle_look {action:"snapshot",sessionId}`. Perform the user's
   authorized browser interaction using the active browser's supported controls.
4. Assert the specific outcome with `reticle_assert {action:"now",sessionId,
   predicate:{kind:"route",pathname:"/expected"}}` or an element/response assertion.
   Prefer a real network/state consequence over a label merely being present.
5. Use `reticle_observe {action:"network",sessionId,bodies:false,limit:5}` for a
   bounded response check. Record pass/fail/unknown, actual revision and limits.
   Re-list after navigation; an absent session or observation is not a pass.
6. End/yield the session when finished, close preview tabs and stop the preview.

For a styled heading split across child spans, prefer an observed role/name query
over a raw text query. Reticle may normalize whitespace differently from the
browser. Read its actual result before adjusting an assertion; never weaken it
just to get a pass. Unknown/partial coverage cannot prove end-to-end success.

## Boundaries and tradeoffs

- The proxy accepts only explicit HTTP 127.0.0.1 upstreams and listens on 127.0.0.1.
  It rejects foreign Host/Origin requests, serves no arbitrary files and sends no
  CORS grants. The fixed WebSocket bridge preserves strict app CSP unchanged.
- Incoming same-origin requests are translated to the upstream Host/Origin;
  backend auth/CSRF checks remain active. Cookies and request bodies pass through.
  This is not an isolation boundary: browser cookies are shared across ports on
  one hostname. Use a disposable app/profile for synthetic mutation tests.
- Absolute same-upstream HTTP redirects return to the preview. Generated absolute
  links, OAuth callbacks and other origins may leave it. Test external sign-in on
  the normal app URL; this setup makes no OAuth callback compatibility promise.
- Network/error response bodies and source mapping are off; no application stores
  are registered. DOM, console and URL metadata can still contain sensitive data.
  Reticle tool results enter the current assistant context. Do not attach real
  recordings, transcripts, customer records or credentials to saved evidence.
- SDK loads after parsing; initial navigation and early requests can be missed.
  Full-page navigation reconnects but is not a complete network audit. Use normal
  tests for persistence, ownership, background jobs and external integrations.
- Reticle's presenter/tour/annotation overlays are disabled to preserve app clicks
  and visual review. Use browser screenshots for appearance. There is no guaranteed
  usage saving: bounded calls can help debugging, but long traces add context.
- Only Reticle's WebSocket path is proxied; application WebSocket/HMR is unsupported.
  Compressed HTML that ignores the identity request and HTML over 8 MiB fail visibly.
- Versions and transitive dependencies are locked. Upstream server is FSL-1.1-ALv2;
  browser SDK is Apache-2.0. Review updates instead of floating to latest.

Run `node --test dev/reticle/proxy.test.mjs` for proxy boundary checks. Remove the
project MCP entry and stop the preview to disable; the ordinary app is unaffected.
Upstream: https://github.com/reticlehq/reticle

For the separate local owner portal, use its actual port (currently 4179) with preview 4489 and open `/`. Server deployment uses `/admin/`; do not assume that path for the local split-origin app. The public preview also covers booking/estimate pages. For a production-layout check, start a separate clean main checkout locally and point this tool at that local port; never instrument a live public site.
