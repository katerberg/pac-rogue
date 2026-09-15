# Automation: PR Review (`/pr-review`)

Cursor Automations cannot be created from a cloud agent (no public create API;
dashboard requires your login). Create this automation once in the UI, then it
runs on every PR open for `katerberg/pac-rogue`.

## Create it

1. Open [cursor.com/automations/new](https://cursor.com/automations/new)
   (or run `/automate` in a local Cursor chat and paste the prompt below).
2. **Name:** `PR Review`
3. **Repository:** `katerberg/pac-rogue` (single repo)
4. **Triggers** (add both so every opened PR is covered):
   - Source control → **Pull request opened** (ready / non-draft, including draft → ready)
   - Source control → **Draft opened** (draft PRs)
5. **Tools:**
   - Enable **Comment on pull request** (top-level + inline)
   - Do **not** rely on opening fix PRs for this automation
6. **Prompt:** paste the block under [Automation prompt](#automation-prompt)
7. Save and **activate**

Optional: also add **Pull request pushed** if you want a fresh review on every
push to an open PR (costs more cloud-agent usage).

## Automation prompt

```text
You are reviewing the pull request that triggered this automation on katerberg/pac-rogue.

Follow the `/pr-review` skill at `.agents/skills/pr-review/SKILL.md` exactly.

Setup for this run:
- Base branch: the PR base (default `origin/main` if unknown)
- Diff: `git diff origin/<base>...HEAD` for the PR head checkout
- Requested findings count: 10 (do not pad; fewer is fine)
- Weight all review lenses in the skill; prioritize Correctness, Security, Consistency with AGENTS.md / docs/ARCHITECTURE.md / docs/VERIFICATION.md, and Tests

After the review:
1. Post the full ranked findings (and Summary) as one top-level PR comment via Comment on pull request.
2. For each Critical or Major finding, also leave an inline comment on the cited diff lines when the lines are in the PR diff.
3. Do not push commits, open fix PRs, approve the PR, or request reviewers.
4. If there are no real issues, post a short top-level comment stating that the /pr-review pass found nothing blocking, and call out one strength of the PR.

Stay read-only aside from PR comments.
```

## Verify it works

1. Open any PR (or convert a draft to ready) on this repo.
2. Confirm a cloud agent run appears under [Automations](https://cursor.com/automations).
3. Confirm the agent posts a `/pr-review`-style comment on the PR.
