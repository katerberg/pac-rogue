# Rendering, fonts and render scale

The game has one look: PNG ghosts, Dot-Man, Quarters and pellets, VGA 8x8 bitmap text, no glow. **Black 2×2 art-pixel ghost pupils are runtime Graphics** (`src/domain/ghostPupils.ts` + `render.ts`), offset by each ghost's `Facing` (icons/intermission use a rest stare). Pupils hide while Hunter-frightened (including blink-off) and on warp afterimages. The ghost PNGs keep white sclera only. **Maze ghosts, learn icons, and the level-clear intermission crop the PNG above the skirt (Phaser crop hides pixels only — display stays size×size) and draw a Graphics wave** (`src/domain/ghostSkirt.ts`: one `fillRect` per art column; maze/intermission advance phase with horizontal travel). Warp afterimages keep the baked skirt.

Collision never depends on the drawing: every ghost catches with the same body circle, so sprite size is visual only.

## Rendering model

- **The canvas matches physical pixels.** World coordinates stay fixed; the canvas is the world size times `renderScaleFor(window, devicePixelRatio)` (`src/domain/renderScale.ts`). Every scene calls `applyRenderScale(this)` first in `create()`, reads pointers with `pointer.worldX/worldY` (never `pointer.x/y`) and uses `renderScaleOf(scene)` where canvas pixels matter.
- Pixel art uses Phaser's `smoothPixelArt`; graphics are multisampled so wall strokes are crisp. Fractional scales can bleed texture edges (`visual` checks for this).
- Walls are one Graphics that strokes the domain path commands; the wall look (colour, thickness, corner radius, background) comes from `wallStyleFor` and the Visuals knobs (`?knobs=1`).
- Code: `systems/render.ts` is the bridge from ECS `Drawable`s to Phaser objects.

## Dot-Man and Quarters

Dot-Man's mouth frames follow a chomp beat tied to distance travelled (`dotManMouth.ts`). Icons (`addDotManIcon`, `addQuarterIcon` in `render.ts`) are plain images of the same textures. Chomp speed comes from the Visuals knobs.

## Fonts

- IBM VGA 8x8 bitmasks (`font8x8Basic.ts`, atlas in `pixelFont.ts`); scenes create text with `addPixelText` / `placePixelText`.
- Directional hints reuse `>` rotated (`upgradeChoiceHints.ts`); do not invent `v`/`^`.
- **Stacked UI text:** gaps between separate text rows are explicit constants per surface; `src/domain/textLayout.ts` holds the pure stacking and wrap-width helpers, and card surfaces route through `stackTexts` / `layoutCardText`. Wrap is character-count `wrapText`. Title size steps down in whole glyphs (`fitFontSize`); body, school and cost are never shrunk.
