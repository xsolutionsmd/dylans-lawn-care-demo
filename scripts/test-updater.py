#!/usr/bin/env python3
"""Exercise the real Bash updater in temporary paths with simulated external commands.

Run on Linux: python3 scripts/test-updater.py. No Docker daemon, network or root
access is used. These tests check recovery behavior, not real Oracle health.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile

NEW = "a" * 40
OLD = "b" * 40
IMAGE = "ghcr.io/derek-sykes/dylans-lawn-care-demo@sha256:" + "c" * 64
SOURCE = Path(__file__).resolve().parents[1] / "server/update-release.sh"

STUB = r'''#!/usr/bin/env python3
import json, os, pathlib, shutil, signal, sys
p = pathlib.Path(os.environ["TEST_CASE"])
mode = os.environ["TEST_MODE"]
command, args = pathlib.Path(sys.argv[0]).name, sys.argv[1:]
revision, old = "a" * 40, "b" * 40
image = "ghcr.io/derek-sykes/dylans-lawn-care-demo@sha256:" + "c" * 64
def once(name):
    marker = p / name
    if marker.exists(): return False
    marker.touch()
    return True
if command == "git":
    print(revision + "\trefs/heads/main")
elif command == "sleep":
    pass
elif command == "docker":
    if args[:2] == ["image", "inspect"]:
        fmt = args[-1]
        print("arm64" if "Architecture" in fmt else revision if "revision" in fmt else "https://github.com/Derek-Sykes/dylans-lawn-care-demo")
    elif args[0] == "port":
        print("127.0.0.1:12345")
    elif args[0] == "inspect":
        print("healthy")
    elif args[0] == "compose" and "up" in args:
        envfile = pathlib.Path(args[args.index("--env-file") + 1])
        new = image in envfile.read_text()
        with (p / "up.log").open("a") as f: f.write("new\n" if new else "old\n")
        if new and mode in ("compose_failure", "rollback_failure"): sys.exit(1)
        if not new and mode == "rollback_failure": sys.exit(1)
        if new and mode == "term": os.kill(os.getppid(), signal.SIGTERM)
elif command == "curl":
    url = next(a for a in args if a.startswith("http"))
    if "releases/download" in url:
        body = json.dumps({"revision": revision, "image": image})
        print("200", end="")
    elif "version.json" in url:
        actual = old if mode == "live_failure" and url.startswith("https:") else revision
        body = json.dumps({"revision": actual})
    else:
        body = "<html>company</html>\n"
    if "-D" in args:
        blocked = (mode == "candidate_noindex" and url.startswith("http:")) or (mode == "live_noindex" and url.startswith("https:"))
        headers = "HTTP/1.1 200 OK\nX-Robots-Tag: index, follow\n"
        if blocked: headers += "X-Robots-Tag: noindex, nofollow\n"
        if mode == "candidate_missing_header" and url.startswith("http:"): headers = "HTTP/1.1 200 OK\n"
        pathlib.Path(args[args.index("-D") + 1]).write_text(headers)
    if "-o" in args:
        pathlib.Path(args[args.index("-o") + 1]).write_text(body)
    else:
        print(body, end="")
elif command in ("cp", "mv"):
    src, dst = map(pathlib.Path, args)
    config_write = dst == p / "root/release.env" and src.name == "next.env"
    state_write = dst == p / "state/current.json.new" and src.name == "deployment.json"
    if command == "cp" and ((mode == "config_write_failure" and config_write) or (mode == "state_write_failure" and state_write)) and once("write-failed"):
        sys.exit(1)
    (shutil.copyfile if command == "cp" else shutil.move)(src, dst)
    if command == "mv" and dst == p / "state/current.json" and mode == "term_after_state" and once("term-sent"):
        os.kill(os.getppid(), signal.SIGTERM)
else:
    raise AssertionError((command, args))
'''


def run_case(mode):
    with tempfile.TemporaryDirectory(prefix="dylan-updater-test-") as temp:
        base = Path(temp)
        root, state, bin_dir = (base / name for name in ("root", "state", "bin"))
        for directory in (root, state, bin_dir):
            directory.mkdir()
        previous = {"revision": OLD, "image": "previous-image"}
        (root / "compose.yaml").write_text("previous-compose\n")
        (root / "release.env").write_text("DYLAN_IMAGE=previous-image\n")
        (state / "current.json").write_text(json.dumps(previous))
        template = base / "template.yaml"
        template.write_text("new-compose\n")
        updater = base / "update.sh"
        source = SOURCE.read_text().replace("root=/opt/dylan-demo", f"root={root}")
        source = source.replace("state=/var/lib/dylan-demo-deploy", f"state={state}")
        source = source.replace("/usr/local/share/dylan-demo/compose.yaml", str(template))
        # Only the disposable copy bypasses the root-user gate; all paths and
        # network/Docker commands below are isolated fixtures.
        source = "\n".join(line for line in source.splitlines() if not line.startswith("[[ $EUID == 0 ]]")) + "\n"
        updater.write_text(source)
        stub = bin_dir / "stub"
        stub.write_text(STUB)
        stub.chmod(0o755)
        for command in ("git", "docker", "curl", "sleep", "cp", "mv"):
            (bin_dir / command).symlink_to(stub)
        env = dict(os.environ, TEST_CASE=temp, TEST_MODE=mode)
        env["PATH"] = str(bin_dir) + os.pathsep + env["PATH"]
        result = subprocess.run(["bash", str(updater)], env=env, capture_output=True, text=True, timeout=30)
        if mode == "success":
            assert result.returncode == 0, result.stderr
            assert (root / "compose.yaml").read_text() == "new-compose\n"
            assert IMAGE in (root / "release.env").read_text()
            assert json.loads((state / "current.json").read_text())["revision"] == NEW
            assert (state / "previous-compose.yaml").read_text() == "previous-compose\n"
        else:
            assert result.returncode != 0, (mode, result.stdout, result.stderr)
            assert (root / "compose.yaml").read_text() == "previous-compose\n", mode
            assert (root / "release.env").read_text() == "DYLAN_IMAGE=previous-image\n", mode
            assert json.loads((state / "current.json").read_text()) == previous, mode
            if mode in ("candidate_noindex", "candidate_missing_header"):
                assert not (base / "up.log").exists(), 'Candidate rejection must not touch the running site.'
            else:
                assert (base / "up.log").read_text().endswith("old\n"), mode
            if mode in ("term", "term_after_state"):
                assert result.returncode == 143, (mode, result.returncode)
        recovery = list(state.glob("check.*"))
        if mode == "rollback_failure":
            assert len(recovery) == 1, mode
            assert (recovery[0] / "previous-compose.yaml").is_file()
            assert "recovery files retained" in result.stderr
        else:
            assert not recovery, mode
        print(f"PASS {mode}")


if __name__ == "__main__":
    for case in ("success", "compose_failure", "live_failure", "config_write_failure",
                 "state_write_failure", "term", "term_after_state", "rollback_failure",
                 "candidate_noindex", "candidate_missing_header", "live_noindex"):
        run_case(case)
