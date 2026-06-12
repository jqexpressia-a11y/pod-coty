#!/usr/bin/env python3
"""Pod City bridge: inbox watcher, headless Claude dispatch, artifacts, quality gates."""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from artifact_store import ArtifactStore, utc_now_id

REPO_ROOT = Path(__file__).resolve().parents[2]
CONFIG_EXAMPLE = REPO_ROOT / ".claude" / "pod-bridge.example.json"
CONFIG_LOCAL = REPO_ROOT / ".claude" / "pod-bridge.local.json"
SHARED_SPEC = REPO_ROOT / "ARCHITECTURE_SPECS.md"

REQUIRED_TASK_FIELDS = (
    "task_id",
    "priority",
    "spec_file",
    "spec",
    "acceptance_criteria",
    "files",
)
PRIORITIES = {"high", "med", "low"}

LOG = logging.getLogger("pod-bridge")


def setup_logging(log_file: Path) -> None:
    log_file.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)sZ] %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        handlers=[
            logging.FileHandler(log_file, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


def load_config() -> dict[str, Any]:
    cfg = json.loads(CONFIG_EXAMPLE.read_text(encoding="utf-8"))
    if CONFIG_LOCAL.exists():
        overlay = json.loads(CONFIG_LOCAL.read_text(encoding="utf-8"))
        cfg = deep_merge(cfg, overlay)
    return cfg


def deep_merge(base: dict[str, Any], overlay: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in overlay.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def log(msg: str) -> None:
    LOG.info(msg)


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def wait_until_stable(path: Path, stable_seconds: float = 1.5, timeout: float = 30.0) -> bool:
    deadline = time.time() + timeout
    last_size = -1
    stable_since = None
    while time.time() < deadline:
        if not path.exists():
            time.sleep(0.2)
            continue
        size = path.stat().st_size
        if size == last_size:
            if stable_since is None:
                stable_since = time.time()
            elif time.time() - stable_since >= stable_seconds:
                return True
        else:
            last_size = size
            stable_since = None
        time.sleep(0.2)
    return False


def normalize_task(task: dict[str, Any], source: Path) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    task.setdefault("schema_version", "1.0")
    task.setdefault("title", task.get("task_id", source.stem))
    task.setdefault("status", "queued")
    task.setdefault("created_by", "manus")
    task.setdefault("created_at", now)
    task["updated_at"] = now
    return task


def validate_task(task: dict[str, Any], cfg: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    for field in REQUIRED_TASK_FIELDS:
        if field not in task:
            errors.append(f"missing required field '{field}'")
    priority = str(task.get("priority", "")).lower()
    if priority and priority not in PRIORITIES:
        errors.append(f"invalid priority '{priority}'")
    spec_file = task.get("spec_file")
    if spec_file and not (REPO_ROOT / str(spec_file)).exists():
        errors.append(f"spec_file not found: {spec_file}")
    elif cfg.get("shared_spec_file") and not (REPO_ROOT / cfg["shared_spec_file"]).exists():
        errors.append(f"shared spec missing: {cfg['shared_spec_file']}")
    return errors


def discover_tasks(inbox: Path) -> list[Path]:
    return sorted(inbox.glob("*.json"), key=lambda p: p.stat().st_mtime)


def move_task(src: Path, dest_dir: Path) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / src.name
    if dest.exists():
        dest.unlink()
    shutil.move(str(src), str(dest))
    return dest


def build_claude_command(cfg: dict[str, Any], task_path: Path, branch: str, task: dict[str, Any]) -> list[str]:
    claude_cfg = cfg.get("claude", {})
    command = claude_cfg.get("command", cfg.get("claude_command", "claude"))
    template = claude_cfg.get(
        "prompt_template",
        cfg.get(
            "prompt_template",
            'Read ARCHITECTURE_SPECS.md and implement the task defined in {task_path}. '
            "Return machine-readable JSON describing success, changed_files, tests, "
            "review_requirements, infrastructure_requirements, git_handoff, and notes.",
        ),
    )
    prompt = (
        template.replace("{task_path}", task_path.as_posix())
        .replace("{branch}", branch)
        .replace("{task_id}", str(task.get("task_id", "")))
        .replace("{title}", str(task.get("title", "")))
    )
    args = [
        command,
        claude_cfg.get("headless_flag", "-p"),
        prompt,
        "--allowedTools",
        claude_cfg.get("allowed_tools", "Bash,Read,Edit"),
        "--max-turns",
        str(claude_cfg.get("max_turns", 10)),
    ]
    output_format = claude_cfg.get("output_format")
    if output_format:
        args.extend(["--output-format", str(output_format)])
    if claude_cfg.get("dangerously_skip_permissions"):
        args.append("--dangerously-skip-permissions")
    return args


def parse_execution_output(stdout: str, stderr: str, exit_code: int) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "success": exit_code == 0,
        "exit_code": exit_code,
        "changed_files": [],
        "tests": [],
        "review_requirements": [],
        "infrastructure_requirements": [],
        "git_handoff": {"status": "not_run"},
        "notes": "",
    }
    text = stdout.strip()
    if text:
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                payload.update(parsed)
                payload["success"] = bool(parsed.get("success", exit_code == 0))
        except json.JSONDecodeError:
            payload["notes"] = text[:4000]
    if stderr.strip():
        payload["stderr_excerpt"] = stderr.strip()[:2000]
    return payload


def env_has_api_key() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY", "").strip())


def run_greptile(cfg: dict[str, Any], artifacts: ArtifactStore) -> dict[str, Any]:
    gate = cfg.get("quality_gates", {}).get("greptile", {})
    result: dict[str, Any] = {
        "available": False,
        "passed": False,
        "confidence": None,
        "command": gate.get("command", "greptile"),
        "notes": "Greptile CLI not available",
    }
    command = gate.get("command", "greptile")
    if not shutil.which(command):
        artifacts.write_json("greptile.json", result)
        return result
    result["available"] = True
    proc = subprocess.run(
        [command, "review", "--path", "."],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    combined = (proc.stdout or "") + "\n" + (proc.stderr or "")
    match = re.search(r"(\d)\s*/\s*5", combined)
    confidence = int(match.group(1)) if match else None
    result.update(
        {
            "exit_code": proc.returncode,
            "confidence": confidence,
            "passed": confidence is not None and confidence >= 5 and proc.returncode == 0,
            "stdout_excerpt": (proc.stdout or "")[:4000],
            "stderr_excerpt": (proc.stderr or "")[:2000],
        }
    )
    artifacts.write_json("greptile.json", result)
    artifacts.write_text("greptile.raw.txt", combined[:8000])
    return result


def git_handoff(cfg: dict[str, Any], task: dict[str, Any], artifacts: ArtifactStore, dry_run: bool) -> dict[str, Any]:
    handoff_cfg = cfg.get("git_handoff", {})
    result: dict[str, Any] = {
        "enabled": bool(handoff_cfg.get("enabled")),
        "dry_run": dry_run,
        "status": "skipped",
        "commands": [],
    }
    if not handoff_cfg.get("enabled"):
        artifacts.write_json("git-handoff.json", result)
        return result

    branch = task.get("branch") or f"{handoff_cfg.get('default_branch_prefix', 'claude/')}{task['task_id']}"
    remote = handoff_cfg.get("remote", "origin")
    allow_main = bool(handoff_cfg.get("allow_main_branch_push"))
    if branch == "main" and not allow_main:
        result["status"] = "blocked"
        result["error"] = "push to main is disabled"
        artifacts.write_json("git-handoff.json", result)
        return result

    exclude = set(handoff_cfg.get("exclude_paths", []))
    allowed = task.get("files") or task.get("allowed_paths") or []
    add_paths = [p for p in allowed if p and not any(p.startswith(x.rstrip("/")) for x in exclude)]

    status = subprocess.run(["git", "status", "--short"], cwd=REPO_ROOT, capture_output=True, text=True, check=False)
    result["status_before"] = status.stdout
    commands = [["git", "add", *add_paths]] if add_paths else [["git", "add", "-A"]]
    msg = handoff_cfg.get("commit_message_template", "claude: implement {task_id} {title}").format(
        task_id=task["task_id"], title=task.get("title", task["task_id"])
    )
    commands.append(["git", "commit", "-m", msg])
    if handoff_cfg.get("push_after_commit"):
        commands.append(["git", "push", remote, branch])
    result["commands"] = [" ".join(cmd) for cmd in commands]

    if dry_run:
        result["status"] = "dry_run"
        artifacts.write_json("git-handoff.json", result)
        return result

    for cmd in commands:
        proc = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True, check=False)
        if proc.returncode != 0:
            result["status"] = "failed"
            result["error"] = (proc.stderr or proc.stdout or "").strip()[:2000]
            artifacts.write_json("git-handoff.json", result)
            return result

    sha = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO_ROOT, capture_output=True, text=True, check=False)
    result["status"] = "success"
    result["commit"] = sha.stdout.strip() if sha.returncode == 0 else None
    result["branch"] = branch
    result["remote"] = remote
    artifacts.write_json("git-handoff.json", result)
    return result


def verify_deployment(cfg: dict[str, Any], git_result: dict[str, Any], artifacts: ArtifactStore) -> dict[str, Any]:
    verify_cfg = cfg.get("deployment_verification", {})
    result: dict[str, Any] = {
        "deployment_trigger_verified": False,
        "target": verify_cfg.get("target", "kvm"),
        "method": verify_cfg.get("method", "manual_or_configured_command"),
        "status": "skipped",
    }
    if git_result.get("status") != "success":
        result["status"] = "not_applicable"
        artifacts.write_json("deployment-trigger.json", result)
        return result

    status_command = (verify_cfg.get("status_command") or "").strip()
    if status_command:
        proc = subprocess.run(status_command, cwd=REPO_ROOT, shell=True, capture_output=True, text=True, check=False)
        result["status"] = "verified" if proc.returncode == 0 else "failed"
        result["deployment_trigger_verified"] = proc.returncode == 0
        result["stdout_excerpt"] = (proc.stdout or "")[:2000]
        result["stderr_excerpt"] = (proc.stderr or "")[:2000]
    else:
        workflows = list((REPO_ROOT / ".github" / "workflows").glob("*.yml")) + list(
            (REPO_ROOT / ".github" / "workflows").glob("*.yaml")
        )
        result["workflows_discovered"] = [p.name for p in workflows]
        result["status"] = "unverified"
        result["notes"] = "No deployment verification command configured and trigger not confirmed."

    result["commit"] = git_result.get("commit")
    result["branch"] = git_result.get("branch")
    artifacts.write_json("deployment-trigger.json", result)
    return result


def finalize_task(
    task: dict[str, Any],
    active_path: Path,
    archive_dir: Path,
    failed_dir: Path,
    success: bool,
    artifacts_ref: dict[str, Any],
    extra: dict[str, Any],
) -> Path:
    task["updated_at"] = datetime.now(timezone.utc).isoformat()
    task["status"] = "completed" if success else "failed"
    task["result"] = {
        "status": "completed" if success else "failed",
        "summary": extra.get("summary", ""),
        "artifacts": artifacts_ref,
        **{k: v for k, v in extra.items() if k != "summary"},
    }
    target_dir = archive_dir if success else failed_dir
    target_dir.mkdir(parents=True, exist_ok=True)
    stamp = utc_now_id()
    dest = target_dir / f"{task['task_id']}.{stamp}.json"
    write_json(dest, task)
    if active_path.exists():
        active_path.unlink()
    return dest


def process_task(task_path: Path, cfg: dict[str, Any], dry_run: bool) -> None:
    inbox = REPO_ROOT / "pods" / "inbox"
    active_dir = REPO_ROOT / cfg.get("active_dir", "pods/active")
    archive_dir = REPO_ROOT / cfg.get("archive_dir", "pods/archive")
    failed_dir = REPO_ROOT / cfg.get("failed_dir", "pods/failed")

    if not wait_until_stable(task_path):
        log(f"task file not stable: {task_path}")
        return

    task = normalize_task(read_json(task_path), task_path)
    errors = validate_task(task, cfg)
    if errors:
        artifacts = ArtifactStore(REPO_ROOT, task.get("task_id", task_path.stem))
        artifacts.write_json("validation.json", {"errors": errors})
        ref = artifacts.finalize({"success": False, "stage": "validation"})
        task["status"] = "failed"
        task["result"] = {"status": "failed", "error": "; ".join(errors), "artifacts": ref}
        dest = failed_dir / f"{task.get('task_id', 'invalid')}.{utc_now_id()}.json"
        failed_dir.mkdir(parents=True, exist_ok=True)
        write_json(dest, task)
        task_path.unlink(missing_ok=True)
        log(f"invalid task moved to {dest}")
        return

    task_id = str(task["task_id"])
    branch = task.get("branch") or f"{cfg.get('default_branch_prefix', 'claude/')}{task_id}"
    artifacts = ArtifactStore(REPO_ROOT, task_id)
    artifacts.write_json("task.snapshot.json", task)

    if dry_run:
        cmd = build_claude_command(cfg, active_dir / task_path.name, branch, task)
        artifacts.write_json(
            "dry-run.json",
            {"command": cmd, "branch": branch, "env_has_api_key": env_has_api_key()},
        )
        ref = artifacts.finalize({"success": True, "stage": "dry_run"})
        log(f"dry run for {task_id}; artifacts at {ref['root']}")
        return

    active_path = move_task(task_path, active_dir)
    task["status"] = "active"
    write_json(active_path, task)
    log(f"claimed {task_id} -> {active_path}")

    if not env_has_api_key():
        ref = artifacts.finalize({"success": False, "stage": "precheck"})
        finalize_task(
            task,
            active_path,
            archive_dir,
            failed_dir,
            False,
            ref,
            {"summary": "ANTHROPIC_API_KEY missing", "error": "ANTHROPIC_API_KEY missing"},
        )
        return

    cmd = build_claude_command(cfg, active_path, branch, task)
    artifacts.write_json("claude.command.json", {"argv": cmd})
    proc = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True, check=False)
    artifacts.write_text("claude.stdout.txt", proc.stdout or "")
    artifacts.write_text("claude.stderr.txt", proc.stderr or "")
    execution = parse_execution_output(proc.stdout or "", proc.stderr or "", proc.returncode)
    artifacts.write_json("execution.result.json", execution)

    greptile = run_greptile(cfg, artifacts)
    greptile_required = cfg.get("quality_gates", {}).get("greptile", {}).get("enabled", False)
    bypass = cfg.get("quality_gates", {}).get("greptile", {}).get("allow_local_bypass", False)
    greptile_ok = greptile.get("passed") or (not greptile_required and (greptile.get("available") or bypass))

    git_result = git_handoff(cfg, task, artifacts, dry_run=False)
    git_required = cfg.get("git_handoff", {}).get("enabled", False)
    git_ok = git_result.get("status") in {"success", "skipped", "dry_run"} or not git_required

    deploy_result = verify_deployment(cfg, git_result, artifacts)
    deploy_required = cfg.get("deployment_verification", {}).get("required_after_push", False)
    deploy_ok = deploy_result.get("deployment_trigger_verified") or not deploy_required or git_result.get("status") != "success"

    success = bool(execution.get("success")) and greptile_ok and git_ok and deploy_ok
    summary = (
        f"execution={'ok' if execution.get('success') else 'fail'}; "
        f"greptile={'ok' if greptile_ok else 'fail'}; "
        f"git={'ok' if git_ok else 'fail'}; "
        f"deploy={'ok' if deploy_ok else 'unverified'}"
    )
    ref = artifacts.finalize(
        {
            "success": success,
            "task_id": task_id,
            "summary": summary,
            "confidence": greptile.get("confidence"),
        }
    )
    dest = finalize_task(
        task,
        active_path,
        archive_dir,
        failed_dir,
        success,
        ref,
        {
            "summary": summary,
            "branch": branch,
            "commit": git_result.get("commit"),
            "deployment_trigger_verified": deploy_result.get("deployment_trigger_verified", False),
            "greptile": greptile,
        },
    )
    log(f"task {task_id} finished success={success}; archived to {dest}; artifacts={ref['root']}")


def poll_inbox(cfg: dict[str, Any], dry_run: bool, once: bool) -> None:
    inbox = REPO_ROOT / "pods" / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    interval = float(cfg.get("poll_interval_seconds", 2.0))
    max_tasks = int(cfg.get("max_tasks_per_run", 1))

    while True:
        tasks = discover_tasks(inbox)[:max_tasks]
        if not tasks:
            if once:
                log("no queued tasks")
                return
        for task_path in tasks:
            process_task(task_path, cfg, dry_run)
        if once:
            return
        time.sleep(interval)


def watch_inbox(cfg: dict[str, Any], dry_run: bool, once: bool) -> None:
    try:
        from watchdog.events import FileSystemEventHandler
        from watchdog.observers import Observer
    except ImportError:
        log("watchdog not installed; using polling fallback")
        poll_inbox(cfg, dry_run, once)
        return

    inbox = REPO_ROOT / "pods" / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    pending: dict[str, float] = {}

    class Handler(FileSystemEventHandler):
        def on_created(self, event):  # type: ignore[no-untyped-def]
            if event.is_directory:
                return
            if event.src_path.endswith(".json"):
                pending[event.src_path] = time.time()

        def on_modified(self, event):  # type: ignore[no-untyped-def]
            if event.is_directory:
                return
            if event.src_path.endswith(".json"):
                pending[event.src_path] = time.time()

    observer = Observer()
    handler = Handler()
    observer.schedule(handler, str(inbox), recursive=False)
    observer.start()
    log(f"watching {inbox}")
    try:
        while True:
            for src, seen_at in list(pending.items()):
                path = Path(src)
                if not path.exists():
                    pending.pop(src, None)
                    continue
                if time.time() - seen_at < 1.5:
                    continue
                if wait_until_stable(path):
                    pending.pop(src, None)
                    process_task(path, cfg, dry_run)
                    if once:
                        observer.stop()
                        observer.join()
                        return
            time.sleep(0.5)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


def main() -> int:
    parser = argparse.ArgumentParser(description="Pod City bridge with artifact capture")
    parser.add_argument("--dry-run", action="store_true", help="Plan only; do not dispatch")
    parser.add_argument("--once", action="store_true", help="Process one batch then exit")
    parser.add_argument("--poll", action="store_true", help="Force polling instead of watchdog")
    args = parser.parse_args()

    cfg = load_config()
    log_path = REPO_ROOT / cfg.get("log_file", ".claude/logs/pod-bridge.log")
    setup_logging(log_path)

    enabled = bool(cfg.get("enabled")) or os.environ.get("POD_BRIDGE_ENABLED", "").lower() in {"1", "true", "yes"}
    dry_run = args.dry_run or bool(cfg.get("dry_run_default", True))
    if not enabled and not args.once and not args.dry_run:
        log("bridge disabled; set enabled=true in pod-bridge.local.json or POD_BRIDGE_ENABLED=1")
        return 0

    if args.poll:
        poll_inbox(cfg, dry_run, args.once)
    else:
        watch_inbox(cfg, dry_run, args.once)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
