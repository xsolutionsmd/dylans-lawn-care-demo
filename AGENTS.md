
## Source context

For dev/main source discovery, read docs/GRAFT.md and run scripts/graft.py with an explicit --ref matching this checkout. Production context requires clean main. Use the whole-repository graph plus bounded search/read for Docker, CI, deployment scripts, configuration and docs. Unsupported formats use text retrieval, not native graph edges. Explicit --feature enables attached development feature branches. Keep private/runtime/dependency files excluded; inspect status coverage and use rg/direct reads for gaps. Graphs are local hints; actual source and tests remain authoritative. Never run upstream init or install global hooks as part of this setup.

## Runtime verification

For browser behavior changes, use [Reticle](docs/RETICLE.md) when useful: start the intended local app/preview, select its exact URL session, perform a focused interaction and assert the resulting state/response. Treat unknown or partial observations honestly. Keep instrumentation local, preserve dev/main release gates, and use source/tests plus visual review for the gaps. This does not require Reticle for documentation-only edits.

## Reference-led visual design

For a new website, new app interface or substantial visual redesign, including
"build me a beautiful website", use the repository's
[reference-design skill](.agents/skills/reference-design/SKILL.md) and
[setup guide](docs/DESIGN_WORKFLOW.md). Recover this project's context, inspect
actual Inspo references, implement with the accepted stack/design route, and
check the working desktop/mobile preview. Routine backend fixes skip this flow.
Preserve the project's branch and release contract; design setup is development
tooling and does not itself authorize deployment.
