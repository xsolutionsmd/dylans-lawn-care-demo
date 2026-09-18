
## Source context

For dev/main source discovery, read docs/GRAFT.md and run scripts/graft.py with an explicit --ref matching this checkout. Production context requires clean main. The tool indexes only approved tracked source; use rg/direct reads for HTML, CSS, Markdown, deployment configuration, feature branches and missing results. Graphs are local hints; actual source and tests remain authoritative. Never run upstream init or install global hooks as part of this setup.
