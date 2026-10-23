# Colour palette

New aesthetics (art, UI, effects, backgrounds, tints) default to this Game Boy Color-style palette. It is our own locked list; do not re-derive it from any external source.

## Colours

- `#000000`
- `#ffad63`
- `#833100`
- `#ffffff`
- `#f7c4a5`
- `#7bff30`
- `#008300`
- `#65a49b`
- `#0000fe`
- `#ff8584`
- `#943a3a`
- `#e60000`
- `#ffe7c5`
- `#ce9c85`
- `#846b29`
- `#5b315b`
- `#a56b31`
- `#64a5ff`
- `#8b8cde`
- `#53528c`
- `#a5a5a5`
- `#525252`
- `#949494`
- `#fe9494`
- `#9394fe`
- `#ffffa5`
- `#ff00fe`
- `#ffff00`
- `#fe0000`
- `#7d4900`
- `#ffff3a`
- `#3a2802`
- `#51ff00`
- `#ff4200`
- `#0163c6`
- `#008486`
- `#ffde00`

## Always allowed

Ghost colours (`GHOST_COLOR_BY_KIND` in `src/domain/learnOverlay.ts`) and school colours (`SCHOOL_COLORS` in `src/game/scenes/upgradeChoiceModal.ts`) are part of the look even where they are not in the list above. Use them as they are for ghosts and schools; they are not divergences. A new ghost or school colour still follows the list unless you check in.

## How strictly

Hold it loosely. The goal is a cohesive GBC look, not exact-match enforcement.

- Pick from the list first.
- Darkening or lightening a listed colour (shades, tints, hover or disabled states, dim overlays, alpha) is fine without asking.
- A hue that has no listed neighbour, or a look that clashes with the GBC feel, is a divergence: check in with the user before shipping it, and say in the PR body which colours diverge and why.
- Existing colours are not a mandate to migrate. Do not recolour untouched art as a drive-by; a deliberate re-palette is its own change.

Palette choices are a presentation judgement, so they get a live check and screenshots ([live check](./VERIFICATION.md#live-check)), not a unit test.
