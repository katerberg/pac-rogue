# Rename the game to Dot-Man

## Goal

Rebrand the game's own displayed name from `PAC-ROGUE` / `pac-rogue` to `Dot-Man` (splash title `DOT-MAN`) everywhere it is shown to a player or read as prose in docs, without touching generic references to the real classic "Pac-Man" arcade game, without touching internal-only identifiers (storage keys, env vars, asset/code names), and without renaming the npm package or the GitHub repo.

## Locked decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                 | Source                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | `package.json` `"name"` and `.cursor/environment.json` `"name"` stay `pac-rogue` (matches the real GitHub repo `katerberg/pac-rogue` and its live Pages URL, which are not being renamed)                                                                                                                                                                                                | user                      |
| 2   | `.cursor/plans/menu-high-scores.plan.md` — update its `PAC-ROGUE` mentions to `DOT-MAN` for consistency (do not leave as an untouched historical record)                                                                                                                                                                                                                                 | user                      |
| A   | Rename only the game's own displayed name/brand; leave alone every reference to the real classic Namco game (genre description, asset/preload comments, maze-topology attribution, external art-credit link)                                                                                                                                                                             | approve all (no override) |
| B   | Splash/menu-title casing is `DOT-MAN` (all-caps, matches existing `START` / `HIGH SCORES` / `SETTINGS` convention); prose in README/docs uses `Dot-Man`                                                                                                                                                                                                                                  | approve all               |
| C   | Leave all internal-only identifiers unchanged: `localStorage` keys (`pac-rogue.run-history.v2`, `pac-rogue.audio-settings.v1`), `PAC_ROGUE_AGENT` env var, `window.__PAC_ROGUE_GAME__` global, `PacmanDir`/`PACMAN_DIRS`/`pacmanTextureKey`, `art/pacman-<dir>/` asset folders. Docs that quote these keys verbatim keep quoting the real key even though surrounding prose says Dot-Man | approve all               |
| D   | Update the two internal-tooling text strings that are pure prose with no functional dependency: `scripts/cloud-setup.sh`'s log line and the heading in `.agents/skills/simplify-pr/references/smells.md`, both → Dot-Man                                                                                                                                                                 | approve all               |
| E   | No "formerly PAC-ROGUE" breadcrumb anywhere — clean rename; git history already has the record                                                                                                                                                                                                                                                                                           | approve all               |

## Today's world (brief)

- In-game splash title is hardcoded as the literal string `"PAC-ROGUE"` in `src/game/scenes/MenuScene.ts` (`create()`, passed to `addPixelText`), rendered via the all-caps bitmap pixel font alongside `START` / `HIGH SCORES` / `SETTINGS`.
- `index.html` `<title>` is `pac-rogue`.
- `README.md` has `# pac-rogue` as its H1 and a `Boots to a \`PAC-ROGUE\` menu`sentence in`## Status`. It also has an unrelated genre line ("Phaser + bitECS 0.4 Pac-Man-like game.") and an art-credit link to `pac-man-game-art` on itch.io — both stay untouched (Decision A).
- `docs/ARCHITECTURE.md` has `Current shape of pac-rogue.` in its intro line and ``Boot lands on `MenuScene` (`PAC-ROGUE` title, ...)`` in `## Current runtime`. It also has two untouched genre/asset comments ("Pac-Man / pellet / power-pellet / ghost / fruit PNGs", "preload(): pac-man frames") and quotes the literal storage key `pac-rogue.audio-settings.v1` and `pac-rogue.run-history.v2` — those stay as-is (Decision C).
- `.cursor/plans/menu-high-scores.plan.md` has 4 mentions of `` `PAC-ROGUE` `` describing the already-shipped menu/splash feature (lines ~14, ~78, ~193, ~220).
- `.agents/skills/simplify-pr/references/smells.md` has a heading `## Layer & architecture (pac-rogue)`.
- `scripts/cloud-setup.sh` ends with `echo "pac-rogue cloud setup ready (node $(node -v))" >&2`.
- `package.json` `"name": "pac-rogue"` and scripts `PAC_ROGUE_AGENT=1 vite` / `vite preview`; `.cursor/environment.json` `"name": "pac-rogue"`; `vite.config.ts` reads `process.env.PAC_ROGUE_AGENT`; `src/main.ts` sets `window.__PAC_ROGUE_GAME__`; `scripts/play-probe.mjs` and `scripts/visual-smoke.mjs` read `PAC_ROGUE_AGENT` / `__PAC_ROGUE_GAME__`. All of these stay unchanged (Decision 1 + C).
- `src/domain/mazeLayouts.ts` has an attribution comment `Arcade Ms. Pac-Man Maze 1 topology (shaunlebron/pacman-mazegen paths).` — stays (Decision A, external attribution).
- `src/game/systems/render.ts` has `PACMAN_DIRS`, `PacmanDir`, `pacmanTextureKey()`, and loads `art/pacman-${dir}/${frame}.png` (matching the real folder names under `public/art/pacman-*`) — stays (Decision C, internal code + real asset paths).

## Approach

Edit these files, changing only the literal strings called out (no other lines touched):

1. `src/game/scenes/MenuScene.ts` — in `create()`, change the `addPixelText(this, PLAYFIELD_WIDTH / 2, 120, "PAC-ROGUE", MENU_TITLE_FONT_SIZE)` call's string literal from `"PAC-ROGUE"` to `"DOT-MAN"`.
2. `index.html` — change `<title>pac-rogue</title>` to `<title>Dot-Man</title>`.
3. `README.md`:
   - Line 1: `# pac-rogue` → `# Dot-Man`.
   - `## Status` sentence: ``Boots to a `PAC-ROGUE` menu`` → ``Boots to a `DOT-MAN` menu``.
   - Leave the "Pac-Man-like game" genre line and the `pac-man-game-art` credit link untouched.
4. `docs/ARCHITECTURE.md`:
   - Intro line: `Current shape of pac-rogue.` → `Current shape of Dot-Man.`
   - `## Current runtime` bullet: ``(`PAC-ROGUE` title, Start / High Scores / Settings)`` → ``(`DOT-MAN` title, Start / High Scores / Settings)``
   - Leave the two Pac-Man genre/asset comments and the literal storage-key quotes untouched.
5. `.cursor/plans/menu-high-scores.plan.md` — replace every `` `PAC-ROGUE` `` occurrence with `` `DOT-MAN` `` (title-text mentions only; do not touch anything else in that file).
6. `.agents/skills/simplify-pr/references/smells.md` — change heading `## Layer & architecture (pac-rogue)` to `## Layer & architecture (Dot-Man)`.
7. `scripts/cloud-setup.sh` — change `echo "pac-rogue cloud setup ready (node $(node -v))" >&2` to `echo "Dot-Man cloud setup ready (node $(node -v))" >&2`.
8. Do **not** touch: `package.json`, `package-lock.json`, `.cursor/environment.json`, `vite.config.ts`, `src/main.ts`, `scripts/play-probe.mjs`, `scripts/visual-smoke.mjs`, `src/game/storage/runHistoryStorage.ts`, `src/game/storage/runHistoryStorage.test.ts`, `src/game/storage/audioSettingsStorage.ts`, `src/game/systems/render.ts`, `src/domain/mazeLayouts.ts`, any `public/art/pacman-*` paths, `README.md`'s genre/art-credit lines, `docs/ARCHITECTURE.md`'s genre/asset/preload comments and storage-key quotes.

## Data / contracts

None — this is a text/string-literal rename only. No storage schema, API shape, or persisted key changes (Decision C).

## Failure behavior

N/A — no new error paths, no runtime branching introduced. A missed occurrence is a correctness bug (wrong displayed name), not a failure mode; catch it via the grep check in Acceptance tests.

## Docs

- `README.md` and `docs/ARCHITECTURE.md` updated as above (same PR as the code change).
- `.cursor/plans/menu-high-scores.plan.md` updated per Decision 2.
- `.agents/skills/simplify-pr/references/smells.md` updated per Decision D.

## Acceptance tests

1. `npm run verify` passes (typecheck, lint, format:check, check:ecs, test, build, visual).
2. Regression grep — after edits, this must return **zero** matches outside the intentionally-untouched files:
   ```bash
   grep -rniE "pac-rogue|pac.rogue" --include="*.md" --include="*.html" --include="*.ts" README.md docs/ARCHITECTURE.md index.html src/game/scenes/MenuScene.ts .cursor/plans/menu-high-scores.plan.md .agents/skills/simplify-pr/references/smells.md scripts/cloud-setup.sh
   ```
   (Confirms no stray `PAC-ROGUE`/`pac-rogue` brand text is left in the files this plan touches.)
3. Confirm untouched files are genuinely untouched: `git diff --stat` shows no changes to `package.json`, `package-lock.json`, `.cursor/environment.json`, `vite.config.ts`, `src/main.ts`, `scripts/play-probe.mjs`, `scripts/visual-smoke.mjs`, `src/game/storage/*`, `src/game/systems/render.ts`, `src/domain/mazeLayouts.ts`.
4. **Live-check recipe** (menu splash title is the only player-visible change):
   ```bash
   npm run probe -- --query "" --steps "wait:600,shot:menu,scene:MenuScene" --name rename
   ```
   Read `artifacts/rename-menu.png` and confirm the splash title reads `DOT-MAN` (not `PAC-ROGUE`), rendered in the same white bitmap-font style as before, positioned identically (still centered at `PLAYFIELD_WIDTH / 2, 120`).
5. Also read the standard `npm run visual` output `artifacts/visual-smoke-menu.png` (already captures the menu) and confirm the same thing — this doubles as the required boot/canvas-path inspection since `verify` already runs it.

## Out of scope

- Renaming the npm package name, `.cursor/environment.json` name, or the GitHub repo/Pages URL (Decision 1).
- Renaming `localStorage` keys, env vars, the `window` debug global, or any internal code/asset identifiers (Decision C).
- Rewording genre/attribution references to the real classic Pac-Man game (Decision A).
- Adding any "formerly known as" note (Decision E).

## Implementation order

1. Apply the 7 edits in **Approach**, in the order listed.
2. Run `npm run verify`; fix and rerun until green (per `docs/VERIFICATION.md`).
3. Run the regression grep and the untouched-files diff check from **Acceptance tests**.
4. Run the live-check recipe, read `artifacts/rename-menu.png` (and `artifacts/visual-smoke-menu.png`), and record what was observed.
5. **Run the `ship-plan` skill** (`.agents/skills/ship-plan/SKILL.md`). Do not stop before the PR exists.
