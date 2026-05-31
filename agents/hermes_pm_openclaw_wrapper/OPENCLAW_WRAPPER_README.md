# OpenClaw Wrapper README — Hermes PM for jq Traffic Control

**Author:** Manus AI  
**Prepared for:** jq  
**Purpose:** Install or paste the Hermes Project Manager agent into an OpenClaw-compatible workspace wrapper.

## What This Package Is

This package wraps the earlier **Hermes Project Manager Agent build spec** in an **OpenClaw workspace structure**. The Hermes source files are preserved in `source_hermes_spec/`. The OpenClaw-facing workspace files are in `openclaw_workspace/`, including `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `BOOTSTRAP.md`, and a local `jq-traffic-control` skill.

OpenClaw’s agent runtime loads workspace bootstrap files such as `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `BOOTSTRAP.md`, `IDENTITY.md`, and `USER.md` into project context at session start.[1] OpenClaw skills use a `SKILL.md` file inside a skill directory, and workspace skills can live under `<workspace>/skills`.[2] This wrapper follows those conventions.

## Fast Install Path

First install and onboard OpenClaw using the official setup path from the OpenClaw documentation.[3]

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
openclaw gateway status
```

Then copy this wrapper to the target machine. On Hostinger or any Linux VPS, a practical path is:

```bash
mkdir -p ~/openclaw-jq-pm
cp -R openclaw_workspace ~/openclaw-jq-pm/openclaw_workspace
```

After onboarding, merge the relevant parts of `openclaw_config/openclaw.hermes-pm.example.json5` into `~/.openclaw/openclaw.json`. Because OpenClaw validates configuration strictly, do not paste unknown fields blindly. Restart or reload the Gateway after the config is accepted.

```bash
openclaw doctor
openclaw gateway restart
openclaw agent --agent jq-pm --message "Bootstrap jq traffic control" --thinking high
```

## n8n Wrapper Usage

The `scripts/` folder includes a direct CLI wrapper and an n8n Execute Command wrapper. After OpenClaw is installed and the `jq-pm` agent is configured, make scripts executable.

```bash
chmod +x scripts/*.sh
./scripts/run_openclaw_pm_turn.sh "Create a task card for setting up the next automation pod."
```

In n8n, use an **Execute Command** node to call:

```bash
/path/to/hermes_pm_openclaw_wrapper/scripts/n8n_call_openclaw_pm.sh "{{$json.task_message}}"
```

## Required Guardrails

The wrapped agent must not complete account creation, login, captcha, payment, publishing, outreach sending, credential changes, file deletion, or production modification without jq approval. It should create task cards and n8n payloads, then stop at **Needs jq Approval** when an action is sensitive.

## File Map

| File or Folder | Use |
|---|---|
| `openclaw_workspace/` | Copy this into the OpenClaw workspace path. |
| `openclaw_workspace/skills/jq_traffic_control/SKILL.md` | Local OpenClaw skill enforcing jq traffic-control behavior. |
| `openclaw_config/openclaw.hermes-pm.example.json5` | Example config fragment for the `jq-pm` agent. |
| `scripts/run_openclaw_pm_turn.sh` | Direct OpenClaw CLI wrapper. |
| `scripts/n8n_call_openclaw_pm.sh` | n8n command wrapper. |
| `source_hermes_spec/` | Original Hermes PM package preserved as source material. |
| `OPENCLAW_WRAPPER_ARCHITECTURE.md` | Architecture explanation and reasoning. |
| `OPENCLAW_RESEARCH_NOTES.md` | Notes from OpenClaw documentation review. |

## Acceptance Test

After installation, send this test prompt:

```text
Build me a new research pod for one of my automated businesses.
```

The correct response should create a task card, classify the lane as `agent_build` or `research`, route through n8n or prepare an n8n-ready payload, identify CrewAI/Firecrawl/Gemini/Claude roles, and stop before deployment or external actions until jq approves.

## References

[1]: https://docs.openclaw.ai/concepts/agent "OpenClaw Agent Runtime"  
[2]: https://docs.openclaw.ai/tools/skills "OpenClaw Skills"  
[3]: https://docs.openclaw.ai/start/getting-started "OpenClaw Getting Started"  
[4]: https://docs.openclaw.ai/cli/agent "OpenClaw Agent CLI"
