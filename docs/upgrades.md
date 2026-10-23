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

Power pellets are inert unless an owned def reacts. `applyPowerPelletEffects` walks **all** owned defs and applies every `onPowerPellet` field in one shot; `PlaySim` then runs the follow-up calls (freeze, corner warp, recall, warp, Extra Hungry, Hunter fright, Cornucopia). The same function is the single trigger path for a chomp, Ghost Harvester pellets, Fruit Power, Streak Engine, Echo and Shield Break, so a new `onPowerPellet` effect works for all of them. Timed effects refresh (not stack) on re-trigger and are level-scaled via `levelScaledDurationMs` unless noted in code. Overcharge multiplies the durations of every other owned effect.

## HUD timers

The owned-upgrade icons (and LEARN's check marks) pulse when the upgrade fires and darken from the top as its timer runs out, so a refreshed timer snaps back to full. Which `RunUpgrades` timer drives each icon, and the pulse rule, live in [`upgradeTimers.ts`](../src/domain/upgradeTimers.ts); a new timed upgrade adds its reading there.

## Enhanced upgrades

Every upgrade has an enhanced `<baseId>Plus` form, bought at a [store](./store.md) or granted with `?enableUpgrade=<id>Plus`. Offers and shelves only ever list base ids (plus a small chance a level-clear card is rolled enhanced; `enhancedOfferChance`).

- `owned` holds the base **or** the Plus id, never both. Use `hasUpgrade(owned, baseId)` for either form; `owned`-based helpers work unchanged.
- Each `BASE_UPGRADE_DEFS` row requires an `enhanced` override (description, `enhanceNote`, changed effect fields); the type rejects a row without one. `UPGRADE_DEFS` derives the Plus rows; `ALL_UPGRADE_IDS` is base-only.
- `enhanceUpgrade` swaps in place and once. A store swap carries the enhancement to the incoming upgrade (`carryEnhancement`). Grant side effects on enhancing (extra life, pellet conversion) are part of the enhanced def.
- A School Specialist makes every owned upgrade of its school act enhanced (`effectiveUpgrades`), with a threshold of other owned upgrades for the base form and none for the Plus form.

## Trinkets

A fallback family of neutral, common, passive upgrades (Speed, Tunnel Speed, Tunnel Vortex, Traction, and per-ghost Slowdown, House Delay and Traction), defined in [`src/domain/trinkets.ts`](../src/domain/trinkets.ts). They differ from every other upgrade in three ways:

- **Repeatable and additive.** `owned` holds one entry per copy, up to `TRINKET_MAX_COPIES`, and each copy adds its flat step. They never leave the offer or store pool until the cap, and are drawn at `TRINKET_OFFER_WEIGHT` (a quarter) of a normal upgrade, with at most one per level-clear card and one per store (`dropTrinkets`).
- **Outside the slot cap.** They never count toward [the slot cap](#slot-cap-and-salvage), `RARE_MIN_OWNED` or a Specialist, and can never be salvaged. The HUD and pause list draw them as a pool of half-size neutral cards under the slots, copies stacked like paper (`trinketPoolLayout`).
- **Never enhanced.** No `Plus` form, never an enhance target, not carried by a swap or a Specialist, and never rolled enhanced on a level-clear card. They are not trade-ins at a store swap.
- **Roster-aware.** A per-ghost upgrade is only offered when that ghost is in the run's roster; `eligibleUpgrades` takes the roster, and the offer and store paths pass it.

Effects are static multipliers applied at the existing speed, turn-window and ghost-release sites; Traction drags a ghost briefly after it turns, since ghosts only turn at tile centers. Bots do not test them.

## Slot cap and salvage

A run holds at most `MAX_RUN_UPGRADES` slot upgrades; Trinkets and a base/Plus pair count as described above. The rules live in [`src/domain/salvage.ts`](../src/domain/salvage.ts) and `PlaySim`.

- A level-clear pick, store `U` purchase or slot win that would exceed the cap queues a prompt instead of granting (`needsSalvage`). The sim freezes on it; there is no dismiss. Everything happens in the left HUD panel: the new card joins as a 7th icon, a dotted red outline blinks with SLOTS FULL (`salvageAlertFrame`), then SALVAGE REQUIRED puts a selector on the new card. Arrows move it over all seven (`salvageSelectionStep`); Enter, Space, `T` or a click salvages the selected one at once, which keeps the other six. Several grants queue and open one at a time; slot wins wait until the final grid is dismissed.
- **Salvage** revokes the upgrade, clears its live state (`clearStaleUpgradeTimers`), and grants a uniform random eligible Trinket from the `salvage` stream, or a Quarter when none is eligible. An Extra Life's life is kept.
- On demand, `T` (or a click in the pause list) opens the same selector over the owned slots from the pause screen, the level-clear card and the slot final grid; Esc backs out. Refused during death (including a Possession that defers it), transitions and while a prompt is queued.
- Exempt: the level-1 starting upgrade and the debug flags never prompt. LEARN has no cap ([parity](./learn.md#parity)).
- The Trinket lands in the pool with a short in-panel label (`trinketToastAlpha`). The run log records the loss and a `salvage` gain.

## Schools and rarity

- `school` is required on every def: a color tag on every upgrade card, the Specialist rule, and soft affinity on level-clear offers. Neutral is no school for either rule. School colors: `SCHOOL_COLORS`.
- **Rare** defs set `rare: true` and the higher `storePrice`. Rares are never in the starting pool; they unlock after `RARE_MIN_OWNED` upgrades and only on level-clear offers at `clearLevelIndex >= RARE_MIN_CLEAR_LEVEL`. Level-clear draws target a fixed rare **mass** (`RARE_OFFER_MASS` via `rareWeightForPool` over the live eligible pool) so adding commons does not require retuning weights; the store uses half that mass (`STORE_RARE_OFFER_MASS`) and shelves at most one rare (trade tile exempt). Budget goal: about `TARGET_RARES_PER_SCHOOL` rares per non-neutral school (~13 with neutral). Rare cards get `addRareFx` (`src/game/scenes/rareFx.ts`).
- **Affinity** (`upgradeOfferWeight`): level-clear offers are weighted toward schools already owned; invisible, uncapped, and not applied to the starting upgrade or store draws. Affinity multiplies on top of the mass-derived rare base weight.

## Grant rules

- Level 1 grants one random **starting upgrade** from `STARTING_UPGRADE_POOL` (a no-button card, `startingUpgradeCard.ts`). Later level advances and `level>=2` starts never grant one. On a new device’s first play, that grant prefers Freeze — [new-player.md](./new-player.md#first-play-on-a-new-device).
- Clearing levels 1-8 (`offersUpgradeAfterLevel`) opens the pick-one modal: two upgrades at left/right. There is no skip or Quarters fallback; if nothing is eligible the offer is skipped. Never offered after level 9 or from fruit.
- `pickUpgradeChoiceOffer`: no repeated ids, prefers excluding `lastDeclinedUpgradeId` (the one card not taken from the last offer), applies a forced id, and rolls enhancement **last** so seeded offers on other levels stay unchanged.
- The sim is fully frozen while the modal is open or animating; keys held through open are ignored until released. No dismiss: the player must pick. A pick at the cap opens the [salvage prompt](#slot-cap-and-salvage).

## Cross-cutting rules

- **Timers** are separate and combine by "max wins": freeze (cyan tint on one ghost, zero speed, catch skip), Ghost Proof (gold tint, catch skip, ghosts keep moving), Defy Death (shares the gold tint; does not skip kills), wall pass (its tint wins). All clear on level advance and life-loss reset. Expiry while overlapping a ghost can kill on the same update.
- **Chaff decoys** replace the player as the chase target for every ghost (nearest decoy wins) through `GhostAiContext.decoys`; a ghost touching one removes it. They clear with the other timers.
- **Shields** are a banked count, not a timer: they survive timer clears, empty on level advance, and clamp to the cap when the upgrade is lost.
- **Banana peels** are a separate banked count from shields (`peelsBanked`): they trail behind Dot-Man via leftover charm-bracelet physics, empty on level advance, and clamp when Banana Trail is lost. A ghost overlapping a peel bead slips (ghost-only bounce — Dot-Man keeps control) and counts as a shield break (Reactive Armor / Shield Break); body catch without peel contact is unchanged. Peel overflow does not arm Shield Break+.
- **Shield bounce**: a ghost breaking a banked shield grants no immunity. Dot-Man and that ghost (plus any ghost overlapping it) bounce apart in an arc and keep heading the new way; keys held into the bounce are ignored until re-pressed. A wall ends Dot-Man's bounce early; a ghost that hits one tips (slip), overcorrects, then settles upright for the stun, then re-picks its way. Timings: [`src/domain/shieldBounce.ts`](../src/domain/shieldBounce.ts). Lava and twin breaks keep the short break immunity.
- **Programmer** owns movement while it runs (`src/domain/programmer.ts`): keys record presses (shown above the player and, faded except the newest, in the hallway tile where each will fire), then a Hyperspeed-speed run without its turn beat. Mutually exclusive with Hyperspeed in `eligibleUpgrades`.
- **Speed**: `applyPlayerSpeed` / `applyGhostSpeed` in `PlaySim` combine the level ramp, owned multipliers, cell-based multipliers and active bursts every frame. Boss ghosts use a flat base.
- **Catch order**: banana peel slip (ghost-only bounce / shield-break hooks), then shield break (Reactive Armor sends ghost(s) home if owned, then Shield Break fires if owned), then Mirror+ (pops the twin), then Death's Harvest, then Defy Death, then Money Talks, then Martyr (fires all owned power-pellet effects on a life loss, and on a save when enhanced), then Possession (5s control of the catching ghost before the death hold; skipped on lava / `infiniteLives`), then death. A break or save is not a death (no life lost, `deathsThisBoard` unchanged where the code says so). If Martyr or Possession clears the board, the lost life is restored and the run continues into level clear (including a would-be game-over death).
- **Respawn placement**: life loss and saves (Defy Death, Money Talks) share one reset. Without Reanimation that reset puts you at the player spawn; with Reanimation, `respawnCenter` wins over that spawn path (base: where you fell; Plus: beside a remaining power pellet, else where you fell). Possession ends into that same reset path; Possession+ arms a 5s haunt on the steered ghost (max with Haunting when both are owned). On a real life loss every ghost returns to the house; on a save ghosts stay put, except any active ghost on the respawn tile is flung to its corner (Haunting still cages the killer first).
- **Mirror** adds a second body: ghosts steer for whichever of you is nearer by A* path (`nearestBody`), and a catch of either body is a death from that body's spot. It is a second you: it trails a mirrored copy of your banana peels (the same bank, so a ghost slipping on either spends one), and it gets Pickup Range, Extra Hungry, per-substep eating at hyperspeed and the lava. It has no timer; it ends on a pop (a mirrored-wall or speed-zone mismatch, unless Floating+ erases the slow side, or you and the twin touching at the midline), you wrapping through a horizontal tunnel, death, level advance or store entry.
- **Boss level**: Lazy Looper is off; boss pellets are never optional.
- **LEARN** mirrors upgrades through shared helpers and the demo catch; toggling an upgrade off must clear its stale timers (`clearStaleUpgradeTimers`).
- **Run log** records activations per upgrade ([RUN_LOG.md](./RUN_LOG.md)).

## Upgrade art

The left-column upgrade icons (play HUD, pause list) use a 48x48 PNG named `<baseUpgradeId>.png` in [`src/art/upgrades/`](../src/art/upgrades) when one exists, and the scaled-up school icon otherwise. Dropping a file in is the whole change: [`src/game/upgradeArt.ts`](../src/game/upgradeArt.ts) globs the folder, and the enhanced form shares its base's art. A new upgrade never needs art. `upgradeArt.test.ts` fails on a misnamed file or a wrong size.

## Adding an upgrade

Use the [`new-upgrade` skill](../.agents/skills/new-upgrade/SKILL.md) for the full touch-point list. In short: add a `BaseUpgradeId` and a row at the end of `BASE_UPGRADE_DEFS` with its required `enhanced` override, reuse existing effect fields where possible, add a `PlaySim` test (`registrySync.test.ts` enforces one), and cover it in LEARN.
