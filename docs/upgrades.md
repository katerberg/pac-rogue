# Run upgrades

Each upgrade's id, label, school, rarity, price, effect fields and one-line description live in `UPGRADE_DEFS` in [`src/domain/upgrades.ts`](../src/domain/upgrades.ts); constants sit next to the helper that uses them. This file explains only how the pieces fit. Per-upgrade behavior is in the code and its `PlaySim` test.

## Model

- `RunUpgrades` (domain) holds `owned` ids plus the upgrade timers and counters; `PlaySim` owns one per run. No ECS components for upgrades.
- Effects are data on the def: passive multipliers and `onPowerPellet` fields. A **new kind** of effect extends the def shape and adds one resolve site (domain helper + `PlaySim` call). No plugin bus.
- Choice UI is `src/game/scenes/upgradeChoiceModal.ts`; offer math stays in domain (`pickUpgradeChoiceOffer`, `confirmUpgradeChoice`, `declineUpgrades`).
- Debug flags (`enableUpgrade`, `forceUpgrade`, `disableLevelUpgrades`, `jumpToUpgrade`) are documented on `parsePlayOptions`. `enableUpgrade` / `forceUpgrade` also accept each upgrade's label as lowerCamel (any casing; `Plus` for enhanced). Any of them disables high-score saving.
- LEARN coverage: [learn.md](./learn.md#upgrade-fidelity).

## Upgrade list

Card text for every id (base and enhanced): [upgrade-list.md](./upgrade-list.md#upgrade-table). `registrySync.test.ts` keeps that table in lockstep with `UPGRADE_DEFS`.

## Power pellets

Power pellets are inert unless an owned def reacts. `applyPowerPelletEffects` walks **all** owned defs and applies every `onPowerPellet` field in one shot; `PlaySim` then runs the follow-up calls (freeze, corner warp, recall, warp, Extra Hungry, Hunter fright, Cornucopia). The same function is the single trigger path for a chomp, Ghost Harvester pellets, a Tunnel Dash sweep, Fruit Power, Streak Engine, Echo and Shield Break, so a new `onPowerPellet` effect works for all of them. Timed effects refresh (not stack) on re-trigger and are level-scaled via `levelScaledDurationMs` unless noted in code. Overcharge multiplies the durations of every other owned effect.

## HUD timers

The owned-upgrade icons (and LEARN's check marks) pulse when the upgrade fires and darken from the top as its timer runs out, so a refreshed timer snaps back to full. Which `RunUpgrades` timer drives each icon, and the pulse rule, live in [`upgradeTimers.ts`](../src/domain/upgradeTimers.ts); a new timed upgrade adds its reading there.

## Enhanced upgrades

Every upgrade has an enhanced `<baseId>Plus` form, bought at a [store](./store.md) or granted with `?enableUpgrade=<id>Plus`. Offers and shelves only ever list base ids (plus a small chance a level-clear card is rolled enhanced; `enhancedOfferChance`).

- `owned` holds the base **or** the Plus id, never both. Use `hasUpgrade(owned, baseId)` for either form; `owned`-based helpers work unchanged.
- Each `BASE_UPGRADE_DEFS` row requires an `enhanced` override (description, `enhanceNote`, changed effect fields); the type rejects a row without one. `UPGRADE_DEFS` derives the Plus rows; `ALL_UPGRADE_IDS` is base-only.
- `enhanceUpgrade` swaps in place and once. A store swap carries the enhancement to the incoming upgrade (`carryEnhancement`). Grant side effects on enhancing (extra life, pellet conversion) are part of the enhanced def.
- A School Specialist makes every owned upgrade of its school act enhanced (`effectiveUpgrades`), with a threshold of other owned upgrades for the base form and none for the Plus form.

## Schools and rarity

- `school` is required on every def: a color tag on every upgrade card, the Specialist rule, and soft affinity on level-clear offers. Neutral is no school for either rule. School colors: `SCHOOL_COLORS`.
- **Rare** defs set `rare: true` and the higher `storePrice`. Rares are never in the starting pool; they unlock after `RARE_MIN_OWNED` upgrades and only on level-clear offers at `clearLevelIndex >= RARE_MIN_CLEAR_LEVEL`. Level-clear draws target a fixed rare **mass** (`RARE_OFFER_MASS` via `rareWeightForPool` over the live eligible pool) so adding commons does not require retuning weights; the store uses half that mass (`STORE_RARE_OFFER_MASS`) and shelves at most one rare (trade tile exempt). Budget goal: about `TARGET_RARES_PER_SCHOOL` rares per non-neutral school (~13 with neutral). Rare cards get `addRareFx` (`src/game/scenes/rareFx.ts`).
- **Affinity** (`upgradeOfferWeight`): level-clear offers are weighted toward schools already owned; invisible, uncapped, and not applied to the starting upgrade or store draws. Affinity multiplies on top of the mass-derived rare base weight.

## Grant rules

- Level 1 grants one random **starting upgrade** from `STARTING_UPGRADE_POOL` (a no-button card, `startingUpgradeCard.ts`). Later level advances and `level>=2` starts never grant one. On a new device’s first play, that grant prefers Freeze — [new-player.md](./new-player.md#first-play-on-a-new-device).
- Clearing levels 1-8 (`offersUpgradeAfterLevel`) opens the pick-one modal: two upgrades at left/right. There is no skip or Quarters fallback; if nothing is eligible the offer is skipped. Never offered after level 9 or from fruit.
- `pickUpgradeChoiceOffer`: no repeated ids, prefers excluding `lastDeclinedUpgradeId` (the one card not taken from the last offer), applies a forced id, and rolls enhancement **last** so seeded offers on other levels stay unchanged.
- The sim is fully frozen while the modal is open or animating; keys held through open are ignored until released. No dismiss: the player must pick.

## Cross-cutting rules

- **Timers** are separate and combine by "max wins": freeze (cyan tint on one ghost, zero speed, catch skip), Ghost Proof (gold tint, catch skip, ghosts keep moving), Defy Death (shares the gold tint; does not skip kills), wall pass (its tint wins). All clear on level advance and life-loss reset. Expiry while overlapping a ghost can kill on the same update.
- **Chaff decoys** replace the player as the chase target for every ghost (nearest decoy wins) through `GhostAiContext.decoys`; a ghost touching one removes it. They clear with the other timers.
- **Shields** are a banked count, not a timer: they survive timer clears, empty on level advance, and clamp to the cap when the upgrade is lost.
- **Banana peels** are a separate banked count from shields (`peelsBanked`): they trail behind Dot-Man via leftover charm-bracelet physics, empty on level advance, and clamp when Banana Shield is lost. A ghost overlapping a peel bead slips with the same bounce as a shield break and counts as a shield break (Reactive Armor / Shield Break); body catch without peel contact is unchanged. Peel overflow does not arm Shield Break+.
- **Shield bounce**: a ghost breaking a banked shield grants no immunity. Dot-Man and that ghost (plus any ghost overlapping it) bounce apart in an arc and keep heading the new way; keys held into the bounce are ignored until re-pressed. A wall ends Dot-Man's bounce early; a ghost that hits one shakes in place, then re-picks its way. Timings: [`src/domain/shieldBounce.ts`](../src/domain/shieldBounce.ts). Lava and twin breaks keep the short break immunity.
- **Programmer** owns movement while it runs (`src/domain/programmer.ts`): keys record presses, then a Hyperspeed-speed run without its turn beat. Mutually exclusive with Hyperspeed in `eligibleUpgrades`.
- **Speed**: `applyPlayerSpeed` / `applyGhostSpeed` in `PlaySim` combine the level ramp, owned multipliers, cell-based multipliers and active bursts every frame. Boss ghosts use a flat base.
- **Catch order**: banana peel slip (same bounce / shield-break hooks), then shield break (Reactive Armor sends ghost(s) home if owned, then Shield Break fires if owned), then Mirror+ (pops the twin), then Death's Harvest, then Defy Death, then Money Talks, then death. A break or save is not a death (no life lost, `deathsThisBoard` unchanged where the code says so).
- **Respawn placement**: life loss and saves (Defy Death, Money Talks) share one reset. Without Reanimation that reset puts you at the player spawn; with Reanimation, `respawnCenter` wins over that spawn path (base: where you fell; Plus: beside a remaining power pellet, else where you fell).
- **Mirror** adds a second body: ghosts steer for whichever of you is nearer by A* path (`nearestBody`), and a catch of either body is a death from that body's spot. It is a second you: it gets Pickup Range, Extra Hungry, Tunnel Dash sweeps, per-substep eating at hyperspeed and the lava. It has no timer; it ends on a pop (a mirrored-wall or speed-zone mismatch, or you and the twin touching at the midline), death, level advance or store entry.
- **Boss level**: Lazy Looper is off; boss pellets are never optional.
- **LEARN** mirrors upgrades through shared helpers and the demo catch; toggling an upgrade off must clear its stale timers (`clearStaleUpgradeTimers`).
- **Run log** records activations per upgrade ([RUN_LOG.md](./RUN_LOG.md)).

## Upgrade art

The left-column upgrade icons (play HUD, pause list) use a 48x48 PNG named `<baseUpgradeId>.png` in [`src/art/upgrades/`](../src/art/upgrades) when one exists, and the scaled-up school icon otherwise. Dropping a file in is the whole change: [`src/game/upgradeArt.ts`](../src/game/upgradeArt.ts) globs the folder, and the enhanced form shares its base's art. A new upgrade never needs art. `upgradeArt.test.ts` fails on a misnamed file or a wrong size.

## Adding an upgrade

Use the [`new-upgrade` skill](../.agents/skills/new-upgrade/SKILL.md) for the full touch-point list. In short: add a `BaseUpgradeId` and a row at the end of `BASE_UPGRADE_DEFS` with its required `enhanced` override, reuse existing effect fields where possible, add a `PlaySim` test (`registrySync.test.ts` enforces one), and cover it in LEARN.
