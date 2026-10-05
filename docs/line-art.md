# Line art (vector sprites)

A prototype of thin neon line art next to the pixel art. On levels 5–8 Clyde is drawn from a hand-written SVG; every other sprite is still a PNG, in the same frame. Nothing is animated yet, but the SVG is parsed into point lists that carry distance along the path, so a later "unspool" (trim the stroke away along its path) needs no data rework.

## Rendering model

- **Fixed 3× internal resolution.** The canvas is 2400×1800 (`RENDER_SCALE` in `src/game/renderScale.ts`); world coordinates stay 800×600. Every scene calls `applyRenderScale(this)` first thing in `create()` (camera origin 0,0, zoom 3). Read pointers with `pointer.worldX/worldY`, never `pointer.x/y`.
- **Textures stay nearest-filtered** (`antialias: false`), so the pixel art keeps its look at 3×.
- **Graphics are multisampled** (`antialiasGL: true`), so 16px line art is crisp.
- **The canvas is CSS-smoothed** (`image-rendering: auto` in `src/styles.css`). The 3× canvas is downscaled to fit the window, and nearest downscaling would make thin lines shimmer.
- **Glow** uses Phaser 4's `Glow` filter, as a knockout (glow-only) layer under the crisp art:
  - Vector actors: one glow Graphics per actor, holding only the strokes. Its filter is focused on the art box plus the glow reach. Graphics have no bounds, and without that focus Phaser would filter the whole screen every frame.
  - Maze walls: the glow is static, so it is filtered once into a full-resolution `RenderTexture` whenever the wall style changes (in `render.ts`). Strength comes from `wallGlowFilter` (`src/domain/wallStyle.ts`). It is on by default (`DEFAULT_TUNING.wallGlow` = 0.6).

Code: `src/domain/lineArt.ts` (parser, pure), `src/game/systems/lineArtRender.ts` (Phaser drawing), and the line-art branch of `src/game/systems/render.ts`.

## Authoring rules

`parseLineArt` reads a deliberately small SVG subset with plain string parsing, so it runs in node tests. Anything outside the subset throws a `lineArt: …` error at boot. There is no fallback.

- The root must have `viewBox="0 0 W H"`.
- Use `<path>` elements only. Each needs a unique `id` and a `d`. `<circle>`, `<ellipse>`, `<rect>`, `<line>`, `<polyline>`, `<polygon>`, `<use>`, `<text>` and any `transform=` are rejected.
- One subpath per path: no second `M`, and nothing after `Z`. Split shapes into separate ids.
- Keep strokes as strokes. Never "outline stroke" or "expand" them in an editor: the stroke's path is what a future unspool will trim.
- **Path direction is the future unspool order.** Draw each path in the order it should appear.
- `stroke` / `fill`: `currentColor` (the actor's colour, set in code), `none`, or `#rrggbb`. A missing attribute means `none`. `fill-opacity` is a number (default 1). `stroke-width` is ignored (preview only); the renderer uses `LINE_ART_STROKE_VB` in viewBox units.
- Path commands: `M L H V C Q A Z`, absolute and relative. `S`/`T` are not supported. Arc flags must be space- or comma-separated (packed flags like `011` are not parsed).
- Strands are drawn in document order. Fill comes first, then stroke.

Each strand becomes `{ id, points: {x, y, s}[], length, closed, stroke, fill, fillOpacity }` in viewBox units. `s` is the distance along the strand from its start.

## Adding a vector actor

1. Put the SVG under `src/game/art/` and parse it once with `parseLineArt` (`import svg from "./x.svg?raw"`, like `clydeArt.ts`). Add a test that pins its strands.
2. Map its drawable id in `render.ts`: `LINE_ART_BY_DRAWABLE_ID` (art + colour).
3. Decide when it is vector in a pure domain rule, like `ghostArtStyle` in `src/domain/ghostArt.ts`. `PlaySim.renderOptions()` sends the matching ids as `lineArtDrawableIds`, and `snapshot().lineArtGhosts` exposes them to probes. `render.ts` only acts on what it is told. With the option absent (e.g. LEARN), everything stays pixel art.

Frozen ghosts recolour the line, fill and glow cyan (the eyes stay white). Dimming uses alpha. Warp-glide afterimages are vector copies without glow.
