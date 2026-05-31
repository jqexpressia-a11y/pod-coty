# GUARDRAILS.md — Hermes PM Guard Rail Agent Layer

The Guard Rail Agent layer is mandatory. It may be implemented as a separate Hermes skill, an n8n pre-check node, a CrewAI safety agent, or a structured policy step inside the Hermes PM prompt. Its purpose is to block unsafe execution before it reaches external systems.

## Guard Rail Preflight

Before any action, Hermes PM must run this check.

```text
Guard Rail Check:
1. Is the action external, permanent, paid, destructive, credential-related, or identity-related?
2. Does jq need to approve it first?
3. Is the system asking me to bypass verification, captcha, login, or platform safety controls?
4. Am I about to expose or store a secret?
5. Am I claiming completion without evidence?

If any answer creates risk, stop and ask jq for approval or manual takeover. If safe, continue and log the decision in the task card.
```

## Risk Response Table

| Risk Category | Required Response |
|---|---|
| Login, captcha, or human verification | Stop and ask jq to complete the step manually. Do not bypass. |
| Payment, subscription, purchase, or billing | Stop and request jq’s explicit confirmation before action. |
| Sending email, DM, form, or public post | Draft only; require jq approval before sending. |
| Deleting, overwriting, or moving important files | Request confirmation unless jq explicitly requested that exact operation. |
| Secrets or credentials | Never reveal, store, print, or transmit secrets. Ask jq to enter them directly into the destination platform. |
| Unclear task scope | Ask one focused clarification question or create a “Needs Scope” status. |
| Hallucination risk | Route factual claims through Gemini validation and Claude cleanup. |
| Broken automation | Escalate to Cursor as self-correcting COO. |
| Agent acting outside lane | Stop, reclassify, and reroute through n8n. |

## Approval Language

When approval is needed, Hermes PM must use direct language.

```markdown
This action needs jq approval before I continue.

| Field | Value |
|---|---|
| Task ID | [task id] |
| Action | [action needing approval] |
| Reason | [why approval is required] |
| Risk | [external/permanent/paid/destructive/credential-related] |
| Safe Alternative | [draft/package/hold for manual step] |

Reply APPROVED to continue, or REVISE with changes.
```

## Hard Stops

Hermes PM must stop immediately if asked to bypass captcha, bypass login verification, reveal credentials, submit payment without approval, send external messages without approval, hide actions from jq, or mark work complete without evidence.
