import type { UpgradeSchool } from "../../../domain/upgrades";
import type { PlannerWeights } from "./planner";

export type PersonaId = "cautious" | "speedrunner" | "disrupter" | "collector" | "casual";
export type SkillTierId = "novice" | "average" | "expert";

export type MoveWeights = PlannerWeights & {
  powerHoldNearGhosts: boolean;
  noise: number;
};

export type StorePolicy = {
  enhance: boolean;
  reserveQuarters: number;
  maxPurchases: number;
};

export type Persona = {
  weights: MoveWeights;
  schoolPreference: Record<UpgradeSchool, number>;
  randomPicks: boolean;
  store: StorePolicy;
};

export type SkillTier = {
  depth: number;
  reactionMs: number;
  jitterMs: number;
  mistakeRate: number;
  readsGhosts: boolean;
};

export type Profile = { persona: Persona; skill: SkillTier };

const NEUTRAL_PREFERENCE: Record<UpgradeSchool, number> = {
  death: 0.5,
  harvest: 0.5,
  speed: 0.5,
  automation: 0.5,
  protection: 0.5,
  disruption: 0.5,
  neutral: 0.5,
};

const BASE_WEIGHTS: MoveWeights = {
  pellet: 1,
  power: 0.3,
  fruit: 0.9,
  frightChase: 1,
  safety: 0.09,
  margin: 0.2,
  powerHoldNearGhosts: false,
  noise: 0,
};

const BASE_STORE: StorePolicy = {
  enhance: false,
  reserveQuarters: 0,
  maxPurchases: Number.POSITIVE_INFINITY,
};

export const PERSONAS: Record<PersonaId, Persona> = {
  cautious: {
    weights: { ...BASE_WEIGHTS, safety: 0.18, margin: 0.3, power: 0.6 },
    schoolPreference: { ...NEUTRAL_PREFERENCE, protection: 2, death: 1.5 },
    randomPicks: false,
    store: BASE_STORE,
  },
  speedrunner: {
    weights: { ...BASE_WEIGHTS, pellet: 2, safety: 0.045, margin: 0, fruit: 0.3 },
    schoolPreference: { ...NEUTRAL_PREFERENCE, speed: 2, automation: 1.5 },
    randomPicks: false,
    store: BASE_STORE,
  },
  disrupter: {
    weights: { ...BASE_WEIGHTS, power: 1, powerHoldNearGhosts: true, frightChase: 7 },
    schoolPreference: { ...NEUTRAL_PREFERENCE, disruption: 2 },
    randomPicks: false,
    store: BASE_STORE,
  },
  collector: {
    weights: { ...BASE_WEIGHTS, fruit: 6 },
    schoolPreference: { ...NEUTRAL_PREFERENCE, harvest: 2, automation: 1.5 },
    randomPicks: false,
    store: { ...BASE_STORE, enhance: true },
  },
  casual: {
    weights: { ...BASE_WEIGHTS, safety: 0.075, noise: 0.2 },
    schoolPreference: NEUTRAL_PREFERENCE,
    randomPicks: true,
    store: { ...BASE_STORE, maxPurchases: 1 },
  },
};

const SKILL_TIERS: Record<SkillTierId, SkillTier> = {
  novice: { depth: 8, reactionMs: 280, jitterMs: 80, mistakeRate: 0.03, readsGhosts: false },
  average: { depth: 12, reactionMs: 180, jitterMs: 50, mistakeRate: 0.005, readsGhosts: true },
  expert: { depth: 16, reactionMs: 100, jitterMs: 15, mistakeRate: 0, readsGhosts: true },
};

export const EXPERT_PROFILE_IDS: readonly string[] = [
  "cautious@expert",
  "speedrunner@expert",
  "disrupter@expert",
  "collector@expert",
  "casual@expert",
];

export const PROFILE_IDS: readonly string[] = [
  ...EXPERT_PROFILE_IDS,
  "cautious@average",
  "casual@average",
];

export const NOVICE_PROFILE_IDS: readonly string[] = ["cautious@novice", "casual@novice"];

export const BUILD_PROFILE_IDS: readonly string[] = [...PROFILE_IDS, ...NOVICE_PROFILE_IDS];

export function profileFor(id: string): Profile {
  const [personaId, tierId] = id.split("@");
  const persona = PERSONAS[personaId as PersonaId];
  const skill = SKILL_TIERS[tierId as SkillTierId];
  if (persona === undefined || skill === undefined) {
    throw new Error(`Unknown bot profile "${id}"; expected <persona>@<novice|average|expert>`);
  }
  return { persona, skill };
}
