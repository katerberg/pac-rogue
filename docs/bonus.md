# BONUS bar

A persistent HUD meter that pays one **Quarter** each time it fills. Eating pellets in an unbroken streak bumps it; the charge carries over after a fill, so careful pellet ordering earns extra Quarters to spend at [store floors](./store.md).

## Rules

[`src/domain/bonusBar.ts`](../src/domain/bonusBar.ts), run by `PlaySim`:

- The bar holds `BONUS_BAR_MAX` (300) points. A fill pays 1 Quarter and keeps the remainder. One bump that overflows several times pays several Quarters.
- Eating bonus fruit adds `FRUIT_BONUS_CHARGE` (150, half a bar). With Quarter Bounty it pays Quarters directly (1; 2 enhanced) and skips the charge. It does not touch the streak.
- Each ghost that brushes past within 1 tile without a catch, with [Near Miss](./upgrades.md#near-miss), adds 15 (30 enhanced).
- Each death with [Death's Bounty](./upgrades.md#deaths-bounty) adds up to a full bar (300), less for later deaths on the same level.
- The charge lasts the whole run: deaths, level advances and store floors keep it. `?bonus=` sets the starting charge.
- A **streak** counts pellets the player's own body collects: the `collectPellets` player frame (including the Pickup Range radius) and the Tunnel Dash sweep. A power pellet counts as one. Extra Hungry, Remote Transference, Ghost Harvest and Death's Harvest removals neither extend nor break a streak.
- Each time the streak reaches a multiple of `BONUS_STREAK_TIER_SIZE` (5), the bar bumps by `bonusTierBump(tier)`; pellets in between add nothing. One frame that crosses several thresholds adds them all.
- With [Streak Engine](./upgrades.md#streak-engine), every 30th pellet of a streak also fires your power-pellet effects, and 5, 10 … 30 pop off the pellets.
- The streak breaks (charge kept) when:
  - the player steps onto a **blank tile**: the new cell has no pellet and was not just eaten (see below), or
  - no pellet is collected for `BONUS_STREAK_IDLE_MS` (400) while a streak is running, or
  - the player dies, a shield breaks, a new board starts, or a store floor is entered.
- Blank-tile check: a pellet is eaten about 6 px before the player's cell changes to its tile, so each eaten pellet **credits** its cell. Entering a credited cell uses the credit up; walking back over a tile eaten earlier in the streak is a blank. Tunnels, the fruit tile and cleared corridors all break a streak.
- The clocks only run in normal play frames (not during cards, modals, deaths, transitions or stores).

### Tier table

| Streak | Tier | Bump | Streak total | Bar % | Motion                                     |
| -----: | ---: | ---: | -----------: | ----: | ------------------------------------------ |
|      5 |    1 |   +2 |            2 |    1% | bounce: hop 1, 1 wobble                    |
|     10 |    2 |   +3 |            5 |    2% | bounce: hop 1, 1 wobble                    |
|     15 |    3 |   +5 |           10 |    3% | bounce: hop 2, 2 wobbles                   |
|     20 |    4 |   +8 |           18 |    6% | bounce: hop 2, 2 wobbles, slot wave        |
|     25 |    5 |  +12 |           30 |   10% | bounce: hop 3, 3 wobbles, slot wave        |
|     30 |    6 |  +16 |           46 |   15% | punch: flash 90 ms, shake 1                |
|     35 |    7 |  +21 |           67 |   22% | punch: flash 120 ms, shake 1               |
|     40 |    8 |  +26 |           93 |   31% | punch: flash 150 ms, shake 2, chrome shake |
|     45 |    9 |  +31 |          124 |   41% | punch: flash 180 ms, shake 2, chrome shake |
|     50 |   10 |  +36 |          160 |   53% | punch: flash 210 ms, shake 3, chrome shake |

Tiers past 6 add 5 more each.

### Economy reference

Tuned so an 80%-efficient run earns about one Quarter per level, roughly 70% from streaks and 30% from the level-end [time bonus](#time-bonus). A 240-pellet board eaten as 12 streaks of 20 gives 216 points (0.72 of a bar); 24 streaks of 10 give 120; 4 streaks of 60 give 988 (3 Quarters). `bonusBar.test.ts` pins these numbers.

## HUD

[`src/domain/bonusBarFx.ts`](../src/domain/bonusBarFx.ts) holds all the presentation math (pure, unit-tested); `PlayScene` steps it every frame and draws from that math with Phaser `Graphics`.

- A `BONUS` label and a 75×8 art bar at top center, drawn at `BONUS_ART_SCALE` (2). Palette: maze blue `0x2121de` (tube outline), pellet yellow `0xffd800` (fill), pale yellow `0xfff4a3` (hot core / highlight). White appears only during a punch flash.
- Settings → **STYLE** skins the meter (same store as ghosts/walls; see [line-art.md](./line-art.md)):
  - **PIXEL:** 12 slots of 25 points, each 5×4 art pixels with 1 px gaps (`barRects`). Empty slots get a 1 px floor dash. A partly filled slot draws whole pixels, at least 1 px for any charge. Slot pops raise individual segments.
  - **NEON / LINED:** a capsule neon tube (`neonBarTube` + rounded stroke/fill): dim glass track, blue outline, continuous yellow fill with rounded tip and a brighter core strip. Slot-pop FX remaps to a whole-tube pulse. **NEON** also adds a knockout Phaser Glow (`bonusBarGlowFilter`, strength 7 / distance 18 px); **LINED** keeps the tube without glow.
- The displayed fill follows the charge on a soft spring (slight overshoot). At 75% full the fill blinks yellow / pale yellow every 260 ms.
- Bumps (`bonusBumpFx(tier)`): tiers 1–5 **bounce** (the bar hops and wobbles; a slot wave from tier 4). Tier 6+ **punch** (white flash, hard horizontal shake, every slot pops at once). Tier 8+ also shakes the **HUD chrome**.
- The chrome is one `Container` holding the Quarter icons, `Time:`, the upgrades list, the life icons and the bar. A chrome shake steps it through fixed offsets; the maze, actors and camera never move.
- A fill runs the bar up to full, pops a wave across all 12 slots (neon: whole-fill pulse), resets to the carried-over charge, pulses the new Quarter icon and plays both munch sounds.
- On store floors the bar stays visible and static.

## Testing flag

`?bonus=<0..299>` starts the run with that much charge (invalid → 0 with a console warning). It disables high-score saving, like every debug flag. Example: `http://127.0.0.1:5174/?play=1&level=2&bonus=295`.

`play.bonus.{charge,streak,max,draining}` in the debug snapshot exposes the state for `npm run probe`.

## Time bonus

[`src/domain/timeBonus.ts`](../src/domain/timeBonus.ts): clearing a board drains the time left into the bar.

- The payout is the square of the time left over `BONUS_TIME_SQUARE_DIVISOR` (2250), so fast clears pay far more than slow ones. A typical good clear with about 45 s left (450) is worth 90; 70 s left (700) is worth 217; a full 999 timer is worth 443 (over a Quarter); 22 s left (225) is worth 22.
- The drain pays the most valuable time first: each tick credits what the drained slice of the curve is worth, so the bar rises fastest at the start.
- The drain always takes `TIME_BONUS_DRAIN_MS` (1200), whatever the amount. `Time:` counts down to 0 in pellet yellow while the bar rises; Quarters are paid as it fills (the usual fill wave and pulse), so they are in hand before the upgrade offer.
- Order at a clear: level-complete fanfare → drain → upgrade offer (levels 2–8) or the transition (level 1).
- No drain when the timer is already 0, and none on the level-9 boss clear (the run ends there).
- `PlaySim.step` holds every other gate while it drains (`play.bonus.draining` in the snapshot); `?jumpToUpgrade=1` clears the board at once, so it drains the full 999.
