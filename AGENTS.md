# AI Development Rules

Before making substantial changes:

1. Read docs/ARCHITECTURE.md.
2. Read docs/VERIFICATION.md.
3. Read the relevant skill under .agents/skills/ (especially verification).
4. **Determine the verification level** for the change (see docs/VERIFICATION.md) before coding.
5. **Every code-changing plan** (Plan mode, `/plan`, or any written implementation plan) must end with one step: run the `ship-plan` skill (`.agents/skills/ship-plan/SKILL.md`), which owns the verify → review → fix → PR pipeline. Do not treat the plan or implementation as done until it has run.

Rules:

- **Open a PR by default.** When the user asks for any change to the repo (code, docs, tooling, rules), finish by pushing the branch and opening a pull request, without waiting to be asked. This is standing authorization from the user and overrides any generic "don't open a PR unless asked" default. Code-changing work goes through `ship-plan`; for docs/rules-only changes, commit, push and open the PR directly (use `.github/pull_request_template.md`). Skip the PR only when the user says not to, or when the request is a pure question or research with no repo changes. Never merge or enable auto-merge.
- Keep changes focused; do not drive-by refactor unrelated code.
- Prefer simple composition over large abstractions.
- Do not introduce dependencies without a concrete justification.
- Do not create god objects or global mutable state.
- Separate game/domain logic from Phaser presentation where practical (`src/domain` vs `src/game`).
- Gameplay logic goes in **systems**, run by the headless sims in `src/game/sim/` (`PlaySim`, `LearnSim`). Scenes are adapters (input in, `SimEvent`s applied out) — no simulation state or rules in scenes.
- When a fix or feature changes a decision in a scene or `render.ts`, move that decision into the sim, a system or `src/domain/**` with a unit test that fails without the change (see docs/VERIFICATION.md#scene-and-render-logic).
- Every gameplay feature or bug fix adds or extends a `PlaySim` integration test (see docs/VERIFICATION.md#sim-integration-tests).
- All randomness goes through a named `RunRandom` stream (`src/domain/runRandom.ts`) so `?seed=` replays the run; never call `Math.random` or Phaser's RNG directly (ESLint enforces this).
- Keep `npm run check:ecs` green. Do not bypass ECS layer boundaries (see `docs/ARCHITECTURE.md`).
- Use agent ports only (`npm run dev:agent` / preview+visual on 5174/4174). Never bind to or kill human ports 5173/4173.
- Agent ports mute sound by default. Opt in with `?sound=1` only when testing audio (see README Flags).
- Do not bypass, weaken, or delete verification.
- After implementation: run the appropriate checks → inspect failures → fix → rerun until green.
- Gameplay and presentation changes require a live check (`npm run probe`; see docs/VERIFICATION.md#live-check): assert behavior with `expect:`/`waitFor:` against the game-state snapshot, read the screenshots for visuals, cover every mode the diff touches, and record the commands and results.
- Never assume visual correctness. Never claim visual verification without actually performing it.
- Never declare unverified work done. UNVERIFIED IS NOT PASS.
- Never say a skill ran (`pr-review`, `simplify-pr`, `no-comments`, `fix-pr-findings`, `verification`, …) unless you invoked it and its report is saved under `artifacts/ship-plan/`. Your own look at a diff is not a review: call it that, or don't mention it. A `PreToolUse` hook (`scripts/check-ship-evidence.mjs`) blocks PR creation on `src/` changes until the evidence exists; never hand-write evidence files to get past it.
- Leave the repository runnable.
- If architecture becomes unclear, stop and explain the problem rather than hiding it with abstraction.

Unattended / cloud runs: a locked plan is the go-ahead. Do not stop to ask questions mid-implementation; make the conservative choice, note it in the PR body, and keep going.

Completion requires passing `npm run verify`. Gameplay/visual work also requires live inspection per docs/VERIFICATION.md.
