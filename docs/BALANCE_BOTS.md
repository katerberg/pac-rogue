# Balance bots

Scripted bots play `PlaySim` headlessly, thousands of times, to point at upgrades, builds and ghosts worth retuning. It is a **60% tool**: rankings and outliers to investigate, not tuning values. No LLM plays; a Sonnet-class agent can read the report afterwards ([balance-report skill](../.agents/skills/balance-report/SKILL.md)).

Code: [`src/game/sim/bots/`](../src/game/sim/bots/) (pure TS, Vitest-covered) and [`scripts/balance.mjs`](../scripts/balance.mjs) (bundles the bots with esbuild, runs worker processes, writes files).

## Workflow

| Step                       | Command                                                                  | Time                                    |
| -------------------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| Iterate on the harness     | `npm run balance -- --preset smoke`                                      | ~3 min (fixed size)                     |
| Is it telling us anything? | `npm run balance -- --preset pilot`                                      | 30 min budget                           |
| Check a full run fits      | `npm run balance -- --dry-run`                                           | 1 min calibration                       |
| Real numbers               | `npm run balance`                                                        | 6 h budget (`--budget-hours` to change) |
| Did a tuning change help?  | `npm run balance:compare -- artifacts/balance/<A> artifacts/balance/<B>` | seconds                                 |

Other flags: `--workers N` (default: cores − 1), `--only builds,singles,pairs,schools,enemies`, `--profiles cautious@average,…`, `--calibrate-seconds N`, `--out DIR`. Ctrl-C finishes in-flight episodes and writes a report marked `PARTIAL`.

Compare runs of the same preset. Arms are matched by experiment, arm and level, so a pilot only lines up with the pilot-sized slice of a full run.

## Profiles

A profile is `<persona>@<skill tier>`. Personas live in [`profiles.ts`](../src/game/sim/bots/profiles.ts) as plain weight tables, all scored by one decision engine.

| Persona       | Moves                                                                                           | Picks upgrades           | Store                     |
| ------------- | ----------------------------------------------------------------------------------------------- | ------------------------ | ------------------------- |
| `cautious`    | Strong ghost fear, wide margin                                                                  | Protection, then Death   | Buys a life at 2 or fewer |
| `speedrunner` | Pellet-first, narrow margin                                                                     | Speed, then Automation   | Never buys lives          |
| `disrupter`   | Saves power pellets until 2 ghosts are within 6 tiles (or 1 within 3); chases frightened ghosts | Disruption               | Life at 1 or fewer        |
| `collector`   | Goes for fruit and unbroken pellet streaks                                                      | Harvest, then Automation | Also buys enhancements    |
| `casual`      | Noisy routing, double mistake rate                                                              | Random                   | One random purchase       |

Non-random pickers add a bonus for a school they already own 2+ of and for multiplier upgrades (Overcharge, Echo, Fruit Power, Streak Engine) once they own 2+ upgrades.

| Tier      | Reaction delay | Press jitter (σ) | Wrong-turn rate |
| --------- | -------------- | ---------------- | --------------- |
| `novice`  | 250 ms         | 100 ms           | 2%              |
| `average` | 180 ms         | 50 ms            | 0.5%            |
| `expert`  | 100 ms         | 15 ms            | 0%              |

Batches use 9 profiles: every persona `@average`, plus `cautious` and `casual` at `novice` and `expert`.

### How a bot plays

- **Perception:** ghost positions come from a ring buffer `reactionMs` old; the board (pellets, power pellets, fruit, Wall Pass solids) is current.
- **Decisions:** at each cell ahead of the player, every open exit is scored: danger from each threatening ghost (BFS distance scaled by its speed, ghosts can't reverse), **territory** (cells the bot reaches before any ghost, which catches pincers), nearest pellet / power pellet / fruit / frightened ghost / tunnel, and noise. Reversing is scored from the player's real cell.
- **Execution:** turns are pressed 0.75 tile before the corner plus Gaussian jitter; a late press misses the corner, as it would for a person. Turn Tuning's tap window applies naturally.
- **Offers and stores:** offers go through the persona's picker; stores are bought by clicking slots and leaving through the nearest tunnel.

Randomness comes from the `bot` `RunRandom` stream, so an episode replays exactly from its job (profile + seed + arm).

## Experiments

Levels 1–2 are never played: we assume reasonable players clear them with any starting upgrade.

| Experiment | Start                                                                                                                | Ends                                        | Profiles     |
| ---------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------ |
| `builds`   | Level-2 clear offer (`jumpToUpgrade`) with the starting upgrade the seed would roll; bot picks every offer and shops | Level 9 begins (`reachedBoss`) or game over | all 9        |
| `singles`  | One level (3, 5, 8) with only the tested upgrade (base and `Plus`), plus a no-upgrade `none` arm                     | Level clear or game over                    | all 9        |
| `pairs`    | Level 5 with two base upgrades                                                                                       | same                                        | 5 `@average` |
| `schools`  | Levels 5 and 8 with a school's first 3 upgrades, with and without its Specialist                                     | same                                        | all 9        |
| `enemies`  | Level 5 with each forced roster (`roster:0..5`) and each ghost alone (`ghost:<kind>`)                                | same                                        | all 9        |

School Specialists are never tested alone (they do nothing without 3 school upgrades). Every arm uses the same seeds (`bal-0 … bal-N`), so arms are compared on the same boards. Each level is capped at 240 s of sim time; hitting it records `stalled`.

### Presets and budget

- **smoke**: 3 profiles (`cautious@average`, `disrupter@average`, `casual@novice`), level 5 only, the 8 upgrades in `SMOKE_UPGRADES` (Ghost Proof, Afterburner, Hunter, Extra Hungry, Fruit Power, Extra Life, Overcharge, Hyperspeed), 4 pairs among them, the Speed school, roster 0 and Blinky alone. 30 build runs per profile, 10 seeds per forced arm. Its job is to prove the pipeline works end to end, not to measure.
- **pilot**: the 5 `@average` profiles; singles at level 5 (base only), the 28 pairs among the smoke upgrades, every school at level 5, every enemy arm. 30-minute budget.
- **full**: the whole matrix above. 6-hour budget.

pilot and full first spend `--calibrate-seconds` (60) measuring seconds per build run and per one-level test on this machine. Then one-level experiments get fixed shares of the budget (singles + schools 20%, pairs 20%, enemies 5%, pair re-runs 5%), each with a minimum of 10 (pilot) or 20 (full) seeds, and **build runs get whatever remains**. If the minimums alone don't fit, the CLI prints the estimate per experiment and exits 1 before running anything. After the first pass, the 20 pairs with the largest synergy (positive or negative) run again with extra seeds.

## Output

`artifacts/balance/<YYYYMMDD-HHMM>-<preset>/` (gitignored):

- `episodes.jsonl`: one `EpisodeResult` per line (job, outcome, level reached, board progress, deaths with ghost and mode, ghost time out, offers, final loadout, Quarters spent).
- `summary.json`: per-arm, per-profile metrics with 95% intervals, build analysis, ghost lethality. `compare` reads this.
- `report.md`: the human / Sonnet-readable report.
- `compare.md` (written next to the second run by `balance:compare`).

## Reading the report

- **Health** first. Errors or more than 2% `stalled` episodes means the bots got stuck somewhere: fix that before trusting anything (the report says `UNTRUSTWORTHY` at the top).
- **Board progress** is the main forced-test metric: 1 for a clear, otherwise the share of the board's pellets eaten before game over. It still separates upgrades when nobody clears.
- **Singles**: Δ progress vs `none` per profile, then clear rate. `*` = the 95% intervals don't overlap.
- **Builds / upgrade value**: mean level reached when the bot took an upgrade minus when it was offered and passed. Comparing against "offered but passed", instead of everyone else, removes most of the "long runs collect more upgrades" bias. `casual` picks at random, so its rows are the cleanest.
- **Strongest final school mixes** and **co-owned pairs** are leads, not proof: they still carry survivorship bias.
- **Pairs**: synergy = pair − A − B + none on board progress at level 5. Large positive = a combination worth a look; large negative = they cancel out.
- **Enemies**: per-board clear rate and deaths; ghost lethality = catches per minute that ghost spent outside the house, across every experiment.
- **Cross-profile spread**: upgrades whose value depends most on who plays them.

## Known limitations

- Bots play like bots. Absolute rates mean little; compare arms and profiles within one run.
- The decision engine is heuristic. At level 3 with no upgrades, `cautious@average` clears about half the time; build runs average around level 4–5 and rarely reach the boss. Tune `navigate.ts` weights if bot strength becomes the bottleneck.
- Upgrades that need deliberate use (Tunnel Dash timing, Hyperspeed steering, Wall Pass shortcuts) are only used as far as the generic weights reach them.
- Board progress divides by every pellet on the board, so Lazy Looper (which only requires the outer ring and house-side pellets) reads lower than it plays; trust its clear rate over its progress.
- Build runs start at the level-2 offer with full lives and the default Quarters, not with what a player would have earned on levels 1–2.
- No boss (level 9), no evolutionary build search, no calibration against real player data yet.
