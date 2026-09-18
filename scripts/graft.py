"""Branch-bound, offline Graft source context. Python 3.10+ and Docker required."""
import argparse
import fnmatch
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
IMAGE = 'xsolutions-graft:0.18.0-node22.22.0'

def run(args, cwd=None):
    return subprocess.check_output(args, cwd=cwd or ROOT, text=True, encoding='utf-8').strip()

def git(*args):
    return run(['git', *args])

def identity(ref):
    config = json.loads((ROOT / 'tools/graft/context.json').read_text(encoding='utf-8-sig'))
    patterns = config.get('sourcePatterns')
    if not isinstance(patterns, list) or not patterns or any(not isinstance(p, str) or not p or '/' not in p or p.startswith('/') or '..' in Path(p).parts for p in patterns):
        raise ValueError('sourcePatterns must be a nonempty list of repository-relative patterns')
    repo = config['repository']
    remote = git('remote', 'get-url', 'origin')
    if remote not in (f'https://github.com/{repo}.git', f'git@github.com:{repo}.git'):
        raise ValueError('Unexpected origin repository; refusing context access')
    if git('rev-parse', '--show-toplevel').replace('\\', '/') != ROOT.as_posix():
        raise ValueError('Launcher must belong to the checkout root')
    branch = git('branch', '--show-current')
    if branch != ref:
        raise ValueError(f'Expected branch {ref}; got {branch or "detached HEAD"}')
    dirty = bool(git('status', '--porcelain', '--untracked-files=all'))
    if ref == 'main' and dirty:
        raise ValueError('Production context requires a clean main checkout')
    omitted = git('ls-files', '--others', '--exclude-standard').splitlines()
    return config, dict(repository=repo, ref=ref, root=str(ROOT), revision=git('rev-parse', 'HEAD'), dirty=dirty, omittedUntracked=omitted)

def inventory(config):
    paths = []
    for line in git('ls-files', '-s', '-z').split('\0'):
        if not line:
            continue
        entry, name = line.split('\t', 1)
        if entry.split()[0] != '100644' and entry.split()[0] != '100755':
            continue  # No symlinks or submodules.
        p = Path(name)
        if not any(len(p.parts) == len(Path(pattern).parts) and all(fnmatch.fnmatchcase(part, rule) for part, rule in zip(p.parts, Path(pattern).parts)) for pattern in config['sourcePatterns']):
            continue
        if any(part.startswith('.') or part in ('node_modules', 'config', 'vendor', 'graft') for part in p.parts):
            continue
        source = ROOT / p
        if source.is_file() and source.resolve().is_relative_to(ROOT) and not source.is_symlink():
            paths.append(name)
    return sorted(paths)

def snapshot(config, info):
    cache = ROOT / '.graft-context' / info['ref']
    if cache.resolve() != cache.absolute():
        raise ValueError('Cache must not resolve through a symlink')
    cache.mkdir(parents=True, exist_ok=True)
    stamp = cache / 'identity.json'
    if stamp.exists():
        old = json.loads(stamp.read_text())
        if any(old[k] != info[k] for k in ('repository', 'ref', 'root')):
            raise ValueError('Cache identity mismatch; remove this checkout cache explicitly')
    src = cache / 'source'
    if src.resolve() != src.absolute():
        raise ValueError('Source snapshot must not resolve through a symlink')
    src.mkdir(exist_ok=True)
    names = inventory(config)
    wanted = {src / name for name in names}
    for path in src.rglob('*'):
        if path.is_symlink():
            raise ValueError('Symlink in source snapshot')
        if path.is_file() and path not in wanted:
            path.unlink()
    hashes = {}
    for name in names:
        data = (ROOT / name).read_bytes()
        dest = src / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists() or dest.read_bytes() != data:
            dest.write_bytes(data)
        hashes[name] = hashlib.sha256(data).hexdigest()
    stamp.write_text(json.dumps(dict(info, files=hashes), indent=2) + '\n')
    verify_snapshot(config, info, cache)
    return cache

def verify_snapshot(config, info, cache):
    current_config, current = identity(info['ref'])
    if current_config != config or current['revision'] != info['revision']:
        raise ValueError('Checkout identity changed while reading source; retry')
    stamp = json.loads((cache / 'identity.json').read_text())
    actual = {name: hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in inventory(config)}
    if actual != stamp['files']:
        raise ValueError('Source changed while building context; retry')

def tool_fingerprint():
    return hashlib.sha256(b''.join((ROOT/'tools/graft'/p).read_bytes() for p in ('Dockerfile', 'package.json', 'package-lock.json'))).hexdigest()

def setup():
    subprocess.run(['docker', 'build', '-t', IMAGE, str(ROOT / 'tools/graft')], check=True)
    image_id = run(['docker', 'image', 'inspect', '--format', '{{.Id}}', IMAGE])
    versions = run(['docker', 'run', '--rm', '--network=none', '--entrypoint', 'node', image_id, '-p',
                    'process.version + " " + require("/opt/graft/node_modules/@nanonets/graft/package.json").version'])
    if versions != 'v22.22.0 0.18.0':
        raise ValueError('Unexpected runtime/package version')
    cache = ROOT / '.graft-context'
    if cache.resolve() != cache.absolute():
        raise ValueError('Cache must not resolve through a symlink')
    cache.mkdir(exist_ok=True)
    (cache/'runtime.json').write_text(json.dumps({'imageId':image_id, 'versions':versions, 'fingerprint':tool_fingerprint()}, indent=2))
    print(versions + ' ' + image_id)

def container(cache, args):
    receipt = ROOT / '.graft-context/runtime.json'
    if not receipt.exists():
        raise ValueError('Run setup in this checkout first')
    runtime = json.loads(receipt.read_text())
    if runtime['fingerprint'] != tool_fingerprint() or runtime['versions'] != 'v22.22.0 0.18.0':
        raise ValueError('Tooling changed; rerun setup')
    return ['docker', 'run', '--rm', '--network=none', '--read-only', '--tmpfs', '/tmp',
            '-e', 'HOME=/tmp', '-e', 'DO_NOT_TRACK=1', '-e', 'GRAFT_NO_SEED=1',
            '-e', 'GRAFT_NO_GITIGNORE=1', '-e', 'GRAFT_NO_IGNORE=1',
            '--mount', f'type=bind,source={cache},target=/context',
            '-w', '/context', runtime['imageId'], *args]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ref', required=True, choices=['dev', 'main'])
    parser.add_argument('action', choices=['setup', 'status', 'build', 'ask', 'callers', 'api', 'remote'])
    parser.add_argument('query', nargs='?')
    args = parser.parse_args()
    config, info = identity(args.ref)
    if args.action == 'setup':
        setup()
        return
    if args.action == 'status':
        print(json.dumps(dict(info, files=inventory(config)), indent=2))
        return
    if args.action == 'remote':
        endpoint = f'repos/{info["repository"]}/git/ref/heads/{args.ref}'
        if args.query:
            if args.query.startswith('/') or '..' in Path(args.query).parts:
                raise ValueError('Expected a repository-relative file path')
            endpoint = f'repos/{info["repository"]}/contents/{quote(args.query, safe="/")}?ref={args.ref}'
        print(run(['gh', 'api', '--method', 'GET', endpoint]))
        return
    if args.action in ('ask', 'callers', 'api') and (not args.query or args.query.startswith('-')):
        raise ValueError('Provide a query or source file path')
    lock_dir = ROOT / '.graft-context'
    if lock_dir.resolve() != lock_dir.absolute():
        raise ValueError('Cache must not resolve through a symlink')
    lock_dir.mkdir(exist_ok=True)
    lock = lock_dir / (args.ref + '.lock')
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        raise ValueError('Context already in use; remove stale lock only after confirming no query is running')
    try:
        os.close(fd)
        execute(args, config, info)
    finally:
        lock.unlink()

def execute(args, config, info):
    cache = snapshot(config, info)
    # Explicit build before every query: no hidden upkeep/init, paid mode or arbitrary CLI args.
    subprocess.run(container(cache, ['build', '/context', '--only-dir', 'source', '--include-dir', 'dist', '--no-gitignore', '--no-ignore']), check=True, stdout=sys.stderr)
    verify_snapshot(config, info, cache)
    commands = {
        'ask': ['ask', args.query, '/context', '--limit', '5', '--source', '--no-refresh'],
        'callers': ['callers', args.query, '/context', '--depth', '1', '--no-refresh'],
        'api': ['skeleton', 'source/' + (args.query or ''), '/context', '--no-refresh'],
    }
    if args.action in commands:
        subprocess.run(container(cache, commands[args.action]), check=True)
    else:
        print(json.dumps(info, indent=2))

if __name__ == '__main__':
    try:
        main()
    except (ValueError, subprocess.CalledProcessError) as exc:
        sys.exit(str(exc))
