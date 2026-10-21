# Rendering, fonts and render scale

The game has one look: PNG ghosts, Dot-Man, Quarters and pellets, VGA 8x8 bitmap text, no glow. **Black 2×2 art-pixel ghost pupils are runtime Graphics** (`src/domain/ghostPupils.ts` + `render.ts`), offset by each ghost's `Facing` (icons use a rest stare; the level-2 intermission aims Blinky's pupils at Dot-Man). Pupils hide while Hunter-frightened (including blink-off) and on warp afterimages. The ghost PNGs keep white sclera only. **Maze ghosts, learn icons, and the level-clear intermission crop the PNG above the skirt (Phaser crop hides pixels only — display stays size×size) and draw a Graphics wave** (`src/domain/ghostSkirt.ts`: one `fillRect` per art column; maze/intermission advance phase with horizontal travel; maze ghosts also advance it at half speed while moving vertically, waving toward their queued horizontal move). Warp afterimages keep the baked skirt.

Collision never depends on the drawing: every ghost catches with the same body circle, so sprite size is visual only. A short silent catch grace after a perpendicular turn (`src/domain/turnCatchGrace.ts`) so a faster ghost cannot kill on the corner; lava is unaffected.

## Rendering model

- **The canvas matches physical pixels.** World coordinates stay fixed; the canvas is the world size times `renderScaleFor(window, devicePixelRatio)` (`src/domain/renderScale.ts`). Every scene calls `applyRenderScale(this)` first in `create()`, reads pointers with `pointer.worldX/worldY` (never `pointer.x/y`) and uses `renderScaleOf(scene)` where canvas pixels matter.
- **Pixel art is pixel-perfect at every scale.** Every art pixel covers the same whole number of device pixels, and art edges sit on device-pixel boundaries. Art textures are crisp (`makeTextureCrisp`), and the scene pass in `applyRenderScale` (`src/game/renderScale.ts`) applies the rule to every art image just before each frame renders, using `src/domain/pixelArt.ts`. It then restores the authored size and position, so call sites keep using plain `setDisplaySize` / `setPosition` / tweens and never round by hand. Drawn sizes therefore step in whole art-pixel multiples as the window resizes. Graphics drawn on an art grid (ghost skirt, pupils and horns) snap their ghost with `crispGhost` and keep art offsets whole. Phaser's `roundPixels` does not do this: it skips any scaled object, which is every sprite under the render-scale zoom. Free rotations (the visor mid-turn) cannot be crisp.
- Graphics are multisampled. Fractional scales can bleed texture edges (`visual` checks for this).
- Walls are one Graphics of hard-edged art-pixel rects rasterized from the domain path commands (`src/domain/pixelWall.ts`), so corners are stair-stepped, not anti-aliased; the wall look (colour, thickness, corner radius, background) comes from `wallStyleFor` and the Visuals knobs (`?knobs=1`).
- **Play sidebar bands:** the camera clear stays the maze background for the full playfield height in the maze column; Play paints slightly lighter full-height gutter fills with a soft seam (`src/domain/sidebarBands.ts`, enabled via `createRender(scene, true)`). Learn leaves bands off ([parity](./learn.md#parity)).
- Code: `systems/render.ts` is the bridge from ECS `Drawable`s to Phaser objects.

## Dot-Man and Quarters

Dot-Man is a round body PNG that never rotates, with a right-facing visor PNG drawn on top (like ghost pupils). The visor eases to each new heading over a short turn (`dotManHeading.ts`); leftward headings mirror it instead of turning it upside down. It bobs smoothly up and down on a chomp beat tied to distance travelled (`dotManMouth.ts`). Afterimages and the wrap twin copy the head's visor pose. Icons (`addDotManIcon`, `addQuarterIcon` in `render.ts`) are plain images of the same textures. Chomp speed comes from the Visuals knobs.

## Bubble shield

Banked shields draw a PNG ring around Dot-Man (`public/art/other/bubble-shield.png`, or `bubble-shield-multiple.png` when 2+). Size is Dot-Man's display size plus a fixed pad (`bubbleShield.ts`); a lost shield splits into left/right halves that drift apart (`shieldCrack.ts`). The old drag-along charm bracelet (`charmTail.ts`, Visuals knobs) stays in the codebase but is off by default; enabling the knob replaces the bubble rather than stacking.

## Fonts

- IBM VGA 8x8 bitmasks (`font8x8Basic.ts`, atlas in `pixelFont.ts`); scenes create text with `addPixelText` / `placePixelText`.
- Directional hints reuse `>` rotated (`upgradeChoiceHints.ts`); do not invent `v`/`^`.
- **Stacked UI text:** gaps between separate text rows are explicit constants per surface; `src/domain/textLayout.ts` holds the pure stacking and wrap-width helpers, and card surfaces route through `stackTexts` / `layoutCardText`. Wrap is character-count `wrapText`. Title size steps down in whole glyphs (`fitFontSize`); body, school and cost are never shrunk.
