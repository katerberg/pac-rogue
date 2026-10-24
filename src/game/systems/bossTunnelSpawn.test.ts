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
import { SWARM_BOSS_MAZE_ASCII } from "../../domain/mazeLayouts";
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

function eatBossPelletOnSideTunnelRow() {
  activateAsciiLayout(SWARM_BOSS_MAZE_ASCII, "swarmBoss");
  const mouths = bossTunnelMouths(getActiveLayout().playerSolids);
  const sideRow = horizontalTunnelRows()[0]!;
  const pelletCell = pelletCellCenters()
    .filter((cell) => cell.kind === "dot" && cell.row === sideRow)
    .sort((a, b) => a.col - b.col)[0]!;

  const world = createWorld();
  const pellet = spawnAt(world, pelletCell.x, pelletCell.y);
  addComponent(world, pellet, Pellet);
  addComponent(world, pellet, BossPellet);
  Drawable.radius[pellet] = PELLET_RADIUS;
  const player = spawnAt(world, pelletCell.x, pelletCell.y);
  addComponent(world, player, Player);
  Drawable.radius[player] = playerRadius();

  let state = { ...createBossState(BOSS_DEFS.blinkySwarm, 2), bossPelletsRemaining: 1 };
  expect(collectPellets(world).removedEids).toEqual([pellet]);
  state = recordBossPelletsEaten(state, countBossPellets(world));
  return { world, mouths, sideRow, state };
}

describe("boss tunnel spawn after eating a boss pellet on the side tunnel row", () => {
  afterEach(() => {
    activateLayout("maze1");
  });

  it("never spawns the new Blinky from either side-tunnel mouth on the player's row", () => {
    const { world, mouths, sideRow, state } = eatBossPelletOnSideTunnelRow();
    expect(state.pendingSpawns).toBe(1);
    for (const mouthIndex of mouths.flatMap((mouth, i) => (mouth.row === sideRow ? [i] : []))) {
      const picked = pickFreeBossMouth(world, mouths, mouthIndex);
      expect(picked).not.toBeNull();
      expect(mouths[picked!]!.row).not.toBe(sideRow);
    }
  });

  it("still spawns from the vertical tunnels on the player's side-tunnel row", () => {
    const { world, mouths, sideRow } = eatBossPelletOnSideTunnelRow();
    const vertical = mouths.filter((mouth) => mouth.row !== sideRow);
    expect(vertical).toHaveLength(4);
    const picks = new Set(
      mouths.map((_, start) => pickFreeBossMouth(world, mouths, start)).filter((i) => i !== null),
    );
    expect(picks.size).toBe(4);
  });
});
