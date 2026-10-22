# Balance bots

Scripted bots play `PlaySim` headlessly, thousands of times, to point at upgrades, builds and ghosts worth retuning. It is a **60% tool**: rankings and outliers to investigate, not tuning values. No LLM plays; an agent reads the report afterwards ([balance-report skill](../.agents/skills/balance-report/SKILL.md)).

Code: `src/game/sim/bots/` (pure TS, Vitest-covered; personas and skill tiers are weight tables in `profiles.ts`, experiments and presets in the bot/script code) and `scripts/balance.mjs` (esbuild bundle, worker processes, output files). `npm run balance -- --help` lists flags.

## Workflow

- Iterate on the harness: `npm run balance -- --preset smoke` (fixed, a few minutes).
- Is it telling us anything: `--preset pilot` (30 min budget). Real numbers: `npm run balance` (6 h budget, `--budget-hours`). Check a full run fits: `--dry-run`.
- Did a tuning change help: `npm run balance:compare -- artifacts/balance/<A> artifacts/balance/<B>`. Compare runs of the same preset; arms match by experiment, arm and level.
- Ctrl-C finishes in-flight episodes and writes a report marked `PARTIAL`.

## Model

A profile is `<persona>@<skill tier>`: personas (`cautious`, `speedrunner`, `disrupter`, `collector`, `casual`) weight routes, upgrades and store purchases; tiers set search depth, reaction delay, press jitter and wrong-turn rate. Batches use every persona `@expert` (a strong player who reads ghost AI) plus `cautious` and `casual` `@average` (a solid player with a shorter horizon and slower hands). `casual` picks upgrades at random, so it shows what a build is worth without the bot's own taste.

- **Perception:** ghost positions come from a ring buffer `reactionMs` old; the board is current.
- **Decisions:** at each cell the bot searches routes `depth` tiles ahead (tier values in `profiles.ts`). For every route it simulates each ghost with the game's own targeting (`resolveGhostTarget` + `pickGhostDirection`). Routes that get caught are rejected; survivors score pellets, power pellets, fruit, frightened ghosts and end distance from ghosts. Ghost Proof and frightened time are honored.
- **Execution:** turns press shortly before the corner plus jitter. A wrong turn picks another survivable route; deaths come from slow reactions, late presses and what the search can't see.
- All randomness comes from the `bot` `RunRandom` stream, so an episode replays exactly from its job (profile + seed + arm).
- Levels 1-2 are never played. Every arm uses the same seeds so arms compare on the same boards. Levels are capped in sim time; hitting the cap records `stalled`.

Experiments: `builds` (play from the level-2 offer to the boss), `singles` (one upgrade at one level vs a `none` arm), `pairs`, `schools` (with and without the Specialist) and `enemies` (each roster and each ghost alone). Presets differ in profiles, arms and budget; pilot and full calibrate seconds per run and split the budget across experiments, giving build runs whatever remains.

## Output

`artifacts/balance/<timestamp>-<preset>/` (gitignored): `episodes.jsonl` (one result per episode), `summary.json` (metrics with 95% intervals; `compare` reads it), `report.md` and `compare.md`.

## Reading the report

- **Health first.** Errors or over 2% `stalled` means the bots got stuck: the report says `UNTRUSTWORTHY` at the top; fix that before trusting anything.
- **Executive summary** (right after Health): one-line takeaway, the most over/underperforming upgrades (singles Δ progress with a short why, plus build value when present), and watchouts (difficulty spikes, pair synergies, lethal ghosts, hard rosters, play-style spread, school specialists). Thin seeds/arm (< 50) are called out as leads only. Detail tables below are the evidence.
- **Board progress** (1 for a clear, else the share of pellets eaten before game over) is the main forced-test metric. `*` means the 95% intervals don't overlap.
- **Difficulty curve** (Builds): share of runs reaching each level and deaths spent on it. A steep drop between two levels is a difficulty spike; compare `@expert` with `@average` to see who it hits.
- **Upgrade value** compares mean level reached when taken vs offered and passed, which removes most of the "long runs collect more upgrades" bias. `casual` picks at random, so its rows are cleanest. At the [slot cap](./upgrades.md#slot-cap-and-salvage) a bot salvages the lowest-scored of its six slots and the new card, keeping owned cards on a tie (`pickSalvage`). School mixes and co-owned pairs carry survivorship bias: leads, not proof.
- **Pairs:** synergy = pair - A - B + none; large positive is worth a look, large negative means they cancel.
- **Ghost lethality:** catches per minute a ghost spent outside the house.

## Known limitations

Bots play like bots: compare arms and profiles within one run rather than reading absolute rates. The planner assumes ghosts keep their current scatter/chase mode over its horizon (mode flips reverse them) and treats frightened ghosts as standing still. It does not model what a power pellet it plans to eat would trigger (Ghost Proof, Hunter, Freeze …) or a shield absorbing a hit, so it never plans a power-pellet escape or trades a shield for pellets: proactive-use upgrades read as lower bounds. Upgrades needing deliberate use (Hyperspeed steering, Wall Pass shortcuts) are used only as far as the generic weights reach. Board progress divides by every pellet, so Lazy Looper reads lower than it plays (trust its clear rate). Build runs start at the level-2 offer with default lives and Quarters. No boss, no build search, no calibration against real players.
