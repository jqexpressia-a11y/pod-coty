# OpenClaw Wrapper Architecture for Hermes PM

**Author:** Manus AI  
**Prepared for:** jq  
**Wrapper target:** OpenClaw workspace package  
**Wrapped agent:** Hermes PM: JQ Traffic Control Project Manager

## Executive Summary

This wrapper converts the existing **Hermes Project Manager Agent** build specification into an **OpenClaw-ready workspace package**. The original Hermes package remains preserved under `source_hermes_spec/`, while the OpenClaw runtime-facing files are placed under `openclaw_workspace/`. This makes the same Project Manager agent usable as a local-first OpenClaw assistant without discarding the Hermes setup path.

OpenClaw’s public documentation describes the runtime as a Gateway-driven assistant that loads workspace bootstrap files such as `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `BOOTSTRAP.md`, `IDENTITY.md`, and `USER.md` into project context at session start.[1] OpenClaw’s skills documentation also confirms that workspace skills can be placed under `<workspace>/skills`, where each skill is a folder containing `SKILL.md` with YAML frontmatter.[2] This wrapper uses those conventions and keeps jq’s required **n8n-first traffic-control rule** as the core behavior.

> **Wrapper principle:** OpenClaw is the interface and local runtime shell. Hermes PM remains the role, n8n remains the nervous system, and jq remains the only final approval authority.

## Package Layout

| Path | Purpose |
|---|---|
| `openclaw_workspace/AGENTS.md` | Primary OpenClaw operating instructions for the wrapped Project Manager agent. |
| `openclaw_workspace/SOUL.md` | Persona and behavioral identity loaded by OpenClaw. |
| `openclaw_workspace/TOOLS.md` | Tool-use notes for n8n, Hermes, MCP, Cursor, Claude, Gemini, CrewAI, Firecrawl, and Zapier. |
| `openclaw_workspace/BOOTSTRAP.md` | First-run verification ritual for the agent. |
| `openclaw_workspace/IDENTITY.md` | Name, mission, and short identity card. |
| `openclaw_workspace/USER.md` | jq owner profile and operating preferences. |
| `openclaw_workspace/skills/jq_traffic_control/SKILL.md` | Workspace skill that enforces task routing, guardrails, and n8n handoff discipline. |
| `openclaw_config/openclaw.hermes-pm.example.json5` | Conservative example config fragment for an OpenClaw agent workspace. |
| `scripts/run_openclaw_pm_turn.sh` | Scripted OpenClaw CLI wrapper for direct turns. |
| `scripts/n8n_call_openclaw_pm.sh` | n8n Execute Command wrapper example. |
| `source_hermes_spec/` | The original Hermes PM build-spec package preserved as the source of truth. |

## Operating Flow

The wrapped agent should receive a request from jq through an OpenClaw channel, CLI turn, or n8n execution. It then creates a task card, classifies the lane, checks guardrails, and prepares or sends an n8n handoff payload. If n8n is unavailable, the agent must create an n8n-ready payload and mark the task as **Blocked** or **Needs jq Approval**, rather than pretending the task was routed.

| Step | OpenClaw Wrapper Behavior | Result |
|---:|---|---|
| 1 | Load workspace bootstrap files. | The PM agent starts with jq’s rules and context. |
| 2 | Receive jq’s request. | The request becomes an intake item, not an untracked chat. |
| 3 | Invoke the jq traffic-control operating pattern. | A task card is created with lane, owner, acceptance criteria, and guardrail notes. |
| 4 | Prepare n8n handoff. | The request is converted into a structured routing payload. |
| 5 | Escalate by lane. | Cursor, Claude, Gemini, CrewAI, Firecrawl, or Zapier is selected as appropriate. |
| 6 | Stop at approval gates. | External, permanent, paid, sensitive, or destructive actions wait for jq. |

## Safety and Approval Model

The wrapper intentionally avoids granting the agent authority to complete sensitive actions independently. OpenClaw can connect to real messaging channels and tools, so the wrapper keeps a strict **Guard Rail Agent layer** active in the instructions. Any action involving payments, account creation, credential changes, publishing, sending external messages, deleting data, bypassing human verification, or filing final records must stop at **Needs jq Approval**.

## References

[1]: https://docs.openclaw.ai/concepts/agent "OpenClaw Agent Runtime"  
[2]: https://docs.openclaw.ai/tools/skills "OpenClaw Skills"  
[3]: https://docs.openclaw.ai/gateway/configuration "OpenClaw Gateway Configuration"  
[4]: https://docs.openclaw.ai/cli/agent "OpenClaw Agent CLI"  
