# Whole-repository context for Codex

Graft is optional developer tooling, not a website service or a GitHub client. The repository-local adapter combines Graft's structural graph with bounded text search and reads across the repository. This covers application code, Dockerfiles, Compose, CI workflows, deployment scripts, configuration and documentation. Unsupported formats are searchable text; they do not gain native Graft dependency edges.

## Setup and ordinary development

Requirements: Python 3.10+, Git and Docker Desktop/Linux Docker. No host Node installation is needed. From dev:

```sh
python scripts/graft.py --ref dev setup
python scripts/graft.py --ref dev status
python scripts/graft.py --ref dev ask "navigation"
python scripts/graft.py --ref dev search "FROM"
python scripts/graft.py --ref dev read Dockerfile
python scripts/graft.py --ref dev search "refs/heads/main"
python scripts/graft.py --ref dev read .github/workflows/check.yml
```

Use the workflow file listed by `status` for this repository (the company uses `.github/workflows/website.yml`). PowerShell and Bash use the same commands; `python3` can replace `python`. `search` and `read` do not need Docker or setup. `--start-line 121 read PATH` continues a long file. Reads are capped at 120 lines/12,000 characters, and literal search at 40 matches/12,000 characters. `status` lists included, excluded and untracked files so gaps remain visible.

`ask` returns at most five graph excerpts and also searches repository text. `api PATH` shows supported-code signatures; `callers SYMBOL` follows one-hop relationships. Strip the `source/` prefix from graph references to open the real checkout file. Follow adjacent files and inspect source/tests before editing. Use literal `search`, bounded `read`, `rg` and direct reads when the graph has no coverage or misses a relationship. HTML/CSS, Dockerfiles, YAML, Markdown, PowerShell and shell code primarily use the text route; Python deployment code and supported application languages can appear in the graph.

## Feature branches and separate main context

By default `--ref` must exactly match the current dev/main branch. To develop on an attached feature branch, explicitly add `--feature`:

```sh
python scripts/graft.py --ref dev --feature setup
python scripts/graft.py --ref dev --feature ask "deployment"
python scripts/graft.py --ref dev --feature read Dockerfile
```

The feature view reports its actual branch/commit and owns a distinct cache. GitHub reads still use dev. An ordinary dev view rejects a feature branch; feature mode rejects main and detached HEAD. Production always requires an entirely clean main checkout and never accepts feature mode.

Use a separate main worktree: `git worktree add ../site-main main`, or `git worktree add --track -b main ../site-main origin/main` if local main does not exist. There, use `python scripts/graft.py --ref main setup`, followed by `--ref main ask QUERY`, `search TEXT` or `read PATH`. Keep it fast-forwarded explicitly from origin/main. The adapter never updates or merges source itself.

`remote` reads the explicit GitHub endpoint `repos/<configured repository>/git/ref/heads/<ref>`. `remote README.md` uses `repos/<repository>/contents/README.md?ref=dev` or `?ref=main`. The validated origin must match `tools/graft/context.json`. Remote results can be newer than local source; compare the revision reported by `status`. Existing website update launchers fetch the selected dev/main branch and reject dirty/unsupported branch state. Production workflows remain main-only; Dylan's booking deployment still requires explicit dev dispatch. Every release CLI operation names `--repo "$GITHUB_REPOSITORY"`.

## Reproducibility, scope and privacy

The tool uses Graft **0.18.0**, Node **22.22.0**, a digest-pinned base image and committed npm lockfile. Setup needs network access once, verifies both versions and records the immutable image ID. Queries use that ID, not the shared mutable tag, and reject modified tool definitions until setup is rerun.

Build/query containers have no network, a read-only filesystem, temporary HOME and only a repository snapshot mounted writable. No provider keys, global settings, Codex/Claude hooks, upstream init, MCP configuration, cloud Brain or paid summaries are installed. Telemetry and graph seeding are disabled during installation and execution.

`sourcePatterns: ["**"]` selects tracked repository files, then a fixed text-file policy excludes binaries, files over 1 MB, symlinks, submodules, dependencies, generated graph/cache data, runtime/private directories, .env files and known credential files including the private booking setup filenames. Root-anchored narrower patterns remain supported. Docker/Caddy files, dotfile controls, `.github`, supported code, docs and ordinary configuration are included. `status` explicitly reports excluded tracked paths. Verify a new file is safe before staging it; no tool can recognize every arbitrarily named secret. Untracked files are reported but omitted until intentionally staged. The private project/KB is outside the repository root and never mounted.

Each checkout owns `.graft-context/<ref>` or a branch-specific `dev-feature-*` directory containing a source snapshot, hashes and graph. A lock serializes snapshot/build/query. Every request refreshes tracked bytes, removes deleted files, validates root/repository/ref/branch, and rechecks branch/commit/config/source hashes before returning text or querying the built graph. A foreign cache stamp is rejected. If interrupted, remove only its stale `.lock` after confirming no query is running.

All caches are Git-ignored. Existing application Docker allowlists exclude the optional tool and caches, including from the booking image. Graft is never installed in production web containers.

## Verification and removal

`python scripts/test_graft.py` uses isolated real Git fixtures to test wrong repository/ref, detached HEAD, dirty main, explicit feature mode, tracked edits/deletions, cache separation/poisoning, concurrent access, mid-snapshot changes, malformed patterns, nested lookalikes, whole-repository infrastructure/text coverage and excluded private/untracked files. CI runs these alongside the existing website checks. Actual runtime and release evidence is maintained in the owning project's validation records.

The company application's JavaScript alone is under 1 KB: direct reading is simpler for that file. Whole-repository context adds discovery of its operational files, but no account-token savings are claimed. Missing graph edges remain an upstream/parser limitation, not proof that behavior is absent.

To uninstall, stop queries and remove only this checkout's `.graft-context`; remove its tooling image only if no other checkout uses it. A scoped source revert removes the adapter, tests, `tools/graft/` and documentation/ignore entries. No global agent settings, application data volumes or server services need removal. Do not run global Docker pruning.
