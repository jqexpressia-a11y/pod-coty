# README — Hermes PM Agent Build Package

This package contains the ready-to-use build spec for **Hermes PM: JQ Traffic Control Project Manager**. The package is designed for jq’s automated-business operating model, where every task is routed through **n8n** and final actions require jq approval.

## Package Contents

| File | Purpose |
|---|---|
| `hermes_project_manager_agent_master_trading_sop.md` | Complete master build spec and SOP for the Project Manager agent. |
| `SOUL.md` | Primary Hermes persona and system instruction file. |
| `PROJECT_CONTEXT.md` | jq’s automation architecture and memory-safe operating context. |
| `TASK_ROUTING_RULES.md` | Lane definitions and n8n routing behavior. |
| `GUARDRAILS.md` | Guard Rail Agent rules and approval gates. |
| `N8N_WEBHOOK_SCHEMA.json` | Payload schema for sending tasks from Hermes PM to n8n. |
| `STATUS_TEMPLATES.md` | Intake, routed, blocked, approval, and completion report templates. |
| `ACCEPTANCE_TESTS.md` | Validation prompts and pass/fail criteria for the finished agent. |

## Recommended Setup Flow

First, jq should create or log into the Nous Portal/Hermes account from a regular browser because the automated browser encountered a human-verification checkpoint. The agent should not attempt to bypass that checkpoint.

After Hermes is available, create a Hermes project directory and copy these files into it. Start with `SOUL.md`, `PROJECT_CONTEXT.md`, `TASK_ROUTING_RULES.md`, and `GUARDRAILS.md`. Then connect the agent to n8n using the `N8N_WEBHOOK_SCHEMA.json` payload format.

| Step | Action | Success Check |
|---|---|---|
| 1 | Install or open Hermes Agent. | Hermes can respond in CLI or portal. |
| 2 | Add `SOUL.md` as the primary persona/system context. | Hermes confirms it is jq’s Project Manager agent. |
| 3 | Add `PROJECT_CONTEXT.md` and `TASK_ROUTING_RULES.md`. | Hermes classifies test tasks into lanes. |
| 4 | Add `GUARDRAILS.md`. | Hermes blocks captcha, payment, send, and credential actions. |
| 5 | Connect n8n webhook using `N8N_WEBHOOK_SCHEMA.json`. | A test task reaches n8n and returns a status. |
| 6 | Run `ACCEPTANCE_TESTS.md`. | All required pass criteria are met. |

## First Calibration Prompt

Send this to Hermes PM after setup.

```text
You are my Project Manager agent. Your job is to run traffic control for my automated businesses. Every task goes through n8n. You create task IDs, classify work, route it to the correct lane, watch for completion, enforce guardrails, escalate stuck work to Cursor, validate research through Gemini, clean final outputs through Claude, and wait for my approval before anything final. Confirm your operating rules and ask me for the first task.
```

## Minimum Viable n8n Workflow

The first n8n workflow should be simple. Use a Webhook node to receive the payload, a Set node to normalize fields, a Switch node to classify by `lane`, and a response node to return the task status to Hermes PM. After the basic route works, add CrewAI, Cursor, Gemini, Claude, Firecrawl, and Zapier lanes one at a time.

## Important Safety Note

Do not place passwords, API keys, recovery codes, private tokens, or payment information inside the Hermes prompt, memory, or context files. jq should enter secrets directly into the proper platform secret manager or environment variable store.
