# Run upgrades

Each upgrade's id, label, school, rarity, price, effect fields and one-line description live in `UPGRADE_DEFS` in [`src/domain/upgrades.ts`](../src/domain/upgrades.ts); constants sit next to the helper that uses them. This file explains only how the pieces fit. Per-upgrade behavior is in the code and its `PlaySim` test.

## Model

- `RunUpgrades` (domain) holds `owned` ids plus the upgrade timers and counters; `PlaySim` owns one per run. No ECS components for upgrades.
- Effects are data on the def: passive multipliers and `onPowerPellet` fields. A **new kind** of effect extends the def shape and adds one resolve site (domain helper + `PlaySim` call). No plugin bus.
- Choice UI is `src/game/scenes/upgradeChoiceModal.ts`; offer math stays in domain (`pickUpgradeChoiceOffer`, `confirmUpgradeChoice`, `declineUpgrades`).
- Debug flags (`enableUpgrade`, `forceUpgrade`, `disableLevelUpgrades`, `jumpToUpgrade`) are documented on `parsePlayOptions`. Any of them disables high-score saving.
- LEARN coverage: [learn.md](./learn.md#upgrade-fidelity).

## Upgrade catalog

Ids, labels, schools, rarities, prices, effect fields and card text live in `UPGRADE_DEFS` / `BASE_UPGRADE_DEFS` in [`src/domain/upgrades.ts`](../src/domain/upgrades.ts). `ALL_UPGRADE_IDS` is the base-id list. Do not mirror rows here — that restates values the code already holds and burns the markdown size budget.

## Power pellets

Power pellets are inert unless an owned def reacts. `applyPowerPelletEffects` walks **all** owned defs and applies every `onPowerPellet` field in one shot; `PlaySim` then runs the follow-up calls (freeze, corner warp, recall, warp, Extra Hungry, Hunter fright, Cornucopia). The same function is the single trigger path for a chomp, Ghost Harvester pellets, a Tunnel Dash sweep, Fruit Power, Streak Engine, Echo and Shield Break, so a new `onPowerPellet` effect works for all of them. Timed effects refresh (not stack) on re-trigger and are level-scaled via `levelScaledDurationMs` unless noted in code. Overcharge multiplies the durations of every other owned effect.

## Enhanced upgrades

Every upgrade has an enhanced `<baseId>Plus` form, bought at a [store](./store.md) or granted with `?enableUpgrade=<id>Plus`. Offers and shelves only ever list base ids (plus a small chance a level-clear card is rolled enhanced; `enhancedOfferChance`).

- `owned` holds the base **or** the Plus id, never both. Use `hasUpgrade(owned, baseId)` for either form; `owned`-based helpers work unchanged.
- Each `BASE_UPGRADE_DEFS` row requires an `enhanced` override (description, `enhanceNote`, changed effect fields); the type rejects a row without one. `UPGRADE_DEFS` derives the Plus rows; `ALL_UPGRADE_IDS` is base-only.
- `enhanceUpgrade` swaps in place and once. A store swap carries the enhancement to the incoming upgrade (`carryEnhancement`). Grant side effects on enhancing (extra life, pellet conversion) are part of the enhanced def.
- A School Specialist makes every owned upgrade of its school act enhanced (`effectiveUpgrades`), with a threshold of other owned upgrades for the base form and none for the Plus form.

## Schools and rarity

- `school` is required on every def: a color tag on every upgrade card, the Specialist rule, and soft affinity on level-clear offers. Neutral is no school for either rule. School colors: `SCHOOL_COLORS`.
- **Rare** defs set `rare: true` and the higher `storePrice`. Rares are gated until a minimum number of upgrades is owned, are never in the starting pool, draw at reduced weight (`takeWeightedUpgrade`), and at most one rare is shelved per store (the trade tile is exempt). Rare cards get `addRareFx` (`src/game/scenes/rareFx.ts`).
- **Affinity** (`upgradeOfferWeight`): level-clear offers are weighted toward schools already owned; invisible, uncapped, and not applied to the starting upgrade or store draws.

## Grant rules

- Level 1 grants one random **starting upgrade** from `STARTING_UPGRADE_POOL` (a no-button card, `startingUpgradeCard.ts`). Later level advances and `level>=2` starts never grant one.
- Clearing levels 1-8 (`offersUpgradeAfterLevel`) opens the pick-one modal: two upgrades at left/right. There is no skip or Quarters fallback; if nothing is eligible the offer is skipped. Never offered after level 9 or from fruit.
- `pickUpgradeChoiceOffer`: no repeated ids, prefers excluding `lastDeclinedUpgradeId` (the one card not taken from the last offer), applies a forced id, and rolls enhancement **last** so seeded offers on other levels stay unchanged.
- The sim is fully frozen while the modal is open or animating; keys held through open are ignored until released. No dismiss: the player must pick.

## Cross-cutting rules

- **Timers** are separate and combine by "max wins": freeze (cyan tint on one ghost, zero speed, catch skip), Ghost Proof (gold tint, catch skip, ghosts keep moving), Defy Death (shares the gold tint; does not skip kills), wall pass (its tint wins). All clear on level advance and life-loss reset. Expiry while overlapping a ghost can kill on the same update.
- **Chaff decoys** replace the player as the chase target for every ghost (nearest decoy wins) through `GhostAiContext.decoys`; a ghost touching one removes it. They clear with the other timers.
- **Shields** are a banked count, not a timer: they survive timer clears, empty on level advance, and clamp to the cap when the upgrade is lost.
- **Programmer** owns movement while it runs (`src/domain/programmer.ts`): keys record presses, then a Hyperspeed-speed run without its turn beat. Mutually exclusive with Hyperspeed in `eligibleUpgrades`.
- **Speed**: `applyPlayerSpeed` / `applyGhostSpeed` in `PlaySim` combine the level ramp, owned multipliers, cell-based multipliers and active bursts every frame. Boss ghosts use a flat base.
- **Catch order**: shield break, then Mirror+ (pops the twin), then Death's Harvest, then Defy Death, then Money Talks, then death. A break or save is not a death (no life lost, `deathsThisBoard` unchanged where the code says so).
- **Mirror** adds a second body: ghosts steer for whichever of you is nearer by A* path (`nearestBody`), and a catch of either body is a death from that body's spot. It is a second you: it gets Pickup Range, Extra Hungry, Tunnel Dash sweeps, per-substep eating at hyperspeed and the lava. It has no timer; it ends on a pop (a mirrored-wall or speed-zone mismatch, or you and the twin touching at the midline), death, level advance or store entry.
- **Boss level**: Lazy Looper is off; boss pellets are never optional.
- **LEARN** mirrors upgrades through shared helpers and the demo catch; toggling an upgrade off must clear its stale timers (`clearStaleUpgradeTimers`).
- **Run log** records activations per upgrade ([RUN_LOG.md](./RUN_LOG.md)).

## Adding an upgrade

Use the [`new-upgrade` skill](../.agents/skills/new-upgrade/SKILL.md) for the full touch-point list. In short: add a `BaseUpgradeId` and a row at the end of `BASE_UPGRADE_DEFS` with its required `enhanced` override, reuse existing effect fields where possible, add a `PlaySim` test (`registrySync.test.ts` enforces one), and cover it in LEARN.
