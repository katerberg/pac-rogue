# Colours

Colours that are reserved for upgrade schools. Each school colour is taken: use it only for things that belong to that school (its card border, glyph, store tile, slot symbol, Specialist, and similar school UI). Do not use it for unrelated art, UI or effects, even if the hue fits.

The palette lives in `SCHOOL_COLORS` in [`upgradeChoiceModal.ts`](../src/game/scenes/upgradeChoiceModal.ts). Change a colour there, not here.

| School     | Colour     | Hex       | Reserved for                 |
| ---------- | ---------- | --------- | ---------------------------- |
| Death      | purple     | `#B36BFF` | Death school upgrades        |
| Harvest    | red        | `#FF5A5A` | Harvest school upgrades      |
| Speed      | light blue | `#4DD2FF` | Speed school upgrades        |
| Automation | pink       | `#FF9CE6` | Automation school upgrades   |
| Protection | green      | `#5EE07A` | Protection school upgrades   |
| Disruption | yellow     | `#FFE14D` | Disruption school upgrades   |
| Neutral    | grey       | `#B0B0B0` | Neutral (no-school) upgrades |

Schools are defined in [`upgrades.md`](./upgrades.md#schools-and-rarity).
