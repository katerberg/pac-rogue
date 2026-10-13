# Dot-Man

Phaser + bitECS 0.4 Pac-Man-like roguelike: a fixed 9-level run with upgrades, stores and a boss. The simulation is headless (`src/game/sim/`) and Phaser scenes are adapters. Live game: <https://katerberg.github.io/pac-rogue/>.

## Requirements

Node.js **>= 20.19** (`.nvmrc` pins 24).

```bash
nvm use
npm install
npx playwright install chromium
```

## Commands

`package.json` `scripts` is the full list. The ones you need: `npm run dev` (human, :5173) / `dev:agent` (:5174), `build`, `test`, `lint`, `format`, `probe` (scripted live check), `visual` (headless canvas smoke), `check:ecs`, `verify` (the canonical gate: precommit checks + build + visual), `verify:record` and `check:ship` (ship-plan evidence), `balance` / `balance:compare` ([docs/BALANCE_BOTS.md](./docs/BALANCE_BOTS.md)), `worker:dev`, `data:pull`.

`npm install` points Git at `.githooks/`; the pre-commit hook runs `verify:precommit`. Humans and agents use different ports (`scripts/ports.json`, [docs/VERIFICATION.md](./docs/VERIFICATION.md)). CI (`.github/workflows/verify.yml`) runs `verify` on PRs and `main`.

## Flags

Append query params to any local URL. Invalid values are ignored; a flag with no value means `=1`. **Every flag except `play`, `sound` and `learnAll` is a debug flag and disables high-score saving** (`HIGH_SCORE_DISABLING_FLAGS` in `src/domain/runHistory.ts`). Parsing, valid ranges and defaults are in `parsePlayOptions` (`src/domain/playOptions.ts`) and its tests.

- Boot: `play` (skip the menu), `learnAll` (boot into LEARN; `1` lists all upgrades, `0` none), `knobs` (tuning panels), `sound` (agent ports only: opt in to audio).
- Run setup: `level`, `maze` (`maze1`, `maze2`, `mazeSmall`), `seed` (replays every random roll), `quarters`, `bonus`, `lives`, `maxLives`, `store` (`1`-`3`), `roster` (`0`-`5`), `ghosts` (comma-separated kinds), `boss`, `bossStageAdvance`.
- Upgrades: `enableUpgrade` (repeatable; any id from `ALL_UPGRADE_IDS`, plus `<id>Plus` for the enhanced form), `forceUpgrade`, `disableLevelUpgrades`, `jumpToUpgrade`.
- Cheats: `infiniteLives`, `godMode`.
- Agent ports only: `runLogFill` (synthetic debug runs for the RUN LOG FULL screen and `/data`).

Example: `http://127.0.0.1:5174/?play=1&level=2&seed=demo&enableUpgrade=powerPelletFreeze`

## Deploy (GitHub Pages)

Live game: [https://katerberg.github.io/pac-rogue/](https://katerberg.github.io/pac-rogue/)

Pushes to `main` run [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml): production `npm run build`, then publish `dist/` (plus `.nojekyll`) to the `gh-pages` branch via JamesIves.

GitHub Pages must use source **branch `gh-pages` / folder `/`** (not `main`). After the first successful deploy, set that in the repo’s Pages settings if it is not already.

## Global runs and high scores

Finished, non-debug runs are uploaded to a Cloudflare Worker (`worker/`, name `dot-man-api`) backed by D1, so `/data` can show runs from every player and **High Scores → GLOBAL** shows the best run of every player. Players can opt out in **Settings → SHARE RUN STATS**; see [docs/PRIVACY.md](./docs/PRIVACY.md). API, schema and SQL recipes: [worker/README.md](./worker/README.md). Nothing is sent unless the build has `VITE_API_URL`, which only the Pages deploy sets (dev, preview, CI and probes never do); a page on `localhost` also refuses any non-local API URL, so automation can never write to the real database.

**One-time setup (owner):**

1. Cloudflare account (free, no card), with a `workers.dev` subdomain.
2. D1 database `dot-man-api` (its id is committed in `worker/wrangler.toml`).
3. API token: **My Profile → API Tokens → Create Token → "Edit Cloudflare Workers"**, plus **Account → D1 → Edit**, scoped to your account.
4. GitHub **Settings → Environments → New environment** `production`, deployment branches limited to `main`, with environment secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Do not add them as plain repository secrets: any branch could read those.
5. Merge to `main` (or run **Actions → Worker deploy → Run workflow**): it applies the D1 migrations and deploys the Worker.
6. Add the Worker secret `IP_HASH_KEY` (a long random value; dashboard **Workers & Pages → dot-man-api → Settings → Variables and Secrets**). Until then uploads get 503 and retry later.
7. Repository **variable** `API_URL` = `https://dot-man-api.<subdomain>.workers.dev` (no trailing slash), then **Actions → GitHub Pages deploy → Run workflow**.
8. Check: play a run to Game Over on the live site and look for `POST …/runs → 201` in DevTools.

**Reading the data:** run `npx wrangler login` once, then `npm run data:pull`, start `npm run dev`, open `/data` and click **GLOBAL (PULLED)** (or **LOAD FILE…** for any export).

**Local development:** see [worker/README.md](./worker/README.md#local). Worker ports: humans 8787, agents 8788.

## Docs

Start with [AGENTS.md](./AGENTS.md). Code is the reference for values and shapes; these cover intent and rules:

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [docs/VERIFICATION.md](./docs/VERIFICATION.md)
- Gameplay: [levels](./docs/levels.md), [upgrades](./docs/upgrades.md), [bonus](./docs/bonus.md), [store](./docs/store.md), [bosses](./docs/bosses.md), [learn](./docs/learn.md), [maze constraints](./docs/maze-constraints.md)
- Presentation and data: [line art, fonts, render scale](./docs/line-art.md), [run log and `/data`](./docs/RUN_LOG.md), [balance bots](./docs/BALANCE_BOTS.md), [privacy](./docs/PRIVACY.md), [worker](./worker/README.md), [sim harness](./src/game/sim/README.md)
- Agent workflows: `.agents/skills/*/SKILL.md`

## Art

Art courtesy of [Pixelaholic](https://pixelaholic.itch.io/pac-man-game-art)
