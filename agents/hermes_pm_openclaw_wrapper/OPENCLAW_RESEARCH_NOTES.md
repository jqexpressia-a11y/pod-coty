# OpenClaw Wrapper Findings for Hermes PM Agent

## Confirmed sources

1. OpenClaw official website: https://openclaw.ai/
2. OpenClaw GitHub repository: https://github.com/openclaw/openclaw
3. OpenClaw CLI agent docs: https://docs.openclaw.ai/cli/agent
4. OpenClaw getting started docs: https://docs.openclaw.ai/start/getting-started
5. OpenClaw gateway configuration docs: https://docs.openclaw.ai/gateway/configuration
6. OpenClaw skills docs: https://docs.openclaw.ai/tools/skills
7. OpenClaw agent runtime docs: https://docs.openclaw.ai/concepts/agent
8. Awesome OpenClaw Agents repository: https://github.com/mergisi/awesome-openclaw-agents

## Key OpenClaw requirements confirmed

OpenClaw is a local-first personal AI assistant framework that runs through a Gateway and supports multi-channel messaging. It is installed with Node.js and configured with `openclaw onboard --install-daemon`. The default Gateway port is 18789.

OpenClaw uses a workspace directory set through `agents.defaults.workspace`. On first session bootstrap, OpenClaw injects user-editable files from that workspace into the agent's project context. The core bootstrap files are `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `BOOTSTRAP.md`, `IDENTITY.md`, and `USER.md`.

OpenClaw supports a `SOUL.md` persona format. Community agent templates are commonly provided as copy-paste-ready `SOUL.md` files. A practical wrapper should therefore include a `SOUL.md`, `AGENTS.md`, identity files, setup notes, and any local skills needed to make the agent operational.

OpenClaw skills are markdown instruction files with YAML frontmatter and a body. Each skill lives in a directory containing `SKILL.md`. Workspace skills should be placed under `<workspace>/skills`. Agent-specific skill allowlists can be configured in `openclaw.json` using `agents.defaults.skills` or `agents.list[].skills`.

OpenClaw configuration is stored in `~/.openclaw/openclaw.json`, uses JSON5, and is strictly validated. Unknown keys or malformed values can prevent the Gateway from starting, so wrapper config fragments should be conservative and clearly labeled as examples rather than automatically applied.

OpenClaw can run direct turns with `openclaw agent --agent <id> --message <text>`, and the CLI supports JSON output using `--json`. This makes it suitable for n8n command execution wrappers if jq wires OpenClaw onto Hostinger or another persistent host.

## Wrapper design implication

The Hermes PM build spec should be wrapped as a self-contained OpenClaw workspace package, not as a direct modification of OpenClaw internals. The bundle should include:

| Component | Purpose |
|---|---|
| `openclaw_workspace/AGENTS.md` | Primary operating instructions and routing behavior. |
| `openclaw_workspace/SOUL.md` | Agent persona for OpenClaw bootstrap. |
| `openclaw_workspace/TOOLS.md` | Notes on n8n, Hermes, MCP, and approval gates. |
| `openclaw_workspace/IDENTITY.md` | Agent name and mission. |
| `openclaw_workspace/USER.md` | jq owner context. |
| `openclaw_workspace/BOOTSTRAP.md` | One-time first-run verification ritual. |
| `openclaw_workspace/skills/jq_traffic_control/SKILL.md` | Workspace skill that enforces jq traffic-control routing. |
| `openclaw_config/openclaw.hermes-pm.example.json5` | Conservative config fragment for an OpenClaw PM agent workspace. |
| `scripts/run_openclaw_pm_turn.sh` | Local CLI wrapper for scripted/n8n invocation. |
| `scripts/n8n_call_openclaw_pm.sh` | Example n8n Execute Command wrapper. |
| `OPENCLAW_WRAPPER_README.md` | Installation and handoff guide. |

## Safety note

The wrapper must preserve user approval gates for account creation, payments, publishing, personal data, API keys, and destructive actions. It should route tasks through jq Traffic Control and n8n rather than allowing the OpenClaw agent to act independently on sensitive operations.
