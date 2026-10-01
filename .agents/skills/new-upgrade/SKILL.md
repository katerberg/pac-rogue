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

Every upgrade so far followed the same path. This skill writes down that path and the problems
that kept coming up, so the next one does not run into them again. It **wraps** the other
skills; it does not replace them:

```text
research → one-shot-plan dump (this file's question bank) → user answers → locked plan
  → user says "go" → implement (checklist below) → live check → ship-plan → follow-ups
```

Source of truth for how upgrades work today: [docs/upgrades.md](../../../docs/upgrades.md).
Read it first. It also lists every existing upgrade, which you need for the interaction pass.

## 1. Research (silent)

- Read `docs/upgrades.md`, `src/domain/upgrades.ts` (`UpgradeDef`, `RunUpgrades`,
  `applyPowerPelletEffects`, `clearUpgradeTimers`) and the `PlaySim` site the effect will hook.
- Find the closest existing upgrade and copy its shape. Use a power-pellet duration
  (Ghost Harvester, Defy Death), a passive multiplier (Fruit Fecundity), a counter (Remote
  Transference), a schedule change (Fruit Feast), a grant-time effect (Extra Life, Pellet Surge)
  or a catch hook (Death's Harvest).
- `git fetch origin main` and check open PRs for other upgrades in flight. They touch the same
  lists, so expect a conflict (see §6).

## 2. Question round

Follow the `one-shot-plan` skill exactly (one dump, numbered **Decide**, lettered **Proposed
locks**, then stop). Start with a 5–12 line "today's world" summary. Pull from the bank below and
skip any question the pitch already answers.

### Decide bank (real forks we keep hitting)

- **Trigger:** passive/always-on, `onPowerPellet`, fruit pickup, grant-time, on catch, on level
  clear, or a counter.
- **Numbers:** absolute or **scaled to maze size** (fruit thresholds scale, so a "140 pellets"
  pitch is ambiguous). Small mazes and level 1 differ.
- **Collisions with existing rules:** what happens when the new event is due while the old one
  is active (replace / wait / drop)? What about refreshing on a re-chomp?
- **Interactions** (name each one that applies, with a proposed answer):
  - **Overcharge** doubles `onPowerPellet` durations. Does it double this one? Defy Death: no.
  - **Fruit Power** resolves every `onPowerPellet` field on fruit pickup, so it arms this too.
  - **Triple Chomp, Tunnel Dash sweeps, Death's Harvest and ghost-harvested pellets:** do they
    count as "eaten" for this upgrade's counters and triggers?
  - **Extra Life:** the life icon floor (3, or 4 with Extra Life), and `infiniteLives`.
  - **Boss level 9:** boss pellets spawn Blinkys. Never remove or convert them unless that is
    deliberate.
  - **Store floors, inverted boards (levels 6–7) and the starting upgrade on level 1.**
- **Feedback:**
  - **Tint:** reuse an existing convention, or add a new tint.
  - **Expiry blink:** blink in the last 1000ms, like Ghost Proof.
  - **Sound:** a new sound, which the user must supply (`public/sound/`).
  - **Splash or particles.**
  - Or no feedback at all. Ask; do not invent big visuals unprompted.
- **LEARN:** mirror it in `LearnSim`, or show the "no visible effect" banner?
- **Edge cases the user may waive:** offer "skip, it's an edge case" as an explicit option. The
  user often takes it.

### Proposed locks (defaults; adjust to the pitch)

- **A. Identity:** id `passive…` / `powerPellet…` / `fruit…` by trigger, plus a Title Case label
  and a punchy one-line `description`.
- **B. Store and pools:** `storePrice: STORE_UPGRADE_PRICE`, same pool as every other upgrade.
  The starting upgrade, the level-clear offer and the store all draw from `ALL_UPGRADE_IDS`.
- **C. Logic placement:** decisions go in a pure domain helper or a Phaser-free system with
  unit tests. `PlaySim` only calls it. No scene logic, and no plugin bus.
- **D. Timers:** any new timer lives on `RunUpgrades`. It is cleared by `clearUpgradeTimers`
  (level advance, life loss, store entry) and exposed read-only under `play.timers.*`.
- **E. Randomness:** none, or a new named `RunRandom` stream. Never `Math.random`.
- **F. Tests:** add domain unit tests, an `upgrades.test.ts` entry and a `PlaySim` integration
  test. With the upgrade owned, the test shows the effect. Without it, behaviour is unchanged.
- **G. Docs:** the `docs/upgrades.md` table row plus a section, the README `Upgrade ids` list,
  and the `docs/learn.md` fidelity table.
- **H. Live check:** `npm run probe` with `seed=` and `enableUpgrade=<id>`. Assert against the
  snapshot and add any missing snapshot field.
- **I. Out of scope:** stacking, new art, and rebalancing existing upgrades.
- **J. Ship:** end with `ship-plan`, which opens the PR.

Then write the locked plan per `one-shot-plan` (file-by-file, tests, docs, live-check steps per
mode, final step `ship-plan`) and wait for "go".

## 3. Implementation checklist

Every upgrade PR touched all of these. Missing one fails `npm run verify` or leaves a doc stale.

| Where                                             | What                                                                                                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/upgrades.ts`                          | Add the id to the end of the `UpgradeId` union. Add a `UPGRADE_DEFS` row at the end with a required `storePrice`, named constants for every number, and any new def field.   |
| `src/domain/upgrades.ts` (if a timer)             | `RunUpgrades` field, `createRunUpgrades`, `clearUpgradeTimers`, a `tick…` helper and the `applyPowerPelletEffects` aggregation. Decide whether Overcharge doubles it.        |
| `src/domain/upgrades.test.ts`                     | Append the id to `ALL_IDS`, which must match `UPGRADE_DEFS` order. Add tests for the new helper.                                                                             |
| `src/domain/seenRecord.test.ts`                   | Bump `all.upgrades` `toHaveLength(N)` to the new `ALL_UPGRADE_IDS.length`.                                                                                                   |
| Domain helper / `src/game/systems/*.ts` + test    | The effect itself, pure and unit-tested.                                                                                                                                     |
| `src/game/sim/playSim.ts`                         | One call site. Reset any per-board state in `startBoard` and on life loss. Emit `SimEvent`s for sfx and visuals.                                                             |
| `src/game/sim/playSim.test.ts`                    | Add a `describe("<Label>")` block covering the owned path, the not-owned path and each interaction you locked.                                                               |
| `src/game/sim/simEvents.ts` / `render.ts`         | Only if there is new feedback. Keep the look curve in a domain function (see §5).                                                                                            |
| `src/game/sim/playSim.ts` `snapshot()` (`timers`) | Expose new timer or progress fields read-only, and add them to the snapshot table in `docs/VERIFICATION.md`.                                                                 |
| LEARN                                             | Either mirror it in `learnSim.ts` (plus a `learnSim.test.ts` case), or append the id to `LEARN_NO_EFFECT_UPGRADE_IDS` in `LearnScene.ts`.                                    |
| `docs/upgrades.md`                                | Add a defs-table row and a `### <Label>` section covering rules, interactions, reset points and LEARN behaviour. Update the `RunUpgrades` model bullet if it gained a timer. |
| `docs/learn.md`                                   | Add the upgrade to the matching fidelity-table row.                                                                                                                          |
| `README.md`                                       | Append the id to the `Upgrade ids:` line.                                                                                                                                    |
| Other docs                                        | `levels.md`, `store.md` or `ARCHITECTURE.md` only when the rule they describe changed. Myogenesis needed `levels.md` and `store.md`.                                         |

Run `npx prettier --write` on the touched markdown. Aligned tables are re-padded on every edit,
which is the main source of merge conflicts.

## 4. Live check

Per `docs/VERIFICATION.md#live-check`, on agent ports. These are the problems that cost the most
time before:

- **Getting to the state.**
  - Start with `play=1&level=2&maze=maze1&seed=<name>&enableUpgrade=<id>`. Level 2+ skips the
    starting-upgrade card.
  - Add `infiniteLives=1` for death paths.
  - Add `store=1&quarters=10` for the store.
  - Add `jumpToUpgrade=1` to check that the modal offers the new upgrade.
- **States that are hard to reach** (fruit at N pellets, deaths from below the life floor):
  - Try to reach them with `waitFor:` on snapshot counters first.
  - If that is truly impractical, say so in the PR. Point to the `PlaySim` test that covers it
    instead.
  - Never claim you probed it.
- **Visuals too short to screenshot** (sub-300ms sparks):
  - Expose a progress or timer value in the snapshot (as `play.reviveProgress` does).
  - `waitFor:` that value mid-animation, then `shot:`.
  - Do not stretch tweens by hand for the capture.
- **Sound:** agent ports are muted. Use `sound=1` and assert the `sfx` event, not the audio.
- **Modes:** list every mode the diff reaches (level 1, generated, inverted, store, boss, death,
  LEARN) and probe each. Anything left out goes under "Not checked" in the PR body.

## 5. Feel-tuning follow-ups

After the first PR, the user plays it and iterates on feel. Examples: "slight bounce around 30%
up to 40%", "same invulnerability tint and blink-out", "slow and strengthen the bounce".

- **Shape curves:** keep size, alpha, tint and timing curves in a pure domain function with named
  constants (`reviveSplashLook`, `turnFlashPulse`). Each round is then a number change plus a
  unit test, not a scene rewrite.
- **Reuse conventions:**
  - Ghost Proof gold `0xc48a00`, blinking every 100ms in the last 1000ms. Feed it through
    `playerTintRemainingMs`.
  - Wall-pass tint takes precedence.
  - Ghost tints go through the render opts.
- **Unconfirmed values:** in the final message, name which values are guesses (sizes, opacities,
  durations) so the user knows what to look at.
- **Re-checks:** after each round, re-run `npm run verify` and the probe, read the screenshots,
  then push to the same PR and update its body.

## 6. Merge conflicts with sibling upgrade PRs

Several upgrades are often built in parallel. They conflict in the same places every time:
`UpgradeId` / `UPGRADE_DEFS`, `ALL_IDS`, the `seenRecord` count, the README id list, the
`docs/upgrades.md` and `docs/learn.md` tables, and `LEARN_NO_EFFECT_UPGRADE_IDS`.

1. Run `git fetch origin main && git merge origin/main`. Never rebase a pushed branch.
2. For each list, take `main`'s version, then re-append your entry at the end. Keep `ALL_IDS`
   in `UPGRADE_DEFS` order.
3. Recount: the `seenRecord` length becomes `ALL_UPGRADE_IDS.length`. Give incoming defs any
   field your PR made required.
4. Remove duplicate imports the merge left in `playSim.test.ts`.
5. Re-run `npx prettier --write` on the tables, then `npm run verify`. Re-run the probe if
   runtime code merged.

## 7. Ship

Run `ship-plan` for real, **invoking** `simplify-pr`, `no-comments`, `pr-review` and
`fix-pr-findings`. Earlier upgrade sessions skipped them or "did them inline". Neither counts;
if one is skipped, the PR body must say so. The final message lists:

- what the upgrade does in player terms
- the verify result
- what the probe actually showed
- which modes were not checked
- every skipped or hollered review item
- the open interaction questions, e.g. "Tunnel Dash sweeps don't count — say if you want them to"
