# Local source context

Graft is optional developer tooling, not a website service or a GitHub client. It runs in an isolated Docker container using Graft **0.18.0**, Node **22.22.0**, a digest-pinned base image and a committed npm dependency lock. Install Python 3.10+, Git and Docker Desktop/Linux Docker. No host Node install is needed.

## Use from a clean dev checkout

```sh
python scripts/graft.py --ref dev setup
python scripts/graft.py --ref dev status
python scripts/graft.py --ref dev ask "navigation"
python scripts/graft.py --ref dev callers "close"
```

The same commands work in PowerShell and Bash (`python3` may replace `python`). Setup needs the network once. Builds and queries run with no network, no supplied provider credentials, a read-only container filesystem and only an allowlisted source snapshot mounted writable. Optional telemetry and graph seeding are disabled during installation and use. Setup records and verifies the actual image ID and versions; later queries use that immutable local image ID and reject changed tooling until setup is rerun.

Use `api PATH` for a file's signatures, then `ask QUERY` for at most five source excerpts, then `callers SYMBOL` for one-hop relationships. Source results are prefixed `source/`: remove that prefix to open the real checkout file. Follow neighboring files and actual source/tests before editing. This wrapper intentionally offers structural commands only: no deep summaries, cloud Brain, hooks, init, MCP or machine-wide settings.

## Dev and production are separate views

The required `--ref` must exactly match the checked-out branch. Dev permits edits to tracked source; main requires a completely clean checkout. Feature branches, detached HEADs and an unexpected GitHub origin are rejected before accessing Docker, GitHub or the cache. These are environment views; feature-branch work can continue with ordinary `rg` and direct reads. Merge approved feature changes into dev before using the dev view. Do not relabel a feature checkout as production.

Create a separate main checkout with `git worktree add ../site-main main` (or `git worktree add --track -b main ../site-main origin/main` if the local main branch does not exist). Run `python scripts/graft.py --ref main setup` there, then `--ref main ask QUERY`. Keep main fast-forwarded explicitly from `origin/main`; never switch the development working directory merely to answer a production question.

`remote` reads `repos/<configured repository>/git/ref/heads/<explicit ref>` through authenticated `gh api --method GET`. `remote README.md` reads the contents endpoint with `?ref=dev` or `?ref=main`. This is independent of the local graph: remote source may have advanced beyond the local revision shown by `status`. The adapter never implicitly updates or merges source. Existing website update launchers fetch the selected dev/main branch and refuse dirty/unsupported branch state. Main workflows remain the production release gate; Dylan's booking deployment still requires its explicit dev workflow dispatch. Release commands specify `--repo "$GITHUB_REPOSITORY"`.

## Coverage, freshness and privacy

`tools/graft/context.json` defines the repository identity and root-anchored source patterns. Only tracked regular source files are copied; no symlinks, submodules or nested lookalike paths. The company graph covers its small JavaScript file. Dylan main covers public JavaScript, while Dylan dev also covers Go booking code/tests and admin JavaScript. HTML, CSS, Markdown, workflows, configuration and deployment scripts are intentionally outside this graph: use `rg`, `git show` and direct reads. A missing graph result does not prove missing behavior. A small static site may be faster to inspect directly; no measured account-token savings are claimed.

New untracked files are omitted and listed by `status`; add intended source to Git's index before including it. Never stage a secret to make it searchable. Private booking config, `.local`, `.env`, databases, credentials, dependencies, private project/KB files and runtime data are not source patterns. Production and booking Docker contexts keep their existing application allowlists and exclude all this tooling/state.

Each checkout owns `.graft-context/<ref>` with an identity stamp, source hashes and derived graph. The wrapper serializes snapshot/build/query with a per-ref exclusive lock, refreshes the snapshot before every query, removes deleted source, verifies branch/commit/config and hashes before and after building, and rejects a cache stamped for another root/repository/ref. If interrupted, remove the specific `<ref>.lock` only after confirming its query is no longer running. Graphs are local code-derived data and are never committed or uploaded.

## Validate and remove

`python scripts/test_graft.py` exercises real temporary Git repositories: wrong branch/origin, detached HEAD, dirty production, tracked development edits, malformed patterns, excluded tracked/untracked files, nested lookalikes, deleted files, branch cache separation, poisoned identity and edits/branch switches during a snapshot. It uses no private data, Docker or network.

To remove the optional tool, delete this checkout's `.graft-context` after stopping its queries and remove the local tooling image if no other checkout uses it. A scoped source revert removes `scripts/graft.py`, `scripts/test_graft.py`, `tools/graft/` and the documentation/ignore entries. No global agent config, website service, application volume or production server needs cleanup. Do not run a global Docker prune.
