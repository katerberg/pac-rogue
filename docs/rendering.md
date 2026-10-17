# Rendering, fonts and render scale

The game has one look: PNG ghosts, Dot-Man, Quarters and pellets, VGA 8x8 bitmap text, no glow. **Black 2×2 art-pixel ghost pupils are runtime Graphics** (`src/domain/ghostPupils.ts` + `render.ts`), offset by each ghost's `Facing` (icons use a rest stare; the level-2 intermission aims Blinky's pupils at Dot-Man). Pupils hide while Hunter-frightened (including blink-off) and on warp afterimages. The ghost PNGs keep white sclera only. **Maze ghosts, learn icons, and the level-clear intermission crop the PNG above the skirt (Phaser crop hides pixels only — display stays size×size) and draw a Graphics wave** (`src/domain/ghostSkirt.ts`: one `fillRect` per art column; maze/intermission advance phase with horizontal travel; maze ghosts also advance it at half speed while moving vertically, waving toward their queued horizontal move). Warp afterimages keep the baked skirt.

Collision never depends on the drawing: every ghost catches with the same body circle, so sprite size is visual only.

## Rendering model

- **The canvas matches physical pixels.** World coordinates stay fixed; the canvas is the world size times `renderScaleFor(window, devicePixelRatio)` (`src/domain/renderScale.ts`). Every scene calls `applyRenderScale(this)` first in `create()`, reads pointers with `pointer.worldX/worldY` (never `pointer.x/y`) and uses `renderScaleOf(scene)` where canvas pixels matter.
- Pixel art uses Phaser's `smoothPixelArt`; graphics are multisampled. Fractional scales can bleed texture edges (`visual` checks for this).
- Walls are one Graphics of hard-edged art-pixel rects rasterized from the domain path commands (`src/domain/pixelWall.ts`), so corners are stair-stepped, not anti-aliased; the wall look (colour, thickness, corner radius, background) comes from `wallStyleFor` and the Visuals knobs (`?knobs=1`).
- Code: `systems/render.ts` is the bridge from ECS `Drawable`s to Phaser objects.

## Dot-Man and Quarters

Dot-Man is a round body PNG that never rotates, with a right-facing visor PNG drawn on top (like ghost pupils). The visor eases to each new heading over a short turn (`dotManHeading.ts`); leftward headings mirror it instead of turning it upside down. It bobs smoothly up and down on a chomp beat tied to distance travelled (`dotManMouth.ts`). Afterimages and the wrap twin copy the head's visor pose. Icons (`addDotManIcon`, `addQuarterIcon` in `render.ts`) are plain images of the same textures. Chomp speed comes from the Visuals knobs.

## Charm tail

Charm bracelet (`src/domain/charmTail.ts`, knobs in `charmTailParams.ts`, drawn in `render.ts`): size is fixed in world units (Visuals > Charms knobs), never from `renderScaleOf` / DPR / Dot-Man; textures use `smoothPixelArt`; charms bounce off walls (`blocked`), bobble is physics not a draw offset. Probe at `--dpr 1` and `--dpr 2` ([VERIFICATION.md](./VERIFICATION.md#live-check)).

## Fonts

- IBM VGA 8x8 bitmasks (`font8x8Basic.ts`, atlas in `pixelFont.ts`); scenes create text with `addPixelText` / `placePixelText`.
- Directional hints reuse `>` rotated (`upgradeChoiceHints.ts`); do not invent `v`/`^`.
- **Stacked UI text:** gaps between separate text rows are explicit constants per surface; `src/domain/textLayout.ts` holds the pure stacking and wrap-width helpers, and card surfaces route through `stackTexts` / `layoutCardText`. Wrap is character-count `wrapText`. Title size steps down in whole glyphs (`fitFontSize`); body, school and cost are never shrunk.
