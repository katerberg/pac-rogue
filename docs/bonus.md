# BONUS bar

A persistent HUD meter that pays one **Quarter** each time it fills; the remainder carries over. Quarters are spent at [store floors](./store.md). Logic: `src/domain/bonusBar.ts` and `timeBonus.ts` (constants and tier table live there, pinned by `bonusBar.test.ts`), run by `PlaySim`. Presentation math: `bonusBarFx.ts`, drawn by `PlayScene`. `?bonus=<0..299>` sets the starting charge (disables high scores).

## Rules

- A bump that overflows several times pays several Quarters. Charge lasts the whole run (deaths, level advances and stores keep it).
- Sources: pellet streaks, bonus fruit (half a bar, or Quarters directly with Quarter Bounty, no streak effect), Near Miss, Death's Bounty, and the level-end time bonus.
- A **streak** counts pellets the player's own body collects (the player collect frame including Pickup Range, and the Tunnel Dash sweep; a power pellet counts as one). Extra Hungry, Remote Transference, Ghost Harvest and Death's Harvest removals neither extend nor break it. Each time it reaches a multiple of `BONUS_STREAK_TIER_SIZE` the bar bumps by `bonusTierBump(tier)`.
- The streak breaks (charge kept) on stepping onto a blank tile, an idle gap, a death, a shield break, a new board or a store. Blank-tile check: a pellet is eaten shortly before the player's cell changes, so each eaten pellet credits its cell and entering a credited cell uses the credit; walking back over an eaten tile is a blank. Tunnels, the fruit tile and cleared corridors all break a streak.
- Clocks run only in normal play frames (not cards, modals, deaths, transitions or stores).
- Economy target: an 80%-efficient run earns about one Quarter per level, roughly 70% from streaks and 30% from the time bonus.

## HUD

The bar is drawn top center. It is a slotted pixel-art bar. Bumps animate by tier (bounce, then punch, then HUD chrome shake at higher tiers). The chrome is one `Container` (Quarters, `Time:`, upgrades, lives, bar), so shakes never move the maze or camera. State for probes: `play.bonus.{charge,streak,max,draining}`.

## Time bonus

Clearing a board drains the time left into the bar. The payout is quadratic in time left (`BONUS_TIME_SQUARE_DIVISOR`), so fast clears pay much more. The drain always takes `TIME_BONUS_DRAIN_MS` and pays the most valuable time first; Quarters are paid as the bar fills, so they are in hand before the upgrade offer. Order at a clear: fanfare, drain, upgrade offer (levels 2-8) or transition. No drain when the timer is 0 or on the level-9 clear. `PlaySim.step` holds all other gates while draining; `?jumpToUpgrade=1` drains the full timer.
