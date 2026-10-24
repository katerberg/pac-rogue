# Balance bots

Scripted bots play `PlaySim` headlessly, thousands of times, to say whether each skill tier reaches the levels it should ([targets](#targets)) and to point at upgrades, builds and ghosts worth retuning. It is a **60% tool**: rankings and outliers to investigate, not tuning values. No LLM plays; an agent reads the report afterwards ([balance-report skill](../.agents/skills/balance-report/SKILL.md)).

Code: `src/game/sim/bots/` (pure TS, Vitest-covered; personas and skill tiers are weight tables in `profiles.ts`, experiments and presets in the bot/script code) and `scripts/balance.mjs` (esbuild bundle, worker processes, output files). `npm run balance -- --help` lists flags.

## Workflow

- Iterate on the harness: `npm run balance -- --preset smoke` (fixed, a few minutes).
- Is it telling us anything: `--preset pilot` (30 min budget). Real numbers: `npm run balance` (6 h budget, `--budget-hours`). Check a full run fits: `--dry-run`.
- Did a tuning change help: `npm run balance:compare -- artifacts/balance/<A> artifacts/balance/<B>`. Compare runs of the same preset; arms match by experiment, arm and level.
- Ctrl-C finishes in-flight episodes and writes a report marked `PARTIAL`.

## Targets

The game is balanced against a reach curve per player experience, not against upgrade rankings: a first-time player should usually clear level 2, levels 6-9 should take hours of play, and a win should take about ten hours of reps. Each skill tier stands for one point on that curve, and the bands it must land in (reach level 3, reach level 6, reach the boss, win per run) are the table in [`targets.ts`](../src/game/sim/bots/targets.ts). The report leads with target vs actual per tier; everything after it is the evidence for which knob moves a missed cell. Win is a target only: build runs stop at the boss until the planner understands boss fights. The tiers are not yet calibrated against recorded human runs ([run log](./RUN_LOG.md)); that is the next step, and until then compare tiers with each other rather than trusting a cell to the point.

## Model

A profile is `<persona>@<skill tier>`: personas (`cautious`, `speedrunner`, `disrupter`, `collector`, `casual`) weight routes, upgrades and store purchases; tiers set search depth, reaction delay, press jitter, wrong-turn rate and whether the bot reads ghost targeting (`profiles.ts`). `expert` is a strong player who reads ghost AI; `average` has a shorter horizon and slower hands; `novice` is slower still, turns wrong more often and does not read ghosts at all: its plan assumes each ghost keeps its heading and turns only at walls. Forced tests use every persona `@expert` plus `cautious` and `casual` `@average`; build runs add novice profiles (`presetArms` in `experiments.ts`) so the difficulty curve covers all three tiers. `casual` picks upgrades at random, so it shows what a build is worth without the bot's own taste.

- **Perception:** ghost positions come from a ring buffer `reactionMs` old; the board is current.
- **Decisions:** at each cell the bot searches routes `depth` tiles ahead (tier values in `profiles.ts`). For every route it simulates each ghost with the game's own targeting (`resolveGhostTarget` + `pickGhostDirection`), speed resolver (`resolveGhostSpeedForKind`: tunnel band, Elroy by pellets left, house-exit speed), the player's per-cell speed multipliers (Afterburner, Mole) and catch radius, re-targets at the next scatter/chase flip (`PlaySim.ghostModeFlip`) and the low-pellet chase force, and treats frozen, frightened and still-leaving ghosts as harmless. Routes that get caught are rejected; survivors score pellets, power pellets, fruit, frightened ghosts and end distance from ghosts.
- **Upgrades in the plan:** the live invulnerability, shield count and speed-burst timers seed every route, and a route that eats a power pellet applies what the owned loadout would trigger, read from the game's own `applyPowerPelletEffects` (`affordances.ts`): fright, invulnerability, freeze, speed, recall, warp, Scatter Burst, Extra Hungry and shield banking, with level scaling, Overcharge and Shield Break included. A shield absorbs one catch with a short bounce. So a cornered bot plans an escape through a power pellet and a shielded one trades a hit for pellets.
- **Fidelity:** `fidelity.ts` replays the planner's ghost dynamics against a recorded run and buckets the error by phase, kind and mode flip; `fidelity.test.ts` holds the bounds (`FIDELITY_DEBUG=1` prints the breakdown). Raise the bounds only with a reason.
- **Execution:** turns press shortly before the corner plus jitter. A wrong turn picks another survivable route; deaths come from slow reactions, late presses and what the search can't see.
- All randomness comes from the `bot` `RunRandom` stream, so an episode replays exactly from its job (profile + seed + arm).
- Build runs play from level 1 with the game's own starting upgrade; forced tests start at the tested level. Every arm uses the same seeds so arms compare on the same boards. Levels are capped in sim time; hitting the cap records `stalled`.
- Every build-run death is tagged with a cause from the bot's last plan (`classifyDeath` in `bot.ts`; the report's Death causes section defines each).

Experiments: `builds` (play from level 1 to the boss), `singles` (one upgrade at one level vs a `none` arm), `pairs`, `schools` (with and without the Specialist) and `enemies` (each roster and each ghost alone). Presets differ in profiles, arms and budget; pilot and full calibrate seconds per run and split the budget across experiments, giving build runs whatever remains.

## Output

`artifacts/balance/<timestamp>-<preset>/` (gitignored): `episodes.jsonl` (one result per episode), `summary.json` (metrics with 95% intervals; `compare` reads it), `report.md` and `compare.md`.

## Reading the report

- **Health first.** Errors or over 2% `stalled` means the bots got stuck: the report says `UNTRUSTWORTHY` at the top; fix that before trusting anything.
- **Targets** (right after Health): one row per tier, each cell the measured share against its band with ok / above / below. A `*` means the whole 95% interval is outside the band. Misses repeat under Watchouts.
- **Death causes** (under the difficulty curve): per tier, deaths by level and cause. Cornered and horizon point at the game, execution and reaction at the tier's hands, model at the planner itself (a bot gap, not a tuning lead); read the row for the level where a tier's reach drops.
- **Executive summary** (right after Health): one-line takeaway, the most over/underperforming upgrades (singles Δ progress with a short why, plus build value when present), and watchouts (difficulty spikes, pair synergies, lethal ghosts, hard rosters, play-style spread, school specialists). Thin seeds/arm (< 50) are called out as leads only. Detail tables below are the evidence.
- **Board progress** (1 for a clear, else the share of pellets eaten before game over) is the main forced-test metric. `*` means the 95% intervals don't overlap.
- **Difficulty curve** (Builds): share of runs reaching each level and deaths spent on it. A steep drop between two levels is a difficulty spike; compare `@expert` with `@average` to see who it hits.
- **Upgrade value** compares mean level reached when taken vs offered and passed, which removes most of the "long runs collect more upgrades" bias. `casual` picks at random, so its rows are cleanest. At the [slot cap](./upgrades.md#slot-cap-and-salvage) a bot salvages the lowest-scored of its six slots and the new card, keeping owned cards on a tie (`pickSalvage`). School mixes and co-owned pairs carry survivorship bias: leads, not proof.
- **Pairs:** synergy = pair - A - B + none; large positive is worth a look, large negative means they cancel.
- **Ghost lethality:** catches per minute a ghost spent outside the house.

## Known limitations

Bots play like bots: compare arms and profiles within one run rather than reading absolute rates, and treat the target cells as leads until the tiers are calibrated against human runs. The planner treats frightened ghosts as standing still (the game walks them at random), places a ghost that is still leaving the house at the exit after a distance-based delay, ignores ghosts still inside the house and their release timers, and skips the player's eat drag beyond a flat pellet-tile slowdown, speed lanes, corner cutting, and plans no speed gain from Hyperspeed (its turn delay makes the bot's steering unreliable at 10×). Wall Pass, warp landing spots and Ghost Harvester are not in the route model, so upgrades needing deliberate steering are used only as far as the generic weights reach. Board progress divides by every pellet, so Lazy Looper reads lower than it plays (trust its clear rate). Build runs start with default lives and Quarters. No boss (a run ends on reaching it, so the win target is never measured), no build search, no calibration against real players.
