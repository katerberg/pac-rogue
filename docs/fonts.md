# Fonts

Two typefaces, selected by Settings → **STYLE** (`neon` / `pixel`, same storage as ghost art: `pac-rogue.ghost-style.v1`).

| STYLE          | Ghosts              | UI text                        |
| -------------- | ------------------- | ------------------------------ |
| NEON (default) | SVG line art + glow | Bar-curve neon strokes + bloom |
| PIXEL          | PNG sprites         | VGA 8×8 bitmap (`pac-pixel`)   |

## Pixel font

IBM VGA 8×8 bitmasks in `src/game/scenes/font8x8Basic.ts`, atlas built at runtime in `pixelFont.ts`. Unchanged when STYLE is PIXEL.

## Neon font

Bar-curve glyphs: **axis-aligned** horizontal/vertical segments and **quarter-circle** arcs only (`src/domain/neonFont/`). ViewBox is 2×4 units per glyph.

- Digits `0–9` are frozen to the approved sheet paths in `NEON_DIGIT_PATHS`.
- Uppercase **G** is the replacement silhouette (open bowl with the right stem curling into the center), not the notebook inlet-bar G.
- Punctuation set: space and `!"#$%'()+,-./:<=>?[]`.
- Missing codepoints fall back to a pixel glyph for that character only.

Authoring references (not loaded at runtime): `src/game/art/refs/neon-alphabet-glow.png`, `neon-g-replacement.png`, `neon-notebook-sketch.png`.

Rendering: `NeonText` in `src/game/scenes/neonFont.ts` strokes parsed path points with Phaser Graphics and optional knockout `addGlow` bloom (same idea as line-art ghosts). Scenes use `addGameText` / `placeGameText`, which pick neon vs pixel from `textStyleFor(loadGhostStyle())`.

## Knobs (`?knobs=1`)

Visuals group — restrained defaults, wide extremes:

| Knob                      | Role                                       |
| ------------------------- | ------------------------------------------ |
| Font thickness            | Stroke width as a fraction of glyph height |
| Font bloom / bloom radius | Phaser glow strength and reach             |
| Font glow color           | Bloom color (core uses the call-site tint) |
| Font letter spacing       | Extra gap in viewBox units                 |
| Font height               | Vertical stretch                           |
| Font glow knockout        | Knockout bloom under crisp stroke          |

`fontLineArtLook(tuning)` in `src/domain/neonFont/fontLook.ts`. Play applies look live via `setActiveFontLook` when knobs change.

## Probe

`play.textStyle` is `"neon"` or `"pixel"` (mirrors Settings STYLE for the typeface).
