"""Durable artifact bundles for Pod City bridge and greploop runs."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def utc_now_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


class ArtifactStore:
    """Write inspectable run artifacts under .claude/artifacts/."""

    def __init__(self, repo_root: Path, namespace: str, run_id: str | None = None) -> None:
        self.repo_root = repo_root.resolve()
        self.namespace = _safe_segment(namespace)
        self.run_id = run_id or utc_now_id()
        self.root = self.repo_root / ".claude" / "artifacts" / self.namespace / self.run_id
        self.root.mkdir(parents=True, exist_ok=True)
        self._manifest: dict[str, Any] = {
            "schema_version": "1.0",
            "namespace": self.namespace,
            "run_id": self.run_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "artifacts": [],
        }

    @property
    def relative_root(self) -> str:
        return self.root.relative_to(self.repo_root).as_posix()

    def write_json(self, name: str, payload: Any) -> Path:
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        self._register(name, "json", path)
        return path

    def write_text(self, name: str, content: str) -> Path:
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        self._register(name, "text", path)
        return path

    def write_markdown(self, name: str, content: str) -> Path:
        if not name.endswith(".md"):
            name = f"{name}.md"
        return self.write_text(name, content)

    def attach_file(self, name: str, source: Path, kind: str = "copy") -> Path:
        dest = self.root / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        if source.resolve() != dest.resolve():
            dest.write_bytes(source.read_bytes())
        self._register(name, kind, dest)
        return dest

    def finalize(self, summary: dict[str, Any] | None = None) -> dict[str, Any]:
        if summary:
            self._manifest["summary"] = summary
        self._manifest["completed_at"] = datetime.now(timezone.utc).isoformat()
        manifest_path = self.root / "manifest.json"
        manifest_path.write_text(json.dumps(self._manifest, indent=2), encoding="utf-8")
        return {
            "run_id": self.run_id,
            "root": self.relative_root,
            "manifest": f"{self.relative_root}/manifest.json",
            "files": [entry["path"] for entry in self._manifest["artifacts"]],
        }

    def as_result_ref(self, summary: dict[str, Any] | None = None) -> dict[str, Any]:
        return self.finalize(summary)

    def _register(self, name: str, kind: str, path: Path) -> None:
        rel = path.relative_to(self.repo_root).as_posix()
        self._manifest["artifacts"].append(
            {"name": name, "kind": kind, "path": rel, "bytes": path.stat().st_size}
        )


def greploop_namespace(pr_number: int | str) -> str:
    return f"greploop/pr-{pr_number}"


def _safe_segment(value: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in "._-" else "-" for ch in value.strip())
    return cleaned.strip("-") or "run"
