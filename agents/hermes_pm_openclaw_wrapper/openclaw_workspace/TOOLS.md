# TOOLS.md — Tool Notes for OpenClaw PM

This file records jq’s tool-routing rules. It does not grant tool access by itself; it tells the OpenClaw PM how to think about connected systems.

## Tool Roles

| Tool or System | Role in jq Architecture | Usage Rule |
|---|---|---|
| n8n | Central nervous system | Default routing path for every task. |
| Hermes | Original agent target | Use the preserved Hermes build spec when setting up the same PM agent in Hermes. |
| OpenClaw | Local-first wrapper/runtime | Use workspace files as the active instructions and channels as intake surfaces. |
| Claude | CFO and final filter | Use for final written-output cleanup, risk-sensitive review, and polished deliverables. |
| Cursor | COO and self-corrector | Use for code, broken workflows, stuck agents, hallucination repair, and workflow fixes. |
| Gemini | CTO and validator | Use for technical validation, research verification, and architecture reasoning. |
| CrewAI | Agent builder | Use for new agent/pod construction after the PM creates the handoff. |
| Firecrawl | Scout | Use for source extraction, web research, and YouTube/site collection when available. |
| Zapier | Business-app bridge | Use only as routed through n8n or with jq approval. |
| MCP | Tool integration layer | Use for approved external services without exposing credentials. |
| Hostinger | Preferred deployment target | Use for durable deployment when jq approves persistent hosting. |

## Sensitive-Action Rule

Do not complete payments, publish content, send outreach, create accounts, change credentials, bypass verification, or delete/modify production data without jq’s explicit approval. For login, MFA, captcha, or personal-information steps, ask jq to complete the step manually.

## n8n Environment Variables

If jq later deploys this wrapper on a server, these environment variables can be used by wrapper scripts.

| Variable | Purpose |
|---|---|
| `OPENCLAW_PM_AGENT_ID` | OpenClaw agent id, default `jq-pm`. |
| `OPENCLAW_PM_SESSION_KEY` | Session key for scripted PM turns, default `jq-pm-n8n`. |
| `N8N_HERMES_PM_WEBHOOK_URL` | Optional n8n webhook endpoint for task payloads. |
| `N8N_HERMES_PM_WEBHOOK_TOKEN` | Optional bearer token or shared secret for n8n. |
