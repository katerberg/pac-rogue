import { addComponent, addEntity, createWorld, type World } from "bitecs";
import { afterEach, describe, expect, it } from "vitest";
import { bossTunnelMouths } from "../../domain/bossBoard";
import { BOSS_DEFS, createBossState, recordBossPelletsEaten } from "../../domain/bossRules";
import {
  activateAsciiLayout,
  activateLayout,
  getActiveLayout,
  horizontalTunnelRows,
  pelletCellCenters,
} from "../../domain/maze";
import { GENERATE_MAX_ATTEMPTS, generateMazeAsciiWithRetries } from "../../domain/mazeGenerate";
import { PELLET_RADIUS, playerRadius } from "../../domain/playfield";
import { BossPellet } from "../components/BossPellet";
import { Drawable } from "../components/Drawable";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { countBossPellets, pickFreeBossMouth } from "./bossGhosts";
import { collectPellets } from "./collectPellets";

function spawnAt(world: World, x: number, y: number): number {
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Drawable);
  Position.x[eid] = x;
  Position.y[eid] = y;
  return eid;
}

function eatBossPelletOnBottomTunnelRow(seed: string) {
  const board = generateMazeAsciiWithRetries(seed, GENERATE_MAX_ATTEMPTS, { tunnelCount: 3 });
  activateAsciiLayout(board!.ascii);
  const mouths = bossTunnelMouths(horizontalTunnelRows(), getActiveLayout().cols);
  const bottomRow = mouths[0]!.row;
  const pelletCell = pelletCellCenters()
    .filter((cell) => cell.kind === "dot" && cell.row === bottomRow)
    .sort((a, b) => a.col - b.col)[0]!;

  const world = createWorld();
  const pellet = spawnAt(world, pelletCell.x, pelletCell.y);
  addComponent(world, pellet, Pellet);
  addComponent(world, pellet, BossPellet);
  Drawable.radius[pellet] = PELLET_RADIUS;
  const player = spawnAt(world, pelletCell.x, pelletCell.y);
  addComponent(world, player, Player);
  Drawable.radius[player] = playerRadius();

  let state = { ...createBossState(BOSS_DEFS.doubleBlinky, 2), bossPelletsRemaining: 1 };
  expect(collectPellets(world).removedEids).toEqual([pellet]);
  state = recordBossPelletsEaten(state, countBossPellets(world));
  return { world, mouths, bottomRow, state };
}

describe("boss tunnel spawn after eating a boss pellet on a tunnel row", () => {
  afterEach(() => {
    activateLayout("maze1");
  });

  it("never spawns the new Blinky from either tunnel mouth on the player's row", () => {
    for (let i = 0; i < 6; i += 1) {
      const { world, mouths, bottomRow, state } = eatBossPelletOnBottomTunnelRow(`row-${i}`);
      expect(state.pendingSpawns).toBe(1);
      expect(mouths[state.nextMouthIndex]!.row).toBe(bottomRow);

      const picked = pickFreeBossMouth(world, mouths, state.nextMouthIndex);
      expect(picked).toBe(1);
      expect(mouths[picked!]!.row).not.toBe(bottomRow);

      const fromBottomRight = pickFreeBossMouth(world, mouths, mouths.length - 1);
      expect(mouths[fromBottomRight!]!.row).not.toBe(bottomRow);
    }
  });
});
