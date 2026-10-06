# Neon walls (coupled STYLE)

## Goal

Ship maze walls with the same soft neon outer glow as line-art ghosts by default: thicker stroke, glow on under Settings → **STYLE = NEON**, plain strokes under **PIXEL**, and `?knobs=1` Visuals knobs remapped/widened so wall (and related neon) look can be dialed from subtle to extreme. Reuse the existing once-baked wall Glow path; no new glow stack.

## Locked decisions

| ID  | Decision                                                                                                                                                         | Source                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | Default wall glow **strength** = prior product value `0.6` on the old `×4` scale → after remap, `DEFAULT_TUNING.wallGlow = 2.4` (raw Phaser `outerStrength`)     | user                           |
| 2   | Default `wallGlowRadius = 4` (unchanged)                                                                                                                         | user                           |
| 3   | Settings label **GHOSTS → STYLE**; same NEON/PIXEL options; **couple walls**: NEON ⇒ wall glow from defaults; PIXEL ⇒ wall glow off (and ghosts pixel, as today) | user                           |
| 4   | Keep default maze blue `#2121ff`; Settings **MAZE COLOR** still sets stroke (and glow tint) when knobs are off                                                   | user                           |
| 5   | Default `wallThickness = 3` (also when knobs off — stop reading `WALL_STROKE_WEIGHT` for style thickness)                                                        | user                           |
| 6   | `wallGlow` is raw `outerStrength` like `ghostGlow` (drop `WALL_GLOW_MAX_OUTER`); then apply range bump from 7                                                    | user                           |
| 7   | Rename knob **Glow radius → Wall glow radius**; widen related neon Visuals knobs to **~3×** prior max (see Approach)                                             | user                           |
| 8   | Default neon walls use the **same Glow technique / soft outer glow family** as ghosts (not a softer multi-layer fake); strength number from (1), radius from (2) | user                           |
| A   | Reuse existing bake path (`wallGlowFilter` + `RenderTexture` in `render.ts`)                                                                                     | proposed default               |
| B   | Collision / path / maze geometry unchanged                                                                                                                       | proposed default               |
| C   | Glow tint = wall stroke colour (maze setting or knobs `wallColor`)                                                                                               | proposed default               |
| D   | No pulse / animate / SVG rewrite of walls in v1                                                                                                                  | proposed default               |
| E   | `WALL_GLOW_QUALITY` stays `10`                                                                                                                                   | proposed default               |
| F   | Neon baseline lives on `DEFAULT_TUNING` so play, LEARN, and knobs RESET / ↺ agree                                                                                | proposed default               |
| G   | No new Tuning keys                                                                                                                                               | proposed default               |
| H   | No localStorage migration for old `wallGlow` 0–1 overrides (remap breaks their meaning until RESET); STYLE keeps `pac-rogue.ghost-style.v1`                      | proposed default + Decide 3    |
| I   | Unit tests for `wallStyleFor` / `wallGlowFilter` / STYLE coupling                                                                                                | proposed default               |
| J   | Docs: `docs/line-art.md`, `docs/ARCHITECTURE.md`, README Settings/knobs lines                                                                                    | proposed default               |
| K   | Verification: `verify` + live probes (play, LEARN, Settings STYLE, knobs)                                                                                        | proposed default               |
| L   | Out of scope: neon Dot-Man/pellets/fruit; render-scale rework; new glow implementation                                                                           | proposed default               |
| M   | Finish via `ship-plan`                                                                                                                                           | proposed default               |
| N   | With `?knobs=1`, wall knobs apply absolutely (can preview glowing walls while STYLE=PIXEL); STYLE coupling applies only when `tuning === null`                   | default (debug knobs override) |

## Today’s world (brief)

- Neon ghosts + device-pixel canvas + wall Glow **pipeline** already ship (`docs/line-art.md`). `DEFAULT_TUNING.wallGlow` is `0`; walls look classic unless knobs raise glow.
- `wallGlowFilter(style)` returns `{ outerStrength: style.glow * 4, distance: style.glowRadius }` or `null`.
- `wallStyleFor(null, mazeColorIndex)` uses maze colour, `WALL_STROKE_WEIGHT` (2), `DEFAULT_TUNING.wallGlow` / `wallGlowRadius`.
- Settings row label is **GHOSTS**; storage `pac-rogue.ghost-style.v1`; `lineArtGhostKinds` / sims already gate ghost art. Walls ignore that setting.
- Knobs Visuals: `wallThickness` 1–8, `wallGlow` 0–1, `Glow radius` 0–12, ghost glow knobs 0–4 / 0–12, etc. Live apply via `PlayScene.applyKnobTuning` → `setWallStyle` / `setGhostLook`.

## Approach

### 1. Tuning defaults and `wallGlowFilter`

In `src/domain/tuning.ts`:

- `wallThickness: 3`
- `wallGlow: 2.4`
- `wallGlowRadius: 4` (unchanged)
- Leave `wallColor: 0x2121ff`, ghost defaults unchanged

In `src/domain/wallStyle.ts`:

- Remove `WALL_GLOW_MAX_OUTER`.
- `wallGlowFilter`: `{ outerStrength: style.glow, distance: style.glowRadius }` when both `> 0`, else `null`.
- Extend `wallStyleFor(tuning, mazeColorIndex, style: GhostStyle = DEFAULT_GHOST_STYLE)` (import style type from `ghostArt.ts`):
  - **`tuning !== null`**: current knob mapping (thickness/color/glow/radius/corners/background from tuning). STYLE ignored (lock N).
  - **`tuning === null`**:
    - `color`: `mazeColorForIndex(mazeColorIndex)`
    - `thickness`: `DEFAULT_TUNING.wallThickness` (not `WALL_STROKE_WEIGHT`)
    - `cornerRadius`: `WALL_CORNER_RADIUS` (unchanged constant)
    - `background`: `MAZE_BACKGROUND_COLOR`
    - if `style === "neon"`: `glow` / `glowRadius` from `DEFAULT_TUNING`
    - if `style === "pixel"`: `glow: 0`, `glowRadius: 0` (filter null → plain walls)

Update `wallStyle.test.ts` for defaults, PIXEL ⇒ no glow, NEON ⇒ filter `{ outerStrength: 2.4, distance: 4 }`, and knob path still raw glow.

Update any test that pins `DEFAULT_TUNING.wallThickness === WALL_STROKE_WEIGHT` or `wallGlow === 0` (e.g. `tuning.test.ts`).

### 2. Knob table (`src/domain/tuningKnobs.ts`)

| Key                | Label                | Range (locked) | Step | Default (via DEFAULT_TUNING) |
| ------------------ | -------------------- | -------------- | ---- | ---------------------------- |
| `wallThickness`    | Wall thickness       | **1–24**       | 0.5  | 3                            |
| `wallColor`        | Wall color           | colour         | —    | `#2121ff`                    |
| `wallGlow`         | Wall glow            | **0–12**       | 0.1  | 2.4                          |
| `wallGlowRadius`   | **Wall glow radius** | **0–36**       | 1    | 4                            |
| `ghostGlow`        | Ghost glow           | **0–12**       | 0.1  | 1.6                          |
| `ghostGlowRadius`  | Ghost glow radius    | **0–36**       | 1    | 6                            |
| `ghostLineWidth`   | Ghost line thickness | **1–45**       | 0.5  | 6.5                          |
| `ghostWidth`       | Line ghost width     | **0.6–4.5**    | 0.01 | 1.16                         |
| `ghostHeight`      | Line ghost height    | **0.6–4.5**    | 0.01 | 1.14                         |
| `wallCornerRadius` | Corner radius        | **0–24**       | 1    | 6                            |

Refresh `KNOB_HELP` for wall glow (raw strength, 0 = off), wall glow radius rename, and note STYLE coupling only outside knobs. Fix stale help that still says “Clyde on levels 5–8” if still present.

No panel code changes beyond what the table drives (`knobsPanel.ts` already renders from `TUNING_KNOBS`).

### 3. Settings: GHOSTS → STYLE (couple walls)

In `src/game/scenes/SettingsScene.ts`:

- Row label text **"STYLE"** (keep internal field names if cheap; or rename locals to `artStyle` for clarity — either is fine if tests/docs say STYLE).
- Options stay **NEON** / **PIXEL**; still `saveGhostStyle` / `loadGhostStyle` on `pac-rogue.ghost-style.v1` (no key rename, no migration).

Wire style into wall style resolution:

- `storedWallStyle()` in `src/game/systems/render.ts`: `wallStyleFor(null, mazeColorIndex, loadGhostStyle())` so play + LEARN boards and pause→Settings→resume pick up STYLE without scene special-cases.
- `PlayScene.applyKnobTuning`: keep `wallStyleFor(tuning, 0)` (knobs override; maze index unused when tuning set).
- Ghost path unchanged: `setGhostStyle` / `lineArtGhostKinds` already driven by the same storage.

Domain rule for “do walls glow under this style?” is **inside `wallStyleFor`** (scene-logic rule): unit-test PIXEL vs NEON; do not branch glow in the scene.

### 4. Docs

- `docs/line-art.md`: walls glow **on by default** under STYLE=NEON; off under PIXEL; knobs (`wallGlow` raw 0–12, defaults 2.4 / 4px); thickness default 3.
- `docs/ARCHITECTURE.md`: Settings STYLE (not GHOSTS); wall glow default on when neon; knobs blurb if it mentions wall glow off.
- `README.md`: Settings prose **STYLE**; Flags `knobs` line if it lists wall look; any “GHOSTS” user-facing mention for this toggle → STYLE.

### 5. Render / runtime

No structural change to the bake path. Confirm `sameWallStyle` still invalidates the bake when glow/thickness flip (STYLE toggle or knobs). Collision unchanged.

## Data / contracts

- `Tuning.wallGlow`: meaning changes from `0–1` fraction to raw `outerStrength` (0–12). Existing `pac-rogue.debug-tuning.v1` entries that stored old fractions look weaker until RESET OPTIONS — accepted (lock H).
- `GhostStyle` / storage key / values (`neon` \| `pixel`) unchanged; UI label STYLE only.
- `wallStyleFor` gains required-or-default `style` argument; call sites: `storedWallStyle`, tests, `PlayScene` knobs path (omit or pass anything — ignored when tuning non-null).
- Probe surface: existing `play.lineArtGhosts` still asserts STYLE→ghost art; wall glow has no snapshot field — assert via screenshots + unit tests.

## Failure behavior

- Invalid / missing STYLE storage → `DEFAULT_GHOST_STYLE` (`neon`) via existing `parseGhostStyle`.
- `wallGlow <= 0` or `wallGlowRadius <= 0` → no glow texture draw (today’s null path); crisp stroke still draws.
- Knobs localStorage parse failures → `resolveTuning({})` defaults (neon walls on).
- No user-visible error UI; glow bake failures would surface as Phaser/runtime errors (unchanged — do not add fallback art).

## Docs

Same PR as code: `docs/line-art.md`, `docs/ARCHITECTURE.md`, `README.md` (Settings + knobs). No new doc file.

## Acceptance tests

**Unit / domain**

- `wallStyle.test.ts`: NEON + `tuning === null` → thickness 3, glow 2.4, radius 4, `wallGlowFilter` → `{ outerStrength: 2.4, distance: 4 }`; PIXEL + null tuning → glow/radius 0, filter null; knobs tuning with `wallGlow: 3` → filter `{ outerStrength: 3, distance: … }` (no `×4`).
- `tuning.test.ts` (or equivalent): defaults match locked numbers; drop equality to `WALL_STROKE_WEIGHT` / `wallGlow === 0` if present.
- Existing ghost-style PlaySim / LearnSim tests stay green; add assertion only if a test currently assumes plain walls.

**`npm run verify`** green.

**Live-check recipe** (read every screenshot):

```bash
# NEON default: glowing walls + neon ghosts (level 5)
npm run probe -- --query "play=1&level=5&seed=neonwalls" --name neon-walls-5 --steps \
  "waitFor:scenes.PlayScene==running,wait:1500,expect:play.lineArtGhosts.length==4,shot:board"

# PIXEL style: pixel ghosts + plain walls (no glow)
npm run probe -- --query "" --name style-pixel-walls --steps \
  "waitFor:scenes.MenuScene==running,press:ArrowDown,press:ArrowDown,press:ArrowDown,press:Enter,waitFor:scenes.SettingsScene==running,wait:300,shot:settings-style,press:ArrowDown,press:ArrowDown,press:ArrowDown,press:ArrowRight,wait:200,shot:settings-pixel,press:Escape,waitFor:scenes.MenuScene==running,press:Enter,waitFor:scenes.PlayScene==running,wait:1500,expect:play.lineArtGhosts.length==0,shot:play-pixel-plain-walls"

# LEARN under NEON (default storage): walls glow
npm run probe -- --query "learnAll=1" --name neon-walls-learn --steps \
  "waitFor:scenes.LearnScene==running,wait:1000,shot:learn"

# Knobs: Wall glow 0 → high; Wall glow radius / thickness at extreme end
npm run probe -- --query "play=1&level=5&seed=knobwalls&knobs=1" --name neon-walls-knobs --steps \
  "waitFor:scenes.PlayScene==running,wait:1200,shot:knobs-default,wait:300,shot:knobs-board"
```

For the knobs probe, manually (or via DOM if the probe harness allows — if not, document slider interaction in the PR after using the knobs panel in a headed/agent session) set **Wall glow** to `0`, screenshot plain walls with knobs on; set **Wall glow** near `12` and **Wall glow radius** near `36`, screenshot extreme neon; **RESET OPTIONS** and confirm return to thickness 3 / glow 2.4. If probe cannot drive DOM sliders, drive them with the computer-use agent against `http://127.0.0.1:5174/?play=1&level=5&seed=knobwalls&knobs=1` and save screenshots under `artifacts/`.

**Screenshot expectations**

- NEON board: soft coloured halo outside wall strokes; stroke clearly thicker than pre-change (~3px); ghosts still neon.
- PIXEL board: PNG ghosts; wall strokes with **no** halo.
- Settings: row label **STYLE** (not GHOSTS); NEON/PIXEL highlight behaviour unchanged.
- Knobs default: matches NEON play look; glow `0` clears halo; maxed knobs look loudly overblown (insane edges); RESET restores baseline.

**Modes touched:** play (generated), LEARN, Settings (from menu), knobs debug. Pause→Settings→resume STYLE flip: cover if easy (`togglepause`-style probe); otherwise note under not-checked only if skipped.

## Out of scope

- Neon Dot-Man, pellets, fruit, or other sprites
- Changing default ghost glow numbers (except knob **max** ranges)
- Renaming `pac-rogue.ghost-style.v1` or `GhostStyle` type/values
- Migrating old 0–1 `wallGlow` saved knobs
- Animated / pulsing walls; SVG wall art
- Replacing or rewriting the wall Glow bake path; changing `WALL_GLOW_QUALITY`
- Render-scale / canvas density work

## Implementation order

1. Branch from latest `main`.
2. `DEFAULT_TUNING` + `wallGlowFilter` remap + `wallStyleFor(..., style)` coupling; fix unit tests.
3. Widen/rename knobs + help strings in `tuningKnobs.ts`.
4. Settings label STYLE; `storedWallStyle()` passes `loadGhostStyle()`.
5. Docs (`line-art.md`, `ARCHITECTURE.md`, README).
6. Run `npm run verify`; fix failures.
7. Live checks per Acceptance tests; read screenshots; record commands/results for the PR body.
8. **Run the `ship-plan` skill** (`.agents/skills/ship-plan/SKILL.md`). Do not stop before the PR exists.
