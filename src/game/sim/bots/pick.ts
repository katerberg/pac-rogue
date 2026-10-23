import { isTrinketId, slotCount } from "../../../domain/trinkets";
import {
  baseIdOf,
  enhancedIdOf,
  getUpgradeDef,
  isEnhancedId,
  type BaseUpgradeId,
  type UpgradeChoiceOffer,
  type UpgradeChoiceOption,
  type UpgradeId,
} from "../../../domain/upgrades";
import type { Persona } from "./profiles";

const MULTIPLIERS: ReadonlySet<BaseUpgradeId> = new Set([
  "passiveOvercharge",
  "passiveEcho",
  "fruitPowerPellet",
  "passiveStreakEngine",
]);

export function upgradeScore(id: UpgradeId, owned: readonly UpgradeId[], persona: Persona): number {
  const baseId = baseIdOf(id);
  const school = getUpgradeDef(baseId).school;
  const sameSchool = owned.filter(
    (own) => baseIdOf(own) !== baseId && getUpgradeDef(baseIdOf(own)).school === school,
  ).length;
  return (
    persona.schoolPreference[school] +
    (sameSchool >= 2 ? 1 : 0) +
    (MULTIPLIERS.has(baseId) && slotCount(owned) >= 2 ? 0.5 : 0) +
    (isEnhancedId(id) ? 0.5 : 0)
  );
}

function offerOptions(offer: UpgradeChoiceOffer): UpgradeChoiceOption[] {
  return offer.upgrades.map((id): UpgradeChoiceOption => ({
    kind: "upgrade",
    id,
    enhanced: offer.enhanced.includes(id),
  }));
}

export function pickOffer(
  offer: UpgradeChoiceOffer,
  owned: readonly UpgradeId[],
  persona: Persona,
  rng: () => number,
): UpgradeChoiceOption {
  const options = offerOptions(offer);
  if (persona.randomPicks) {
    return options[Math.floor(rng() * options.length)]!;
  }
  let best = options[0]!;
  let bestScore = -Infinity;
  for (const option of options) {
    const score = upgradeScore(
      option.enhanced === true ? enhancedIdOf(option.id) : option.id,
      owned,
      persona,
    );
    if (score > bestScore) {
      best = option;
      bestScore = score;
    }
  }
  return best;
}

export function pickSalvage(
  incoming: UpgradeId,
  owned: readonly UpgradeId[],
  persona: Persona,
  rng: () => number,
): UpgradeId | null {
  const slots = owned.filter((id) => !isTrinketId(id));
  if (persona.randomPicks) {
    const index = Math.floor(rng() * (slots.length + 1));
    return slots[index] ?? null;
  }
  let lowest: UpgradeId | null = null;
  let lowestScore = upgradeScore(incoming, owned, persona);
  for (const id of slots) {
    const score = upgradeScore(id, owned, persona);
    if (score < lowestScore) {
      lowest = id;
      lowestScore = score;
    }
  }
  return lowest;
}
