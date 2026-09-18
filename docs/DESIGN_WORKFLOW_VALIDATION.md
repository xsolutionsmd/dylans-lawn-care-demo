# Design workflow setup validation

September 18, 2026; tooling/inspo-static from main 7ca71dd. Added portable repo skill,
static-site-specific context, connector helper and README/agent routes. No dist,
Docker/Caddy configuration or deployment workflow changed. Existing deny-by-default
image context admits only Dockerfile, Caddyfile and dist, excluding the skill.

Observed: public MCP initialization and 15-tool discovery passed from the portable
helper; a synthetic landscape-services brief returned text and three image blocks
in the companion development-context test. One was opened and inspected. Search
relevance varied, so the workflow requires visual/relevance checks and a fallback.
Python syntax, Markdown routes and skill validation passed. Codex skills/list
discovered the enabled repo skill. Native desktop hot reload is not claimed; the
included helper is callable immediately and native MCP may need a fresh session.

This is tooling acceptance, not a redesign, application regression suite or live
release. Main merges trigger the existing automatic Oracle release and require
authorization. The booking dev branch was not merged into this static lineage.
