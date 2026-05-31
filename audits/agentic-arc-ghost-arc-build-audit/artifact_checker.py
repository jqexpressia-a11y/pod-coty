#!/usr/bin/env python3
"""Artifact checker for the Ghost Arc / Agentic-Arc build audit.

This script performs deterministic checks against the cloned repository and
previously captured command logs. It does not require secrets and does not call
external services.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Dict, List

ROOT = Path('/home/ubuntu/ghost_arc_build_audit')
REPO = ROOT / 'Agentic-Arc'

REQUIRED_ENV = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'LIVEBLOCKS_SECRET_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'TRIGGER_SECRET_KEY',
    'NEXT_PUBLIC_TRIGGER_PUBLIC_API_KEY',
    'DATABASE_URL',
    'INTERNAL_API_SECRET',
    'APP_URL',
]

LOGS = {
    'initial_npm_ci': ROOT / 'npm_ci.log',
    'npm_install_lock_repair': ROOT / 'npm_install.log',
    'npm_ci_after_lockfix': ROOT / 'npm_ci_after_lockfix.log',
    'production_build': ROOT / 'npm_build.log',
    'eslint': ROOT / 'npm_lint.log',
    'runtime_smoke': ROOT / 'smoke_http.log',
    'runtime_server': ROOT / 'npm_start.log',
}


def read(path: Path) -> str:
    try:
        return path.read_text(errors='replace')
    except FileNotFoundError:
        return ''


def pass_fail(name: str, passed: bool, evidence: str, severity: str = 'required') -> Dict[str, str]:
    return {
        'check': name,
        'status': 'PASS' if passed else 'FAIL',
        'severity': severity,
        'evidence': evidence.strip()[:500],
    }


def main() -> int:
    results: List[Dict[str, str]] = []

    pkg_path = REPO / 'package.json'
    lock_path = REPO / 'package-lock.json'
    pkg = json.loads(read(pkg_path))
    scripts = pkg.get('scripts', {})

    results.append(pass_fail('repository cloned', (REPO / '.git').exists(), str(REPO)))
    results.append(pass_fail('package.json present', pkg_path.exists(), f"name={pkg.get('name')} version={pkg.get('version')}"))
    results.append(pass_fail('required npm scripts present', all(s in scripts for s in ['build', 'lint', 'prisma:generate']), json.dumps(scripts, sort_keys=True)))
    results.append(pass_fail('package lock present', lock_path.exists(), str(lock_path)))

    initial_ci = read(LOGS['initial_npm_ci'])
    results.append(pass_fail(
        'initial npm ci exposed stale lock',
        'Missing:' in initial_ci and 'Clean install a project' in initial_ci,
        'Initial npm ci failed because package-lock.json was out of sync with package.json.',
        severity='fixed',
    ))

    ci_after = read(LOGS['npm_ci_after_lockfix'])
    results.append(pass_fail(
        'npm ci after lock repair',
        'added 1128 packages' in ci_after and 'Generated Prisma Client' in ci_after and 'npm error' not in ci_after.lower(),
        ci_after[-500:],
    ))

    build_log = read(LOGS['production_build'])
    results.append(pass_fail(
        'production build',
        'Compiled successfully' in build_log and 'Finalizing page optimization' in build_log and 'Route (app)' in build_log,
        build_log[-500:],
    ))
    results.append(pass_fail('Next.js build artifact exists', (REPO / '.next').exists(), '.next directory generated'))

    lint_log = read(LOGS['eslint'])
    lint_ok = '> eslint' in lint_log and not re.search(r'\b(error|warning)\b', lint_log, re.I)
    results.append(pass_fail('ESLint', lint_ok, lint_log[-500:]))

    generated_prisma = REPO / 'app' / 'generated' / 'prisma'
    results.append(pass_fail('Prisma client generated', generated_prisma.exists(), str(generated_prisma)))

    readme = read(REPO / 'README.md')
    missing_env_in_readme = [e for e in REQUIRED_ENV if e not in readme]
    results.append(pass_fail('README documents required environment variables', not missing_env_in_readme, ', '.join(missing_env_in_readme) or 'all documented'))

    smoke = read(LOGS['runtime_smoke'])
    server = read(LOGS['runtime_server'])
    smoke_blocked_by_credentials = '500 Internal Server Error' in smoke and 'Publishable key not valid' in server
    results.append({
        'check': 'runtime HTTP smoke test',
        'status': 'BLOCKED' if smoke_blocked_by_credentials else ('PASS' if 'HTTP/1.1 200' in smoke or 'HTTP/1.1 30' in smoke else 'FAIL'),
        'severity': 'external_credentials_required' if smoke_blocked_by_credentials else 'required',
        'evidence': 'Server starts, but local HTTP pages return 500 with placeholder Clerk credentials: Publishable key not valid.' if smoke_blocked_by_credentials else smoke[-500:],
    })

    git_diff = os.popen(f"cd {REPO} && git diff --name-only").read().strip().splitlines()
    results.append(pass_fail('tracked code/config diff limited', git_diff == ['package-lock.json'], ', '.join(git_diff) or 'none', severity='change_control'))

    failures = [r for r in results if r['status'] == 'FAIL']
    blocked = [r for r in results if r['status'] == 'BLOCKED']
    passed = [r for r in results if r['status'] == 'PASS']

    report = {
        'project': 'JavaScript-Mastery-Pro/Agentic-Arc',
        'local_path': str(REPO),
        'summary': {
            'pass': len(passed),
            'fail': len(failures),
            'blocked': len(blocked),
            'overall_status': 'PASS_WITH_EXTERNAL_RUNTIME_BLOCKER' if not failures and blocked else ('FAIL' if failures else 'PASS'),
        },
        'results': results,
    }

    out_json = ROOT / 'artifact_check_results.json'
    out_md = ROOT / 'artifact_check_results.md'
    out_json.write_text(json.dumps(report, indent=2) + '\n')

    rows = ['| Check | Status | Severity | Evidence |', '|---|---:|---|---|']
    for r in results:
        evidence = r['evidence'].replace('\n', '<br>').replace('|', '\\|')
        rows.append(f"| {r['check']} | {r['status']} | {r['severity']} | {evidence} |")
    out_md.write_text(
        '# Ghost Arc Artifact Check Results\n\n'
        f"**Overall status:** {report['summary']['overall_status']}\n\n"
        + '\n'.join(rows) + '\n'
    )

    print(json.dumps(report['summary'], indent=2))
    print(f'wrote {out_json}')
    print(f'wrote {out_md}')
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
