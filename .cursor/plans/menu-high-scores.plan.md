# Menu + High Scores (multi-scene)

## Locked decisions

| ID  | Decision                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Architecture **A**: exclusive Phaser scenes; bitecs/ECS only in `PlayScene`. Docs must state this clearly.                                                                                                                               |
| 2   | High Scores ordered **score descending** (ties: newer `clearedAt` first).                                                                                                                                                                |
| 3   | Each row shows **score + date** (parsed from `clearedAt`).                                                                                                                                                                               |
| 4   | Layout shows **all rows that fit** in the scores viewport; enable scroll **only when `runs.length > 5`**.                                                                                                                                |
| 5   | Empty history → single line **`NO SCORES YET`** (no scroll).                                                                                                                                                                             |
| 6   | Menu + High Scores input: **keyboard and pointer**.                                                                                                                                                                                      |
| 7   | **No** Play → Menu exit in this PR.                                                                                                                                                                                                      |
| 8   | Splash title: **`PAC-ROGUE`**.                                                                                                                                                                                                           |
| 9   | Font: **existing** Phaser `Text` monospace style (same family/size language as HUD; title larger). No new font assets.                                                                                                                   |
| 10  | Scroll: **pause briefly at top**, then scroll up so content leaves through the top and the **bottom trails off** (a few rows of empty trail after the last score), then **loop** back to top + pause. Domain state machine + unit tests. |
| 11  | Implement **separate `HighScoresScene`** (Option 1 below). Option 2 documented for posterity; not built.                                                                                                                                 |
| A–N | All Proposed locks from the interrogation stand (no overrides).                                                                                                                                                                          |

## Architecture (ECS + Phaser scenes)

```text
gameConfig.scene = [MenuScene, HighScoresScene, PlayScene]
                 first registered = boot entry

MenuScene  --start-->  PlayScene        (Start)
MenuScene  --start-->  HighScoresScene  (High Scores)
HighScoresScene --start--> MenuScene    (Back)

Only PlayScene: createWorld / addEntity / system pipeline
UI scenes: Phaser Text + input only — no bitecs
```

- Register scenes in [`src/game/config.ts`](src/game/config.ts); **MenuScene first**.
- Transitions: exclusive `this.scene.start(key)` only (no `launch`/`pause` for v1).
- `Start` → `PlayScene` recreates the scene → fresh world/spawn (same gameplay as today’s cold boot, minus auto-start).
- `check:ecs` already allows Phaser under `src/game/scenes/**` and confines `createWorld`/`addEntity` to scenes — keep UI scenes free of world APIs.

### Decide #11 — High Scores placement (tradeoffs)

**Option 1 — Separate `HighScoresScene` (LOCKED for this PR)**

- Files: `MenuScene.ts`, `HighScoresScene.ts`, `PlayScene.ts`.
- Pros: Matches architecture A; each screen has a clear Phaser lifecycle (`create`/`shutdown`); scores re-`loadRunHistory()` on every entry; menu stays small; easy to deep-link or add a third UI scene later; ARCHITECTURE diagram stays 1:1 with classes.
- Cons: Extra class + `scene.start` round-trips; shared chrome (title style, back affordance) must be duplicated or extracted to a tiny helper.

**Option 2 — High Scores as MenuScene internal state (not built)**

- Files: `MenuScene.ts` with `mode: "title" | "scores"`, plus `PlayScene.ts`.
- Pros: One less scene registration; shared title/background without helpers; slightly less transition boilerplate.
- Cons: Menu becomes a state machine; `create`/`update` branches grow; harder to document “scenes only wire X”; conflicts with the spirit of locking exclusive scenes for each screen; reloading scores/tearing down scroll timers is manual.

**Choice:** Option 1 — keeps the multi-scene story honest and matches locked architecture A.

## Files to add / change

| Path                                                                             | Action                                                                                             |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [`src/game/config.ts`](src/game/config.ts)                                       | Register `[MenuScene, HighScoresScene, PlayScene]`.                                                |
| `src/game/scenes/MenuScene.ts`                                                   | **New** — title, Start / High Scores, keyboard + pointer.                                          |
| `src/game/scenes/HighScoresScene.ts`                                             | **New** — load history, list, scroll, Back.                                                        |
| [`src/game/scenes/PlayScene.ts`](src/game/scenes/PlayScene.ts)                   | Import shared text style; no menu exit.                                                            |
| `src/game/ui/textStyles.ts`                                                      | **New** — shared monospace styles (HUD + menu title/options/scores).                               |
| `src/domain/highScoresView.ts`                                                   | **New** — sort + row format from `RunHistory` (Phaser-free).                                       |
| `src/domain/highScoresView.test.ts`                                              | **New** — sort, format, empty.                                                                     |
| `src/domain/scoreListScroll.ts`                                                  | **New** — scroll state machine (Phaser-free).                                                      |
| `src/domain/scoreListScroll.test.ts`                                             | **New** — ≤5 static; >5 pause → scroll → trail → loop.                                             |
| [`src/game/storage/runHistoryStorage.ts`](src/game/storage/runHistoryStorage.ts) | Unchanged API; High Scores calls `loadRunHistory()`.                                               |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)                                   | Multi-scene map; ECS-only-in-Play; menu/high-scores roles; update layout tree + “Current runtime”. |
| [`README.md`](README.md)                                                         | Status: boots to menu; High Scores from localStorage.                                              |
| [`scripts/visual-smoke.mjs`](scripts/visual-smoke.mjs)                           | Comment/wait: first paint is menu (still canvas screenshot).                                       |

No new npm dependencies. No DOM menu overlay.

## MenuScene behavior

1. Background: existing game `backgroundColor` (`#1a1a2e`).
2. Top: `PAC-ROGUE` in shared title style (monospace, larger than HUD `16px`, e.g. `32px`, white).
3. Below: two options — `START`, `HIGH SCORES` — vertically stacked, centered.
4. Selection highlight: selected row brighter / `>` prefix or color `#ffff00`; unselected white/dim.
5. Keyboard: ↑/↓ or W/S move selection; Enter/Space activate.
6. Pointer: hover updates selection; click activates.
7. Activate Start → `this.scene.start("PlayScene")`.
8. Activate High Scores → `this.scene.start("HighScoresScene")`.

## HighScoresScene behavior

1. Title: `HIGH SCORES` (same style family).
2. On `create`: `loadRunHistory()` → `toHighScoreRows(history)` (domain).
3. Empty → centered `NO SCORES YET`; no scroll ticker.
4. Non-empty: render rows as `"{score}  {date}"` (date = locale-stable short form from ISO `clearedAt` — lock **`YYYY-MM-DD`** via domain formatter for deterministic tests).
5. Scores panel: fixed viewport rectangle in the middle of the 800×600 playfield; **clip** with a Phaser mask or Container + geometry mask so scrolled rows do not draw over title/back.
6. **Fit:** compute `visibleRowCount = floor(viewportHeight / rowHeight)`; draw rows at `y - offsetY`.
7. **Scroll gate:** if `rows.length <= 5`, `offsetY = 0` always. If `rows.length > 5`, drive `offsetY` from `tickScoreListScroll` each `update(delta)`.
8. Scroll constants (locked): `pauseMs = 1500`, `pixelsPerSecond = 40`, `rowHeight = 28`, `trailRows = 3` (empty space after last row before loop), viewport height ~ `5 * rowHeight` minimum so “more than 5” meaningfully overflows a 5-row-tall panel (panel height = `min(fit, max(5, visible))` — lock panel to **`5 * rowHeight`** so “fit” for the scroll region is five rows; extra vertical space stays as margin). Re-read user: “show all that fit and scroll them if there are more than 5”. Lock: **viewport shows as many rows as fit in a panel sized to ~half the screen**, but scroll **enables iff count > 5**. Prefer panel height = `Math.min(available, rows.length * rowHeight)` when ≤5, and fixed `5 * rowHeight` visible window when >5. Simpler lock for implementer: **viewport height = 5 * rowHeight** always for the list region; ≤5 items just don’t fill it and don’t scroll; >5 scroll inside that window.
9. Back: label `BACK` (or Esc); keyboard Esc/Backspace → Menu; pointer click Back → Menu.

## Domain: `highScoresView`

```ts
export type HighScoreRow = { score: number; dateLabel: string; clearedAt: string };

export function toHighScoreRows(history: RunHistory): HighScoreRow[];
// sort score desc; tie-break clearedAt desc (ISO string compare OK)
// dateLabel = clearedAt.slice(0, 10) if valid ISO date prefix, else "????-??-??"

export function formatHighScoreLine(row: HighScoreRow): string;
// `${row.score}  ${row.dateLabel}`
```

## Domain: `scoreListScroll` (must be unit-tested)

```ts
export type ScoreListScrollConfig = {
  scrollWhenMoreThan: number; // 5
  pauseMs: number;
  pixelsPerSecond: number;
  rowHeight: number;
  viewportRows: number; // 5
  trailRows: number; // 3
};

export type ScoreListScrollState = {
  offsetY: number;
  phase: "static" | "paused" | "scrolling";
  pauseRemainingMs: number;
};

export function createScoreListScroll(
  itemCount: number,
  config: ScoreListScrollConfig,
): ScoreListScrollState;
export function contentScrollExtent(itemCount: number, config: ScoreListScrollConfig): number;
// max(0, itemCount * rowHeight + trailRows * rowHeight - viewportRows * rowHeight)
export function tickScoreListScroll(
  state: ScoreListScrollState,
  itemCount: number,
  deltaMs: number,
  config: ScoreListScrollConfig,
): ScoreListScrollState;
```

**Semantics:**

- `itemCount <= scrollWhenMoreThan` → `phase: "static"`, `offsetY: 0` forever.
- Else start `"paused"` with `pauseRemainingMs = pauseMs`.
- While paused, subtract `deltaMs`; at 0 → `"scrolling"`.
- While scrolling, `offsetY += pixelsPerSecond * (deltaMs/1000)`.
- When `offsetY >= contentScrollExtent(...)`, reset `offsetY = 0`, `phase = "paused"`, `pauseRemainingMs = pauseMs` (loop).
- Clamp tiny float overshoot in tests with tolerances or exact integer ms steps.

**Tests** (`scoreListScroll.test.ts`):

1. `itemCount <= 5` → always static / offset 0 after many ticks.
2. `itemCount > 5` → remains paused until `pauseMs` elapses.
3. After pause, offset increases with delta.
4. After scrolling past extent (include trail), resets to 0 and paused again.
5. Config echo: extent includes `trailRows` so the bottom “scrolls off” before loop.

**Tests** (`highScoresView.test.ts`):

1. Sort by score desc; tie → newer date first.
2. Format line includes score and `YYYY-MM-DD`.
3. Empty history → `[]` (scene shows `NO SCORES YET`).

## Shared text styles

Extract from PlayScene’s `HUD_TEXT_STYLE` into `src/game/ui/textStyles.ts`:

- `hudTextStyle` — `16px` monospace white (PlayScene imports this).
- `menuTitleStyle` — `32px` monospace white.
- `menuOptionStyle` — `20px` monospace white.
- `menuOptionSelectedStyle` — `20px` monospace `#ffff00`.
- `scoresLineStyle` — `16px` monospace white.

## Docs (same PR)

Update [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md):

- Layout tree: list `MenuScene`, `HighScoresScene`, `PlayScene`; note `game/ui/textStyles.ts`, domain `highScoresView` / `scoreListScroll`.
- New subsection **Scenes**: boot order; exclusive `start`; **only PlayScene owns ECS**; UI scenes presentation-only.
- Replace “One Phaser scene…” in Current runtime with multi-scene + menu → play / high scores.
- Clarify High Scores reads `loadRunHistory()`, sorted view is display-only (storage remains chronological append).

Update [`README.md`](README.md) Status one-liner accordingly.

## Verification level

**Phaser presentation / boot path** → `npm run verify` **and** live visual on `npm run dev:agent` (:5174).

Evidence:

1. Boot lands on `PAC-ROGUE` menu (not maze).
2. Keyboard + click: Start → playfield/HUD like today; High Scores → list; Back → menu.
3. With ≤5 seeded runs: static list; with >5: pause then slow scroll + loop (seed via DevTools/`localStorage` or a tiny test helper only in unit tests — do not ship debug cheats).
4. Read `artifacts/visual-smoke.png` after verify (menu first paint).
5. `/no-comments` on the scoped branch diff vs `main`.

## Implementation order

1. Domain `highScoresView` + tests.
2. Domain `scoreListScroll` + tests.
3. `textStyles` + PlayScene import swap.
4. `MenuScene` + `HighScoresScene`; wire `config.ts`.
5. Docs + README + visual-smoke comment.
6. `npm run verify` → fix → live visual evidence.
7. **`/no-comments`** on scoped diff (required; plan incomplete until done).

## Out of scope

- Esc / return from Play to Menu.
- Game-over / clear → menu or high-score celebration.
- Clearing or editing history; schema/version bump; changing max 100 cap.
- Bitmap/webfonts; DOM overlays; gamepad; audio.
- Parallel scene `launch` (pause overlays).
- MenuScene-internal High Scores (Option 2).

## Acceptance checklist

- [ ] Cold boot → Menu with `PAC-ROGUE`, Start, High Scores.
- [ ] Start → PlayScene gameplay unchanged (ECS pipeline intact).
- [ ] High Scores shows score+date, score desc; empty → `NO SCORES YET`.
- [ ] ≤5 static; >5 pause-at-top then scroll with trail loop (unit tests green).
- [ ] Keyboard and pointer work on Menu and High Scores (incl. Back).
- [ ] No bitecs in Menu/HighScores; `check:ecs` green.
- [ ] ARCHITECTURE + README updated for multi-scene / ECS-only-Play.
- [ ] `npm run verify` green; live visual recorded.
- [ ] `/no-comments` executed on scoped diff.
