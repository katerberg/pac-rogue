# dot-man-api Worker

Cloudflare Worker + D1 database that receives finished runs from the game. See `docs/plans/global-runs-and-high-scores.md` for the design and `docs/PRIVACY.md` for what players are told.

## API

`POST /runs` with `{ "platform": "web" | "itch" | "steam", "record": RunLogRecord }`.

- The record must pass `parseRunLogRecord` (`src/domain/runLog.ts`), be finished (`death`, `complete`, `quit`, `abandoned`), not `debug`, have UUID `id` and `installId`, `finalLevel` 1..99, `pelletsCollected` 0..100000 and `gameVersion` 1..64 chars. The body must be at most 64 KB.
- Insert-or-update by run `id`; an update only applies when the stored `install_id` matches.
- Responses: 201 `{ ok: true }`; 400 `invalid`; 413 `too_large`; 429 `rate_limited` (30 accepted uploads per IP hash per 10 minutes); 503 `unconfigured` (no `IP_HASH_KEY`); 500 `internal`. CORS `*`.

There is no read endpoint. Pull data with `npm run data:pull` (see the root README).

## Schema

`migrations/0001_runs.sql`: one `runs` row per run with indexed columns (`install_id`, `schema_version`, `game_version`, `platform`, `outcome`, `final_level`, `pellets`, `country`, `ip_hash`, `received_at`), the raw `record` JSON, and `hidden_reason` (NULL = visible). The raw IP is never stored: `ip_hash` is HMAC-SHA-256 of it keyed with the `IP_HASH_KEY` secret.

## Secret

`IP_HASH_KEY`: set once after the first deploy, in the dashboard (**Workers & Pages → dot-man-api → Settings → Variables and Secrets → Add → Secret**) or with `npx wrangler secret put IP_HASH_KEY --config worker/wrangler.toml`. Use a long random value (`openssl rand -hex 32`). For local dev put `IP_HASH_KEY=anything` in `worker/.dev.vars` (gitignored).

## Recipes

Run with `npx wrangler d1 execute dot-man-api --remote --config worker/wrangler.toml --command "…"`.

```sql
-- hide one install's runs (cheating or junk)
UPDATE runs SET hidden_reason = 'junk-2026-10' WHERE install_id = '…';
-- undo
UPDATE runs SET hidden_reason = NULL WHERE hidden_reason = 'junk-2026-10';
-- deletion request (the player sends the 8 characters shown in Settings)
DELETE FROM runs WHERE install_id LIKE '<8 chars>%';
-- quick look
SELECT outcome, COUNT(*) FROM runs GROUP BY outcome;
```

## Local

```bash
echo 'IP_HASH_KEY=local-test-key' > worker/.dev.vars
npm run worker:migrate:local
npm run worker:dev            # http://127.0.0.1:8787 (agents: npm run worker:dev:agent on 8788)
VITE_API_URL=http://127.0.0.1:8787 npm run dev
npm run data:pull -- --local  # export the local database
```

## Cost

Workers Free and D1 Free, no card on file. When a daily free limit is reached the Worker fails (clients retry later); nothing is billed.
