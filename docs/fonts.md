# Fonts

Two typefaces, selected by Settings → **STYLE** (`neon` / `lined` / `pixel`, same storage as ghost art: `pac-rogue.ghost-style.v1`). LINED uses the neon typeface (`textStyleFor`).

| STYLE          | Ghosts                 | UI text                        |
| -------------- | ---------------------- | ------------------------------ |
| NEON (default) | SVG line art + glow    | Bar-curve neon strokes + bloom |
| LINED          | SVG line art, glow off | Bar-curve neon strokes + bloom |
| PIXEL          | PNG sprites            | VGA 8×8 bitmap (`pac-pixel`)   |

## Pixel font

IBM VGA 8×8 bitmasks in `src/game/scenes/font8x8Basic.ts`, atlas built at runtime in `pixelFont.ts`. Unchanged when STYLE is PIXEL.

## Neon font

Bar-curve glyphs: **axis-aligned** horizontal/vertical segments and **quarter-circle** arcs only (`src/domain/neonFont/`). Every glyph sits on a 3×5 grid of points (viewBox 2×4 units): all path points are integers, every arc is an r=1 (cell) or r=2 (full glyph width) quarter turn, and dots are zero-length strands drawn as round dots; `assertBarCurvePath` lints this at module load. Neon text is uppercase only (`neonDisplayText`). Because caps fill the whole line height, stacked neon lines get an extra 0.5× line height of leading on top of `setLineSpacing` (`neonLinePitch`), so multi-line neon text is taller than the pixel font at the same size. Layout uses **ink-bounds metrics** (`neonGlyphMetrics`): each character advances by its path width plus thickness-aware side bearings and default tracking (`NEON_TRACKING`), plus a small pair-kerning table (`neonKern`) for open-sided pairs (TA, AV, T-, …).

- Digits `0–9` are frozen to the approved sheet paths in `NEON_DIGIT_PATHS`.
- Uppercase **G** is the replacement silhouette (open bowl with the right stem curling into the center), not the notebook inlet-bar G.
- Uppercase **V** is a full left stem, a half right stem, and an r=2 quarter from mid-right to the bottom-left corner.
- Punctuation set: space and `!"#$%'()+,-./:<=>?[]`.
- Missing codepoints fall back to a pixel glyph for that character only.
- Directional UI hints (upgrade-choice slots) reuse `>` and rotate it; do not invent `v` / `^` stand-ins (see `upgradeChoiceHints.ts`).

Authoring references (not loaded at runtime): `src/game/art/refs/neon-alphabet-glow.png`, `neon-g-replacement.png`, `neon-notebook-sketch.png`.

Rendering: `NeonText` in `src/game/scenes/neonFont.ts` strokes parsed path points with Phaser Graphics and optional knockout `addGlow` bloom (same idea as line-art ghosts). Scenes use `addGameText` / `placeGameText`, which pick neon vs pixel from `textStyleFor(loadGhostStyle())`.

## Stacked UI text (cards / store)

Two different vertical rules — do not conflate them:

| Rule                         | Where                                                     | Helper                                                                 |
| ---------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Intra-`NeonText` leading** | Lines inside one multi-line string (`\n` from `wrapText`) | `neonLinePitch` / `NEON_LINE_LEADING` (0.5×) in `layout.ts`            |
| **Inter-object gaps**        | Separate `GameText` rows (title → school → body → cost)   | `interTextGap` in `textStack.ts` (`×1.5` for neon, identity for pixel) |

Supported surfaces route through `stackTexts` / `layoutCardText` (choice modal, starting card, store confirm + side panel). Pixel STYLE keeps today's gap and wrap numbers.

**Char wrap:** still character-count `wrapText` (`src/domain/wrapText.ts`). Neon starts from a wider budget via `wrapCharBudget` (`NEON_WRAP_CHAR_MUL = 1.75`), and store panels further clamp with `wrapCharsFittingWidth` so each line's measured neon advance stays inside the box minus side pads (`PANEL_SIDE_PAD`). Fitting measures `neonDisplayText` (uppercase) advances — mixed-case strings under-measure the glyphs NeonText draws. Upgrade descriptions stay single prose strings — no per-upgrade `\n` edits.

**Store side panel:** top-anchors title → school → body → footer via `stackTextsFromTop` with school-sized `interTextGap` between rows (short 190px panel; section gaps overflow NEED/QUARTERS).

**Title fit floors:** `fitFontSize(..., textStyle)` uses a 4px neon cell (pixel stays 8). Preferred size ≥ 22 floors at **16**; otherwise floor **8**. School, body (8), cost, and SURE/YES/NO are never shrunk for stack pressure. If a stack is still taller than the box after the floor, leave it — do not grow the box or drop below the floor. Bloom is visual-only and is not added into gap math.

## Knobs (`?knobs=1`)

Visuals group — restrained defaults, wide extremes:

| Knob                      | Role                                              |
| ------------------------- | ------------------------------------------------- |
| Font thickness            | Stroke width in grid cells (1 cell = ¼ font size) |
| Font bloom / bloom radius | Phaser glow strength and reach                    |
| Font glow color           | Bloom color (core uses the call-site tint)        |
| Font letter spacing       | Extra tracking on top of default bearings         |
| Font height               | Vertical stretch                                  |
| Font glow knockout        | Knockout bloom under crisp stroke                 |

`fontLineArtLook(tuning)` in `src/domain/neonFont/fontLook.ts`. Play applies look live via `setActiveFontLook` when knobs change.

## Probe

`play.textStyle` is `"neon"` or `"pixel"` (mirrors Settings STYLE for the typeface).
