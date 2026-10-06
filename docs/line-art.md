# Line art (vector sprites)

Thin neon line art next to the pixel art. By default every ghost (in play, in LEARN and on the LEARN picker) is drawn from one hand-written SVG, `src/game/art/ghost.svg`, in its own neon colour; every other sprite is still a PNG, in the same frame. Settings → **STYLE** (NEON / PIXEL, stored as `pac-rogue.ghost-style.v1`) switches all ghosts back to the pixel PNGs and turns maze wall glow off (NEON keeps the soft wall glow on). Nothing is animated yet, but the SVG is parsed into point lists that carry distance along the path, so a later "unspool" (trim the stroke away along its path) needs no data rework.

## Rendering model

- **The canvas matches the screen's physical pixels.** World coordinates stay 800×600. The canvas is 800×600 × `renderScaleFor(window size, devicePixelRatio)` (`src/domain/renderScale.ts`): fit-to-window × device pixel ratio, clamped to 1–4. So a 1080p window gets ×1.8 (1440×1080), a 2× retina laptop ×3, and the 900×700 probe viewport ×1.125. The browser then shows it 1:1 with no resampling. On window resize, `followWindowRenderScale` resizes the canvas.
- **Every scene calls `applyRenderScale(this)` first thing in `create()`.** It sets camera origin 0,0 and zoom = canvas width / 800, and re-zooms on resize. Read pointers with `pointer.worldX/worldY`, never `pointer.x/y`. Use `renderScaleOf(scene)` wherever canvas pixels per world pixel matter.
- **Pixel art uses Phaser's `smoothPixelArt`.** 16×16 textures stay blocky but get clean edges at non-integer scales. Graphics are multisampled, so line art is crisp.
- **Glow** uses Phaser 4's `Glow` filter, as a knockout (glow-only) layer under the crisp art:
  - Vector actors: one glow Graphics per actor, holding the art as an opaque silhouette. The Glow filter only emits where its source is transparent, so the glow stays outside the body and never hazes the eyes. The filter is focused on the art box plus the glow reach, at one texel per canvas pixel. Graphics have no bounds, and without that focus Phaser would filter the whole screen every frame. Strength and reach come from the `?knobs=1` **Ghost glow** / **Ghost glow radius** knobs (defaults 1.6 and 6px). **Ghost line thickness** (stroke as % of the ghost's size, default 6.5), **Line ghost width** (horizontal stretch of the geometry, default 1.16) and **Line ghost height** (vertical stretch, default 1.14) are knobs too. All five go through `ghostLineArtLook` in `src/domain/ghostArt.ts`; changing any of them rebuilds the line-art objects, since Phaser fixes the glow distance at creation.
  - Maze walls: the glow is static, so it is filtered once into a canvas-resolution `RenderTexture` whenever the wall style changes (in `render.ts`). Strength comes from `wallGlowFilter` (`src/domain/wallStyle.ts`), which passes `wallGlow` through as Phaser `outerStrength` (defaults: glow **4**, radius **21px**, thickness **1.5px** under STYLE = NEON). STYLE = PIXEL forces wall glow off when knobs are not on. With `?knobs=1`, **Wall glow** (0–12) and **Wall glow radius** (0–36) always apply.

Code: `src/domain/lineArt.ts` (parser, pure), `src/game/systems/lineArtRender.ts` (Phaser drawing), and the line-art branch of `src/game/systems/render.ts`.

## Authoring rules

`parseLineArt` reads a deliberately small SVG subset with plain string parsing, so it runs in node tests. Anything outside the subset throws a `lineArt: …` error at boot. There is no fallback.

- The root must have `viewBox="0 0 W H"`.
- Use `<path>` elements only. Each needs a unique `id` and a `d`. `<circle>`, `<ellipse>`, `<rect>`, `<line>`, `<polyline>`, `<polygon>`, `<use>`, `<text>` and any `transform=` are rejected.
- One subpath per path: no second `M`, and nothing after `Z`. Split shapes into separate ids.
- Keep strokes as strokes. Never "outline stroke" or "expand" them in an editor: the stroke's path is what a future unspool will trim.
- **Path direction is the future unspool order.** Draw each path in the order it should appear.
- `stroke` / `fill`: `currentColor` (the actor's colour, set in code), `none`, or `#rrggbb`. A missing attribute means `none`. `fill-opacity` is a number (default 1). `stroke-width` is ignored (preview only); the renderer uses the Ghost line thickness knob.
- Path commands: `M L H V C Q A Z`, absolute and relative. `S`/`T` are not supported. Arc flags must be space- or comma-separated (packed flags like `011` are not parsed).
- Strands are drawn in document order. Fill comes first, then stroke.

Each strand becomes `{ id, points: {x, y, s}[], length, closed, stroke, fill, fillOpacity }` in viewBox units. `s` is the distance along the strand from its start.

## Adding a vector actor

1. Put the SVG under `src/game/art/` and parse it once with `parseLineArt` (`import svg from "./x.svg?raw"`, like `ghostLineArt.ts`). Add a test that pins its strands.
2. Map its drawable id in `render.ts`: `LINE_ART_BY_DRAWABLE_ID` (art + colour). The four ghosts share `GHOST_LINE_ART` with colours blinky `#ff5a5a`, pinky `#ff9ce6`, inky `#5ff2ff`, clyde `#ffb852`.
3. Decide when it is vector in a pure domain rule, like `lineArtGhostKinds(style, presentKinds)` in `src/domain/ghostArt.ts`. `PlaySim` and `LearnSim` (both `setGhostStyle`, called by their scenes from the stored setting) send the matching ids as `lineArtDrawableIds`, and `PlaySim.snapshot().lineArtGhosts` exposes them to probes. `render.ts` only acts on what it is told; with the option absent everything stays pixel art. Static pictures outside the maze (the LEARN picker) use `addGhostIcon` from `render.ts`.

Translucent fills (the body's 0.25 tint) sit on an opaque layer of the maze background colour, so nothing behind a line-art ghost (Dot-Man, pellets) shows through. Frozen ghosts recolour the line, fill and glow icy white (`#e6f6ff`; the pixel freeze tint would read as Inky's cyan). Hunter-frightened ghosts recolour them light blue (`#6f7bff`, brighter than the default walls), blinking back to their own colour in the last second like the pixel sprite. The eyes stay white. Dimming uses alpha. Warp-glide afterimages are vector copies without glow.

Collision never depends on the drawing: every ghost catches with the same body circle (`Drawable.radius = ghostRadius()`, set in `PlaySim`), so glow, thickness and width are visual only (pinned by the PlaySim "ghost style" tests).
