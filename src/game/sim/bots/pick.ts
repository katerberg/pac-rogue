import {
  baseIdOf,
  getUpgradeDef,
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

export function upgradeScore(
  id: BaseUpgradeId,
  owned: readonly UpgradeId[],
  persona: Persona,
): number {
  const school = getUpgradeDef(id).school;
  const sameSchool = owned.filter((own) => getUpgradeDef(baseIdOf(own)).school === school).length;
  return (
    persona.schoolPreference[school] +
    (sameSchool >= 2 ? 1 : 0) +
    (MULTIPLIERS.has(id) && owned.length >= 2 ? 0.5 : 0)
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
    const score = upgradeScore(option.id, owned, persona) + (option.enhanced ? 0.5 : 0);
    if (score > bestScore) {
      best = option;
      bestScore = score;
    }
  }
  return best;
}
