# BONUS bar

A persistent HUD meter that pays a Quarter each time it fills; the remainder carries over. The [slot machine](#slot-machine) is no longer tied to it. Quarters are spent at [store floors](./store.md). Logic: `src/domain/bonusBar.ts` and `timeBonus.ts` (constants and tier table live there, pinned by `bonusBar.test.ts`), run by `PlaySim`. Presentation math: `bonusBarFx.ts`, drawn by `PlayScene`. `?bonus=<0..299>` sets the starting charge (disables high scores).

## Rules

- A bump that overflows several times pays several Quarters. Charge lasts the whole run (deaths, level advances and stores keep it).
- Sources: pellet streaks, bonus fruit (half a bar, or Quarters directly with Quarter Bounty, no streak effect), Near Miss, Death's Bounty, and the level-end time bonus.
- A **streak** counts pellets the player's own body collects (the player collect frame including Pickup Range, and the Tunnel Dash sweep; a power pellet counts as one). Extra Hungry, Remote Transference, Ghost Harvest and Death's Harvest removals neither extend nor break it. Each time it reaches a multiple of `BONUS_STREAK_TIER_SIZE` the bar bumps by `bonusTierBump(tier)`.
- The streak breaks (charge kept) on stepping onto a blank tile, an idle gap, a death, a shield break, a new board or a store. Blank-tile check: a pellet is eaten shortly before the player's cell changes, so each eaten pellet credits its cell and entering a credited cell uses the credit; walking back over an eaten tile is a blank. Tunnels, the fruit tile and cleared corridors all break a streak.
- Clocks run only in normal play frames (not cards, modals, deaths, transitions or stores).
- Economy target: an 80%-efficient run fills the bar (one Quarter) about once per level, roughly 70% from streaks and 30% from the time bonus.

## HUD

The bar is drawn top center. It is a slotted pixel-art bar. Bumps animate by tier (bounce, then punch, then HUD chrome shake at higher tiers). The chrome is one `Container` (Quarters, countdown, upgrades, lives, bar), so shakes never move the maze or camera. State for probes: `play.bonus.{charge,streak,max,draining}`.

## Time bonus

Clearing a board drains the time left into the bar. The payout is quadratic in time left (`BONUS_TIME_SQUARE_DIVISOR`), so fast clears pay much more. The drain always takes `TIME_BONUS_DRAIN_MS` and pays the most valuable time first; Bar fills during the drain pay Quarters without pausing it, and the upgrade offer waits only for any queued slot spin. Order at a clear: fanfare, drain, upgrade offer (levels 1-8) or transition. No drain when the timer is 0 or on the level-9 clear. `PlaySim.step` holds all other gates while draining; `?jumpToUpgrade=1` drains the full timer.

## Slot machine

Bar fills pay a Quarter directly and do not spin. A world pickup (art: `public/art/other/slot-machine.png`) appears every four Quarters gained from non-spin sources; walking over it queues one spin on `PlaySim`'s `slotQueue` (same gate as `?jumpToSpinner=1`). Logic: counter/placement in `src/domain/slotPickup.ts`, spin table in `src/domain/slotMachine.ts`, both run by `PlaySim`. Drawn by `slotOverlay.ts` (placeholder art) and the maze render path.

### World pickup

Rules and constants: `src/domain/slotPickup.ts` (run by `PlaySim`). Non-spin Quarter gains advance a remainder counter; reel payouts and spends do not. Spawn is a seeded walkable cell (`slotPickup` stream; pellets may share it). Unclaimed machines keep `{col,row}` across levels (row flips with upside-down boards; solid cells remap), stay invisible through stores, and drop on the boss. Play only ([learn.md](./learn.md#parity)). Debug: `?slotMachine=1`. Probe: `play.slotPickup.*`.

### Spin

- 3 reels × 3 rows, 5 paylines (3 rows, 2 diagonals). Three in a line pay: Quarters a Quarter, a school a random unowned upgrade of that school (a Quarter if none is left), a life a life.
- The outcome is rolled first from a weighted table, then a grid is built that shows exactly that many lines. Targets: nothing under 10%, at least 0.85 Quarters per spin, upgrades and lives each about 25%, multi-line hits about a third.
- Lives are on the reels only below the life cap (the store free-life rule); at the cap life lines become Quarter lines.
- School symbols lean toward owned schools (`slotSchoolWeights`, the level-offer affinity rate).
- Feel: reels stop left to right; a third reel that could finish a school or life line is held longer; about a quarter of losing spins tease a near miss. A single-line spin takes about 3s; multi-line hits flash each line, then a finale. The final grid then holds, with every winning line lit, until the player presses a key; any upgrades won show as cards under it.
- Spins wait out death sequences and run back to back; the level-clear drain and offer wait for them.
