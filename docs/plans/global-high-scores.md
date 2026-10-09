# Global high scores (Cloudflare Worker + D1)

## Goal

Add a free global leaderboard beside the existing local high scores. The game (GitHub Pages today; itch.io and Steam later) submits each device's **personal best** to a small Cloudflare Worker backed by D1, with the server recording IP, country, time, app version and platform. `HighScoresScene` gets a `LOCAL | GLOBAL` toggle; Global shows the top 50 (one row per device) and is fetched only when the player switches to it. Cheating is handled after the fact: rows are soft-hidden by SQL and a rebuild script restores each device's last legit best. Ongoing cost target: $0 (Workers Free + D1 Free, hard caps, no card).

## Locked decisions

| ID  | Decision                                                                                                                                                                                             | Source                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | Completed runs (clearing the final level / RUN COMPLETE) are recorded locally and globally; level shows `CLR`                                                                                        | user                               |
| 2   | Local tab gains a LVL column; migrated v2 rows show `-`                                                                                                                                              | user                               |
| 3   | No backfill: pre-update local runs are never submitted                                                                                                                                               | user                               |
| A   | Worker lives in `worker/` (TypeScript): `wrangler.toml`, `src/index.ts` (thin handler), `src/scores.ts` (pure validation/SQL/mapping), `migrations/`, `sql/`                                         | default                            |
| B   | `scores` table, insert-only, keep all rows; `hidden_reason` NULL = visible                                                                                                                           | default                            |
| C   | `level` = `levelIndex` when the run ended; a completed run (final level cleared) sends `completed: true` with `level: MAX_LEVEL`                                                                     | default                            |
| D   | `POST /scores` validation bounds (see Data / contracts); 400 on reject                                                                                                                               | default                            |
| E   | IP / country / `created_at` are server-set; raw IP stored                                                                                                                                            | default                            |
| F   | Rate limit 10 inserts per IP per 10 minutes, counted in D1; 429 on exceed                                                                                                                            | default                            |
| G   | CORS `*`, methods `GET, POST, OPTIONS`, header `Content-Type`; no credentials                                                                                                                        | default                            |
| H   | `bests` table (one row per client) keeps board reads ≈ 50; purge = hide rows + run `worker/sql/rebuild-bests.sql`                                                                                    | default                            |
| I   | Ranking: pellets desc → remaining time desc → date desc (same as local); level not a tiebreaker                                                                                                      | default                            |
| J   | No admin endpoint, no Turnstile; purges via `wrangler d1 execute` with recipes in `worker/README.md`                                                                                                 | default                            |
| K   | Local history v3 (`pac-rogue.run-history.v3`) adds `level: number \| null`, `completed: boolean`; v2 migrated on read                                                                                | default                            |
| L   | `pac-rogue.leaderboard.v1` localStorage key: `{ clientId, lastSubmittedBest }`; `clientId` from `crypto.randomUUID()`                                                                                | default                            |
| M   | PB submit after every recorded run and on HighScoresScene open, only if local best beats `lastSubmittedBest`; silent failure, natural retry; never blocks the game                                   | default                            |
| N   | No new debug-flag list: runs with any `HIGH_SCORE_DISABLING_FLAGS` URL flag are already never saved (`PlayOptions.highScoresDisabled`), so they never reach local history or the global board        | default (updated for current main) |
| O   | Build-time env: `VITE_LEADERBOARD_URL` (unset → global off), `VITE_APP_VERSION` (default `dev`), `VITE_PLATFORM` (default `web`); Pages deploy sets short SHA + repo variable URL                    | default                            |
| P   | Pure logic in `src/domain/leaderboard.ts`; fetch in `src/game/net/leaderboardClient.ts` (5 s timeout); storage in `src/game/storage/leaderboardStorage.ts`; no ECS                                   | default                            |
| Q   | `LOCAL  GLOBAL` toggle under the title; Left/Right + click; Local default; Global fetched once per scene visit on first switch                                                                       | user (fetch-on-switch) + default   |
| R   | Global columns `PELLETS  TIME  LVL  DATE  CC`; own row yellow; same scroll behavior                                                                                                                  | user (country code) + default      |
| S   | Status text: `LOADING...` / `NO SCORES YET` / `GLOBAL UNAVAILABLE` / `GLOBAL OFFLINE`                                                                                                                | default                            |
| T   | Root devDeps `wrangler` + `@cloudflare/workers-types`; `worker/tsconfig.json`; `typecheck` also runs `tsc -p worker`; vitest includes `worker/**/*.test.ts`                                          | default                            |
| U   | `.github/workflows/deploy-worker.yml`: on push to `main` touching `worker/**` + `workflow_dispatch`; apply remote migrations then deploy; skips cleanly when secrets are absent; `*.workers.dev` URL | user (GitHub Action) + default     |
| V   | One-time Cloudflare setup is done by the repo owner; implementer commits a placeholder `database_id` and documents steps                                                                             | default                            |
| W   | Local worker ports: humans 8787, agents 8788 (in `scripts/ports.json`); `npm run verify` / visual smoke never set the URL                                                                            | default                            |
| X   | Tests: domain + migration + worker unit tests, manual `wrangler dev` curl check, probe screenshots                                                                                                   | default                            |
| Y   | Docs: README section + ports, `worker/README.md`, `docs/ARCHITECTURE.md`                                                                                                                             | default                            |
| —   | Global board size: top 50                                                                                                                                                                            | user                               |
| —   | Collect level reached                                                                                                                                                                                | user                               |
| —   | GitHub Action deploy for the Worker                                                                                                                                                                  | user                               |

## Today's world (brief)

Re-verified against `main` at `b9bd0a1` (2026-10-09).

- The run simulation lives in `src/game/sim/playSim.ts`. Its private `saveRun()` (~line 2709) emits `{ type: "saveRun", collected, remaining }` (typed in `src/game/sim/simEvents.ts` ~line 90) unless `options.highScoresDisabled`. It is called on last-life Game Over (~line 1414) **and** in `beginRunComplete()` (~line 2578), so completed runs are already saved locally — Decide 1 only adds the `completed` marker.
- `PlayScene.applyEvents` handles `case "saveRun": saveRun(event.collected, event.remaining)` (~line 618).
- `MAX_LEVEL = 9` (`src/domain/levelRules.ts`). `playSim` tracks `levelIndex`.
- URL flags are parsed in `src/domain/playOptions.ts` (`parsePlayOptions`). `src/domain/runHistory.ts` exports `HIGH_SCORE_DISABLING_FLAGS` (seed, maze, level, quarters, bonus, enableUpgrade, disableLevelUpgrades, infiniteLives, lives, maxLives, godMode, jumpToUpgrade, forceUpgrade, store, ghosts, boss, bossStageAdvance, knobs) and `highScoresDisabled(params)`.
- `src/domain/runHistory.ts`: `RUN_HISTORY_VERSION = 2`, `RunRecord { collectedCount, remainingTime, recordedAt }`, `parseRunHistory` returns empty on any version mismatch, `appendRun`, cap 100.
- `src/game/storage/runHistoryStorage.ts`: key `pac-rogue.run-history.v2`, `loadRunHistory`, `saveRun(collectedCount, remainingTime, recordedAt?)`.
- `src/domain/highScoresView.ts`: sort + fixed-width format (PELLETS 7, TIME 4, DATE 10, gap 2). `HighScoresScene` builds rows once in `create()` with `addGameText` / `placeGameText` / `placeSelectableMenuOption` from `./neonFont` at `SCORES_FONT_SIZE`, and scrolls via `scoreListScroll`. Measure the widened lines with the existing probe-text width trick; they must fit the 800 px canvas.
- Menu order: START, LEARN, HIGH SCORES, SETTINGS.
- No `import.meta.env` usage and no `vite-env.d.ts` yet. `check:ecs` and ESLint Phaser bans cover `src/` only. Vitest includes `src/**/*.test.ts` only, node environment.
- Probe (`npm run probe`) reuses an already-listening server on 5174 and **fails on any `console.error`** (Chromium logs failed network requests as console errors).
- Deploy: `.github/workflows/deploy-pages.yml` builds and publishes `dist/` to `gh-pages`.
- If `main` has moved again when you implement, re-check these anchors first and adapt file/line references; the locked decisions still hold.

## Approach

### 1. Local history v3 (domain + storage)

`src/domain/runHistory.ts`

- `RUN_HISTORY_VERSION = 3`.
- `RunRecord = { collectedCount; remainingTime; recordedAt; level: number | null; completed: boolean }`.
- `parseRunHistory(raw)`: accept v3 as today (validate new fields: `level` null or positive integer — not capped at `MAX_LEVEL`, so changing the level count never wipes history; `completed` boolean). Accept v2 payloads and migrate each run to `{ ...run, level: null, completed: false }`. Anything else → empty.
- `appendRun(history, run: RunRecord)` (object param).

`src/game/storage/runHistoryStorage.ts`

- `RUN_HISTORY_STORAGE_KEY = "pac-rogue.run-history.v3"`; add `LEGACY_RUN_HISTORY_STORAGE_KEY = "pac-rogue.run-history.v2"`.
- `loadRunHistory()`: read v3 key; if absent (`null`), read the v2 key and parse (migrates). Never delete the v2 key.
- `saveRun(run: Omit<RunRecord, "recordedAt">, recordedAt = new Date().toISOString())`: `appendRun(loadRunHistory(), …)` then write the v3 key.

### 2. Domain: views and leaderboard logic

`src/domain/highScoresView.ts`

- Add `HIGH_SCORE_LEVEL_WIDTH = 3`, `HIGH_SCORE_COUNTRY_WIDTH = 2`.
- `levelLabel(level: number | null, completed: boolean)`: `"CLR"` if completed, `"-"` if null, else `String(level)`.
- `HighScoreRow` gains `levelLabel`. Local header/line become `PELLETS  TIME  LVL  DATE` (LVL right-padded after TIME, `padStart(3)`).
- Add `formatGlobalHighScoreHeader()` → `PELLETS  TIME  LVL  DATE        CC` and `formatGlobalHighScoreLine(row: GlobalScoreRow)` (same columns + 2-char country).
- Sorting stays exactly as today.

`src/domain/leaderboard.ts` (new, pure, no Phaser)

- `type ScoreKey = { collectedCount: number; remainingTime: number }`; `beats(a: ScoreKey, b: ScoreKey | null): boolean` (strictly better under ranking I; `b === null` → true).
- `personalBest(history: RunHistory): RunRecord | null`: best run with `level !== null` (this is what makes "no backfill" true).
- `pendingSubmission(history, lastSubmittedBest: ScoreKey | null): RunRecord | null`: `personalBest` if it `beats` `lastSubmittedBest`, else null.
- `type ScoreSubmission = { clientId; collectedCount; remainingTime; level; completed; appVersion; platform }`; `buildSubmission(run, clientId, appVersion, platform)`.
- `type GlobalScoreRow = { collectedCount; remainingTime; level; completed; country; createdAt; mine: boolean }`; `parseGlobalScores(json: unknown): GlobalScoreRow[] | null` (null on any shape error; drops nothing silently — a bad row makes the whole response null).
- `PLATFORMS = ["web", "itch", "steam"] as const`; `parsePlatform(value: string | undefined): Platform` (fallback `web`).

### 3. Client storage + network

`src/game/storage/leaderboardStorage.ts` (new; same try/catch pattern as `runHistoryStorage`)

- Key `pac-rogue.leaderboard.v1`, value `{ clientId: string; lastSubmittedBest: ScoreKey | null }`.
- `loadLeaderboardState()`: parse; on missing/invalid create `{ clientId: crypto.randomUUID(), lastSubmittedBest: null }` and persist it.
- `saveLastSubmittedBest(best: ScoreKey)`.

`src/vite-env.d.ts` (new): `/// <reference types="vite/client" />` plus `ImportMetaEnv` with optional `VITE_LEADERBOARD_URL`, `VITE_APP_VERSION`, `VITE_PLATFORM` strings.

`src/game/net/leaderboardClient.ts` (new, no Phaser)

- Reads env once: `const baseUrl = import.meta.env.VITE_LEADERBOARD_URL?.replace(/\/$/, "") || null`, version default `"dev"`, platform via `parsePlatform`.
- `submitPersonalBestIfNeeded(): Promise<void>`: return if `baseUrl === null`; compute `pendingSubmission(loadRunHistory(), state.lastSubmittedBest)`; if non-null, `POST ${baseUrl}/scores` JSON with `AbortSignal.timeout(5000)`; on 2xx `saveLastSubmittedBest`. Swallow every error (no `console.error`; a single `console.warn` is fine). Double submits from overlapping triggers are harmless (server keeps the better row) — no in-flight guard.
- `type GlobalScoresResult = { kind: "ok"; rows: GlobalScoreRow[] } | { kind: "offline" } | { kind: "error" }`.
- `fetchGlobalScores(): Promise<GlobalScoresResult>`: `offline` if no `baseUrl`; else `GET ${baseUrl}/scores?clientId=<id>` with 5 s timeout; non-2xx, network error or `parseGlobalScores` null → `error`.

### 4. Scene wiring

`src/game/sim/simEvents.ts` / `src/game/sim/playSim.ts`

- Extend the event to `{ type: "saveRun"; collected: number; remaining: number; level: number; completed: boolean }`.
- `playSim.saveRun(completed: boolean)` emits `level: this.levelIndex` and `completed`; Game Over calls `this.saveRun(false)`, `beginRunComplete()` calls `this.saveRun(true)`. The existing `highScoresDisabled` guard stays as is. Update any `playSim` tests that assert the `saveRun` event shape.

`PlayScene.ts`

- `case "saveRun": saveRun({ collectedCount: event.collected, remainingTime: event.remaining, level: event.level, completed: event.completed }); void submitPersonalBestIfNeeded(); break;`
- No other PlayScene logic changes.

`HighScoresScene.ts`

- Tab row between the title and the list header (start at `y = 124`; nudge only if it overlaps): two texts `LOCAL` and `GLOBAL` at `MENU_OPTION_FONT_SIZE`, built with the same `neonFont` helpers the scene already uses; style the active tab the way `placeSelectableMenuOption` styles a selected option and the inactive one as unselected; both interactive → switch on pointerdown. Left/Right keys switch tabs.
- State: `tab: "local" | "global"`, `globalResult: GlobalScoresResult | "loading" | null`, `visitId` (incremented in `create()`).
- `create()`: reset state, render Local, then `void submitPersonalBestIfNeeded()`.
- Switching to Global: if `globalResult === null` set `"loading"` and call `fetchGlobalScores()`; when it resolves, store it only if `visitId` is unchanged and the scene is active, then re-render if Global is still the active tab. Switching back and forth never refetches within a visit.
- Extract the existing list-building code into `renderList(header: string | null, lines: string[], highlight: boolean[], emptyText: string)` which destroys previous header/rule/rows/status texts and resets `scrollState`/`itemCount`. Own rows (`mine`) use the same highlight colour as the selected menu option.
- Status texts (centered where `NO SCORES YET` is today): Local empty → `NO SCORES YET`; Global `"loading"` → `LOADING...`; `offline` → `GLOBAL OFFLINE`; `error` → `GLOBAL UNAVAILABLE`; ok with 0 rows → `NO SCORES YET`.
- Back / Esc / Enter / Space behavior unchanged. No bitecs.

### 5. Worker

`worker/wrangler.toml`

```toml
name = "pac-rogue-scores"
main = "src/index.ts"
compatibility_date = "2026-09-01"

[[d1_databases]]
binding = "DB"
database_name = "pac-rogue-scores"
database_id = "00000000-0000-0000-0000-000000000000"
migrations_dir = "migrations"
```

`worker/migrations/0001_scores.sql`

```sql
CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  collected_count INTEGER NOT NULL,
  remaining_time INTEGER NOT NULL,
  level INTEGER NOT NULL,
  completed INTEGER NOT NULL,
  app_version TEXT NOT NULL,
  platform TEXT NOT NULL,
  country TEXT NOT NULL,
  ip TEXT NOT NULL,
  created_at TEXT NOT NULL,
  hidden_reason TEXT
);
CREATE INDEX scores_ip_created ON scores (ip, created_at);
CREATE INDEX scores_client ON scores (client_id);

CREATE TABLE bests (
  client_id TEXT PRIMARY KEY,
  collected_count INTEGER NOT NULL,
  remaining_time INTEGER NOT NULL,
  level INTEGER NOT NULL,
  completed INTEGER NOT NULL,
  country TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX bests_rank ON bests (collected_count DESC, remaining_time DESC, created_at DESC);
```

`worker/sql/rebuild-bests.sql`

```sql
DELETE FROM bests;
INSERT INTO bests (client_id, collected_count, remaining_time, level, completed, country, created_at)
SELECT client_id, collected_count, remaining_time, level, completed, country, created_at
FROM (
  SELECT *, ROW_NUMBER() OVER (
    PARTITION BY client_id
    ORDER BY collected_count DESC, remaining_time DESC, created_at DESC
  ) AS rn
  FROM scores WHERE hidden_reason IS NULL
) WHERE rn = 1;
```

`worker/src/scores.ts` (pure; no Workers types)

- `validateSubmission(body: unknown): ScoreSubmission | null` per bounds below.
- `RATE_LIMIT_MAX = 10`, `RATE_LIMIT_WINDOW_MS = 600_000`, `BOARD_LIMIT = 50`.
- SQL string constants: `COUNT_RECENT_BY_IP`, `INSERT_SCORE`, `UPSERT_BEST` (`INSERT … ON CONFLICT(client_id) DO UPDATE SET … WHERE excluded.collected_count > bests.collected_count OR (excluded.collected_count = bests.collected_count AND excluded.remaining_time > bests.remaining_time)`), `SELECT_BOARD` (`SELECT … FROM bests ORDER BY collected_count DESC, remaining_time DESC, created_at DESC LIMIT ?`).
- `toBoardRow(dbRow, requesterClientId)` → public row shape with `mine` (never exposes `client_id`).
- `countryOrUnknown(value: unknown)`: 2-char string else `"XX"`.

`worker/src/index.ts`

- `export default { fetch(request, env: { DB: D1Database }) }`.
- `OPTIONS *` → 204 + CORS headers. Every response carries CORS headers.
- `POST /scores`: parse JSON (invalid → 400) → `validateSubmission` (null → 400) → `ip = request.headers.get("CF-Connecting-IP") ?? "unknown"`, `country = countryOrUnknown(request.cf?.country)`, `now = new Date()` → count recent by IP since `now - window` (≥ max → 429) → `env.DB.batch([INSERT_SCORE, UPSERT_BEST])` → 201 `{ ok: true }`.
- `GET /scores[?clientId=]` → `SELECT_BOARD` with `BOARD_LIMIT` → 200 `{ scores: [...] }`.
- Other paths → 404; other methods on `/scores` → 405. Unexpected exceptions → 500 `{ error: "internal" }`.

`worker/tsconfig.json`: extends nothing; `target/lib ES2022`, `module ESNext`, `moduleResolution bundler`, `strict`, `noEmit`, `types: ["@cloudflare/workers-types", "vitest/globals"]`, `include: ["src"]`.

### 6. Tooling

- `package.json`:
  - devDeps: `wrangler`, `@cloudflare/workers-types` (current majors via `npm install -D`).
  - `"typecheck": "tsc --noEmit && tsc --noEmit -p worker"`.
  - `"worker:migrate:local": "wrangler d1 migrations apply pac-rogue-scores --local --config worker/wrangler.toml"`.
  - `"worker:dev": "wrangler dev --config worker/wrangler.toml --local --port 8787"`.
  - `"worker:dev:agent": "wrangler dev --config worker/wrangler.toml --local --port 8788"`.
- `scripts/ports.json`: add `"humanWorker": 8787, "agentWorker": 8788`.
- `vitest.config.ts`: `include: ["src/**/*.test.ts", "worker/**/*.test.ts"]`.
- `.gitignore`: add `.wrangler/` and `worker/.wrangler/`.
- ESLint/Prettier already cover `worker/**`; fix any findings rather than ignoring the folder.

### 7. CI

`.github/workflows/deploy-pages.yml` build step env:

```yaml
env:
  VITE_LEADERBOARD_URL: ${{ vars.LEADERBOARD_URL }}
  VITE_PLATFORM: web
```

plus a prior step `run: echo "VITE_APP_VERSION=${GITHUB_SHA::7}" >> "$GITHUB_ENV"`.

`.github/workflows/deploy-worker.yml` (new): triggers `push` to `main` with `paths: ["worker/**", ".github/workflows/deploy-worker.yml"]` and `workflow_dispatch`; `concurrency: deploy-worker`; steps: checkout → setup-node (`.nvmrc`, npm cache) → `npm ci` → a `check` step that sets `enabled=false` output and prints a notice when `CLOUDFLARE_API_TOKEN` is empty → (if enabled) `npx wrangler d1 migrations apply pac-rogue-scores --remote --config worker/wrangler.toml` → `npx wrangler deploy --config worker/wrangler.toml`. Env: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` from secrets.

`verify.yml`: unchanged (it never sets the URL).

## Data / contracts

**POST /scores** body (JSON):

| Field            | Rule                                                                                |
| ---------------- | ----------------------------------------------------------------------------------- |
| `clientId`       | string matching `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` |
| `collectedCount` | integer 0..20000                                                                    |
| `remainingTime`  | integer 0..999                                                                      |
| `level`          | integer 1..99 (loose on purpose so adding levels never needs a Worker redeploy)     |
| `completed`      | boolean                                                                             |
| `appVersion`     | string, 1..64 chars                                                                 |
| `platform`       | `"web" \| "itch" \| "steam"`                                                        |

Responses: 201 `{ ok: true }`; 400 `{ error: "invalid" }`; 429 `{ error: "rate_limited" }`; 500 `{ error: "internal" }`. Unknown extra fields are ignored.

**GET /scores?clientId=<uuid optional>** → 200 `{ scores: Array<{ collectedCount, remainingTime, level, completed, country, createdAt, mine }> }`, max 50, ranked per I. `completed` returned as boolean.

**localStorage**: `pac-rogue.run-history.v3` (RunHistory v3), `pac-rogue.run-history.v2` (read-only legacy), `pac-rogue.leaderboard.v1` (`{ clientId, lastSubmittedBest: { collectedCount, remainingTime } | null }`).

**Purge recipes** (go in `worker/README.md`, run with `npx wrangler d1 execute pac-rogue-scores --remote --config worker/wrangler.toml --command "…"`, then `--file worker/sql/rebuild-bests.sql`):

```sql
UPDATE scores SET hidden_reason = 'purge-2026-10-a'
WHERE app_version = 'abc1234' AND collected_count > 5000
  AND created_at BETWEEN '2026-10-01' AND '2026-10-15T23:59:59Z';
UPDATE scores SET hidden_reason = 'cheater' WHERE client_id = '…';
UPDATE scores SET hidden_reason = 'cheater' WHERE ip = '…';
UPDATE scores SET hidden_reason = NULL WHERE hidden_reason = 'purge-2026-10-a'; -- undo
```

## Failure behavior

- No `VITE_LEADERBOARD_URL`: nothing is ever sent; Global tab shows `GLOBAL OFFLINE`.
- Submit network error / timeout / non-2xx (incl. 429): silent; `lastSubmittedBest` unchanged, so the next trigger retries. Game flow never waits.
- Global fetch error / timeout / bad JSON: `GLOBAL UNAVAILABLE` for the rest of that scene visit (re-entering the screen retries).
- Response arrives after leaving the scene or switching tabs: stored only if the visit is still current; rendered only if Global is active.
- localStorage unavailable: local history behaves as today (empty); leaderboard state falls back to an in-memory fresh id each call, so submissions still work but PB tracking resets (acceptable).
- Corrupt `pac-rogue.leaderboard.v1`: regenerated (new clientId).
- Worker D1 daily cap exceeded: Worker returns 500 → client treats as failure (above).
- Placeholder `database_id` / missing secrets: deploy workflow skips with a notice; `worker:dev` works locally.

## Docs

- `README.md`: new "Global high scores" section (what it is; one-time setup: create Cloudflare account, `npx wrangler login`, `npx wrangler d1 create pac-rogue-scores`, paste id into `worker/wrangler.toml`, add repo secrets `CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit + D1:Edit) and `CLOUDFLARE_ACCOUNT_ID`, run the deploy-worker workflow, set repo variable `LEADERBOARD_URL` to the `https://pac-rogue-scores.<subdomain>.workers.dev` URL, redeploy Pages; local dev with `worker:migrate:local` + `worker:dev` and `VITE_LEADERBOARD_URL=http://127.0.0.1:8787 npm run dev`); add worker ports to any ports mention; link `worker/README.md`.
- `worker/README.md` (new): API contract, schema, rate limit, purge recipes + rebuild step, cost notes (free-tier caps fail closed).
- `docs/ARCHITECTURE.md`: layout adds `src/domain/leaderboard.ts`, `src/game/net/leaderboardClient.ts`, `src/game/storage/leaderboardStorage.ts`, `src/vite-env.d.ts`, `worker/`; Ports lists 8787/8788; High Scores paragraph describes LOCAL/GLOBAL tabs, v3 history, PB submission, and that saved runs now carry level + completed (update any sentence that describes the history record shape).

## Acceptance tests

Automated (`npm run verify` green, including new tests):

- `runHistory.test.ts`: v2 payload migrates with `level: null, completed: false`; v3 round-trips; invalid level/flags → empty; cap still 100.
- `runHistoryStorage.test.ts`: falls back to the v2 key when v3 absent; `saveRun` writes v3.
- `highScoresView.test.ts`: `levelLabel` (`CLR`, `-`, `3`); local line/header widths; global line includes 2-char country; sort unchanged.
- `leaderboard.test.ts`: `beats` ordering and ties (tie → false); `personalBest` skips `level: null` runs; `pendingSubmission` null when not better; `parseGlobalScores` accepts a valid payload and rejects malformed ones.
- `leaderboardStorage.test.ts`: creates and persists a UUID; corrupt value regenerates; `saveLastSubmittedBest` round-trips.
- `worker/src/scores.test.ts`: every validation bound (each field just inside / just outside), level 0 / 100 rejected, extra fields ignored, `toBoardRow` sets `mine` and omits `client_id`, `countryOrUnknown`.
- `worker/src/index.test.ts` with a minimal fake `DB` (records `prepare(sql).bind(...)`, stubs `first`/`all`/`batch`): OPTIONS → 204 + CORS; bad JSON → 400; invalid body → 400; recent count ≥ 10 → 429 and no batch; valid → 201 and batch called with insert + upsert; GET → 200 with ≤ 50 rows and `mine`; unknown path → 404; wrong method → 405.

Manual worker check (record commands + output in the PR):

```bash
npm run worker:migrate:local
npm run worker:dev:agent &   # port 8788
curl -s -X POST localhost:8788/scores -H 'content-type: application/json' \
  -d '{"clientId":"11111111-1111-4111-8111-111111111111","collectedCount":420,"remainingTime":300,"level":3,"completed":false,"appVersion":"dev","platform":"web"}'   # 201
curl -s 'localhost:8788/scores?clientId=11111111-1111-4111-8111-111111111111'   # row with mine:true
# POST a lower score for the same client → board unchanged; a higher one → board updates
# POST 11 times → 11th returns 429
npx wrangler d1 execute pac-rogue-scores --local --config worker/wrangler.toml --command "UPDATE scores SET hidden_reason='test' WHERE collected_count > 400"
npx wrangler d1 execute pac-rogue-scores --local --config worker/wrangler.toml --file worker/sql/rebuild-bests.sql
curl -s localhost:8788/scores   # previous lower best reappears
```

Seed at least 3 rows from 3 client ids (one `completed: true, level: 9`) before the live check.

Live check (agent ports only; Read every screenshot):

```bash
# A. Offline build (no URL): Local default, Global shows GLOBAL OFFLINE
npm run probe -- --query "" --steps "wait:800,press:ArrowDown,press:ArrowDown,press:Enter,wait:500,shot:local,scene:HighScoresScene,press:ArrowRight,wait:300,shot:global-offline" --name hs-offline
# B. With the local worker (stop any existing 5174 dev server first so the env var applies)
VITE_LEADERBOARD_URL=http://127.0.0.1:8788 PAC_ROGUE_AGENT=1 npx vite &
npm run probe -- --query "" --steps "wait:800,press:ArrowDown,press:ArrowDown,press:Enter,wait:500,shot:local,press:ArrowRight,wait:1500,shot:global,press:ArrowLeft,wait:300,shot:back-local" --name hs-global
```

- `hs-offline-local`: title, `LOCAL` yellow / `GLOBAL` white, header `PELLETS  TIME  LVL  DATE` (or `NO SCORES YET`), Back visible.
- `hs-offline-global-offline`: `GLOBAL` yellow, `GLOBAL OFFLINE` centered.
- `hs-global-global`: header `PELLETS  TIME  LVL  DATE        CC`, seeded rows ranked by pellets, the completed row shows `CLR`, country `XX` (local wrangler has no `cf.country`), nothing overlapping the tab row or Back.
- `hs-global-back-local`: Local list again. Confirm in the worker console that only **one** `GET /scores` was logged for the whole probe (fetch-once-per-visit).
- If the menu option order differs from START / LEARN / HIGH SCORES / SETTINGS, adjust `press:` steps to reach `HighScoresScene`; the `scene:HighScoresScene` step must pass.

## Out of scope

30-day / country filters, Game Center / Steamworks identity, Turnstile or other bot checks, admin UI or endpoint, itch.io / Steam packaging, privacy policy, deterministic replay / server-side score verification, backfilling pre-update local scores, custom domain for the Worker, changing the local sort, HUD changes in PlayScene.

## Implementation order

1. Local history v3 + storage migration (+ tests).
2. `highScoresView` level/country columns (+ tests).
3. `src/domain/leaderboard.ts` (+ tests).
4. `leaderboardStorage`, `vite-env.d.ts`, `leaderboardClient`.
5. `saveRun` event shape in `simEvents`/`playSim` + `PlayScene` save/submit wiring.
6. `HighScoresScene` tabs, lazy global fetch, status texts, own-row highlight.
7. `worker/` (wrangler.toml, migration, rebuild SQL, scores.ts, index.ts, tsconfig, tests); package.json scripts/devDeps, ports.json, vitest include, .gitignore.
8. CI: deploy-pages env + deploy-worker workflow.
9. Docs: README, `worker/README.md`, `docs/ARCHITECTURE.md`.
10. Required verification per `docs/VERIFICATION.md`: `npm run verify` green, manual worker curl check, and the live-check recipe above with screenshots read and findings recorded in the PR body.
11. **Run the `ship-plan` skill** (`.agents/skills/ship-plan/SKILL.md`). Do not stop before the PR exists. Note in the PR body that the Worker is inert until the one-time Cloudflare setup in README is done.
