# Pennies

A persistent HUD row of pennies: 24 of them collapse into a Quarter, and the remainder carries over. The [slot machine](#slot-machine) is no longer tied to it. Quarters are spent at [store floors](./store.md). Logic: `src/domain/pennies.ts` and `timePennies.ts` (constants and tier table live there, pinned by `pennies.test.ts`), run by `PlaySim`. Presentation math: `penniesFx.ts`, drawn by `PlayScene`. `?pennyCharge=<0..299>` sets the starting charge (disables high scores).

Charge is stored in fractions of a Quarter (a Quarter is `QUARTER_CHARGE`), so the economy is tuned finer than a whole penny; the row shows the whole pennies in the charge.

## Rules

- A bump that overflows several times pays several Quarters. Charge lasts the whole run (deaths, level advances and stores keep it).
- Sources: pellet streaks, bonus fruit (half a Quarter, or Quarters directly with Quarter Bounty, no streak effect), Near Miss, Death's Bounty, and the level-end time pennies.
- A **streak** counts pellets the player's own body collects (the player collect frame including Pickup Range, and the Tunnel Dash sweep; a power pellet counts as one). Extra Hungry, Remote Transference, Ghost Harvest and Death's Harvest removals neither extend nor break it. Each time it reaches a multiple of `PENNY_STREAK_TIER_SIZE` the charge grows by `pennyTierBump(tier)`.
- The streak breaks (charge kept) on stepping onto a blank tile, an idle gap, a death, a shield break, a new board or a store. Blank-tile check: a pellet is eaten shortly before the player's cell changes, so each eaten pellet credits its cell and entering a credited cell uses the credit; walking back over an eaten tile is a blank. Tunnels, the fruit tile and cleared corridors all break a streak.
- Clocks run only in normal play frames (not cards, modals, deaths, transitions or stores).
- Economy target: an 80%-efficient run earns about one Quarter per level, roughly 70% from streaks and 30% from the time pennies.

## HUD

The pennies drop in one by one along the top center, up to a full row. A full row sweeps left, shrinking into the Quarter row, and the new Quarter pulses as it lands. Several Quarters collapse one after another. Streak tiers hop the row, and higher tiers shake the HUD chrome (one `Container`, so shakes never move the maze or camera). State for probes: `play.pennies.{charge,count,streak,max,draining}` and the row's own `pennyRow.{shown,collapsing,landed,backlog}` fields from `PlayScene.debugSnapshot()`.

## Time pennies

Clearing a board drains the time left into the pennies. The payout is quadratic in time left (`PENNY_TIME_SQUARE_DIVISOR`), so fast clears pay much more. The drain always takes `TIME_PENNY_DRAIN_MS` and pays the most valuable time first; Full rows during the drain pay Quarters without pausing it, and the upgrade offer waits only for any queued slot spin. Order at a clear: fanfare, drain, upgrade offer (levels 1-8) or transition. No drain when the timer is 0 or on the level-9 clear. `PlaySim.step` holds all other gates while draining; `?jumpToUpgrade=1` drains the full timer.

## Slot machine

A full row pays a Quarter directly and do not spin. The machine is kept for special events to come: push onto `PlaySim`'s `slotQueue` to spin it (`?jumpToSpinner=1` does this at start). Logic: `src/domain/slotMachine.ts` (outcome table, grid composer, timeline, pinned by `slotMachine.test.ts`), run by `PlaySim` on the `slots` random stream. Drawn by `slotOverlay.ts` (placeholder art).

- 3 reels × 3 rows, 5 paylines (3 rows, 2 diagonals). Three in a line pay: Quarters a Quarter, a school a random unowned upgrade of that school (a Quarter if none is left), a life a life.
- The outcome is rolled first from a weighted table, then a grid is built that shows exactly that many lines. Targets: nothing under 10%, at least 0.85 Quarters per spin, upgrades and lives each about 25%, multi-line hits about a third.
- Lives are on the reels only below the life cap (the store free-life rule); at the cap life lines become Quarter lines.
- School symbols lean toward owned schools (`slotSchoolWeights`, the level-offer affinity rate).
- Feel: reels stop left to right; a third reel that could finish a school or life line is held longer; about a quarter of losing spins tease a near miss. A single-line spin takes about 3s; multi-line hits flash each line, then a finale. The final grid then holds, with every winning line lit, until the player presses a key; any upgrades won show as cards under it.
- Spins wait out death sequences and run back to back; the level-clear drain and offer wait for them.
