# dot-man-api Worker

Cloudflare Worker + D1 database that receives finished runs from the game and serves the global high-score board. [docs/PRIVACY.md](../docs/PRIVACY.md) is what players are told; the owner's one-time setup is in the [root README](../README.md#global-runs-and-high-scores).

## Design

- **Runs are the only source of truth.** Every finished, non-debug run is stored as-is in `runs`. The leaderboard (`bests`) is derived from those rows and can always be rebuilt from them; there is no separate score-submission path.
- **No raw IP is stored.** Rate limiting uses `ip_hash`, an HMAC-SHA-256 of the IP keyed with the `IP_HASH_KEY` secret.
- **One device id:** the run log's random install id. The board never returns install ids or run ids; it only marks the requester's own row.
- **No telemetry read endpoint.** The developer reads runs with `npm run data:pull` (wrangler, owner's login) and opens them in `/data`.
- **Automation never reaches production.** Only the GitHub Pages deploy builds with `VITE_API_URL` (from the repository variable `API_URL`). A page on `localhost` or a dev server refuses any non-local API URL. Cloudflare credentials live only in the GitHub environment `production` (main branch only), which only `deploy-worker.yml` uses.
- **Free tier, fails closed.** Workers Free and D1 Free with no card on file: when a daily limit is hit the Worker errors, clients retry later, and nothing is billed.

## API

CORS `*` on every response (methods `GET, POST, OPTIONS`, header `Content-Type`).

`POST /runs` with `{ "platform": "web" | "itch" | "steam", "record": RunLogRecord }`.

- The record must pass `parseRunLogRecord` (`src/domain/runLog.ts`), be finished (`death`, `complete`, `quit`, `abandoned`), not `debug`, have UUID `id` and `installId`, `finalLevel` 1..99, `pelletsCollected` 0..100000 and `gameVersion` 1..64 chars. The body must be at most 64 KB.
- Insert-or-update by run `id`; an update only applies when the stored `install_id` matches. In the same batch, a visible `death` or `complete` run replaces its install's best when it has more pellets, or equal pellets and a higher reach.
- Responses: 201 `{ ok: true }`; 400 `invalid`; 413 `too_large`; 429 `rate_limited` (30 accepted uploads per IP hash per 10 minutes); 503 `unconfigured` (no `IP_HASH_KEY`); 500 `internal`.

`GET /scores?installId=<uuid, optional>` → 200 `{ scores: [{ pellets, reach, country, receivedAt, mine }] }`, the top 50 bests ranked by pellets desc, then reach desc, then earliest upload. `receivedAt` is the upload date only (`YYYY-MM-DD`). `reach` is the final level (capped at 9), or 10 for a completed run (shown as `WIN`). `mine` is true only on the row whose install id matches the query.

Other paths return 404; other methods 405.

## Client behaviour

- Uploads: on boot and after every finished run, the game sends up to 10 queued runs, oldest first, one request each with a 5 s timeout. Runs that started before this build first ran are never sent. Network errors, 429 and 5xx leave the run queued for the next try; a 400 marks it sent so it is never retried. Turning **SHARE RUN STATS** off stops uploads; the board can still be viewed.
- Board: High Scores fetches `/scores` once per visit, on the first switch to GLOBAL. Without `VITE_API_URL` it shows `GLOBAL OFFLINE`; any failure shows `GLOBAL UNAVAILABLE`.

## Schema

- `migrations/0001_runs.sql`: one `runs` row per run with indexed columns (`install_id`, `schema_version`, `game_version`, `platform`, `outcome`, `final_level`, `pellets`, `country`, `ip_hash`, `received_at`), the raw `record` JSON, and `hidden_reason` (NULL = visible). New record fields need no migration.
- `migrations/0002_bests.sql`: `bests`, one row per install (`run_id`, `pellets`, `reach`, `country`, `received_at`), indexed in board order. The migration backfilled it from existing runs.
- `sql/rebuild-bests.sql`: rebuilds `bests` from visible runs with the same ranking. Run it after any hide, undo or delete.

Migrations apply automatically when `deploy-worker.yml` runs on `main`.

## Secret

`IP_HASH_KEY`: set once, in the dashboard (**Workers & Pages → dot-man-api → Settings → Variables and Secrets → Add → Secret**) or with `npx wrangler secret put IP_HASH_KEY --config worker/wrangler.toml`. Use a long random value (`openssl rand -hex 32`). Until it is set, uploads get 503 and clients retry later; deploys keep it. For local dev put `IP_HASH_KEY=anything` in `worker/.dev.vars` (gitignored).

## Recipes

Run each with `npx wrangler d1 execute dot-man-api --remote --config worker/wrangler.toml --command "…"`, then rebuild the board with `npx wrangler d1 execute dot-man-api --remote --config worker/wrangler.toml --file worker/sql/rebuild-bests.sql` when it changed `runs`.

```sql
-- hide one install's runs (cheating or junk); then rebuild
UPDATE runs SET hidden_reason = 'junk-2026-10' WHERE install_id = '…';
-- undo; then rebuild
UPDATE runs SET hidden_reason = NULL WHERE hidden_reason = 'junk-2026-10';
-- deletion request (the player sends the 8 characters shown in Settings); then rebuild
DELETE FROM runs WHERE install_id LIKE '<8 chars>%';
-- quick look
SELECT outcome, COUNT(*) FROM runs GROUP BY outcome;
SELECT substr(id, 1, 8) AS run, outcome, final_level, pellets, country, received_at
  FROM runs ORDER BY received_at DESC LIMIT 20;
```

## Local

```bash
echo 'IP_HASH_KEY=local-test-key' > worker/.dev.vars
npm run worker:migrate:local
npm run worker:dev            # http://127.0.0.1:8787 (agents: npm run worker:dev:agent on 8788)
VITE_API_URL=http://127.0.0.1:8787 npm run dev
npm run data:pull -- --local  # export the local database
```

Tests: `worker/src/*.test.ts` run with the rest of `npm run test`. `scores.test.ts` applies the real migration and rebuild SQL to an in-memory SQLite database (`node:sqlite`).
