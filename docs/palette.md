# Colour palette

New aesthetics (art, UI, effects, backgrounds, tints) default to the Game Boy Color palette: [gameboy-color-type1.gpl](https://github.com/aseprite/aseprite/blob/main/data/extensions/hardware-palettes/gameboy-color-type1.gpl). The palette is not copied here; open that file for the swatches.

## How strictly

Hold it loosely. The goal is a cohesive GBC look, not exact-match enforcement.

- Pick from the palette first.
- Darkening or lightening a palette colour (shades, tints, hover or disabled states, dim overlays, alpha) is fine without asking.
- A hue that has no palette neighbour, or a look that clashes with the GBC feel, is a divergence: check in with the user before shipping it, and say in the PR body which colours diverge and why.
- Existing colours are not a mandate to migrate. Do not recolour untouched art as a drive-by; a deliberate re-palette is its own change.

Palette choices are a presentation judgement, so they get a live check and screenshots ([live check](./VERIFICATION.md#live-check)), not a unit test.
