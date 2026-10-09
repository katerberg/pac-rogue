# Global run data and high scores (Cloudflare Worker + D1)

## Goal

Send every finished, non-debug run from every player to one small backend, so the developer can analyse runs from all players in `/data`, and everyone can see a global high-score board built from those same runs. The game (GitHub Pages today; itch.io and Steam later) uploads finished run-log records to a Cloudflare Worker backed by D1. The server derives each device's best from the uploaded runs; there is no separate score submission. Players can opt out in Settings. Ongoing cost target: $0 (Workers Free + D1 Free, hard caps, no card).

This plan replaces the earlier "global high scores only" plan in this file's history: same Worker + D1 setup, but runs are the single source of truth.

Ship it as **two PRs**, each ending with `ship-plan`:

- **PR 1 — foundation and run uploads:** Worker, `runs` table, upload queue, Settings opt-out, privacy notice, `npm run data:pull`, `/data` showing pulled global data, deploy workflows.
- **PR 2 — global leaderboard:** `bests` table derived from runs, `GET /scores`, LOCAL / GLOBAL tabs on High Scores.

PR 2 starts only after PR 1 is merged.

## Locked decisions

| ID  | Decision                                                                                                                                                                                                          | Source         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | No raw IP is stored anywhere. Rate limiting uses a keyed hash of the IP (HMAC-SHA-256 with a Worker secret)                                                                                                       | user           |
| 2   | One device id: the existing run-log install id (`pac-rogue.run-log.v1.install-id`, `getInstallId()`); no second client id                                                                                         | user           |
| 3   | One game version: the existing `__GAME_VERSION__` (git short SHA); no `VITE_APP_VERSION`                                                                                                                          | user           |
| 4   | Uploads are on by default with an opt-out in Settings and a short privacy notice                                                                                                                                  | user           |
| 5   | The global leaderboard is derived server-side from uploaded runs; no personal-best submission path; no local history v3 migration                                                                                 | user           |
| 6   | Developer reads global data by export: `npm run data:pull` writes a local file; `/data` loads it with one click. No telemetry read endpoint                                                                       | user           |
| 7   | Leaderboard is all-time (no seasons, no version filter)                                                                                                                                                           | user           |
| 8   | This plan updates PR #273 in place                                                                                                                                                                                | user           |
| A   | Worker in `worker/` (TypeScript): `wrangler.toml`, `src/index.ts` (thin handler), `src/runs.ts` + (PR 2) `src/scores.ts` (pure validation/SQL/mapping), `migrations/`, `sql/`                                     | default        |
| B   | Worker name `pac-rogue-api`, D1 database `pac-rogue`                                                                                                                                                              | default        |
| C   | `runs` stores the raw record JSON plus indexed columns; schema growth never needs a migration                                                                                                                     | default        |
| D   | Upload only finished runs (`death`, `complete`, `quit`, `abandoned`), never `inProgress`, never `debug: true`. Server rejects both too                                                                            | default        |
| E   | `POST /runs` is idempotent: insert-or-update by run `id`, and an update only applies when the stored `install_id` matches                                                                                         | default        |
| F   | No backfill: only runs whose `startedAt` is at or after the moment this build first ran (`uploadsSince`) are uploaded                                                                                             | default        |
| G   | Client upload queue: drains on game boot and after every `runLog` save with a final outcome; one run per request, at most 10 per drain, sequential, 5 s timeout, silent failure, natural retry                    | default        |
| H   | Local upload state in `pac-rogue.run-upload.v1`: `{ since: ISO string, uploaded: string[] }` (ids); purged ids are dropped from it                                                                                | default        |
| I   | Rate limit: 30 accepted uploads per IP hash per 10 minutes, counted in D1; 429 when exceeded                                                                                                                      | default        |
| J   | Body limit 64 KB; record must pass the shared `parseRunLogRecord` plus bounds (see Data / contracts)                                                                                                              | default        |
| K   | Opt-out stored in `pac-rogue.privacy.v1` as `{ shareRunStats: boolean }` (default true). Off stops all uploads at once; data already sent stays until a deletion request                                          | default        |
| L   | Settings gets a `SHARE RUN STATS` checkbox row below the ghost-style row, with a one-line note and the first 8 characters of the install id (for deletion requests)                                               | default        |
| M   | Privacy text lives in `docs/PRIVACY.md` (player-facing, linked from README); deletion is a SQL recipe in `worker/README.md`                                                                                       | default        |
| N   | Build-time env: `VITE_API_URL` (unset → uploads and global board off) and `VITE_PLATFORM` (`web` \| `itch` \| `steam`, default `web`). Only the Pages deploy sets `VITE_API_URL` (from repo variable `API_URL`)   | default        |
| O   | Dev and test never hit production: dev, preview, CI verify and probes never set `VITE_API_URL`; local Worker work uses `wrangler dev --local` (local SQLite)                                                      | default        |
| P   | `npm run data:pull` pages through `runs` with `wrangler d1 execute --remote --json` (1000 rows per page) and writes `data-exports/runs-<UTC date>.json` and `data-exports/latest.json` (folder gitignored)        | default        |
| Q   | `/data` gets a source switch `THIS BROWSER \| GLOBAL (PULLED)`. The dev server serves `data-exports/latest.json` at `/data/export.json` (dev only, not preview or build). A file picker loads any export file too | default        |
| R   | CORS `*`, methods `GET, POST, OPTIONS`, header `Content-Type`; no credentials                                                                                                                                     | default        |
| S   | Country comes from `request.cf.country` (2 letters, else `XX`); `received_at` is server time; client times are kept only inside the record JSON                                                                   | default        |
| T   | Soft-hide with `hidden_reason` on `runs` (NULL = visible); exports and the leaderboard skip hidden rows; no admin endpoint, recipes in `worker/README.md`                                                         | default        |
| U   | Leaderboard (PR 2): one row per install id, from visible `death` / `complete` runs; rank by `pelletsCollected` desc → reach desc (WIN above L9) → earliest `received_at`; top 50                                  | default        |
| V   | High Scores (PR 2): `LOCAL  GLOBAL` toggle under the title, Left/Right + click, Local default, Global fetched once per scene visit on first switch; local list unchanged                                          | default        |
| W   | Global rows show `PELLETS  LVL  DATE  CC`; own row (matched by install id) highlighted                                                                                                                            | default        |
| X   | Root devDeps `wrangler` + `@cloudflare/workers-types`; `worker/tsconfig.json`; `typecheck` also runs `tsc -p worker`; vitest includes `worker/**/*.test.ts`                                                       | default        |
| Y   | Worker ports: humans 8787, agents 8788 (`scripts/ports.json`)                                                                                                                                                     | default        |
| Z   | `.github/workflows/deploy-worker.yml` deploys on push to `main` touching `worker/**` and on `workflow_dispatch`; applies remote migrations, then deploys; skips cleanly without secrets                           | default (#273) |

## Today's world (brief)

Re-check these anchors against `main` before starting; adapt line references, keep the decisions.

- **Run log** (merged): `src/domain/runLog.ts` (`RunLogRecord`, `RUN_LOG_VERSION = 1`, `parseRunLogRecord`, `syntheticRunLog`), `src/game/sim/runRecorder.ts`, `src/game/storage/runLogStorage.ts` (`getInstallId`, `newRunLogMeta`, `saveRunLog`, `relabelAbandoned`, `loadAllRuns`, `purgeOldestRuns`). Records carry `id`, `installId`, `gameVersion`, `startedAt`, `outcome`, `debug`, `finalLevel`, `pelletsCollected`, `loadout`, `levels`, `storeVisits`. `PlayScene` saves each `runLog` SimEvent; `src/main.ts` calls `relabelAbandoned()` once at boot. See `docs/RUN_LOG.md`.
- **`/data`** (merged): `data/index.html`, `src/data/main.ts` (calls `loadAllRuns()` and renders), `src/data/dataPage.ts`, counting in `src/domain/runAnalytics.ts`. The Vite `data-route` plugin in `vite.config.ts` redirects `/data` → `/data/` on dev and preview.
- **High scores:** `src/domain/runHistory.ts` (v2), `src/game/storage/runHistoryStorage.ts`, `src/domain/highScoresView.ts`, `src/game/scenes/HighScoresScene.ts`. `PlaySim.saveRun()` emits `saveRun` on game over and RUN COMPLETE unless `highScoresDisabled`. Unchanged by this plan except for the PR 2 tabs.
- **Settings:** `src/game/scenes/SettingsScene.ts` (music, SFX, maze colour, ghost style rows; focus count in `src/domain/settingsFocus.ts`). Storage pattern: `src/game/storage/audioSettingsStorage.ts`.
- **Lint:** `crypto.randomUUID` / `Math.random` are banned outside `src/domain/runRandom.ts`; ids come from `freshId()` there.
- **Build:** `vite.config.ts` defines `__GAME_VERSION__`; no `import.meta.env` use and no `vite-env.d.ts` yet. `.github/workflows/deploy-pages.yml` builds and publishes `dist/`.
- **Probe:** `npm run probe` fails on any `console.error` (Chromium logs failed fetches as console errors), so the client must never fetch when `VITE_API_URL` is unset. It has `goto:<path>`, `pageShot:`, `domClick:` and `domFill:` steps.

## Approach — PR 1: foundation and run uploads

### 1. Client: env, privacy setting, upload state

- `src/vite-env.d.ts` (new): `/// <reference types="vite/client" />` plus `ImportMetaEnv` with optional `VITE_API_URL` and `VITE_PLATFORM`.
- `src/domain/runUpload.ts` (new, pure):
  - `PLATFORMS = ["web", "itch", "steam"] as const`; `parsePlatform(value: string | undefined): Platform` (fallback `web`).
  - `type UploadState = { since: string; uploaded: string[] }`; `parseUploadState(raw: string | null): UploadState | null`.
  - `uploadable(record: RunLogRecord, state: UploadState): boolean`: true when `outcome` is not `inProgress`, `debug` is false, `startedAt >= state.since` (ISO string compare) and `id` is not in `state.uploaded`.
  - `nextUploads(records, state, max = 10): RunLogRecord[]`: the uploadable records, oldest `startedAt` first, at most `max`.
  - `type RunUpload = { platform: Platform; record: RunLogRecord }`.
- `src/game/storage/runUploadStorage.ts` (new; same try/catch style as `runLogStorage`): key `pac-rogue.run-upload.v1`. `loadUploadState()` creates `{ since: new Date().toISOString(), uploaded: [] }` on first call and persists it (this is the no-backfill marker). `markUploaded(id)`. `forgetUploaded(ids)`, called by `purgeOldestRuns()` for the ids it deletes.
- `src/domain/privacySettings.ts` + `src/game/storage/privacySettingsStorage.ts` (new): key `pac-rogue.privacy.v1`, `{ shareRunStats: boolean }`, default `true`, corrupt → default.

### 2. Client: upload queue

`src/game/net/apiClient.ts` (new, no Phaser):

- Reads env once: `baseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || null`; `platform = parsePlatform(import.meta.env.VITE_PLATFORM)`.
- `drainRunUploads(): Promise<void>`: returns at once if `baseUrl === null`, `shareRunStats` is false, or a drain is already running (module-level `draining` flag; this is a single in-flight guard, not shared state). Otherwise loads `loadAllRuns().runs` and `loadUploadState()`, takes `nextUploads(...)`, and POSTs each to `${baseUrl}/runs` in sequence (`AbortSignal.timeout(5000)`). On 201/200 → `markUploaded(id)`. On 400 → `markUploaded(id)` too (the server will never accept it, so stop retrying). On 429, 5xx or network error → stop this drain. Never `console.error`; at most one `console.warn` per drain.
- Triggers: `src/main.ts` calls `void drainRunUploads()` after `relabelAbandoned()`; `PlayScene` calls it after `saveRunLog(event.record)` when `event.record.outcome !== "inProgress"`.

### 3. Client: Settings opt-out

`SettingsScene`: add a `SHARE RUN STATS` checkbox row below the ghost-style row, built like the music/SFX checkbox rows (same focus, keyboard and pointer handling; bump `SETTINGS_FOCUS_COUNT` in `src/domain/settingsFocus.ts` and its test). Under it, one muted line: `ANONYMOUS RUN STATS HELP BALANCE THE GAME · ID <first 8 of install id>`. Toggling saves `pac-rogue.privacy.v1` at once. Measure the new text with the existing probe-text width trick; it must fit the 800 px canvas and not overlap Back.

### 4. Worker

`worker/wrangler.toml`:

```toml
name = "pac-rogue-api"
main = "src/index.ts"
compatibility_date = "2026-10-01"

[[d1_databases]]
binding = "DB"
database_name = "pac-rogue"
database_id = "00000000-0000-0000-0000-000000000000"
migrations_dir = "migrations"
```

Secret `IP_HASH_KEY` (set with `wrangler secret put IP_HASH_KEY`; for local dev put it in `worker/.dev.vars`, gitignored).

`worker/migrations/0001_runs.sql`:

```sql
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  install_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  game_version TEXT NOT NULL,
  platform TEXT NOT NULL,
  outcome TEXT NOT NULL,
  final_level INTEGER NOT NULL,
  pellets INTEGER NOT NULL,
  country TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  received_at TEXT NOT NULL,
  record TEXT NOT NULL,
  hidden_reason TEXT
);
CREATE INDEX runs_ip_received ON runs (ip_hash, received_at);
CREATE INDEX runs_install ON runs (install_id);
CREATE INDEX runs_received ON runs (received_at);
```

`worker/src/runs.ts` (pure; no Workers types):

- `validateUpload(body: unknown): RunUpload | null`: `platform` in `PLATFORMS`; `record` passes `parseRunLogRecord(JSON.stringify(record))` (imported from `../../src/domain/runLog`; wrangler bundles it) and the bounds below.
- `RATE_LIMIT_MAX = 30`, `RATE_LIMIT_WINDOW_MS = 600_000`, `MAX_BODY_BYTES = 65_536`.
- SQL constants: `COUNT_RECENT_BY_IP_HASH`; `UPSERT_RUN` (`INSERT … ON CONFLICT(id) DO UPDATE SET outcome = excluded.outcome, final_level = excluded.final_level, pellets = excluded.pellets, record = excluded.record, received_at = excluded.received_at WHERE runs.install_id = excluded.install_id`).
- `countryOrUnknown(value: unknown)`: 2-letter string else `"XX"`.

`worker/src/index.ts`:

- `export default { fetch(request, env: { DB: D1Database; IP_HASH_KEY?: string }) }`.
- `OPTIONS *` → 204 + CORS. Every response carries CORS headers.
- `POST /runs`: if `IP_HASH_KEY` is missing → 503 `{ error: "unconfigured" }`. Read the body as text; over `MAX_BODY_BYTES` → 413. Parse JSON (bad → 400) → `validateUpload` (null → 400) → `ipHash = hex(HMAC-SHA-256(IP_HASH_KEY, CF-Connecting-IP ?? "unknown"))` via `crypto.subtle` → count recent by `ipHash` (≥ max → 429) → `UPSERT_RUN` → 201 `{ ok: true }`. The raw IP is never written or logged.
- Other paths → 404; other methods on `/runs` → 405; unexpected exceptions → 500 `{ error: "internal" }`.

`worker/sql/` recipes (also in `worker/README.md`):

```sql
-- hide one install's runs (cheating or junk)
UPDATE runs SET hidden_reason = 'junk-2026-10' WHERE install_id = '…';
-- undo
UPDATE runs SET hidden_reason = NULL WHERE hidden_reason = 'junk-2026-10';
-- deletion request (player gives the 8-char id from Settings)
DELETE FROM runs WHERE install_id LIKE '<8 chars>%';
```

`worker/tsconfig.json`: `target`/`lib` ES2022, `module` ESNext, `moduleResolution` bundler, `strict`, `noEmit`, `types: ["@cloudflare/workers-types", "vitest/globals"]`, `include: ["src"]`.

### 5. Pull and import

- `scripts/data-pull.mjs` (new; `npm run data:pull`): pages with `npx wrangler d1 execute pac-rogue --remote --json --config worker/wrangler.toml --command "SELECT id, record, received_at FROM runs WHERE hidden_reason IS NULL AND received_at > '<cursor>' ORDER BY received_at LIMIT 1000"` until a page has fewer than 1000 rows. It parses each `record`, keeps the ones `parseRunLogRecord` accepts, and writes `{ exportedAt, source: "pac-rogue", runs: RunLogRecord[] }` to `data-exports/runs-<YYYY-MM-DD>.json` and `data-exports/latest.json`. It prints the run count and file path. Fails clearly if wrangler is not logged in. A `--local` flag reads the local dev database instead (for testing).
- `src/domain/runExport.ts` (new, pure): `parseRunExport(json: unknown): { exportedAt: string; runs: RunLogRecord[]; unreadable: number } | null`.
- `vite.config.ts`: extend the `data-route` plugin's **dev server only** (`configureServer`) to serve `GET /data/export.json` from `data-exports/latest.json` (404 when missing). Not in `configurePreviewServer`, not in the build.
- `src/data/main.ts` / `dataPage.ts`: a source switch above the toggles, `THIS BROWSER | GLOBAL (PULLED)`. Global fetches `./export.json` once (404 → the message `NO PULLED DATA — RUN npm run data:pull`). Plus a `LOAD FILE…` button (`<input type="file">`) that reads any export file. The header notes `exported <date> · N runs`. Everything else on the page works the same on either source. In global mode, runs from other installs never have `debug: true`, so the debug toggle changes nothing there.

### 6. Tooling and CI

- `package.json`: devDeps `wrangler`, `@cloudflare/workers-types` (current majors via `npm install -D`). Scripts: `"typecheck": "tsc --noEmit && tsc --noEmit -p worker"`, `"worker:migrate:local": "wrangler d1 migrations apply pac-rogue --local --config worker/wrangler.toml"`, `"worker:dev": "wrangler dev --config worker/wrangler.toml --local --port 8787"`, `"worker:dev:agent": "wrangler dev --config worker/wrangler.toml --local --port 8788"`, `"data:pull": "node scripts/data-pull.mjs"`.
- `scripts/ports.json`: add `"humanWorker": 8787, "agentWorker": 8788`.
- `vitest.config.ts`: include `worker/**/*.test.ts`.
- `.gitignore`: `.wrangler/`, `worker/.wrangler/`, `worker/.dev.vars`, `data-exports/`.
- `deploy-pages.yml` build step env: `VITE_API_URL: ${{ vars.API_URL }}`, `VITE_PLATFORM: web`.
- `.github/workflows/deploy-worker.yml` (new): triggers `push` to `main` with `paths: ["worker/**", "src/domain/runLog.ts", ".github/workflows/deploy-worker.yml"]` and `workflow_dispatch`; `concurrency: deploy-worker`; checkout → setup-node (`.nvmrc`, npm cache) → `npm ci` → a `check` step that outputs `enabled=false` and prints a notice when `CLOUDFLARE_API_TOKEN` is empty → (if enabled) `npx wrangler d1 migrations apply pac-rogue --remote --config worker/wrangler.toml` → `npx wrangler deploy --config worker/wrangler.toml`. Env from secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. `IP_HASH_KEY` is set once by hand with `wrangler secret put` (documented), not by CI.
- `verify.yml`: unchanged (never sets `VITE_API_URL`).

## Approach — PR 2: global leaderboard

### 7. Worker

`worker/migrations/0002_bests.sql`:

```sql
CREATE TABLE bests (
  install_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  pellets INTEGER NOT NULL,
  reach INTEGER NOT NULL,
  country TEXT NOT NULL,
  received_at TEXT NOT NULL
);
CREATE INDEX bests_rank ON bests (pellets DESC, reach DESC, received_at ASC);
```

`reach` = `final_level`, or 10 for `complete` (same as `runAnalytics.reachOf`).

- `worker/src/scores.ts` (pure): `UPSERT_BEST` (only for `death` / `complete` uploads; `ON CONFLICT(install_id) DO UPDATE … WHERE excluded.pellets > bests.pellets OR (excluded.pellets = bests.pellets AND excluded.reach > bests.reach)`), `SELECT_BOARD` (`ORDER BY pellets DESC, reach DESC, received_at ASC LIMIT ?`), `BOARD_LIMIT = 50`, `toBoardRow(dbRow, requesterInstallId)` → `{ pellets, reach, country, receivedAt, mine }` (never exposes `install_id` or `run_id`).
- `POST /runs` runs `UPSERT_RUN` and, for qualifying runs, `UPSERT_BEST` in one `env.DB.batch`.
- `GET /scores[?installId=]` → 200 `{ scores: [...] }`.
- `worker/sql/rebuild-bests.sql`: rebuilds `bests` from visible `death` / `complete` runs with `ROW_NUMBER() OVER (PARTITION BY install_id ORDER BY pellets DESC, reach DESC, received_at ASC)`. Run it after every soft-hide.
- Backfill on deploy: the 0002 migration ends with the same `INSERT … SELECT` as the rebuild, so runs uploaded during PR 1 appear on the board immediately.

### 8. Client

- `src/domain/leaderboard.ts` (new, pure): `type GlobalScoreRow = { pellets; reach; country; receivedAt; mine }`; `parseGlobalScores(json: unknown): GlobalScoreRow[] | null` (null on any shape error); `formatGlobalHeader()` → `PELLETS  LVL  DATE        CC`; `formatGlobalLine(row)` (LVL via `formatReach` from `runAnalytics`, date = first 10 chars).
- `apiClient.ts`: `fetchGlobalScores(): Promise<{ kind: "ok"; rows } | { kind: "offline" } | { kind: "error" }>`; `offline` when no `baseUrl`; `GET ${baseUrl}/scores?installId=<getInstallId()>` with a 5 s timeout.
- `HighScoresScene`: the tab row, fetch-once-per-visit state, `renderList(...)` extraction, own-row highlight and status texts from the earlier #273 design: `LOADING...` / `NO SCORES YET` / `GLOBAL UNAVAILABLE` / `GLOBAL OFFLINE`. The local list stays as it is today. Opted-out players can still view the global board.

## Data / contracts

**POST /runs** body: `{ platform: "web" | "itch" | "steam", record: RunLogRecord }`.

| Rule on `record`           | Bound                                                |
| -------------------------- | ---------------------------------------------------- |
| passes `parseRunLogRecord` | version 1 and required fields                        |
| `outcome`                  | `death`, `complete`, `quit` or `abandoned`           |
| `debug`                    | `false`                                              |
| `id`, `installId`          | UUID format                                          |
| `finalLevel`               | integer 1..99 (loose so new levels need no redeploy) |
| `pelletsCollected`         | integer 0..100000                                    |
| `gameVersion`              | string 1..64 chars                                   |
| whole body                 | ≤ 64 KB                                              |

Responses: 201 `{ ok: true }`; 400 `{ error: "invalid" }`; 413 `{ error: "too_large" }`; 429 `{ error: "rate_limited" }`; 503 `{ error: "unconfigured" }`; 500 `{ error: "internal" }`.

**GET /scores?installId=<uuid optional>** (PR 2) → 200 `{ scores: Array<{ pellets, reach, country, receivedAt, mine }> }`, at most 50.

**Export file** (`data-exports/*.json`): `{ exportedAt: ISO string, source: "pac-rogue", runs: RunLogRecord[] }`.

**localStorage (new):** `pac-rogue.run-upload.v1` (`{ since, uploaded }`), `pac-rogue.privacy.v1` (`{ shareRunStats }`).

## Failure behavior

- No `VITE_API_URL` (dev, preview, CI, probes): nothing is ever sent; the Global tab shows `GLOBAL OFFLINE`; `/data` global source still works from a pulled file.
- Opted out: no uploads; queue state kept; turning it back on resumes from the next drain, only for runs started after `since`.
- Upload network error, timeout, 429 or 5xx: silent; the run stays queued; the next drain retries. 400: marked uploaded so it is never retried.
- Worker missing `IP_HASH_KEY`: 503 on uploads (clients retry later); board reads still work.
- D1 free-tier daily cap hit: 500s; clients treat it as a failure (above).
- localStorage unavailable: no run log, so nothing to upload; the game plays normally.
- `data:pull` without a wrangler login or with a placeholder `database_id`: exits non-zero with a message naming the setup step.
- Pulled file missing or corrupt: `/data` shows `NO PULLED DATA — RUN npm run data:pull` or `UNREADABLE EXPORT`.
- Two tabs draining at once: the server upsert by `id` makes duplicates harmless.

## Docs

- `docs/PRIVACY.md` (new, player-facing): what is sent (finished run stats, random install id, game version, platform, country), what is not (no IP, no name, no account), opt-out in Settings, how to ask for deletion (the 8-character id), where it is stored (Cloudflare D1).
- `README.md`: "Global runs and high scores" section with the one-time setup: Cloudflare account; `npx wrangler login`; `npx wrangler d1 create pac-rogue`; paste the id into `worker/wrangler.toml`; `npx wrangler secret put IP_HASH_KEY --config worker/wrangler.toml`; repo secrets `CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit + D1:Edit) and `CLOUDFLARE_ACCOUNT_ID`; run the deploy-worker workflow; set repo variable `API_URL` to the `workers.dev` URL; redeploy Pages. Plus local dev (`worker:migrate:local`, `worker:dev`, `VITE_API_URL=http://127.0.0.1:8787 npm run dev`), `npm run data:pull` → open `/data` → GLOBAL, the worker ports, and links to `worker/README.md` and `docs/PRIVACY.md`.
- `worker/README.md` (new): API contract, schema, rate limit, hide/undo/delete recipes, rebuild step (PR 2), cost notes (free-tier caps fail closed).
- `docs/RUN_LOG.md`: an "Uploads" section (what uploads, when, `since`, opt-out) and the `/data` source switch.
- `docs/ARCHITECTURE.md`: layout adds `src/domain/runUpload.ts`, `privacySettings.ts`, `runExport.ts`, (PR 2) `leaderboard.ts`; `src/game/net/apiClient.ts`; the new storage files; `src/vite-env.d.ts`; `worker/`; `scripts/data-pull.mjs`; ports 8787/8788.

## Acceptance tests

### PR 1 automated (`npm run verify` green)

- `runUpload.test.ts`: `uploadable` rejects `inProgress`, `debug`, `startedAt < since` and already-uploaded ids; `nextUploads` is oldest-first and capped; `parsePlatform` fallback; `parseUploadState` handles corrupt input.
- `runUploadStorage.test.ts`: first load writes `since`; `markUploaded` / `forgetUploaded` round-trip; `purgeOldestRuns` forgets the purged ids.
- `privacySettings` tests: default true; corrupt → default; round-trip.
- `runExport.test.ts`: accepts a valid export; counts unreadable records; rejects a wrong shape.
- `apiClient.test.ts` (stub `fetch`, `localStorage`, env): no URL → no fetch; opted out → no fetch; 201 → marked; 400 → marked; 429 → stops the drain and keeps the run queued; at most 10 per drain; one in-flight drain.
- `worker/src/runs.test.ts`: every bound just inside and just outside; `inProgress` and `debug` rejected; `countryOrUnknown`.
- `worker/src/index.test.ts` (fake `DB` recording `prepare(sql).bind(...)` with `first` / `run` / `batch` stubs): OPTIONS → 204 + CORS; missing key → 503; oversize → 413; bad JSON → 400; invalid → 400; recent ≥ 30 → 429 and no write; valid → 201; the bound values never include the raw IP; unknown path → 404; wrong method → 405.
- `settingsFocus` test updated for the new row.

### PR 1 manual worker check (record commands and output in the PR)

```bash
echo 'IP_HASH_KEY=local-test-key' > worker/.dev.vars
npm run worker:migrate:local
npm run worker:dev:agent &   # port 8788
# POST a finished run built from a syntheticRunLog-shaped record with debug:false → 201
# POST the same id again with a different outcome → 201, one row, updated
# POST it again with a different installId → row unchanged
# POST debug:true or outcome:inProgress → 400
# 31 POSTs in a row → the 31st returns 429
npx wrangler d1 execute pac-rogue --local --config worker/wrangler.toml --command "SELECT id, ip_hash, length(record) FROM runs"   # no raw IP anywhere
npm run data:pull -- --local   # writes data-exports/latest.json with the runs
```

### PR 1 live check (agent ports; Read every screenshot)

```bash
# A. Settings opt-out row (no API URL): the row shows, toggles, and persists across a reload
npm run probe -- --query "" --name privacy --steps "<menu → SETTINGS>,pageShot:settings,<focus SHARE RUN STATS>,press:Enter,pageShot:off"
# B. /data global source from a pulled file (after data:pull --local, or a fixture copied to data-exports/latest.json)
npm run probe -- --query "" --name data-global --steps "goto:/data,domClick:button[data-source=global],waitFor:data.source==global,expect:data.stored>0,pageShot:global"
# C. Uploads end to end: dev server with VITE_API_URL=http://127.0.0.1:8788, play a run to game over with infiniteLives off,
#    then confirm a row in the local D1 with the same id as play.runLog.id
```

Add `source` to the `/data` agent snapshot. Screenshots must show: the Settings row with checkbox, note and 8-char id fitting the canvas and clear of Back; the box unticked after Enter; `/data` with the GLOBAL source active and `exported <date> · N runs` in the header.

### PR 2

- Worker tests: `UPSERT_BEST` only for `death` / `complete`; a lower score never replaces a best; `toBoardRow` sets `mine` and omits ids; the 0002 backfill builds `bests` from existing runs.
- `leaderboard.test.ts`: parse valid / reject malformed; header and line widths; WIN label.
- Manual: seed 3 installs locally (one `complete`), `GET /scores?installId=…` shows `mine`, hide one install and run `rebuild-bests.sql`, and its row disappears.
- Live check: the #273 High Scores probes (offline → `GLOBAL OFFLINE`; with the local worker → ranked rows, own row highlighted, one `GET /scores` per visit).

## Out of scope

Player names, seasons or version filters on the board, any telemetry read endpoint, admin UI, Turnstile or bot checks, server-side replay verification, backfill of runs recorded before the upload build, uploading `inProgress` runs, auto-pruning uploaded runs from the local log, itch.io / Steam packaging, custom domain, and a level column on the local high-score list.

## Implementation order

PR 1:

1. `runUpload` domain + storage, `privacySettings`, tests.
2. `vite-env.d.ts`, `apiClient` drain + tests; triggers in `main.ts` and `PlayScene`; `purgeOldestRuns` forgets uploaded ids.
3. Settings `SHARE RUN STATS` row.
4. `worker/` (wrangler.toml, migration 0001, `runs.ts`, `index.ts`, tsconfig, tests); package.json, ports, vitest include, `.gitignore`.
5. `data-pull.mjs`, `runExport`, the dev-only `/data/export.json` route, the `/data` source switch and file loader.
6. CI: deploy-pages env and the deploy-worker workflow.
7. Docs: `PRIVACY.md`, README, `worker/README.md`, `RUN_LOG.md`, `ARCHITECTURE.md`.
8. Verification per `docs/VERIFICATION.md`: `npm run verify`, the manual worker check, live checks A–C with screenshots read.
9. **Run the `ship-plan` skill.** Note in the PR body that nothing uploads until the one-time Cloudflare setup is done and `API_URL` is set.

PR 2 (after PR 1 merges):

1. Migration 0002 + backfill, `scores.ts`, `GET /scores`, batch in `POST /runs`, rebuild SQL, tests.
2. `leaderboard.ts`, `fetchGlobalScores`, `HighScoresScene` tabs.
3. Docs: README, `worker/README.md`, `ARCHITECTURE.md`.
4. Verification: `npm run verify`, the manual board check, the High Scores live checks.
5. **Run the `ship-plan` skill.**
