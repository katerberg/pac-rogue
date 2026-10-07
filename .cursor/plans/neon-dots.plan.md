# Neon dots (STYLE-coupled stroke rings)

## Goal

Under Settings → **STYLE = NEON**, draw every pellet kind (regular, power, boss, and Lazy Looper optional) as thin circular strokes with a soft maze-coloured outer bloom, subtler than neon walls; power pellets read distinctly louder; optional pellets keep a grey fill with a muted non-wall glow. **STYLE = PIXEL** keeps today’s PNG pellets. Knobs get a dedicated **Dots** section with extreme ranges covering stroke, radius, glow, colours, and per-kind overrides.

## Locked decisions

| ID  | Decision                                                                                                                                                                                                                                                      | Source            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | Neon treatment covers **all** pellet kinds: regular, power, boss, and Lazy Looper optional                                                                                                                                                                    | user              |
| 2   | Neon silhouette = **thin circular stroke** (hollow ring), not filled disc / not PNG+filter                                                                                                                                                                    | user              |
| 3   | Stroke core = **white**; bloom / glow tint = **maze colour** (Settings MAZE COLOR when knobs off)                                                                                                                                                             | user              |
| 4   | Default glow **subtler than walls** (walls today: glow `4` / radius `21`): regular `pelletGlow = 1.2`, `pelletGlowRadius = 7`, stroke `1.0` px, ring radius `2.5` px                                                                                          | user + default    |
| 5   | Power pellets **distinct**: thicker stroke `2.0`, larger radius `5.5`, stronger glow `2.2`, larger bloom `12`                                                                                                                                                 | user + default    |
| 6   | Optional (Lazy Looper) pellets: **grey fill** `0x6e6e6e` (existing `LAZY_LOOPER_OPTIONAL_TINT`) + **muted non-wall glow** colour `0xa0a0b4`, glow `0.6`, radius `5`; stroke matches fill grey at regular stroke width                                         | user + default    |
| 7   | New independent **Dots** knob group (not sharing wall knobs); extreme ranges; comprehensive per-kind knobs (see Approach)                                                                                                                                     | user              |
| A   | Gate with existing Settings → **STYLE** / `pac-rogue.ghost-style.v1`: NEON on, PIXEL = today’s PNG path unchanged                                                                                                                                             | approve-all       |
| B   | `?knobs=1` overrides STYLE for pellet look the same way walls do (knobs always apply when `tuning !== null`)                                                                                                                                                  | approve-all       |
| C   | Reuse Phaser `Glow` (soft outer glow family); no new glow stack / shader                                                                                                                                                                                      | approve-all       |
| D   | Bake shared glow for regular + power + optional into one board-level `RenderTexture`; rebuild when style/knobs/scale or that pellet set changes. Boss pellets (≤8) use **per-entity** glow Graphics so size/alpha pulse stays live without full-board rebakes | approve-all + #1  |
| E   | Collision / `Drawable.radius` / collect rules unchanged; visual only                                                                                                                                                                                          | approve-all       |
| F   | Domain rule in `src/domain/pelletStyle.ts` (`pelletStyleFor` / helpers) with unit tests; `render.ts` only draws what it is told                                                                                                                               | approve-all       |
| G   | No new pulse/animation for regular/power/optional in v1; boss keeps existing size/alpha pulse on the neon stroke ring                                                                                                                                         | approve-all + #1  |
| H   | Docs in same PR: `docs/line-art.md`, `docs/ARCHITECTURE.md`, README Settings/knobs as needed                                                                                                                                                                  | approve-all       |
| I   | Out of scope: neon Dot-Man, fruit, renaming STYLE storage, render-scale rework, SVG pellet art                                                                                                                                                                | approve-all       |
| J   | Verification: `npm run verify` + live probes (NEON play, PIXEL play, LEARN, boss, knobs Dots)                                                                                                                                                                 | approve-all       |
| K   | Finish via `ship-plan`                                                                                                                                                                                                                                        | approve-all       |
| L   | Boss neon: white stroke + maze-colour bloom (same family as regular); base radius `4`, stroke `1.5`, glow `1.8`, glow radius `10`; existing `bossPelletPulse` still scales display size and alpha                                                             | default (from #1) |
| M   | When knobs off, `pelletGlowColor` comes from `mazeColorForIndex`; `DEFAULT_TUNING.pelletGlowColor` / power/boss glow colours mirror default maze blue `0x2121ff` so knobs RESET matches NEON+default maze                                                     | default           |
| N   | Regular/power/boss fill opacity default `0` (hollow); optional fill opacity default `1`                                                                                                                                                                       | default (from #2) |

## Today’s world (brief)

- STYLE couples neon ghosts + wall glow (`wallStyleFor(..., style)`); storage `pac-rogue.ghost-style.v1`.
- Pellets are PNG Images (`dot.png` / `power-pellet.png`); optional tint via `pelletTint`; boss tint = brightened wall colour + sine pulse.
- Wall glow bakes once into a canvas-resolution `RenderTexture` in `render.ts`.
- Knobs: `KnobGroup` includes `Visuals` on the right panel; `TUNING_KNOBS` + `DEFAULT_TUNING` + `KNOB_HELP` drive `knobsPanel.ts`.
- Neon walls plan deferred pellets; this plan is that follow-up.

## Approach

### 1. Domain: `src/domain/pelletStyle.ts`

```ts
export type PelletKindLook = {
  radius: number;
  strokeWidth: number;
  coreColor: number;
  glow: number;
  glowRadius: number;
  glowColor: number;
  fillColor: number;
  fillOpacity: number;
};

export type PelletStyle = {
  regular: PelletKindLook;
  power: PelletKindLook;
  boss: PelletKindLook;
  optional: PelletKindLook;
};
```

- `pelletStyleFor(tuning: Tuning | null, mazeColorIndex: number, style: GhostStyle): PelletStyle | null`
  - If `style === "pixel"` and `tuning === null` → return `null` (render keeps PNG path).
  - If `tuning !== null` → build all four looks from Tuning keys (knobs win; STYLE ignored for pellet look, lock B). Still return a `PelletStyle` even if STYLE is PIXEL when knobs are on (matches wall knobs override).
  - If `tuning === null` and `style === "neon"` → defaults from `DEFAULT_TUNING`, but `glowColor` for regular/power/boss = `mazeColorForIndex(mazeColorIndex)`; optional uses `DEFAULT_TUNING.optionalPelletGlowColor`.
- `pelletGlowFilter(look): { outerStrength; distance } | null` — null when glow or radius ≤ 0 (same idea as `wallGlowFilter`).
- `samePelletStyle(a, b)` for bake invalidation.

Defaults (locked):

| Kind     | radius | stroke | core     | glow | glowRadius | glowColor (knobs default) | fill                    |
| -------- | ------ | ------ | -------- | ---- | ---------- | ------------------------- | ----------------------- |
| regular  | 2.5    | 1.0    | `ffffff` | 1.2  | 7          | `2121ff`                  | opacity 0               |
| power    | 5.5    | 2.0    | `ffffff` | 2.2  | 12         | `2121ff`                  | opacity 0               |
| boss     | 4.0    | 1.5    | `ffffff` | 1.8  | 10         | `2121ff`                  | opacity 0               |
| optional | 2.5    | 1.0    | `6e6e6e` | 0.6  | 5          | `a0a0b4`                  | fill `6e6e6e` opacity 1 |

Unit tests in `pelletStyle.test.ts`: NEON defaults, PIXEL → null, knobs path, maze colour on glow, optional muted colour, filter null when glow 0.

### 2. Tuning + knobs: new **Dots** group

Add to `Tuning` / `DEFAULT_TUNING` / `TuningKey` every key below. Add `KnobGroup` value `"Dots"`. Put `"Dots"` in `RIGHT_KNOB_GROUPS` (after `Visuals`). Extreme ranges (~3× wall extremes):

| Key                         | Label                 | Kind  | Range / notes       | Default  |
| --------------------------- | --------------------- | ----- | ------------------- | -------- |
| `pelletRadius`              | Dot radius            | range | 0.5–48 px, step 0.1 | 2.5      |
| `pelletStrokeWidth`         | Dot stroke            | range | 0.1–32 px, step 0.1 | 1.0      |
| `pelletGlow`                | Dot glow              | range | 0–36, step 0.1      | 1.2      |
| `pelletGlowRadius`          | Dot glow radius       | range | 0–120 px, step 1    | 7        |
| `pelletCoreColor`           | Dot core colour       | color | —                   | `ffffff` |
| `pelletGlowColor`           | Dot glow colour       | color | —                   | `2121ff` |
| `pelletFillOpacity`         | Dot fill opacity      | range | 0–1, step 0.05      | 0        |
| `powerPelletRadius`         | Power radius          | range | 0.5–48              | 5.5      |
| `powerPelletStrokeWidth`    | Power stroke          | range | 0.1–32              | 2.0      |
| `powerPelletGlow`           | Power glow            | range | 0–36                | 2.2      |
| `powerPelletGlowRadius`     | Power glow radius     | range | 0–120               | 12       |
| `powerPelletFillOpacity`    | Power fill opacity    | range | 0–1                 | 0        |
| `bossPelletRadius`          | Boss radius           | range | 0.5–48              | 4.0      |
| `bossPelletStrokeWidth`     | Boss stroke           | range | 0.1–32              | 1.5      |
| `bossPelletGlow`            | Boss glow             | range | 0–36                | 1.8      |
| `bossPelletGlowRadius`      | Boss glow radius      | range | 0–120               | 10       |
| `bossPelletFillOpacity`     | Boss fill opacity     | range | 0–1                 | 0        |
| `optionalPelletRadius`      | Optional radius       | range | 0.5–48              | 2.5      |
| `optionalPelletStrokeWidth` | Optional stroke       | range | 0.1–32              | 1.0      |
| `optionalPelletGlow`        | Optional glow         | range | 0–36                | 0.6      |
| `optionalPelletGlowRadius`  | Optional glow radius  | range | 0–120               | 5        |
| `optionalPelletFillColor`   | Optional fill colour  | color | —                   | `6e6e6e` |
| `optionalPelletGlowColor`   | Optional glow colour  | color | —                   | `a0a0b4` |
| `optionalPelletFillOpacity` | Optional fill opacity | range | 0–1                 | 1        |

Power/boss core colour reuses `pelletCoreColor` (one white). Power/boss glow colour reuses `pelletGlowColor` under knobs (maze colour when knobs off). Optional has its own fill + glow colours.

`KNOB_HELP` entries for each. `knobsPanel.ts` picks up the group automatically once listed in `RIGHT_KNOB_GROUPS` — no special-case UI beyond the group registration.

Update any test that enumerates `Tuning` keys or knob counts if present.

### 3. Render (`src/game/systems/render.ts`)

- `storedPelletStyle()`: `pelletStyleFor(null, loadMazeColorSettings().colorIndex, loadGhostStyle())`.
- `setPelletStyle(style: PelletStyle | null)` override from `PlayScene.applyKnobTuning` via `pelletStyleFor(tuning, 0, loadGhostStyle())` (maze index unused when tuning set; glow colours come from tuning).
- When effective style is `null` (PIXEL, no knobs): keep current Image/PNG path + `pelletTint` + boss wall tint/pulse exactly as today.
- When style is non-null (NEON or knobs):
  - Do **not** create/show pellet PNG Images for regular/power/optional/boss (destroy if present).
  - **Crisp layer:** one `Graphics` redrawn each `draw()`: for each pellet eid, stroke circle (and fill if `fillOpacity > 0`) using the kind look; optional uses optional look; apply boss pulse to radius + alpha for boss eids.
  - **Shared glow bake** (regular + power + optional only): `RenderTexture` + filtered source Graphics, sized like wall glow (`PLAYFIELD_* * renderScale`). Draw opaque rings/fills in each pellet’s `glowColor` (knockout glow), `addGlow(glowColor, …)` — when multiple glow colours exist on one board (optional vs maze), bake **two** passes into the same RT (first maze-coloured non-optional, then optional with its glow colour) or clear and draw sequential glow layers. Simpler lock: **two glow textures** (main + optional) OR one bake that uses a single glow colour only for non-optional and a second bake for optional. Implement as two `RenderTexture`s: `pelletGlowTexture` and `optionalPelletGlowTexture`.
  - Rebuild shared bakes when `samePelletStyle` fails, render scale changes, or the signature of non-boss pellet positions/kinds changes (count + sum of x/y or eid list).
  - **Boss:** per-eid glow `Graphics` with filters (mirror line-art ghost glow focus/scale), restyle when look changes; place/pulse each frame; destroy on release.
- Depth: glow textures under crisp graphics; pellets under ghosts/player as today (match current pellet Image depth).
- `bouncePowerPellet`: under neon, tween the crisp ring’s stroke/radius briefly (scale pulse on that eid for ~120ms) instead of swapping PNG size; if expensive, no-op visually but keep the event (prefer a short radius tween on a per-eid override map).
- `resetForNewBoard` / destroy: clear pellet graphics, glow RTs, boss glow objects.
- `releaseDrawable`: drop boss glow object for that eid; mark shared bake dirty.

Wire `PlayScene.applyKnobTuning` to `setPelletStyle`. LEARN uses the same `createPlayRenderer` path — ensure stored style is read each draw so Settings→STYLE flips apply on resume like walls.

### 4. Lazy Looper / tints

- PNG `pelletTint` path unchanged for PIXEL.
- NEON optional look owns grey fill + muted glow; do not also apply `pelletTint` to a PNG.
- Keep `LAZY_LOOPER_OPTIONAL_TINT` as the default fill colour constant; `pelletStyle` imports it for the default fill/core of optional.

### 5. Docs

- `docs/line-art.md`: neon pellets section — stroke rings, maze bloom, STYLE coupling, Dots knobs, bake vs boss live glow.
- `docs/ARCHITECTURE.md`: mention `pelletStyle.ts`; render draws neon pellets under STYLE.
- `README.md`: Settings/knobs blurb if it lists visual STYLE pieces; note Dots knobs under `?knobs=1`.

## Data / contracts

- New `Tuning` keys (table above); `TUNING_STORAGE_VERSION` stays `1` (unknown keys ignored on load; missing keys use defaults — same as other new knobs).
- `PelletStyle` / `pelletStyleFor` return `null` ⇒ pixel PNG pellets.
- No localStorage migration; STYLE key unchanged.
- No new probe snapshot fields required; assert via screenshots + domain unit tests. Optional: none.

## Failure behavior

- Invalid STYLE storage → neon (existing `parseGhostStyle`).
- Glow ≤ 0 or radius ≤ 0 for a kind → no glow bake/filter for that kind; crisp stroke still draws.
- Knobs parse failure → `resolveTuning` defaults (neon dots on when STYLE neon).
- Empty pellet set → clear glow textures; no error UI.
- Do not add fallback art if Graphics/Glow fails (fail loud like walls).

## Docs

Same PR: `docs/line-art.md`, `docs/ARCHITECTURE.md`, `README.md` (Settings / knobs). Plan file `.cursor/plans/neon-dots.plan.md` committed with the branch.

## Acceptance tests

**Unit / domain**

- `pelletStyle.test.ts`: NEON + null tuning → locked defaults with maze glow colour; PIXEL + null → `null`; knobs tuning → raw values; optional muted glow colour; `pelletGlowFilter` null when glow 0.
- `tuning` / knobs tests: new keys present in `DEFAULT_TUNING` and `TUNING_KNOBS` group `"Dots"`; extreme maxes as locked.
- Existing PlaySim / Lazy Looper / boss tests stay green (collision unchanged).

**`npm run verify`** green.

**Live-check recipe** (read every screenshot):

```bash
# NEON default: stroke-ring dots + maze bloom (level 5, four ghosts)
npm run probe -- --query "play=1&level=5&seed=neondots5" --name neon-dots-5 --steps \
  "waitFor:scenes.PlayScene==running,wait:1500,expect:play.lineArtGhosts.length==4,shot:board"

# PIXEL: PNG pellets, no neon rings
npm run probe -- --query "" --name style-pixel-dots --steps \
  "waitFor:scenes.MenuScene==running,press:ArrowDown,press:ArrowDown,press:ArrowDown,press:Enter,waitFor:scenes.SettingsScene==running,wait:300,press:ArrowDown,press:ArrowDown,press:ArrowDown,press:ArrowRight,wait:200,press:Escape,waitFor:scenes.MenuScene==running,press:Enter,waitFor:scenes.PlayScene==running,wait:1500,expect:play.lineArtGhosts.length==0,shot:play-pixel-dots"

# LEARN under NEON
npm run probe -- --query "learnAll=1" --name neon-dots-learn --steps \
  "waitFor:scenes.LearnScene==running,wait:1000,shot:learn"

# Boss board: neon boss pellets pulse
npm run probe -- --query "play=1&level=9&seed=neondotsboss&boss=blinkySwarm" --name neon-dots-boss --steps \
  "waitFor:scenes.PlayScene==running,wait:2000,expect:play.level==9,shot:boss"

# Lazy Looper optional grey+muted glow
npm run probe -- --query "play=1&level=5&seed=neondotsll&enableUpgrade=passiveLazyLooper" --name neon-dots-lazy --steps \
  "waitFor:scenes.PlayScene==running,wait:1500,shot:lazy"

# Knobs Dots section present / default look
npm run probe -- --query "play=1&level=5&seed=neondotsknobs&knobs=1" --name neon-dots-knobs --steps \
  "waitFor:scenes.PlayScene==running,wait:1200,shot:knobs-default,pageShot:knobs-page"
```

**Screenshot expectations**

- NEON board: hollow white rings on corridors; soft maze-coloured halo around dots; walls still neon; dots subtler than walls.
- Power pellets: visibly thicker/larger rings + stronger bloom than regular dots.
- PIXEL board: classic white PNG dots/octagons; no ring bloom.
- Boss: larger rings that pulse in size/alpha with bloom.
- Lazy: some dots grey-filled with muted grey-lilac glow (not wall blue).
- Knobs page: **Dots** heading with the new sliders; default board matches NEON baseline.

**Modes touched:** play generated L5, PIXEL via Settings, LEARN, boss L9, Lazy Looper, knobs. Level-1 / store / death / pause not required unless render regresses.

**Scene-logic rule:** STYLE → pellet look decision lives in `pelletStyleFor` (domain), unit-tested; scenes only pass tuning / call `setPelletStyle`.

## Out of scope

- Neon Dot-Man, fruit, or other non-pellet sprites
- SVG / line-art path pellets; unspool animation
- Renaming `pac-rogue.ghost-style.v1` or `GhostStyle`
- Sharing wall glow knobs instead of Dots section
- Changing wall or ghost default glow numbers
- Migrating old debug-tuning blobs beyond normal missing-key defaults
- Per-frame full-board pellet glow rebake for non-boss pellets

## Implementation order

1. Branch from latest `main` (this branch).
2. Add Tuning keys + `Dots` knob group + help + defaults; fix tuning/knob unit tests.
3. Add `pelletStyle.ts` + `pelletStyle.test.ts`.
4. Render: neon stroke path, shared glow bakes, boss live glow, PIXEL fallback, `setPelletStyle`, bounce behaviour; wire `PlayScene.applyKnobTuning`.
5. Docs (`line-art.md`, `ARCHITECTURE.md`, README).
6. `npm run verify`; fix until green.
7. Live checks per Acceptance tests; Read every screenshot; record commands/results for the PR body.
8. **Run the `ship-plan` skill** (`.agents/skills/ship-plan/SKILL.md`). Do not stop before the PR exists.
