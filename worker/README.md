# dot-man-api Worker

Cloudflare Worker + D1 database that receives finished runs from the game and serves the global high-score board. [docs/PRIVACY.md](../docs/PRIVACY.md) is what players are told.

## Owner one-time setup

1. Cloudflare account with a `workers.dev` subdomain; D1 database `dot-man-api` (id in `worker/wrangler.toml`).
2. API token with Workers edit + D1 edit. GitHub environment `production` (main only) secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` — not repository secrets.
3. Deploy Worker (`deploy-worker.yml` on `main` or **Actions → Worker deploy**), then set Worker secret `IP_HASH_KEY` (see [Secret](#secret)).
4. Repository variable `API_URL` = `https://dot-man-api.<subdomain>.workers.dev` (no trailing slash); run **GitHub Pages deploy**. Confirm `POST …/runs → 201` on a live Game Over.

## Design

- **Runs are the only source of truth.** Every finished, non-debug run is stored as-is in `runs`. The leaderboard (`bests`) is derived from those rows and can always be rebuilt from them; there is no separate score-submission path.
- **No raw IP is stored.** Rate limiting uses `ip_hash`, an HMAC-SHA-256 of the IP keyed with the `IP_HASH_KEY` secret.
- **One device id:** the run log's random install id. The board never returns install ids or run ids; it only marks the requester's own row.
- **No telemetry read endpoint.** The developer reads runs with `npm run data:pull` (wrangler, owner's login) and opens them in `/data`.
- **Automation never reaches production.** Only the GitHub Pages deploy builds with `VITE_API_URL` (from the repository variable `API_URL`). A page on `localhost` or a dev server refuses any non-local API URL. Cloudflare credentials live only in the GitHub environment `production` (main branch only), which only `deploy-worker.yml` uses.
- **Free tier, fails closed.** Workers Free and D1 Free with no card on file: when a daily limit is hit the Worker errors, clients retry later, and nothing is billed.

## API

`POST /runs` takes `{ platform, record: RunLogRecord }`: validated by `parseRunLogRecord` plus size and range limits in `worker/src/`, upserted by run `id` (only for the matching `install_id`), and a visible `death` or `complete` run can replace its install's best. `GET /scores?installId=` returns the top 50 bests with the requester's own row marked. Statuses, rate limits (per IP hash) and CORS are in the Worker source and its tests. Client upload behaviour: [docs/RUN_LOG.md](../docs/RUN_LOG.md#uploads).

## Schema

Migrations in `worker/migrations/` (`runs` table with indexed columns, the raw `record` JSON and `hidden_reason`; `bests`, one row per install). `worker/sql/rebuild-bests.sql` rebuilds `bests` from visible runs; run it after any hide, undo or delete. Migrations apply automatically when `deploy-worker.yml` runs on `main`.

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
