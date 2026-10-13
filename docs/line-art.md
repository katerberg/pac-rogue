# Line art, fonts and render scale

Settings -> **STYLE** (`pac-rogue.ghost-style.v1`) picks the look. **PIXEL** (default): PNG ghosts, Dot-Man, Quarters and pellets, VGA 8x8 bitmap text, no glow. **NEON**: SVG line art (`src/game/art/*.svg`) with knockout glow, stroke-ring pellets, bar-curve neon text. **LINED**: NEON with all glow forced to 0. The style also skins the BONUS meter ([bonus.md](./bonus.md)) and the LEARN/Settings checkboxes. Style decisions are pure domain rules (`src/domain/ghostArt.ts`: `lineArtGhostKinds`, `textStyleFor`, `*LineArtLook`, `styleUsesGlow`); the sims send `lineArtDrawableIds` and probes read `play.lineArt*` and `play.textStyle`.

Collision never depends on the drawing: every ghost catches with the same body circle, so glow, thickness and width are visual only.

## Rendering model

- **The canvas matches physical pixels.** World coordinates stay fixed; the canvas is the world size times `renderScaleFor(window, devicePixelRatio)` (`src/domain/renderScale.ts`). Every scene calls `applyRenderScale(this)` first in `create()`, reads pointers with `pointer.worldX/worldY` (never `pointer.x/y`) and uses `renderScaleOf(scene)` where canvas pixels matter.
- Pixel art uses Phaser's `smoothPixelArt`; graphics are multisampled so line art is crisp. Fractional scales can bleed texture edges (`visual` checks for this).
- **Glow** is Phaser 4's `Glow` filter as a knockout layer under crisp art: one glow Graphics per vector actor (opaque silhouette, so glow stays outside the body); static maze walls are filtered once into a `RenderTexture` when the wall style changes (`wallGlowFilter`). Regular dots have no glow (cost); power, boss and optional pellets keep a maze-coloured bloom.
- Translucent fills sit on an opaque maze-background layer so nothing behind a line-art ghost shows through. Tints recolour the line (`tintedColor`).
- Code: `lineArt.ts` (pure parser), `systems/lineArtRender.ts`, and the line-art branches of `systems/render.ts`.

## SVG authoring rules

`parseLineArt` reads a deliberately small SVG subset with plain string parsing (runs in node tests). Anything outside it throws `lineArt: ...` at boot; there is no fallback.

- Root needs `viewBox="0 0 W H"`. `<path>` only, each with a unique `id` and `d`; no `<circle>`, `<rect>`, `<use>`, `<text>` or `transform=`.
- One subpath per path (no second `M`, nothing after `Z`). Keep strokes as strokes (never outline them in an editor). Path direction is the future "unspool" order.
- `stroke` / `fill`: `currentColor` (colour set in code), `none` or `#rrggbb`. `stroke-width` and `stroke-linecap` are ignored; thickness comes from the look knobs.
- Commands: `M L H V C Q A Z`, absolute and relative (no `S`/`T`; arc flags separated by space or comma).

Adding a vector actor: put the SVG in `src/game/art/`, parse it once, pin its strands in a test, map its drawable id in `render.ts` (`LINE_ART_BY_DRAWABLE_ID`), and decide when it is vector in a pure domain rule.

## Dot-Man and Quarters

Dot-Man's mouth is a spiral pipe folded on itself; the mouth half-angle follows a chomp beat tied to distance travelled (`dotManMouth.ts`) and rotates to the move direction (`dotManTurn.ts`; reversals sweep clockwise). Icons (`addDotManIcon`, `addQuarterIcon` in `render.ts`) bake art and glow into a texture once per style, size, scale, backdrop and look. `quarter.svg` is a coin drawn with `currentColor`. Looks and glow come from Visuals knobs (`?knobs=1`).

## Fonts

- **Pixel:** IBM VGA 8x8 bitmasks (`font8x8Basic.ts`, atlas in `pixelFont.ts`).
- **Neon:** bar-curve glyphs, axis-aligned segments and quarter-circle arcs only, each on a 3x5 grid of integer points (`src/domain/neonFont/`; the glyph assertion fails loudly on a bad glyph). Missing codepoints fall back to a pixel glyph for that character only. Directional hints reuse `>` rotated (`upgradeChoiceHints.ts`); do not invent `v`/`^`.
- Scenes use `addGameText` / `placeGameText`, which pick the typeface from the style. `NeonText` strokes parsed paths with Phaser Graphics plus optional knockout bloom; look comes from `fontLineArtLook(tuning, style)` and the Font knob subgroup.
- **Stacked UI text:** two different vertical rules. Lines inside one string use `neonLinePitch` / `NEON_LINE_LEADING` (`layout.ts`); gaps between separate text rows use `interTextGap` (`textStack.ts`). Card surfaces route through `stackTexts` / `layoutCardText`. Wrap is character-count `wrapText`, with a wider neon budget (`wrapCharBudget`) and width clamping for store panels. Title size steps down by fixed increments to a floor (`fitFontSize`); body, school and cost are never shrunk, so a very tall stack may clip in the short store panel (accepted).
