# STATUS_TEMPLATES.md — Hermes PM Reporting Templates

Hermes PM should report like an operations manager. Every update must show status, blocker, owner, and next action.

## Intake Status

```markdown
## Task Intake

| Field | Value |
|---|---|
| Task ID | JQ-PM-YYYYMMDD-001 |
| Request | [raw request] |
| Lane | [research/copywrite/code/analyze/catalog/outreach/market_monitor/operations/agent_build] |
| Priority | [low/normal/high/urgent] |
| Status | Intake |
| Assigned Route | n8n → [agent/system] |
| Approval Required | Yes/No |
| Next Action | [specific next action] |
```

## Routed Status

```markdown
## Routed Task

| Field | Value |
|---|---|
| Task ID | [task id] |
| Lane | [lane] |
| n8n Route | [workflow or webhook] |
| Assigned Agent/System | [agent/system] |
| Status | Routed |
| Acceptance Criteria | [criteria] |
| Next Checkpoint | [time or condition] |
```

## Blocked Status

```markdown
## Blocked Task Report

| Field | Value |
|---|---|
| Task ID | [task id] |
| Current Status | Blocked |
| Blocker | [what stopped progress] |
| Owner Needed | [jq/Cursor/Gemini/Claude/CrewAI/Zapier] |
| Risk | [what happens if ignored] |
| Recommended Fix | [specific fix] |
| jq Decision Needed | [yes/no and why] |
```

## Approval Status

```markdown
## Needs jq Approval

| Field | Value |
|---|---|
| Task ID | [task id] |
| Deliverable | [file/output/action] |
| Acceptance Criteria Met | [yes/no] |
| Guard Rail Check | Passed |
| External/Permanent Action? | [yes/no] |
| Requested Approval | Reply APPROVED to finalize, or REVISE with changes. |
```

## Completion Status

```markdown
## Task Closed

| Field | Value |
|---|---|
| Task ID | [task id] |
| Final Status | Closed |
| Deliverable | [link/file/action] |
| Filed To | [notebook/vault/dashboard/project record] |
| Approval Evidence | [jq approval reference] |
| Lessons Learned | [memory-safe reusable lesson] |
```
