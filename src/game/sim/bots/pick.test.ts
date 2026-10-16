import { describe, expect, it } from "vitest";
import { createRunRandom } from "../../../domain/runRandom";
import { pickOffer } from "./pick";
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
