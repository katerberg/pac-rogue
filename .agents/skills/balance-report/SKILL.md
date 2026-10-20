---
name: balance-report
description: >-
  Read a balance-bot report (artifacts/balance/<run>/report.md, and compare.md
  when present) and turn it into a short, ranked list of tuning leads with the
  evidence row and the knob to change. Use after `npm run balance` or
  `npm run balance:compare`, or when asked what the balance bots found. Reads
  only; never edits game code.
---

# Balance report

Written for a Sonnet-class model. Background: [docs/BALANCE_BOTS.md](../../../docs/BALANCE_BOTS.md).

## Inputs

- `artifacts/balance/<run>/report.md` (required). Use the newest directory unless the user names one.
- `artifacts/balance/<run>/compare.md` when the user asks about a change between two runs.
- `summary.json` in the same directory if a table in the report is not enough (same numbers, with intervals and `n`).

## Steps

1. **Health gate.** Read the Health section and the banners at the top.
   - `UNTRUSTWORTHY` or any errors: stop. Report the counts and the error samples, and say the bots need fixing before the numbers mean anything.
   - `PARTIAL`: continue, but say so in your first line.
2. **What counts as signal.** Only use a finding when its 95% interval is separated from the comparison (`*` in Singles, or listed in `compare.md`) and it rests on at least 50 episodes (or 30 build runs for a school mix). Treat everything else as noise; do not list it. Smoke runs (10 seeds per arm) almost never produce signal: say that instead of inventing leads.
3. **Collect candidates** from these sections:
   - **Overpowered**: largest positive Δ in Singles (especially if it holds for most profiles), highest positive "Upgrade value" in Builds (prefer `casual` rows; it picks at random), top pair synergies.
   - **Dead upgrades**: Δ near 0 or negative across every profile and level, and low or negative upgrade value.
   - **Broken combos**: top Pairs synergies, top Co-owned pairs, School Specialist Δ that dwarfs the single-upgrade Δs.
   - **Enemies**: ghosts whose lethality is far above the others for most profiles; rosters with much lower clear rates.
   - **Persona-dependent**: the top of Cross-profile spread (an upgrade that only works for one style).
4. **Find the knob** for each candidate: the upgrade's row in [docs/upgrade-list.md](../../../docs/upgrade-list.md) plus named constants in [`src/domain/upgrades.ts`](../../../src/domain/upgrades.ts), or a tuning knob in `src/domain/tuning.ts`. For ghosts, [docs/levels.md](../../../docs/levels.md) (rosters, speed ramp) and `src/domain/ghostTarget.ts`.

## Output

Plain markdown, in this order, at most 5 items per list:

1. One line: run directory, preset, commit, and whether the health gate passed.
2. **Too strong**, **Too weak / dead**, **Broken combinations**, **Enemies**, **Depends on play style**. Each item: the name, one sentence on what the data shows with the evidence row (numbers, `n`, profiles), and the concrete knob plus a direction (e.g. "lower `INVULN_MS` from 3000 toward 2500").
3. **Next run**: what to re-run to confirm the top lead (`--only`, `--profiles`, preset), and when a pilot is enough.

Rules:

- Never edit code or tuning. This is a reading task.
- Do not report a lead you cannot point to a row for.
- Bots are not people: frame findings as "worth a look", not "is broken".
