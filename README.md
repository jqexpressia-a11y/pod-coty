# Pod City

Ghost AI prompt optimizer docs and agent skills for the Pod City / Pod Coty project.

## Greploop

Automated PR review loop: trigger Greptile → fix comments → push → repeat until **5/5** confidence.

- **Cursor skill:** `.cursor/skills/greploop/` (also installed at `%USERPROFILE%\.cursor\skills\greploop\`)
- **Requires:** Git, GitHub CLI (`gh`), Greptile on the repo
- **Usage in Cursor:** ask *"run greploop"* or *"greploop this PR"*

See [references/windows-setup.md](.cursor/skills/greploop/references/windows-setup.md) for setup.

## Files

| File | Description |
|------|-------------|
| `notebooklm_system_instructions.md` | Prompt optimizer system instructions |
| `notebooklm_example_pairs.md` | Example input/output pairs |
