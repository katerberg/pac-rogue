# AI Development Rules

Before making substantial changes:

1. Read docs/ARCHITECTURE.md.
2. Read docs/VERIFICATION.md.
3. Read the relevant skill under .agents/skills/ (especially verification).
4. **Determine the verification level** for the change (see docs/VERIFICATION.md) before coding.
5. **Every code-changing plan** (Plan mode, `/plan`, or any written implementation plan) must end with one step: run the `ship-plan` skill (`.agents/skills/ship-plan/SKILL.md`). It runs verify → `/simplify-pr` → `/no-comments` → verify → `/pr-review` → `/fix-pr-findings` → verify → push branch + open PR. Do not treat the plan or implementation as done until it has run. Pure docs/tooling plans that touch no `src/` skip the simplify/no-comments steps but still verify and open the PR.

Rules:

- Keep changes focused; do not drive-by refactor unrelated code.
- Prefer simple composition over large abstractions.
- Do not introduce dependencies without a concrete justification.
- Do not create god objects or global mutable state.
- Separate game/domain logic from Phaser presentation where practical (`src/domain` vs `src/game`).
- Gameplay logic goes in **systems**. Scenes only wire the world, spawn entities, and run the pipeline — do not put movement (or other simulation) rules in the scene.
- Keep `npm run check:ecs` green. Do not bypass ECS layer boundaries (see `docs/ARCHITECTURE.md`).
- Use agent ports only (`npm run dev:agent` / preview+visual on 5174/4174). Never bind to or kill human ports 5173/4173.
- Agent ports mute sound by default. Opt in with `?sound=1` only when testing audio (see README Flags).
- Do not bypass, weaken, or delete verification.
- After implementation: run the appropriate checks → inspect failures → fix → rerun until green.
- Gameplay and presentation changes require runtime/visual verification (launch → exercise changed behavior → inspect screenshot/live output → record what was verified).
- Never assume visual correctness. Never claim visual verification without actually performing it.
- Never declare unverified work done. UNVERIFIED IS NOT PASS.
- Leave the repository runnable.
- If architecture becomes unclear, stop and explain the problem rather than hiding it with abstraction.

Unattended / cloud runs: a locked plan is the go-ahead. Do not stop to ask questions mid-implementation; make the conservative choice, note it in the PR body, and keep going. Setup is automatic (`scripts/cloud-setup.sh` via the SessionStart hook). Live checks use `npm run probe` (see docs/VERIFICATION.md), not a browser pane. Never push to `main`; if a gate cannot go green, open a draft PR that leads with the failure.

Completion requires passing `npm run verify`. Gameplay/visual work also requires live inspection per docs/VERIFICATION.md.
