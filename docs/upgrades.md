# Run upgrades

Each upgrade's id, label, school, rarity, price, effect fields and one-line description live in `UPGRADE_DEFS` in [`src/domain/upgrades.ts`](../src/domain/upgrades.ts); constants sit next to the helper that uses them. This file explains only how the pieces fit. Per-upgrade behavior is in the code and its `PlaySim` test.

## Model

- `RunUpgrades` (domain) holds `owned` ids plus the upgrade timers and counters; `PlaySim` owns one per run. No ECS components for upgrades.
- Effects are data on the def: passive multipliers and `onPowerPellet` fields. A **new kind** of effect extends the def shape and adds one resolve site (domain helper + `PlaySim` call). No plugin bus.
- Choice UI is `src/game/scenes/upgradeChoiceModal.ts`; offer math stays in domain (`pickUpgradeChoiceOffer`, `confirmUpgradeChoice`, `declineUpgrades`).
- Debug flags (`enableUpgrade`, `forceUpgrade`, `disableLevelUpgrades`, `jumpToUpgrade`) are documented on `parsePlayOptions`. Any of them disables high-score saving.
- LEARN coverage: [learn.md](./learn.md#upgrade-fidelity).

## Upgrade table

Base and enhanced effects side by side (the one-line card text from each def; mechanics and numbers are in `UPGRADE_DEFS`). Generated from `UPGRADE_DEFS`; `registrySync.test.ts` fails when a row drifts.

<!-- prettier-ignore -->
| Id | Label | School | Base | Enhanced (`<id>Plus`) |
| --- | --- | --- | --- | --- |
| `powerPelletFreeze` | Freeze | disruption | Chomp a power pellet and the nearest ghost locks solid for 3s (shortening toward 2s by level 5). | Chomp a power pellet and the nearest ghost locks solid for 5s (shortening toward ~3.3s by level 5). |
| `passiveAfterburner` | Afterburner | speed | Cleared corridors light your tail: +30% speed there, 10% slower over pellets. | Cleared corridors roar: +50% speed there, 10% slower over pellets. |
| `passiveGhostSlow` | Ghost Slow | disruption | The hunt softens. Ghosts drag their feet. | The hunt crawls. Ghosts wade through syrup. |
| `powerPelletScatterBurst` | Scatter Burst | disruption | Power pellet flings every ghost into its corner. | Power pellet flings every ghost into its corner and pins it there. |
| `powerPelletGhostRecall` | Ghost Recall | disruption | Power pellet yanks the nearest ghost straight home. | Power pellet yanks the two nearest ghosts straight home. |
| `powerPelletWarpFarthest` | Warp Farthest | protection | Power pellet flings you to the spot farthest from the ghosts. | Power pellet flings you to the spot farthest from the ghosts, shielded for a moment. |
| `passivePickupRange` | Pickup Range | automation | You eat pellets up to 1 tile away without touching them. | You eat pellets up to 2 tiles away without touching them. |
| `passiveGhostHouseDelay` | House Delay | disruption | Ghosts linger longer in the house before the hunt. | Ghosts sulk in the house far longer before the hunt. |
| `passiveExtraLife` | Extra Life | death | One more chance, and lives regenerate up to 4. | Two more chances, and lives regenerate up to 5. |
| `passivePelletToPower` | Pellet Surge | automation | Each board, one regular pellet becomes a power pellet. | Each board, two regular pellets become power pellets. |
| `powerPelletExtraHungry` | Extra Hungry | automation | Power pellets also eat the 5 pellets farthest from you. | Power pellets also eat the 10 pellets farthest from you. |
| `powerPelletWallPass` | Wall Pass (rare) | speed | Power pellet lets you slip through walls for 6s (shortening 0.5s a level to 4s). | Power pellet lets you slip through walls and loop around the maze edges for 6s (shortening to 4s by level 5). |
| `powerPelletSpeedBurst` | Speed Burst | speed | Power pellet spikes your pace for a few seconds. | Power pellet spikes your pace hard for a few seconds. |
| `powerPelletInvuln` | Ghost Proof | protection | Power pellet lets you pass through ghosts for 3s (shortening toward 2s by level 5). | Power pellet lets you pass through ghosts for 5s (shortening toward ~3.3s by level 5). |
| `powerPelletGhostHarvester` | Ghost Harvester | automation | Power pellets make ghosts eat pellets for you for 5 seconds. | Power pellets make ghosts eat pellets for you for 8 seconds. |
| `fruitPowerPellet` | Fruit Power (rare) | harvest | Bonus fruit hits like a power pellet, triggering every effect you own. | Bonus fruit hits like a power pellet and turns a pellet hot. |
| `fruitQuarterBounty` | Quarter Bounty | harvest | Bonus fruit pays a Quarter instead of charging the bonus bar. | Bonus fruit pays two Quarters. |
| `fruitFecundity` | Fruit Fecundity | harvest | Bonus fruit lingers twice as long. | Bonus fruit waits until the level ends, and uncollected ones pile up side by side. |
| `fruitFeast` | Fruit Feast | harvest | Bonus fruit appears three times per level, each after the last is gone. | Bonus fruit appears four times per level, each after the last is gone. |
| `passiveDeathsHarvest` | Death's Harvest | death | Dying harvests nearby pellets. | Dying harvests every pellet within ten tiles. |
| `passiveOvercharge` | Overcharge (rare) | neutral | Doubles the duration of every other power pellet timer you're running. | Triples the duration of every other power pellet timer you're running. |
| `passiveTunnelDash` | Tunnel Dash | speed | Tunnels move you the instant you touch them. | Tunnels move you the instant you touch them, and ghosts crawl through them. |
| `passivePowerPelletRecharge` | Second Chomp | harvest | The first two power pellets you eat each level regenerate after ten seconds. | The first four power pellets you eat each level regenerate after seven seconds. |
| `passiveRemoteTransference` | Remote Transference | automation | Every 5th pellet you eat also eats the farthest pellet. | Every 3rd pellet you eat also eats the farthest pellet. |
| `passiveMyogenesis` | Myogenesis | death | Regenerate one life every level. | Refill every empty life slot on level clear. |
| `passiveDefyDeath` | Defy Death | death | Eat a power pellet: die within 5s and keep your life. | Eat a power pellet: die within 8s and keep your life. |
| `passiveTurnTuning` | Turn Tuning | speed | Tap turns up to two tiles early. Nail the beat for a speed kick. | Tap turns early, wider beat, longer speed kick. |
| `passiveDeathsBounty` | Death's Bounty | death | Dying pays a Quarter, a little less for each death on a level. | Dying pays a Quarter, barely less for each death on a level. |
| `passiveMoneyTalks` | Money Talks | death | Die on your last life: pay 3 Quarters to keep it. | Die on your last life: pay 1 Quarter to keep it. |
| `passiveLazyLooper` | Lazy Looper (rare) | speed | Only the outer pellet ring and the pellets beside the ghost house clear the board. | Only the outer pellet ring must be eaten to clear the board. |
| `passiveShieldPellets` | Shield | protection | Power pellets provide a shield. A ghost hit breaks it. | Power pellets provide a shield. Store up to 3. Each ghost hit breaks one. |
| `passiveDeathSpecialist` | Death Specialist | death | Own 3 other Death upgrades and every Death upgrade is enhanced. | Every Death upgrade you own is enhanced. |
| `passiveHarvestSpecialist` | Harvest Specialist | harvest | Own 3 other Harvest upgrades and every Harvest upgrade is enhanced. | Every Harvest upgrade you own is enhanced. |
| `passiveSpeedSpecialist` | Speed Specialist | speed | Own 3 other Speed upgrades and every Speed upgrade is enhanced. | Every Speed upgrade you own is enhanced. |
| `passiveAutomationSpecialist` | Automation Specialist | automation | Own 3 other Automation upgrades and every Automation upgrade is enhanced. | Every Automation upgrade you own is enhanced. |
| `passiveProtectionSpecialist` | Protection Specialist | protection | Own 3 other Protection upgrades and every Protection upgrade is enhanced. | Every Protection upgrade you own is enhanced. |
| `passiveDisruptionSpecialist` | Disruption Specialist | disruption | Own 3 other Disruption upgrades and every Disruption upgrade is enhanced. | Every Disruption upgrade you own is enhanced. |
| `passiveMartyr` | Martyr (rare) | death | Dying scatters the ghosts to their corners. You respawn where you fell. | Dying sends every ghost home. You respawn where you fell. |
| `passiveInterest` | Interest | automation | Entering a store pays 1 Quarter for every 3 you hold. | Entering a store pays 1 Quarter for every 2 you hold. |
| `passiveNearMiss` | Near Miss | protection | Ghosts that brush past without catching you charge the BONUS bar. | Ghosts that brush past without catching you charge the BONUS bar double. |
| `passiveHaunting` | Haunting | death | The ghost that last caught you stays caged in the ghost house for 10 seconds. | The ghost that last caught you stays caged in the ghost house for the level. |
| `passiveTunnelSanctuary` | Tunnel Sanctuary | protection | Leaving a tunnel makes you ghost-proof for a second, but ghosts speed through them. | Leaving a tunnel makes you ghost-proof for a second, and ghosts can't use tunnels. |
| `passiveStreakEngine` | Streak Engine (rare) | harvest | Every 30-pellet streak fires your power-pellet effects. | Every 30-pellet streak fires your power-pellet effects and grants Ghost Proof. |
| `passiveEcho` | Echo (rare) | automation | Power pellets fire a random one of your power effects again 3 seconds later. | Power pellets fire all of your power effects again 3 seconds later. |
| `powerPelletHunter` | Hunter (rare) | disruption | Power pellets frighten ghosts. Eat them! | Power pellets frighten ghosts. Eaten ghosts stay home until the fright ends. |
| `passiveStartingShield` | Starting Shield | protection | Start every level with a shield. A ghost hit breaks it. | Start every level with 2 shields. Each ghost hit breaks one. |
| `powerPelletHyperspeed` | Hyperspeed (rare) | speed | Power pellet: for 2s, run at 10x speed. Every turn costs a beat. | Power pellet: for 3s, run at 10x speed. A shield blocks one catch for 2s. |
| `passiveShieldBreak` | Shield Break (rare) | protection | When a shield breaks, fire all power pellet effects. Power pellet effects no longer trigger at pickup. | When a shield breaks, fire all power pellet effects. Getting a shield at your maximum fires them too. |
| `powerPelletCornucopia` | Cornucopia | harvest | Power pellet: spawns a bonus fruit, if none is out. | Power pellet: always spawns a bonus fruit, even beside others. |

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
- Clearing levels 2-8 (`offersUpgradeAfterLevel`) opens the pick-one modal: up to three upgrades at up/left/right plus an always-available Quarters option down. Never offered after level 1, level 9, or from fruit.
- `pickUpgradeChoiceOffer`: no repeated ids, prefers excluding `lastDeclinedUpgradeId` (set only when exactly one upgrade was offered alongside the choice), applies a forced id, and rolls enhancement **last** so seeded offers on other levels stay unchanged.
- The sim is fully frozen while the modal is open or animating; keys held through open are ignored until released. No dismiss: the player must pick.

## Cross-cutting rules

- **Timers** are separate and combine by "max wins": freeze (cyan tint on one ghost, zero speed, catch skip), Ghost Proof (gold tint, catch skip, ghosts keep moving), Defy Death (shares the gold tint; does not skip kills), wall pass (its tint wins). All clear on level advance and life-loss reset. Expiry while overlapping a ghost can kill on the same update.
- **Shields** are a banked count, not a timer: they survive timer clears, empty on level advance, and clamp to the cap when the upgrade is lost.
- **Speed**: `applyPlayerSpeed` / `applyGhostSpeed` in `PlaySim` combine the level ramp, owned multipliers, cell-based multipliers and active bursts every frame. Boss ghosts use a flat base.
- **Catch order**: shield break, then Death's Harvest, then Defy Death, then Money Talks, then death. A break or save is not a death (no life lost, `deathsThisBoard` unchanged where the code says so).
- **Boss level**: Lazy Looper is off; boss pellets are never optional.
- **LEARN** mirrors upgrades through shared helpers and the demo catch; toggling an upgrade off must clear its stale timers (`clearStaleUpgradeTimers`).
- **Run log** records activations per upgrade ([RUN_LOG.md](./RUN_LOG.md)).

## Adding an upgrade

Use the [`new-upgrade` skill](../.agents/skills/new-upgrade/SKILL.md) for the full touch-point list. In short: add a `BaseUpgradeId` and a row at the end of `BASE_UPGRADE_DEFS` with its required `enhanced` override, reuse existing effect fields where possible, add a `PlaySim` test (`registrySync.test.ts` enforces one), and cover it in LEARN.
