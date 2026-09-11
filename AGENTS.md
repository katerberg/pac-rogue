# AI Development Rules

Before making substantial changes:

1. Read docs/ARCHITECTURE.md.
2. Read docs/VERIFICATION.md.
3. Read the relevant skill under .agents/skills/ (especially verification).
4. **Determine the verification level** for the change (see docs/VERIFICATION.md) before coding.

Rules:

- Keep changes focused; do not drive-by refactor unrelated code.
- Prefer simple composition over large abstractions.
- Do not introduce dependencies without a concrete justification.
- Do not create god objects or global mutable state.
- Separate game/domain logic from Phaser presentation where practical (`src/domain` vs `src/game`).
- Use agent ports only (`npm run dev:agent` / preview+visual on 5174/4174). Never bind to or kill human ports 5173/4173.
- Do not bypass, weaken, or delete verification.
- After implementation: run the appropriate checks → inspect failures → fix → rerun until green.
- Gameplay and presentation changes require runtime/visual verification (launch → exercise changed behavior → inspect screenshot/live output → record what was verified).
- Never assume visual correctness. Never claim visual verification without actually performing it.
- Never declare unverified work done. UNVERIFIED IS NOT PASS.
- Leave the repository runnable.
- If architecture becomes unclear, stop and explain the problem rather than hiding it with abstraction.

Completion requires passing `npm run verify`. Gameplay/visual work also requires live inspection per docs/VERIFICATION.md.
