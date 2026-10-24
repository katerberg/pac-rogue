import type { FruitKind } from "./fruit";

export const GRAVE_LILIES_CHARGES_PER_LEVEL = 1;
export const GRAVE_FRUIT_KIND: FruitKind = "watermelon";

export function takeGraveLiliesCharge(charges: number): { charges: number; drop: boolean } {
  return charges > 0 ? { charges: charges - 1, drop: true } : { charges, drop: false };
}
