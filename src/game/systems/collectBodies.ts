import type { World } from "bitecs";
import { mergePlayerPelletFrames } from "./hyperspeed";
import { collectExtraPellets } from "./collectExtraPellets";
import { collectFruit } from "./collectFruit";
import {
  collectPellets,
  type CollectPelletsOptions,
  type PlayerPelletFrame,
} from "./collectPellets";

type Point = { x: number; y: number };

export function collectPelletsForBodies(
  world: World,
  opts: CollectPelletsOptions,
  twin: Point | null,
): PlayerPelletFrame {
  const own = collectPellets(world, opts);
  return twin === null
    ? own
    : mergePlayerPelletFrames(own, collectPellets(world, { ...opts, at: twin }));
}

export function collectFruitForBodies(world: World, twin: Point | null): number[] {
  const own = collectFruit(world);
  return twin === null ? own : [...own, ...collectFruit(world, twin)];
}

export function collectExtraForBodies(world: World, count: number, twin: Point | null): number[] {
  const own = collectExtraPellets(world, count);
  return twin === null ? own : [...own, ...collectExtraPellets(world, count, twin)];
}
