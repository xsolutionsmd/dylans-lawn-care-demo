
## Source context

For dev/main source discovery, read docs/GRAFT.md and run scripts/graft.py with an explicit --ref matching this checkout. Production context requires clean main. Use the whole-repository graph plus bounded search/read for Docker, CI, deployment scripts, configuration and docs. Unsupported formats use text retrieval, not native graph edges. Explicit --feature enables attached development feature branches. Keep private/runtime/dependency files excluded; inspect status coverage and use rg/direct reads for gaps. Graphs are local hints; actual source and tests remain authoritative. Never run upstream init or install global hooks as part of this setup.
