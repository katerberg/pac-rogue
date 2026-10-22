import { describe, expect, it } from "vitest";
import { createRunRandom } from "../../../domain/runRandom";
import { pickOffer, pickSalvage } from "./pick";
import { PERSONAS } from "./profiles";

const offer = {
  upgrades: ["passiveAfterburner", "powerPelletInvuln"] as const,
  enhanced: [],
};

describe("pickOffer", () => {
  it("takes the persona's preferred school", () => {
    const rng = createRunRandom("pick").stream("bot");
    expect(
      pickOffer({ ...offer, upgrades: [...offer.upgrades] }, [], PERSONAS.cautious, rng),
    ).toEqual({
      kind: "upgrade",
      id: "powerPelletInvuln",
      enhanced: false,
    });
    expect(
      pickOffer({ ...offer, upgrades: [...offer.upgrades] }, [], PERSONAS.speedrunner, rng),
    ).toMatchObject({
      id: "passiveAfterburner",
    });
  });

  it("covers every option when picking at random", () => {
    const rng = createRunRandom("random-picks").stream("bot");
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const choice = pickOffer(
        { ...offer, upgrades: [...offer.upgrades] },
        [],
        PERSONAS.casual,
        rng,
      );
      seen.add(choice.id);
    }
    expect(seen.size).toBe(2);
  });
});

describe("pickSalvage", () => {
  const OWNED = [
    "powerPelletInvuln",
    "passiveShieldPellets",
    "passiveExtraLife",
    "passiveDefyDeath",
    "passiveAfterburner",
    "powerPelletWallPass",
  ] as const;
  const rng = createRunRandom("salvage-pick").stream("bot");

  it("salvages the lowest-scored owned upgrade, first in owned order", () => {
    expect(pickSalvage("passiveNearMiss", [...OWNED, "lowSpeed"], PERSONAS.cautious, rng)).toBe(
      "passiveAfterburner",
    );
  });

  it("salvages the new card on a tie", () => {
    expect(pickSalvage("fruitFeast", [...OWNED], PERSONAS.cautious, rng)).toBeNull();
  });

  it("protects an owned Plus over its plain peer", () => {
    const owned = OWNED.map((id) => (id === "passiveAfterburner" ? "passiveAfterburnerPlus" : id));
    expect(pickSalvage("passiveNearMiss", owned, PERSONAS.cautious, rng)).toBe(
      "powerPelletWallPass",
    );
  });

  it("picks among all seven at random for a random persona, never a Trinket", () => {
    const seen = new Set<string | null>();
    for (let i = 0; i < 400; i += 1) {
      seen.add(pickSalvage("fruitFeast", [...OWNED, "lowSpeed"], PERSONAS.casual, rng));
    }
    expect(seen).toEqual(new Set([...OWNED, null]));
  });
});
