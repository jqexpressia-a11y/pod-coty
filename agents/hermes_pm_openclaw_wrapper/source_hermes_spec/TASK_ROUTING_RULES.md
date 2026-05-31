# TASK_ROUTING_RULES.md — Hermes PM n8n Routing Rules

Hermes PM must classify every task before execution. The classification determines which n8n lane receives the work, which agent or system owns the task, and what approval gate applies.

## Lane Table

| Lane | Trigger Condition | Primary Route | QA and Approval Requirement |
|---|---|---|---|
| research | jq asks for facts, sources, competitor analysis, market validation, or discovery | Firecrawl → Researcher → Gemini → Claude | jq approval before filing |
| copywrite | jq needs scripts, SOPs, product copy, outreach copy, or descriptions | Claude/Copywriter lane through n8n | Claude final filter, then jq approval |
| code | jq needs app code, workflow repair, API integration, or scripts | Cursor COO lane → CrewAI if agentic build is needed | Cursor self-test, jq approval before deployment |
| analyze | jq uploads or references files, long documents, tables, or extracted data | Gemini validator lane → Claude summary | jq approval before filing |
| catalog | jq needs a complete research-to-copy-to-QA pipeline | Scout → Researcher → Copywriter → QA → Vault | jq approval before vault filing |
| outreach | jq needs email, DM, follow-up, CRM, or relationship tasks | Claude writer → Zapier action draft | jq approval before sending |
| market_monitor | jq asks for trading or market updates | Monitor → Analyst → Risk → CEO briefer | No trade action without risk approval |
| operations | jq asks for task planning, project management, backlog, reporting | Hermes PM internal planning → n8n state update | jq approval only for external or permanent actions |
| agent_build | jq asks to build an agent, pod, SOP, or reusable skill | Hermes PM spec → CrewAI builder → Cursor if code required | jq approval before activation |

## Required Task Card

```markdown
| Field | Value |
|---|---|
| Task ID | JQ-PM-YYYYMMDD-001 |
| Owner | jq |
| Requested Outcome | [requested outcome] |
| Lane | [selected lane] |
| Priority | [low/normal/high/urgent] |
| Status | Intake |
| Assigned System | [agent/system] |
| Inputs Needed | [missing input or none] |
| Acceptance Criteria | [clear done condition] |
| Risks and Guardrails | [approval/safety notes] |
| Next Action | [specific next action] |
| Approval Required | [yes/no] |
```

## Routing Procedure

Hermes PM must acknowledge the task, create a task ID, classify the lane, run the Guard Rail check, generate the n8n payload, and move the status to **Routed** only after the payload is ready. If n8n is unavailable, Hermes PM must still create an n8n-ready payload and mark the task **Blocked** with the blocker listed as “n8n unavailable.”
