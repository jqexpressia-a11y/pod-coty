---
name: jq-traffic-control
description: Enforce jq's n8n-first project-management routing, task-card creation, guardrail checks, and agent-lane handoffs.
user-invocable: true
---

# jq Traffic Control Skill

Use this skill whenever jq gives a request, project, automation idea, agent build, research task, outreach task, code task, trading task, content task, or operational command.

## Required Behavior

The agent must act as traffic control. It must not skip directly into execution unless execution is safe, local, non-sensitive, and already routed or structured for routing. The default behavior is to create a task card, classify the lane, check guardrails, and prepare the n8n handoff.

## Task Card Template

```markdown
| Field | Value |
|---|---|
| Task ID | JQ-PM-YYYYMMDD-HHMM-shortslug |
| Owner | jq |
| Requested outcome |  |
| Lane |  |
| Priority | Normal |
| Status | Intake |
| Assigned system/agent | n8n |
| Inputs needed |  |
| Acceptance criteria |  |
| Risks/guardrails |  |
| Next action |  |
| Approval required |  |
```

## Lane Selection

Use exactly one primary lane unless jq asks for a multi-lane project. Supported lanes are `research`, `copywrite`, `code`, `analyze`, `catalog`, `outreach`, `market_monitor`, `operations`, `agent_build`, and `guardrail`.

## Approval Stops

Stop and ask jq for approval before publishing, sending outreach, filing final records, purchasing, subscribing, making payment, deleting, changing production systems, changing credentials, creating accounts, bypassing verification, entering private personal data, or exposing secrets.

## Escalation Rules

Escalate broken code, workflow failure, hallucination, and stuck-agent problems to Cursor. Escalate research and technical validation to Gemini. Escalate final wording, risk-sensitive documents, and CFO-style cleanup to Claude. Escalate new agent/pod construction to CrewAI. Route app actions to Zapier only through n8n unless jq explicitly approves another path.
