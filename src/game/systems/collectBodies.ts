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
  bodies: readonly Point[],
): PlayerPelletFrame {
  return bodies.reduce(
    (frame, at) => mergePlayerPelletFrames(frame, collectPellets(world, { ...opts, at })),
    collectPellets(world, opts),
  );
}

export function collectFruitForBodies(world: World, bodies: readonly Point[]): number[] {
  return [collectFruit(world), ...bodies.map((at) => collectFruit(world, at))].flat();
}

export function collectExtraForBodies(world: World, count: number, twin: Point | null): number[] {
  const own = collectExtraPellets(world, count);
  return twin === null ? own : [...own, ...collectExtraPellets(world, count, twin)];
}
