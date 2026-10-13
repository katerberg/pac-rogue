---
name: new-upgrade
description: >-
  Design and ship a new run upgrade end to end: pitch → one batched question
  round (upgrade-specific Decide + Proposed locks) → locked plan → implement
  every touch point → live check → ship-plan PR → merge-conflict and feel-tuning
  follow-ups. Use when the user pitches a new upgrade ("new upgrade X that…",
  "one shot plan: upgrade…"), or asks to add, design or brainstorm an upgrade.
---

# New upgrade

This wraps the other skills: research → `one-shot-plan` dump (this file's question bank) → user answers → locked plan → "go" → implement → live check → `ship-plan` → follow-ups. How upgrades work: [docs/upgrades.md](../../../docs/upgrades.md); every existing upgrade is in `UPGRADE_DEFS` (`src/domain/upgrades.ts`), which you need for the interaction pass.

## 1. Research (silent)

- Read `docs/upgrades.md`, `src/domain/upgrades.ts` (`UpgradeDef`, `RunUpgrades`, `applyPowerPelletEffects`, `clearUpgradeTimers`) and the `PlaySim` site the effect will hook.
- Copy the closest existing shape: power-pellet duration, passive multiplier, counter, schedule change, grant-time effect or catch hook.
- `git fetch origin main` and check open PRs for upgrades in flight; they touch the same lists (see §5).

## 2. Question round

Follow `one-shot-plan` (one dump, numbered **Decide**, lettered **Proposed locks**, then stop), opening with a 5-12 line "today's world" summary. **Default to locking, not asking:** a question earns a Decide slot only if the pitch leaves behaviour genuinely ambiguous and a wrong guess changes player-visible gameplay. No cap on real forks; with none, say "No open forks". Skip what the pitch answers; do not run the `one-shot-plan` lens sweep.

**Locked by default (list as one-line locks the user can veto):**

- Overcharge doubles only power-pellet durations; Fruit Power arms every `onPowerPellet` field; Extra Hungry, Tunnel Dash sweeps, Death's Harvest and ghost-harvested pellets do not count as "eaten" unless the pitch says so; boss-level pellets are never removed or converted; stores, inverted boards and the starting pool are untouched.
- Scale numbers to maze size when the pitch gives a pellet count; otherwise use the pitch's value. Named constants.
- Re-trigger refreshes a timer, never stacks. Reuse the closest tint, last-second blink and sfx; no new art or sound unless asked.
- Enhanced: use the pitch's numbers, else propose one clear step up with no new behaviour.
- LEARN: mirror it if simple and deterministic, else `LEARN_NO_EFFECT_UPGRADE_IDS`. Edge cases: waived under "Out of scope".

**Decide only when open:** the trigger (passive, `onPowerPellet`, fruit, grant-time, catch, level clear, counter); a genuinely new rule; a number the pitch implies but never gives.

**Proposed locks:** identity (id prefix by trigger, label, one-line `description`); `storePrice` and pools (starting pool only if asked); logic in a pure domain helper or Phaser-free system with tests, `PlaySim` only calls it; timers on `RunUpgrades`, cleared by `clearUpgradeTimers`, exposed under `play.timers.*`; randomness from a named `RunRandom` stream; tests (domain, `upgrades.test.ts`, `PlaySim` owned and not-owned); the required `enhanced` override tested in both forms; live check with `seed=` and `enableUpgrade=`; end with `ship-plan`.

Then write the locked plan per `one-shot-plan` and wait for "go".

## 3. Implementation checklist

- `src/domain/upgrades.ts`: id at the end of `BaseUpgradeId`; a row at the end of `BASE_UPGRADE_DEFS` with `storePrice` (rares: `rare: true` and the rare price), a required `enhanced` override (new `description`, a contextual `enhanceNote`, changed effect fields) and named constants for every number. A timer also needs a `RunUpgrades` field, `createRunUpgrades`, `clearUpgradeTimers`, a `tick…` helper and the `applyPowerPelletEffects` aggregation (decide Overcharge).
- `src/domain/upgrades.test.ts`: append the id to `ALL_IDS` (same order as `BASE_UPGRADE_DEFS`); test the helper in `<id>` and `<id>Plus`.
- `src/domain/seenRecord.test.ts`: bump the `all.upgrades` length.
- Effect in a domain helper or `src/game/systems/*.ts`, with a test.
- `playSim.ts`: one call site; reset per-board state in `startBoard` and on life loss; emit `SimEvent`s for feedback; expose new timers read-only in `snapshot()`. `playSim.test.ts`: a `describe("<Label>")` covering owned, not owned and each locked interaction (`registrySync.test.ts` enforces it).
- `simEvents.ts` / `render.ts` only for new feedback; keep look curves in a domain function.
- LEARN: mirror in `learnSim.ts` (+ test) or append to `LEARN_NO_EFFECT_UPGRADE_IDS`.
- Docs: none for the id or numbers (the def is the doc). Update `docs/upgrades.md` or `docs/learn.md` only when a cross-cutting rule changed.

## 4. Live check

Per [docs/VERIFICATION.md](../../../docs/VERIFICATION.md#live-check). Start with `play=1&level=2&maze=maze1&seed=<name>&enableUpgrade=<id>` (level 2+ skips the starting card); add `infiniteLives=1` for death paths, `store=1&quarters=10` for the store, `jumpToUpgrade=1` to see the modal offer it.

- Hard-to-reach states: try `waitFor:` on snapshot counters first; if impractical, say so and point to the `PlaySim` test. Never claim you probed it.
- Visuals too short to screenshot: expose a progress or timer value in the snapshot (like `play.reviveProgress`), `waitFor:` it mid-animation, then `shot:`. Do not stretch tweens by hand.
- Sound: agent ports are muted; use `sound=1` and assert the `sfx` event.
- Probe every mode the diff reaches; list the rest under "Not checked".

## 5. Feel-tuning follow-ups and merge conflicts

- Keep size, alpha, tint and timing curves in a pure domain function with named constants (`reviveSplashLook`, `turnFlashPulse`) so each round is a number change plus a unit test. Reuse conventions: Ghost Proof gold tint through `playerTintRemainingMs`, wall-pass tint wins, ghost tints via render opts. Name guessed values in the final message. After each round rerun `verify` and the probe, read screenshots, push to the same PR.
- Sibling upgrade PRs conflict in `BaseUpgradeId` / `BASE_UPGRADE_DEFS`, `ALL_IDS`, the `seenRecord` count and `LEARN_NO_EFFECT_UPGRADE_IDS`. `git fetch origin main && git merge origin/main` (never rebase a pushed branch), take `main`'s list and re-append yours, recount, drop duplicate imports, rerun `verify` and the probe if runtime code merged.

## 6. Ship

Run `ship-plan` for real, **invoking** `simplify-pr`, `no-comments`, `pr-review` and `fix-pr-findings`; doing them "inline" does not count, and a skipped one must be stated in the PR body. The final message lists what the upgrade does in player terms, the verify result, what the probe showed, modes not checked, every skipped or hollered review item, and open interaction questions.
