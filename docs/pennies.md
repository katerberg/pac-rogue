# Pennies

A persistent HUD row of pennies: 24 of them collapse into a Quarter, and the remainder carries over. The [slot machine](#slot-machine) is no longer tied to it. Quarters are spent at [store floors](./store.md). Logic: `src/domain/pennies.ts` and `timePennies.ts` (constants and tier table live there, pinned by `pennies.test.ts`), run by `PlaySim`. Presentation math: `penniesFx.ts`, drawn by `PlayScene`. `?pennyCharge=<0..299>` sets the starting charge (disables high scores).

Charge is stored in fractions of a Quarter (a Quarter is `QUARTER_CHARGE`), so the economy is tuned finer than a whole penny; the row shows the whole pennies in the charge.

## Rules

- A bump that overflows several times pays several Quarters. Charge lasts the whole run (deaths, level advances and stores keep it).
- Sources: pellet streaks, bonus fruit (half a Quarter, or Quarters directly with Quarter Bounty, no streak effect), Near Miss, Death's Bounty, and the level-end time pennies.
- A **streak** counts pellets the player's own body collects (the player collect frame including Pickup Range,; a power pellet counts as one). Extra Hungry, Remote Transference, Ghost Harvest and Death's Harvest removals neither extend nor break it. Tithe counts each pellet twice while its window runs. Gleaning adds crumb steps from ghosts (see [upgrades](./upgrades.md)): an active ghost entering an eaten pellet tile, once per tile per board, adds a step only while a streak is running, without crediting the tile or resetting the idle gap. Each time it reaches a multiple of `PENNY_STREAK_TIER_SIZE` the charge grows by `pennyTierBump(tier)`.
- The streak breaks (charge kept) on stepping onto a blank tile, an idle gap, a death, a shield break, a new board or a store. Blank-tile check: a pellet is eaten shortly before the player's cell changes, so each eaten pellet credits its cell and entering a credited cell uses the credit; walking back over an eaten tile is a blank. Tunnels, the fruit tile and cleared corridors all break a streak.
- Clocks run only in normal play frames (not cards, modals, deaths, transitions or stores).
- Economy target: an 80%-efficient run earns about one Quarter per level, roughly 70% from streaks and 30% from the time pennies.

## HUD

The pennies drop in one by one along the top center, up to a full row. A full row sweeps left and stacks on the slot the new Quarter will take; the Quarter appears (and pulses) only once the stack is complete. Several Quarters collapse one after another. Streak tiers hop the row, and higher tiers shake the HUD chrome (one `Container`, so shakes never move the maze or camera). State for probes: `play.pennies.{charge,count,streak,max,draining}` and the row's own `pennyRow.{shown,collapsing,landed,backlog,quartersShown}` fields from `PlayScene.debugSnapshot()`.

## Time pennies

Clearing a board drains the time left into the pennies. The payout is quadratic in time left (`PENNY_TIME_SQUARE_DIVISOR`), so fast clears pay much more. The drain always takes `TIME_PENNY_DRAIN_MS` and pays the most valuable time first; Full rows during the drain pay Quarters without pausing it, and the upgrade offer waits only for any queued slot spin. While draining, every earned penny appears in stacks beside the timer (the row holds its drops); when the drain ends those same pennies slide left into the row, farthest stack first (`holdPennyFx` / `releasePennyFx`), and a full row collapses into a Quarter as usual. Order at a clear: fanfare, drain, upgrade offer (levels 1-8) or transition. No drain when the timer is 0 or on the level-9 clear. `PlaySim.step` holds all other gates while draining; `?jumpToUpgrade=1` drains the full timer.

## Slot machine

Full penny rows pay a Quarter directly and do not spin. A world pickup (art: `public/art/other/slot-machine.png`) appears every four Quarters gained from non-spin sources; walking over it queues one spin on `PlaySim`'s `slotQueue` (same gate as `?jumpToSpinner=1`). Logic: counter/placement in `src/domain/slotPickup.ts`, spin table in `src/domain/slotMachine.ts`, both run by `PlaySim`. Drawn by `slotOverlay.ts` (placeholder art) and the maze render path.

### World pickup

Rules and constants: `src/domain/slotPickup.ts` (run by `PlaySim`). Non-spin Quarter gains advance a remainder counter; reel payouts and spends do not. Spawn is a seeded walkable cell (`slotPickup` stream; pellets may share it). Unclaimed machines keep `{col,row}` across levels (row flips with upside-down boards; solid cells remap), stay invisible through stores, and drop on the boss. Play only ([learn.md](./learn.md#parity)). Debug: `?slotMachine=1`. Probe: `play.slotPickup.*`.

### Spin

- 3 reels × 3 rows, 5 paylines (3 rows, 2 diagonals). Three in a line pay: Quarters a Quarter, a school a random eligible upgrade of that school (a Quarter if none is left), a life a life. The neutral symbol pays a Trinket or Overcharge.
- The outcome is rolled first from a weighted table, then a grid is built that shows exactly that many lines. Targets: nothing under 10%, at least 0.65 Quarters per spin, upgrades and lives each about 25%, multi-line hits under a quarter.
- Lives are on the reels only below the life cap (the store free-life rule); at the cap life lines become Quarter lines.
- School symbols lean toward owned schools (`slotSchoolWeights`, the level-offer affinity rate). Neutral is a reel school at the same base weight with no affinity. This deliberately makes upgrade lines worth less: with nothing owned, about one upgrade line in seven pays neutral.
- Upgrade wins at the [slot cap](./upgrades.md#slot-cap-and-salvage) open the salvage prompt after the final grid is dismissed; a Trinket goes straight to the pool.
- Feel: reels stop left to right; a third reel that could finish a school or life line is held longer; about a quarter of losing spins tease a near miss. A single-line spin takes about 3s; multi-line hits flash each line, then a finale. The final grid then holds, with every winning line lit, until the player presses a key; any upgrades won show as cards under it.
- Spins wait out death sequences and run back to back; the level-clear drain and offer wait for them.
