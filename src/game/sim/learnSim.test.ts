import { decoyTile } from "../../domain/chaff";
import { formatPennies } from "../../domain/pennies";
import { hasComponent, query, removeEntity } from "bitecs";
import { describe, expect, it } from "vitest";
import { CORNUCOPIA_SPAWN_DEBOUNCE_MS } from "../../domain/fruit";
import { ghostTeleportCell, scatterTargetForKind } from "../../domain/ghostCorner";
import { GHOST_KIND } from "../../domain/ghostKind";
import {
  TRINKET_IDS,
  TRINKET_MAX_COPIES,
  TRINKET_SLOWDOWN_CUT,
  TRINKET_SPEED_ADD,
  TRINKET_TUNNEL_SPEED_ADD,
  isTrinketId,
} from "../../domain/trinkets";
import {
  SPUNKY_AGGRO_TILES,
  WARDY_STRIKE_TILES,
  rimDistance,
  spunkyPostTarget,
} from "../../domain/ghostTarget";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import {
  canEnterDirection,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  ghostHouseSpawnCenter,
  hasLeftGhostHouse,
  horizontalTunnelRows,
  isWalkable,
  TILE_SIZE,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { boreSteps, tunnelBoringCells } from "../../domain/tunnelBoring";
import {
  TITHE_SPEED_MUL,
  INVULN_MS,
  NEAR_MISS_CHARGE,
  UPGRADE_DEFS,
  baseIdOf,
  isEnhancedId,
  isSpecialist,
  type BaseUpgradeId,
} from "../../domain/upgrades";
import { WARP_GLIDE_MS } from "../../domain/warpGlide";
import { WALL_DROP_MS, wallDropSpot, type CardinalStep } from "../../domain/wallDrop";
import { NO_KEYS_HELD } from "../systems/heldKeys";
import { Crumb } from "../components/Crumb";
import { Facing } from "../components/Facing";
import { Fruit } from "../components/Fruit";
import { DIRECTION, Input } from "../components/Input";
import { GhostPhase } from "../components/GhostPhase";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { PowerPellet } from "../components/PowerPellet";
import { worldSnapshot } from "../systems/worldSnapshot";
import { defaultPlayOptions } from "../../domain/playOptions";
import { LearnSim } from "./learnSim";
import { PlaySim } from "./playSim";
import type { SimEvent, SimRenderOptions } from "./simEvents";
import { FRAME_MS, held } from "./simTesting";

function learnCellSpeedsAfterToggle(id: BaseUpgradeId): {
  towardPellet: number;
  towardEmpty: number;
} {
  const sim = new LearnSim("learn");
  sim.start();
  const player = query(sim.world, [Player, Position])[0]!;
  const speedWhenMoving = (vx: number): number => {
    Velocity.x[player] = vx;
    Velocity.y[player] = 0;
    sim.step(NO_KEYS_HELD, FRAME_MS);
    return Speed.px[player]!;
  };
  const target = query(sim.world, [Pellet, Position])[0]!;
  const col = worldToCol(Position.x[target]!);
  const row = worldToRow(Position.y[target]!);
  for (const eid of query(sim.world, [Pellet, Position])) {
    if (eid !== target) {
      removeEntity(sim.world, eid);
    }
  }
  const place = () => {
    Position.x[player] = cellCenterX(col - 1);
    Position.y[player] = cellCenterY(row);
  };
  place();
  const base = speedWhenMoving(1);
  sim.toggleUpgrade(id);
  place();
  const towardPellet = speedWhenMoving(1) / base;
  place();
  const towardEmpty = speedWhenMoving(-1) / base;
  return { towardPellet, towardEmpty };
}

describe("LearnSim", () => {
  it("runs a chosen ghost and moves the player", () => {
    const sim = new LearnSim("learn");
    sim.start();
    sim.selectGhost(GHOST_KIND.inky);
    expect(sim.ghostEid).not.toBeNull();
    expect(sim.helperBlinkyEid).not.toBeNull();
    const player = query(sim.world, [Player, Position])[0]!;
    const startX = Position.x[player]!;
    for (let i = 0; i < 60; i += 1) {
      sim.step(held("right"), FRAME_MS);
    }
    expect(Position.x[player]!).toBeGreaterThan(startX);
    expect(worldSnapshot(sim.world).ghosts).toHaveLength(2);
  });

  it("Spunky holds its post until Maze-Man comes within the aggro radius", () => {
    const sim = new LearnSim("learn");
    sim.start();
    sim.selectGhost(GHOST_KIND.spunky);
    const ghost = sim.ghostEid!;
    const player = query(sim.world, [Player, Position])[0]!;
    const ghostTile = { col: worldToCol(Position.x[ghost]!), row: worldToRow(Position.y[ghost]!) };
    const playerTile = {
      col: worldToCol(Position.x[player]!),
      row: worldToRow(Position.y[player]!),
    };
    expect(
      Math.hypot(ghostTile.col - playerTile.col, ghostTile.row - playerTile.row),
    ).toBeGreaterThan(SPUNKY_AGGRO_TILES);
    expect(sim.overlayModel()!.target).toEqual(spunkyPostTarget());

    Position.x[player] = cellCenterX(ghostTile.col);
    Position.y[player] = cellCenterY(ghostTile.row + 2);
    const near = sim.overlayModel()!;
    expect(near.kind).toBe(GHOST_KIND.spunky);
    expect(near.target).toEqual({ col: ghostTile.col, row: ghostTile.row + 2 });
  });

  const STATIC_TARGET_KINDS = Object.entries(GHOST_KIND).filter(([name]) => name !== "inky");

  it.each(STATIC_TARGET_KINDS)(
    "the predicted path of %s is the route it then takes",
    (_name, kind) => {
      const sim = new LearnSim("learn");
      sim.start();
      sim.selectGhost(kind);
      const ghost = sim.ghostEid!;
      const predicted = sim.overlayModel()!.path.map((tile) => `${tile.col},${tile.row}`);
      expect(predicted.length).toBeGreaterThan(8);

      const walked: string[] = [];
      for (let i = 0; i < 60 * 60 && walked.length < predicted.length; i += 1) {
        sim.step(NO_KEYS_HELD, FRAME_MS);
        const tile = `${worldToCol(Position.x[ghost]!)},${worldToRow(Position.y[ghost]!)}`;
        if (tile !== walked.at(-1)) {
          walked.push(tile);
        }
      }
      expect(walked).toEqual(predicted);
    },
  );

  it("Spunky's prediction runs the long loop to its off-board post", () => {
    const sim = new LearnSim("learn");
    sim.start();
    sim.selectGhost(GHOST_KIND.spunky);
    const model = sim.overlayModel()!;
    expect(model.target).toEqual(spunkyPostTarget());
    expect(model.target.row).toBeLessThan(0);
    expect(model.path.length).toBeGreaterThan(20);
  });

  it("the Wardy waits on the rim ahead of Maze-Man, then strikes once he nears an edge", () => {
    const sim = new LearnSim("learn");
    sim.start();
    sim.selectGhost(GHOST_KIND.wardy);
    const player = query(sim.world, [Player, Position])[0]!;
    const { cols, rows } = getActiveLayout();
    const deep = { col: Math.floor(cols / 2), row: Math.floor(rows / 2) };
    expect(rimDistance(deep.col, deep.row)).toBeGreaterThan(WARDY_STRIKE_TILES);
    Position.x[player] = cellCenterX(deep.col);
    Position.y[player] = cellCenterY(deep.row);
    Facing.direction[player] = DIRECTION.right;
    expect(sim.overlayModel()!.target).toEqual({ col: cols - 1, row: deep.row });

    const near = { col: WARDY_STRIKE_TILES, row: deep.row };
    Position.x[player] = cellCenterX(near.col);
    expect(sim.overlayModel()!.target).toEqual(near);
  });

  it("greys the pellets Lazy Looper does not need, fewer kept with Plus, none once off", () => {
    const sim = new LearnSim("learn");
    sim.start();
    expect(worldSnapshot(sim.world).optionalPellets).toBe(0);
    sim.toggleUpgrade("passiveLazyLooper");
    const base = worldSnapshot(sim.world).optionalPellets;
    expect(base).toBeGreaterThan(0);
    sim.toggleEnhanced("passiveLazyLooper");
    expect(worldSnapshot(sim.world).optionalPellets).toBeGreaterThan(base);
    sim.toggleUpgrade("passiveLazyLooperPlus");
    expect(worldSnapshot(sim.world).optionalPellets).toBe(0);
  });

  it("Afterburner speeds the player up faster entering an empty cell and slower entering a pellet cell", () => {
    const { towardPellet, towardEmpty } = learnCellSpeedsAfterToggle("passiveAfterburner");
    expect(towardPellet).toBeCloseTo(0.8);
    expect(towardEmpty).toBeCloseTo(1.3);
  });

  it("Mole speeds the player up faster entering a pellet cell and slower entering an empty cell", () => {
    const { towardPellet, towardEmpty } = learnCellSpeedsAfterToggle("passiveMole");
    expect(towardPellet).toBeCloseTo(1.2);
    expect(towardEmpty).toBeCloseTo(0.9);
  });

  it("turns one pellet into a power pellet when Pellet Surge is toggled on", () => {
    const sim = new LearnSim("learn");
    sim.start();
    const before = worldSnapshot(sim.world);
    const events = sim.toggleUpgrade("passivePelletToPower");
    const after = worldSnapshot(sim.world);
    expect(after.powerPellets).toBe(before.powerPellets + 1);
    expect(after.pellets).toBe(before.pellets - 1);
    expect(events.some((event) => event.type === "bouncePowerPellet")).toBe(true);
  });

  it("releases the drawable of every pellet Dot-Man eats", () => {
    const sim = new LearnSim("release-learn");
    sim.start();
    const events: import("./simEvents").SimEvent[] = [];
    for (let i = 0; i < 60; i += 1) {
      events.push(...sim.step(held("left"), FRAME_MS));
    }
    expect(events.some((event) => event.type === "releaseDrawable")).toBe(true);
  });

  it("regenerates every power pellet once the last one is eaten", () => {
    const sim = new LearnSim("learn");
    sim.start();
    const power = query(sim.world, [PowerPellet, Position]);
    const total = power.length;
    expect(total).toBeGreaterThan(1);
    const player = query(sim.world, [Player, Position])[0]!;
    const positions = Array.from(power).map((eid) => ({
      x: Position.x[eid]!,
      y: Position.y[eid]!,
    }));
    for (const [i, at] of positions.entries()) {
      Position.x[player] = at.x;
      Position.y[player] = at.y;
      sim.step(NO_KEYS_HELD, FRAME_MS);
      const left = query(sim.world, [PowerPellet]).length;
      expect(left).toBe(total - 1 - i);
    }
    Position.x[player] = 0;
    Position.y[player] = 0;
    sim.step(NO_KEYS_HELD, FRAME_MS);
    expect(query(sim.world, [PowerPellet]).length).toBe(total);
    expect(query(sim.world, [Pellet]).length).toBeGreaterThan(total);
  });

  it("toggles an enhanced form on and off for a selected upgrade", () => {
    const sim = new LearnSim("learn");
    sim.start();
    expect(sim.toggleEnhanced("passiveGhostSlow")).toEqual([]);
    expect(sim.ownedUpgrades).toEqual([]);
    sim.toggleUpgrade("passiveGhostSlow");
    sim.toggleEnhanced("passiveGhostSlow");
    expect(sim.ownedUpgrades).toEqual(["passiveGhostSlowPlus"]);
    sim.toggleEnhanced("passiveGhostSlow");
    expect(sim.ownedUpgrades).toEqual(["passiveGhostSlow"]);
    sim.toggleEnhanced("passiveGhostSlow");
    sim.toggleUpgrade("passiveGhostSlow");
    expect(sim.ownedUpgrades).toEqual([]);
  });

  it("converts one more pellet when Pellet Surge is enhanced", () => {
    const sim = new LearnSim("learn");
    sim.start();
    sim.toggleUpgrade("passivePelletToPower");
    const before = worldSnapshot(sim.world).powerPellets;
    sim.toggleEnhanced("passivePelletToPower");
    expect(worldSnapshot(sim.world).powerPellets).toBe(before + 1);
  });

  it("removes an extra far pellet every five eaten when Remote Transference is on", () => {
    const pelletsAfterWalking = (upgraded: boolean): number => {
      const sim = new LearnSim("learn");
      sim.start();
      if (upgraded) {
        sim.toggleUpgrade("passiveRemoteTransference");
      }
      for (let i = 0; i < 90; i += 1) {
        sim.step(held("left"), FRAME_MS);
      }
      return worldSnapshot(sim.world).pellets;
    };
    expect(pelletsAfterWalking(true)).toBeLessThan(pelletsAfterWalking(false));
  });

  it("exposes the overlay model only while a visible ghost is selected", () => {
    const sim = new LearnSim("learn");
    sim.start();
    expect(sim.overlayModel()).toBeNull();
    sim.selectGhost(GHOST_KIND.inky);
    const model = sim.overlayModel()!;
    expect(model.kind).toBe(GHOST_KIND.inky);
    expect(model.blinkyPx).not.toBeNull();
    expect(model.playerPx).not.toBeNull();
    expect(Number.isFinite(model.target.col)).toBe(true);
  });

  it("Scatter Burst warps the chosen ghost to its corner with a glide", () => {
    const sim = new LearnSim("learn");
    sim.start();
    sim.selectGhost(GHOST_KIND.clyde);
    sim.toggleUpgrade("powerPelletScatterBurst");
    const ghost = sim.ghostEid!;
    const start = { x: Position.x[ghost]!, y: Position.y[ghost]! };
    const power = Array.from(query(sim.world, [PowerPellet, Position]))
      .map((eid) => ({ x: Position.x[eid]!, y: Position.y[eid]! }))
      .find((p) => p.y < start.y)!;
    const player = query(sim.world, [Player, Position])[0]!;
    Position.x[player] = power.x;
    Position.y[player] = power.y;
    const draw = sim
      .step(NO_KEYS_HELD, FRAME_MS)
      .flatMap((e) => (e.type === "draw" ? [e.options] : []))[0]!;
    const cell = ghostTeleportCell(scatterTargetForKind(GHOST_KIND.clyde), {
      col: worldToCol(power.x),
      row: worldToRow(power.y),
    });
    expect({ x: Position.x[ghost], y: Position.y[ghost] }).toEqual({
      x: cellCenterX(cell.col),
      y: cellCenterY(cell.row),
    });
    const head = draw.ghostWarpGlides?.[ghost]?.[0];
    expect(Math.hypot(head!.x - start.x, head!.y - start.y)).toBeLessThan(4);
    for (let ms = 0; ms < WARP_GLIDE_MS; ms += FRAME_MS) {
      sim.step(NO_KEYS_HELD, FRAME_MS);
    }
    const after = sim.step(NO_KEYS_HELD, FRAME_MS);
    expect(after.some((e) => e.type === "draw" && e.options.ghostWarpGlides)).toBe(false);
  });
});

describe("LearnSim Turn Tuning", () => {
  const tapUp = { ...NO_KEYS_HELD, right: 0, up: 1 };

  function findSideTurn(): { col: number; row: number } {
    const { playerSolids, cols, rows } = getActiveLayout();
    const open = (col: number, row: number, dx: number, dy: number) =>
      canEnterDirection(cellCenterX(col), cellCenterY(row), dx, dy, playerSolids);
    for (let row = 1; row < rows - 1; row += 1) {
      for (let col = 3; col < cols - 1; col += 1) {
        const straight = [3, 2, 1].every((back) => open(col - back, row, 1, 0));
        const sideless = [3, 2, 1].every(
          (back) => !open(col - back, row, 0, -1) && !open(col - back, row, 0, 1),
        );
        if (straight && sideless && open(col, row, 0, -1)) {
          return { col, row };
        }
      }
    }
    throw new Error("no side turn found");
  }

  function tapOnTheBeat(owned: boolean) {
    const sim = new LearnSim("learn");
    sim.start();
    if (owned) {
      sim.toggleUpgrade("passiveTurnTuning");
    }
    const turn = findSideTurn();
    const player = query(sim.world, [Player, Position])[0]!;
    Position.x[player] = cellCenterX(turn.col - 2);
    Position.y[player] = cellCenterY(turn.row);
    sim.step(held("right"), FRAME_MS);
    sim.step(held("right"), FRAME_MS);
    Position.x[player] = cellCenterX(turn.col) - 6;
    const events = sim.step(tapUp, FRAME_MS);
    for (let i = 0; i < 30; i += 1) {
      events.push(...sim.step({ ...NO_KEYS_HELD, right: 0, up: 1 }, FRAME_MS));
    }
    return { sim, events };
  }

  it("emits perfect sparks and a turn flash on a clean tap on the beat", () => {
    const { events } = tapOnTheBeat(true);
    const perfect = events.filter(
      (event) => event.type === "turnSparks" && event.kind === "perfect",
    );
    expect(perfect).toHaveLength(1);
    const flashes = events.flatMap((event) =>
      event.type === "draw" ? [event.options.turnFlashRemainingMs ?? 0] : [],
    );
    expect(Math.max(...flashes)).toBeGreaterThan(200);
  });

  it("does nothing on the same tap without Turn Tuning", () => {
    const { events } = tapOnTheBeat(false);
    expect(events.some((event) => event.type === "turnSparks")).toBe(false);
  });
});

describe("LearnSim upgrade demos", () => {
  function setup(...ids: Parameters<LearnSim["toggleUpgrade"]>[0][]) {
    const sim = new LearnSim("learn");
    sim.start();
    sim.selectGhost(GHOST_KIND.blinky);
    for (const id of ids) {
      sim.toggleUpgrade(id);
    }
    const player = query(sim.world, [Player, Position])[0]!;
    return { sim, player };
  }

  function moveTo(player: number, at: { x: number; y: number }): void {
    Position.x[player] = at.x;
    Position.y[player] = at.y;
  }

  function posOf(eid: number): { x: number; y: number } {
    return { x: Position.x[eid]!, y: Position.y[eid]! };
  }

  function popups(events: ReturnType<LearnSim["step"]>): string[] {
    return events.flatMap((event) => (event.type === "learnPopup" ? [event.text] : []));
  }

  function eatFruit(sim: LearnSim, player: number): ReturnType<LearnSim["step"]> {
    moveTo(player, posOf(query(sim.world, [Fruit, Position])[0]!));
    return sim.step(NO_KEYS_HELD, FRAME_MS);
  }

  function catchByGhost(sim: LearnSim, player: number): ReturnType<LearnSim["step"]> {
    const ghost = sim.ghostEid!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    moveTo(player, posOf(ghost));
    return sim.step(NO_KEYS_HELD, FRAME_MS);
  }

  function runUntilFreed(sim: LearnSim, ghost: number, ms: number): boolean {
    for (let t = 0; t < ms; t += FRAME_MS) {
      sim.step(NO_KEYS_HELD, FRAME_MS);
      if (GhostPhase.value[ghost] === GHOST_PHASE.active) {
        return true;
      }
    }
    return false;
  }

  function runMs(sim: LearnSim, ms: number): void {
    for (let t = 0; t < ms; t += FRAME_MS) {
      sim.step(NO_KEYS_HELD, FRAME_MS);
    }
  }

  it("Floating toggles on and off without disturbing play (LEARN has no lava or speed zones)", () => {
    const { sim, player } = setup();
    sim.step(NO_KEYS_HELD, FRAME_MS);
    const speed = Speed.px[player]!;
    for (const id of ["passiveFloating", "passiveFloatingPlus"] as const) {
      sim.toggleUpgrade(id);
      sim.step(NO_KEYS_HELD, FRAME_MS);
      expect(sim.ownedUpgrades).toContain(id);
      expect(Speed.px[player]).toBe(speed);
      sim.toggleUpgrade(id);
      expect(sim.ownedUpgrades).not.toContain(id);
    }
  });

  it("Near Miss earns pennies when the ghost touches", () => {
    const { sim, player } = setup("passiveNearMiss");
    const ghost = sim.ghostEid!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    const at = posOf(ghost);
    moveTo(player, { x: at.x + 0.5 * TILE_SIZE, y: at.y });
    expect(popups(sim.step(NO_KEYS_HELD, FRAME_MS))).toEqual([
      `+${formatPennies(NEAR_MISS_CHARGE)}`,
    ]);
    expect(sim.statusText()).toContain("PENNIES 1/24");
    expect(popups(sim.step(NO_KEYS_HELD, FRAME_MS))).toEqual([]);
  });

  it("does not pay a Near Miss that happened while the upgrade was off", () => {
    const { sim, player } = setup("passiveNearMiss");
    const ghost = sim.ghostEid!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    const at = posOf(ghost);
    sim.toggleUpgrade("passiveNearMiss");
    moveTo(player, { x: at.x + 0.5 * TILE_SIZE, y: at.y });
    expect(popups(sim.step(NO_KEYS_HELD, FRAME_MS))).toEqual([]);
    moveTo(player, { x: at.x, y: at.y + 200 });
    sim.toggleUpgrade("passiveNearMiss");
    expect(popups(sim.step(NO_KEYS_HELD, FRAME_MS))).toEqual([]);
  });

  it("Second Chomp brings an eaten power pellet back after ten seconds", () => {
    const { sim, player } = setup("passivePowerPelletRecharge");
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    const at = posOf(power);
    moveTo(player, at);
    sim.step(NO_KEYS_HELD, FRAME_MS);
    const count = () => query(sim.world, [PowerPellet]).length;
    const eaten = count();
    const fruit = getActiveLayout().fruitSpawn;
    moveTo(player, { x: cellCenterX(fruit.col), y: cellCenterY(fruit.row) });
    runMs(sim, 9_000);
    expect(count()).toBe(eaten);
    runMs(sim, 1_200);
    expect(count()).toBe(eaten + 1);
  });

  it("does not regenerate power pellets early while Second Chomp has them pending", () => {
    const { sim, player } = setup("passivePowerPelletRecharge");
    const total = query(sim.world, [PowerPellet]).length;
    const positions = Array.from(query(sim.world, [PowerPellet, Position])).map(posOf);
    for (const at of positions) {
      moveTo(player, at);
      sim.step(NO_KEYS_HELD, FRAME_MS);
    }
    const fruit = getActiveLayout().fruitSpawn;
    moveTo(player, { x: cellCenterX(fruit.col), y: cellCenterY(fruit.row) });
    expect(query(sim.world, [PowerPellet]).length).toBe(0);
    runMs(sim, 9_000);
    expect(query(sim.world, [PowerPellet]).length).toBe(0);
    runMs(sim, 1_500);
    expect(query(sim.world, [PowerPellet]).length).toBe(total);
  });

  it("Defy Death tints Maze-Man while armed by a power pellet", () => {
    const { sim, player } = setup("passiveDefyDeath");
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    const draw = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw")!;
    expect(draw.type === "draw" && draw.options.playerInvulnRemainingMs).toBeGreaterThan(4_000);
  });

  it("Tunnel Sanctuary tints Maze-Man for a second after a tunnel wrap", () => {
    const { sim, player } = setup("passiveTunnelSanctuary");
    moveTo(player, { x: cellCenterX(0), y: cellCenterY(horizontalTunnelRows()[0]!) });
    let tint = 0;
    for (let i = 0; i < 120 && tint === 0; i += 1) {
      const draw = sim.step(held("left"), FRAME_MS).find((event) => event.type === "draw");
      tint = draw?.type === "draw" ? (draw.options.playerInvulnRemainingMs ?? 0) : 0;
    }
    expect(tint).toBeGreaterThan(900);
    expect(tint).toBeLessThanOrEqual(1_000);
  });

  it("Quarter Bounty pays a Quarter per fruit and shows it", () => {
    const { sim, player } = setup("fruitQuarterBounty");
    expect(popups(eatFruit(sim, player))).toEqual(["+1 Q"]);
    expect(sim.statusText()).toContain("QUARTERS 1");
  });

  it("fruit pays bonus charge without Quarter Bounty", () => {
    const { sim, player } = setup("passiveDeathsBounty");
    expect(popups(eatFruit(sim, player))).toEqual(["+12 PENNIES"]);
    expect(sim.statusText()).toContain("PENNIES 12/24");
  });

  it("a ghost touch stays harmless without a death-side upgrade", () => {
    const { sim, player } = setup();
    expect(popups(catchByGhost(sim, player))).toEqual([]);
    expect(sim.statusText()).toBe("");
  });

  it("Extra Life shows an extra life and a catch costs one", () => {
    const { sim, player } = setup("passiveExtraLife");
    expect(sim.statusText()).toContain("LIVES 5");
    expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST"]);
    expect(sim.statusText()).toContain("LIVES 4");
    expect(popups(catchByGhost(sim, player))).toEqual([]);
    sim.toggleUpgrade("passiveExtraLife");
    expect(sim.statusText()).toBe("");
  });

  it("Death's Harvest clears nearby pellets on a catch", () => {
    const { sim, player } = setup("passiveDeathsHarvest");
    const before = query(sim.world, [Pellet]).length;
    expect(popups(catchByGhost(sim, player))[0]).toMatch(/^HARVEST [1-9]/);
    expect(query(sim.world, [Pellet]).length).toBeLessThan(before);
  });

  it("Death's Bounty earns pennies with decaying payouts", () => {
    const { sim, player } = setup("passiveDeathsBounty");
    expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST\n+24 PENNIES"]);
    expect(sim.statusText()).toContain("QUARTERS 1");
    runMs(sim, 1_600);
    expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST\n+19.2 PENNIES"]);
  });

  it("an armed Defy Death saves the life and is consumed", () => {
    const { sim, player } = setup("passiveDefyDeath");
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    sim.step(NO_KEYS_HELD, FRAME_MS);
    expect(popups(catchByGhost(sim, player))).toEqual(["SAVED"]);
    expect(sim.statusText()).toContain("LIVES 4");
    runMs(sim, 1_600);
    expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST"]);
  });

  it("Defy Death scatters the catching ghost off the player tile on a save", () => {
    const { sim, player } = setup("passiveDefyDeath");
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    sim.step(NO_KEYS_HELD, FRAME_MS);
    const ghost = sim.ghostEid!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    moveTo(player, posOf(ghost));
    const playerCell = {
      col: worldToCol(Position.x[player]!),
      row: worldToRow(Position.y[player]!),
    };
    const expected = ghostTeleportCell(scatterTargetForKind(GHOST_KIND.blinky), playerCell);
    expect(popups(sim.step(NO_KEYS_HELD, FRAME_MS))).toEqual(["SAVED"]);
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.active);
    expect({ x: Position.x[ghost], y: Position.y[ghost] }).toEqual({
      x: cellCenterX(expected.col),
      y: cellCenterY(expected.row),
    });
  });

  it("Defy Death + Haunting cages the killer instead of scattering it", () => {
    const { sim, player } = setup("passiveDefyDeath", "passiveHaunting");
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    sim.step(NO_KEYS_HELD, FRAME_MS);
    const ghost = sim.ghostEid!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    moveTo(player, posOf(ghost));
    expect(popups(sim.step(NO_KEYS_HELD, FRAME_MS))).toEqual(["SAVED\nHAUNTED"]);
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.inHouse);
    expect({ x: Position.x[ghost]!, y: Position.y[ghost]! }).toEqual(ghostHouseSpawnCenter());
    const draw = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw")!;
    expect(draw.type === "draw" && draw.options.hauntedGhost?.eid).toBe(ghost);
  });

  it("an armed Defy Death saves the life before a shield is spent", () => {
    const { sim, player } = setup("passiveShieldPellets", "passiveDefyDeath");
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    sim.step(NO_KEYS_HELD, FRAME_MS);
    expect(sim["learnUpgrades"].shieldsBanked).toBe(1);
    expect(popups(catchByGhost(sim, player))).toEqual(["SAVED"]);
    expect(sim["learnUpgrades"].shieldsBanked).toBe(1);
    runMs(sim, 1_600);
    expect(popups(catchByGhost(sim, player))).toEqual([]);
    expect(sim["learnUpgrades"].shieldsBanked).toBe(0);
  });

  it("Shield fires pickup effects and banks a shield; its break fires nothing", () => {
    const { sim, player } = setup("passiveShieldPellets", "powerPelletInvuln");
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    const draw = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw")!;
    expect(draw.type === "draw" && draw.options.playerInvulnRemainingMs).toBeGreaterThan(0);
    expect(sim["learnUpgrades"].shieldsBanked).toBe(1);
    runMs(sim, INVULN_MS + 100);
    expect(popups(catchByGhost(sim, player))).toEqual([]);
    expect(sim["learnUpgrades"].shieldsBanked).toBe(0);
    const after = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw")!;
    expect(after.type === "draw" && after.options.playerInvulnRemainingMs).toBe(0);
    const hops = after.type === "draw" ? after.options.spriteOffsets : undefined;
    expect(hops?.[player]?.y).toBeLessThan(0);
    expect(hops?.[sim.ghostEid!]?.y).toBeLessThan(0);
  });

  it("Reactive Armor sends the contacting ghost home when a shield breaks", () => {
    const { sim, player } = setup("passiveShieldPellets", "passiveReactiveArmor");
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    sim.step(NO_KEYS_HELD, FRAME_MS);
    expect(sim["learnUpgrades"].shieldsBanked).toBe(1);
    const ghost = sim.ghostEid!;
    expect(popups(catchByGhost(sim, player))).toEqual([]);
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.inHouse);
    expect(sim["learnUpgrades"].shieldsBanked).toBe(0);
  });

  it("Reactive Armor releases the house ghost on the house timer without another keypress", () => {
    const { sim, player } = setup("passiveShieldPellets", "passiveReactiveArmor");
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    sim.step(NO_KEYS_HELD, FRAME_MS);
    const ghost = sim.ghostEid!;
    catchByGhost(sim, player);
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.inHouse);
    let released = false;
    for (let t = 0; t < 5_000 && !released; t += FRAME_MS) {
      sim.step(NO_KEYS_HELD, FRAME_MS);
      released = GhostPhase.value[ghost] !== GHOST_PHASE.inHouse;
    }
    expect(released).toBe(true);
  });

  it("Shield Break+ fires pickup effects when the bank is full", () => {
    const { sim, player } = setup(
      "passiveShieldPellets",
      "passiveShieldBreakPlus",
      "powerPelletInvuln",
    );
    const [first, second] = query(sim.world, [PowerPellet, Position]);
    moveTo(player, posOf(first!));
    sim.step(NO_KEYS_HELD, FRAME_MS);
    expect(sim["learnUpgrades"].shieldsBanked).toBe(1);
    moveTo(player, posOf(second!));
    const draw = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw")!;
    expect(draw.type === "draw" && draw.options.playerInvulnRemainingMs).toBeGreaterThan(0);
  });

  it("Shield Break fires on a Starting Shield break", () => {
    const { sim, player } = setup(
      "passiveStartingShield",
      "passiveShieldBreak",
      "powerPelletInvuln",
    );
    expect(popups(catchByGhost(sim, player))).toEqual([]);
    const draw = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw")!;
    expect(draw.type === "draw" && draw.options.playerInvulnRemainingMs).toBeGreaterThan(1000);
  });

  it("Shield Break holds pickup effects until a catch breaks the shield", () => {
    const { sim, player } = setup(
      "passiveShieldPellets",
      "passiveShieldBreak",
      "powerPelletInvuln",
    );
    expect(sim["learnUpgrades"].shieldsBanked).toBe(0);
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    const draw = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw")!;
    expect(draw.type === "draw" && draw.options.playerInvulnRemainingMs).toBe(0);
    expect(sim["learnUpgrades"].shieldsBanked).toBe(1);
    expect(popups(catchByGhost(sim, player))).toEqual([]);
    expect(sim["learnUpgrades"].shieldsBanked).toBe(0);
    expect(sim.statusText()).toContain("LIVES 4");
    runMs(sim, INVULN_MS + 100);
    expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST"]);
  });

  it("Shield drops shields over the cap when toggled down or off", () => {
    const { sim, player } = setup("passiveShieldPellets");
    sim.toggleEnhanced("passiveShieldPellets");
    for (const power of [...query(sim.world, [PowerPellet, Position])]) {
      moveTo(player, posOf(power));
      sim.step(NO_KEYS_HELD, FRAME_MS);
    }
    expect(sim["learnUpgrades"].shieldsBanked).toBe(3);
    sim.toggleEnhanced("passiveShieldPellets");
    expect(sim["learnUpgrades"].shieldsBanked).toBe(1);
    sim.toggleUpgrade("passiveShieldPellets");
    sim.toggleUpgrade("passiveExtraLife");
    expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST"]);
  });

  it("Starting Shield gives a shield now and after a board refill, and breaks on a catch", () => {
    const { sim, player } = setup("passiveStartingShieldPlus");
    expect(sim["learnUpgrades"].shieldsBanked).toBe(2);
    expect(popups(catchByGhost(sim, player))).toEqual([]);
    expect(sim["learnUpgrades"].shieldsBanked).toBe(1);
    sim.toggleEnhanced("passiveStartingShield");
    expect(sim["learnUpgrades"].shieldsBanked).toBe(1);
    sim.toggleUpgrade("passiveStartingShield");
    expect(sim["learnUpgrades"].shieldsBanked).toBe(0);
    expect(sim.statusText()).not.toContain("SHIELDS");
  });

  it("Money Talks pays Quarters to save the last life", () => {
    const { sim, player } = setup("passiveMoneyTalksPlus");
    eatFruit(sim, player);
    runMs(sim, 1_100);
    eatFruit(sim, player);
    expect(sim.statusText()).toContain("QUARTERS 1");
    catchByGhost(sim, player);
    runMs(sim, 1_600);
    expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST"]);
    runMs(sim, 1_600);
    expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST"]);
    runMs(sim, 1_600);
    expect(popups(catchByGhost(sim, player))).toEqual(["SAVED\n-1 Q"]);
    expect(sim.statusText()).toContain("LIVES 1");
    expect(sim.statusText()).toContain("QUARTERS 0");
    runMs(sim, 1_600);
    expect(popups(catchByGhost(sim, player))).toEqual(["LIVES RESET"]);
  });

  it("Haunting cages the ghost that caught Maze-Man for 10 seconds, even when enhanced", () => {
    for (const id of ["passiveHaunting", "passiveHauntingPlus"] as const) {
      const { sim, player } = setup(id);
      const ghost = sim.ghostEid!;
      expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST\nHAUNTED"]);
      expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.inHouse);
      expect({ x: Position.x[ghost]!, y: Position.y[ghost]! }).toEqual(ghostHouseSpawnCenter());
      const draw = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw")!;
      expect(draw.type === "draw" && draw.options.hauntedGhost?.eid).toBe(ghost);
      moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
      runMs(sim, 9_500);
      expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.inHouse);
      const freed = runUntilFreed(sim, ghost, 600);
      expect(freed).toBe(true);
    }
  });

  function chompPower(sim: LearnSim, player: number): ReturnType<LearnSim["step"]> {
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    return sim.step(NO_KEYS_HELD, FRAME_MS);
  }

  it("Hunter frightens the ghost; eating it pays pennies and seats it in the house briefly", () => {
    const { sim, player } = setup("powerPelletHunter");
    const ghost = sim.ghostEid!;
    const draw = chompPower(sim, player).find((event) => event.type === "draw")!;
    expect(draw.type === "draw" && draw.options.frightenedGhosts?.eids).toEqual([ghost]);
    expect(popups(catchByGhost(sim, player))).toEqual(["+6 PENNIES"]);
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.inHouse);
    const spawn = ghostHouseSpawnCenter();
    const exit = getActiveLayout().ghostHouseExit;
    expect({ x: Position.x[ghost], y: Position.y[ghost] }).toEqual(spawn);
    expect({ x: Position.x[ghost], y: Position.y[ghost] }).not.toEqual({
      x: cellCenterX(exit.col),
      y: cellCenterY(exit.row),
    });
    runMs(sim, 1_500 - FRAME_MS);
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.inHouse);
    expect({ x: Position.x[ghost], y: Position.y[ghost] }).toEqual(spawn);
    sim.step(NO_KEYS_HELD, FRAME_MS);
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.leaving);
    expect(hasLeftGhostHouse(worldToCol(Position.x[ghost]!), worldToRow(Position.y[ghost]!))).toBe(
      false,
    );
    expect(runUntilFreed(sim, ghost, 2_000)).toBe(true);
    expect(hasLeftGhostHouse(worldToCol(Position.x[ghost]!), worldToRow(Position.y[ghost]!))).toBe(
      true,
    );
  });

  it("Hunter+ keeps the eaten ghost seated in the house until the fright ends", () => {
    const { sim, player } = setup("powerPelletHunterPlus");
    const ghost = sim.ghostEid!;
    chompPower(sim, player);
    catchByGhost(sim, player);
    const spawn = ghostHouseSpawnCenter();
    expect({ x: Position.x[ghost], y: Position.y[ghost] }).toEqual(spawn);
    runMs(sim, 5_500);
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.inHouse);
    expect({ x: Position.x[ghost], y: Position.y[ghost] }).toEqual(spawn);
    let leftSeat = false;
    for (let t = 0; t < 1_000; t += FRAME_MS) {
      sim.step(NO_KEYS_HELD, FRAME_MS);
      if (GhostPhase.value[ghost] === GHOST_PHASE.leaving) {
        expect(
          hasLeftGhostHouse(worldToCol(Position.x[ghost]!), worldToRow(Position.y[ghost]!)),
        ).toBe(false);
        leftSeat = true;
        break;
      }
    }
    expect(leftSeat).toBe(true);
    expect(runUntilFreed(sim, ghost, 2_000)).toBe(true);
  });

  it("toggling Hunter+ back to Hunter lets a held ghost out", () => {
    const { sim, player } = setup("powerPelletHunterPlus");
    const ghost = sim.ghostEid!;
    chompPower(sim, player);
    catchByGhost(sim, player);
    sim.toggleEnhanced("powerPelletHunter");
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.leaving);
  });

  it("toggling Haunting off lets the caged ghost out", () => {
    const { sim, player } = setup("passiveHaunting");
    const ghost = sim.ghostEid!;
    catchByGhost(sim, player);
    sim.toggleUpgrade("passiveHaunting");
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.active);
  });

  describe("Banana Trail", () => {
    it("banks a peel on power pellet and slips when a ghost touches it", () => {
      const { sim, player } = setup("passiveBananaShield");
      chompPower(sim, player);
      expect(sim["learnUpgrades"].peelsBanked).toBe(1);
      const draw = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw");
      expect(draw?.type === "draw" && draw.options.peels).toHaveLength(1);
      const peel = draw && draw.type === "draw" ? draw.options.peels![0]! : null;
      expect(peel).not.toBeNull();
      const ghost = sim.ghostEid!;
      GhostPhase.value[ghost] = GHOST_PHASE.active;
      Position.x[ghost] = peel!.x;
      Position.y[ghost] = peel!.y;
      const events = sim.step(NO_KEYS_HELD, FRAME_MS);
      expect(sim["learnUpgrades"].peelsBanked).toBe(0);
      expect(events.some((event) => event.type === "peelCrack")).toBe(true);
      expect(popups(events)).toEqual([]);
      expect(sim["shieldBounce"].player).toBeNull();
      expect(sim["shieldBounce"].ghosts.length).toBeGreaterThan(0);
      Facing.direction[player] = DIRECTION.right;
      Input.direction[player] = DIRECTION.right;
      sim.step({ ...NO_KEYS_HELD, left: 1 }, FRAME_MS);
      expect(Input.direction[player]).toBe(DIRECTION.left);
    });

    it("toggling the upgrade off clears banked peels", () => {
      const { sim, player } = setup("passiveBananaShieldPlus");
      chompPower(sim, player);
      expect(sim["learnUpgrades"].peelsBanked).toBe(1);
      sim.toggleUpgrade("passiveBananaShield");
      expect(sim["learnUpgrades"].peelsBanked).toBe(0);
    });
  });

  describe("Chaff", () => {
    it("a power pellet drops a decoy and the sim bursts it when time runs out", () => {
      const { sim, player } = setup("powerPelletChaff");
      moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
      const draw = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw")!;
      expect(draw.type === "draw" && draw.options.chaff).toHaveLength(1);
      const burst: unknown[] = [];
      for (let frame = 0; frame < 400 && sim["learnUpgrades"].chaff !== null; frame += 1) {
        burst.push(...sim.step(NO_KEYS_HELD, FRAME_MS).filter((e) => e.type === "chaffBurst"));
      }
      expect(sim["learnUpgrades"].chaff).toBeNull();
      expect(burst).toHaveLength(1);
    });

    it("the overlay target and player marker follow the decoy, then return to Maze-Man", () => {
      const { sim, player } = setup("powerPelletChaff");
      moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
      sim.step(NO_KEYS_HELD, FRAME_MS);
      const decoy = sim["learnUpgrades"].chaff!.decoys[0]!;
      const model = sim.overlayModel()!;
      expect(model.target).toEqual(decoyTile(decoy));
      expect(model.playerTile).toMatchObject(decoyTile(decoy));
      expect(model.playerPx).not.toEqual(posOf(player));
      sim["learnUpgrades"] = { ...sim["learnUpgrades"], chaff: null };
      expect(sim.overlayModel()!.playerTile).toMatchObject({
        col: worldToCol(Position.x[player]!),
        row: worldToRow(Position.y[player]!),
      });
    });

    it("toggling the upgrade off clears a live decoy", () => {
      const { sim, player } = setup("powerPelletChaff");
      moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
      sim.step(NO_KEYS_HELD, FRAME_MS);
      expect(sim["learnUpgrades"].chaff).not.toBeNull();
      sim.toggleUpgrade("powerPelletChaff");
      expect(sim["learnUpgrades"].chaff).toBeNull();
    });
  });

  describe("Wall Drop", () => {
    const RIGHT: CardinalStep = { dx: 1, dy: 0 };
    const LEFT: CardinalStep = { dx: -1, dy: 0 };

    function corridor(): { col: number; row: number } {
      const layout = getActiveLayout();
      for (let row = 1; row < layout.rows - 1; row += 1) {
        for (let col = 1; col + 5 < layout.cols - 1; col += 1) {
          const open = [0, 1, 2, 3, 4, 5].every((d) =>
            canEnterDirection(cellCenterX(col + d), cellCenterY(row), 1, 0),
          );
          if (
            open &&
            wallDropSpot(col + 2, row, RIGHT, LEFT) !== null &&
            wallDropSpot(col + 3, row, RIGHT, LEFT) !== null
          ) {
            return { col, row };
          }
        }
      }
      throw new Error("no straight corridor");
    }

    function reverse(sim: LearnSim, player: number): { col: number; row: number } {
      const { col, row } = corridor();
      moveTo(player, { x: cellCenterX(col), y: cellCenterY(row) });
      Facing.direction[player] = DIRECTION.right;
      for (let frame = 0; frame < 60 && worldToCol(Position.x[player]!) < col + 3; frame += 1) {
        sim.step(held("right"), FRAME_MS);
      }
      sim.step(held("left"), FRAME_MS);
      return { col: worldToCol(Position.x[player]!), row };
    }

    function drawnWall(sim: LearnSim) {
      const draw = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw")!;
      return draw.type === "draw" ? draw.options.droppedWall : undefined;
    }

    it("a power pellet arms a wall that the next reversal drops, blocking Maze-Man for 8s", () => {
      const { sim, player } = setup("powerPelletWallDrop");
      chompPower(sim, player);
      expect(sim["learnUpgrades"].wallDropArmed).toBe(true);
      const cell = reverse(sim, player);
      expect(drawnWall(sim)).toMatchObject({ ...cell, passable: false });
      for (let frame = 0; frame < 30 && worldToCol(Position.x[player]!) >= cell.col; frame += 1) {
        sim.step(held("left"), FRAME_MS);
      }
      for (let frame = 0; frame < 60; frame += 1) {
        sim.step(held("right"), FRAME_MS);
      }
      expect(worldToCol(Position.x[player]!)).toBe(cell.col - 1);
      runMs(sim, WALL_DROP_MS);
      expect(drawnWall(sim)).toBeNull();
    });

    it("Plus: the wall stays and walking through removes it", () => {
      const { sim, player } = setup("powerPelletWallDrop");
      sim.toggleEnhanced("powerPelletWallDrop");
      chompPower(sim, player);
      const cell = reverse(sim, player);
      runMs(sim, WALL_DROP_MS + 1000);
      expect(drawnWall(sim)).toMatchObject({ ...cell, passable: true });
      moveTo(player, { x: cellCenterX(cell.col - 1), y: cellCenterY(cell.row) });
      for (let frame = 0; frame < 60 && sim["learnUpgrades"].droppedWall !== null; frame += 1) {
        sim.step(held("right"), FRAME_MS);
      }
      expect(sim["learnUpgrades"].droppedWall).toBeNull();
    });

    it("does nothing without the upgrade, and toggling it off clears the wall", () => {
      const plain = setup();
      chompPower(plain.sim, plain.player);
      reverse(plain.sim, plain.player);
      expect(drawnWall(plain.sim)).toBeNull();

      const { sim, player } = setup("powerPelletWallDrop");
      chompPower(sim, player);
      reverse(sim, player);
      expect(drawnWall(sim)).not.toBeNull();
      sim.toggleUpgrade("powerPelletWallDrop");
      expect(drawnWall(sim)).toBeNull();
      expect(sim["learnUpgrades"].wallDropArmed).toBe(false);
    });
  });

  describe("Mirror", () => {
    function centerX(): number {
      const layout = getActiveLayout();
      return layout.offsetX + layout.pixelWidth / 2;
    }

    function parkGhost(sim: LearnSim): void {
      GhostPhase.value[sim.ghostEid!] = GHOST_PHASE.inHouse;
    }

    function twinOf(sim: LearnSim) {
      return lastDrawOptions(sim.step(NO_KEYS_HELD, FRAME_MS)).mirror;
    }

    function ghostOnTwin(sim: LearnSim): void {
      const twin = twinOf(sim)!;
      const ghost = sim.ghostEid!;
      GhostPhase.value[ghost] = GHOST_PHASE.active;
      moveTo(ghost, { x: twin.x, y: twin.y });
    }

    it("a power pellet adds a twin that mirrors Maze-Man across the middle", () => {
      const { sim, player } = setup("powerPelletMirror");
      parkGhost(sim);
      expect(twinOf(sim)).toBeNull();
      chompPower(sim, player);
      const twin = twinOf(sim)!;
      expect(twin.x).toBeCloseTo(2 * centerX() - Position.x[player]!);
      expect(twin.y).toBeCloseTo(Position.y[player]!);
    });

    it("does nothing without the upgrade", () => {
      const { sim, player } = setup();
      parkGhost(sim);
      chompPower(sim, player);
      expect(twinOf(sim)).toBeNull();
    });

    it("the twin eats pellets it stands on", () => {
      const { sim, player } = setup("powerPelletMirror");
      parkGhost(sim);
      chompPower(sim, player);
      const target = query(sim.world, [Pellet, Position]).find(
        (eid) =>
          !hasComponent(sim.world, eid, PowerPellet) &&
          Position.x[eid]! < centerX() - 2 * TILE_SIZE,
      )!;
      moveTo(player, { x: 2 * centerX() - Position.x[target]!, y: Position.y[target]! });
      sim.step(NO_KEYS_HELD, FRAME_MS);
      expect(query(sim.world, [Pellet]).includes(target)).toBe(false);
    });

    it("pops when Maze-Man touches the twin at the middle", () => {
      const { sim, player } = setup("powerPelletMirror");
      parkGhost(sim);
      chompPower(sim, player);
      moveTo(player, { x: centerX() + 1, y: Position.y[player]! });
      const options = lastDrawOptions(sim.step(NO_KEYS_HELD, FRAME_MS));
      expect(sim["learnUpgrades"].mirrorActive).toBe(false);
      expect(options.mirror).toBeNull();
      expect(options.mirrorPop).not.toBeNull();
    });

    it("pops when Maze-Man wraps through a horizontal tunnel", () => {
      const { sim, player } = setup("powerPelletMirror");
      parkGhost(sim);
      chompPower(sim, player);
      moveTo(player, { x: cellCenterX(0), y: cellCenterY(horizontalTunnelRows()[0]!) });
      for (let i = 0; i < 120 && sim["learnUpgrades"].mirrorActive; i += 1) {
        sim.step(held("left"), FRAME_MS);
      }
      expect(sim["learnUpgrades"].mirrorActive).toBe(false);
      expect(sim["mirrorPop"]).not.toBeNull();
    });

    it("trails mirrored banana peels behind the twin", () => {
      const { sim, player } = setup("powerPelletMirror", "passiveBananaShield");
      parkGhost(sim);
      chompPower(sim, player);
      const draw = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw");
      const peels = draw?.type === "draw" ? draw.options.peels! : [];
      expect(peels).toHaveLength(2);
      expect(peels[1]!.x).toBeCloseTo(2 * centerX() - peels[0]!.x);
      expect(peels[1]!.y).toBeCloseTo(peels[0]!.y);
    });

    it("a ghost catching the twin is a death, and it ends the twin", () => {
      const { sim, player } = setup("powerPelletMirror");
      chompPower(sim, player);
      ghostOnTwin(sim);
      const events = sim.step(NO_KEYS_HELD, FRAME_MS);
      expect(popups(events).join(" ")).toContain("LIFE LOST");
      expect(sim["learnUpgrades"].mirrorActive).toBe(false);
    });

    it("Plus: a ghost catching the twin only pops it", () => {
      const { sim, player } = setup("powerPelletMirrorPlus");
      chompPower(sim, player);
      ghostOnTwin(sim);
      const events = sim.step(NO_KEYS_HELD, FRAME_MS);
      expect(popups(events)).toEqual(["TWIN POPPED"]);
      const options = lastDrawOptions(events);
      expect(options.mirror).toBeNull();
      expect(options.mirrorPop).not.toBeNull();
      expect(options.playerInvulnRemainingMs).toBe(0);
    });

    it("Plus: a ghost catching Maze-Man pops the twin and grants a moment of safety", () => {
      const { sim, player } = setup("powerPelletMirrorPlus");
      chompPower(sim, player);
      const events = catchByGhost(sim, player);
      expect(popups(events)).toEqual(["TWIN POPPED"]);
      expect(sim["learnUpgrades"].mirrorActive).toBe(false);
      expect(lastDrawOptions(events).playerInvulnRemainingMs).toBeGreaterThan(0);
    });

    it("pops when the mirrored cell is a wall and Maze-Man's is not", () => {
      const { sim, player } = setup("powerPelletMirror");
      parkGhost(sim);
      chompPower(sim, player);
      const col = worldToCol(Position.x[player]!);
      const row = worldToRow(Position.y[player]!);
      sim["learnUpgrades"] = {
        ...sim["learnUpgrades"],
        droppedWall: {
          col: getActiveLayout().cols - 1 - col,
          row,
          remainingMs: 5000,
          passable: false,
          awayStep: { dx: 1, dy: 0 },
          vacated: true,
        },
      };
      const options = lastDrawOptions(sim.step(NO_KEYS_HELD, FRAME_MS));
      expect(options.mirror).toBeNull();
      expect(options.mirrorPop).not.toBeNull();
    });

    function mirror(col: number): number {
      return getActiveLayout().cols - 1 - col;
    }

    function regularPelletAt(sim: LearnSim, col: number, row: number): number | undefined {
      return query(sim.world, [Pellet, Position]).find(
        (eid) =>
          !hasComponent(sim.world, eid, PowerPellet) &&
          worldToCol(Position.x[eid]!) === col &&
          worldToRow(Position.y[eid]!) === row,
      );
    }

    it("eats along the mirrored path at hyperspeed", () => {
      const { sim, player } = setup("powerPelletMirror", "powerPelletHyperspeed");
      parkGhost(sim);
      chompPower(sim, player);
      const startCol = 10;
      moveTo(player, { x: cellCenterX(startCol), y: cellCenterY(1) });
      Facing.direction[player] = DIRECTION.right;
      for (let frame = 0; frame < 10; frame += 1) {
        sim.step(held("right"), FRAME_MS);
      }
      const endCol = worldToCol(Position.x[player]!);
      expect(endCol - startCol).toBeGreaterThan(5);
      const span = Array.from({ length: endCol - startCol + 1 }, (_, i) => mirror(startCol + i));
      expect(span.filter((col) => regularPelletAt(sim, col, 1) !== undefined)).toEqual([]);
    });

    it("gets Pickup Range", () => {
      const reaches = (extra: BaseUpgradeId[]): boolean => {
        const { sim, player } = setup("powerPelletMirror", ...extra);
        parkGhost(sim);
        chompPower(sim, player);
        const own = regularPelletAt(sim, 11, 1);
        if (own !== undefined) {
          removeEntity(sim.world, own);
        }
        const neighbor = regularPelletAt(sim, 12, 1)!;
        moveTo(player, { x: cellCenterX(mirror(11)), y: cellCenterY(1) });
        sim.step(NO_KEYS_HELD, FRAME_MS);
        return !query(sim.world, [Pellet]).includes(neighbor);
      };
      expect(reaches([])).toBe(false);
      expect(reaches(["passivePickupRange"])).toBe(true);
    });

    it("gets Extra Hungry", () => {
      const eaten = (ids: BaseUpgradeId[]): number => {
        const { sim, player } = setup(...ids);
        parkGhost(sim);
        const before = query(sim.world, [Pellet]).length;
        chompPower(sim, player);
        return before - query(sim.world, [Pellet]).length;
      };
      expect(
        eaten(["powerPelletExtraHungry", "powerPelletMirror"]) - eaten(["powerPelletExtraHungry"]),
      ).toBe(8);
    });

    it("toggling it off removes the twin", () => {
      const { sim, player } = setup("powerPelletMirror");
      parkGhost(sim);
      chompPower(sim, player);
      expect(twinOf(sim)).not.toBeNull();
      sim.toggleUpgrade("powerPelletMirror");
      expect(twinOf(sim)).toBeNull();
    });

    it("the ghost's target overlay follows the nearer body", () => {
      const { sim, player } = setup("powerPelletMirror");
      chompPower(sim, player);
      const ghost = sim.ghostEid!;
      const twin = twinOf(sim)!;
      GhostPhase.value[ghost] = GHOST_PHASE.active;
      moveTo(ghost, { x: twin.x - 2 * TILE_SIZE, y: twin.y });
      expect(sim.overlayModel()!.playerPx).toMatchObject({ x: twin.x, y: twin.y });
    });
  });

  describe("Programmer", () => {
    const STEP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;
    let pressClock = 1;

    function press(sim: LearnSim, dir: keyof typeof STEP): ReturnType<LearnSim["step"]> {
      pressClock += 1;
      return sim.step({ ...NO_KEYS_HELD, [dir]: pressClock }, FRAME_MS);
    }

    function queueDirs(events: ReturnType<LearnSim["step"]>) {
      const draw = events.find((event) => event.type === "draw")!;
      return draw.type === "draw" ? draw.options.programmerQueue?.map((slot) => slot.dir) : null;
    }

    function chompAndOpenDir(
      sim: LearnSim,
      player: number,
      holdDuringChomp = false,
    ): keyof typeof STEP {
      const at = posOf(query(sim.world, [PowerPellet, Position])[0]!);
      // Prefer horizontal so the program stays on one corridor; mazeSmall also
      // stacks powers vertically in the same column.
      const dir = (["right", "left", "up", "down"] as const).find((key) =>
        canEnterDirection(at.x, at.y, STEP[key][0], STEP[key][1]),
      )!;
      moveTo(player, at);
      sim.step(holdDuringChomp ? held(dir) : NO_KEYS_HELD, FRAME_MS);
      // Clear only powers ahead on this corridor. Leave at least one elsewhere
      // so LearnSim's empty-board power regen does not refill the path.
      const row = worldToRow(at.y);
      const col = worldToCol(at.x);
      const horizontal = dir === "left" || dir === "right";
      for (const eid of query(sim.world, [PowerPellet, Position])) {
        const pc = worldToCol(Position.x[eid]!);
        const pr = worldToRow(Position.y[eid]!);
        if (horizontal ? pr === row : pc === col) {
          removeEntity(sim.world, eid);
        }
      }
      return dir;
    }

    it("stops Maze-Man on a power pellet and shows the presses as they are entered", () => {
      const { sim, player } = setup("powerPelletProgrammer");
      const dir = chompAndOpenDir(sim, player, true);
      const stoppedAt = posOf(player);
      for (let frame = 0; frame < 20; frame += 1) {
        sim.step(held(dir), FRAME_MS);
      }
      expect(posOf(player)).toEqual(stoppedAt);
      press(sim, dir);
      const events = press(sim, dir);
      expect(queueDirs(events)).toEqual([dir, dir, null, null, null]);
      expect(posOf(player)).toEqual(stoppedAt);
      const draw = events.find((event) => event.type === "draw")!;
      const path = draw.type === "draw" ? draw.options.programmerPath : null;
      expect(path?.[0]?.dir).toBe(dir);
      expect(path?.[0]?.y).toBe(stoppedAt.y);
      expect(path?.[0]?.x).not.toBe(stoppedAt.x);
      expect(path?.at(-1)?.latest).toBe(true);
    });

    it("runs the program at 10x speed, then hands control back", () => {
      const plain = setup();
      plain.sim.step(held("left"), FRAME_MS);
      const plainSpeed = Speed.px[plain.player]!;

      const { sim, player } = setup("powerPelletProgrammer");
      const dir = chompAndOpenDir(sim, player);
      for (let i = 0; i < 4; i += 1) {
        press(sim, dir);
      }
      const before = posOf(player);
      press(sim, dir);
      const moved = Math.hypot(posOf(player).x - before.x, posOf(player).y - before.y);
      expect(moved).toBeGreaterThan((plainSpeed * 5 * FRAME_MS) / 1000);
      for (let frame = 0; frame < 240 && sim["learnUpgrades"].programmer !== null; frame += 1) {
        sim.step(NO_KEYS_HELD, FRAME_MS);
      }
      expect(sim["learnUpgrades"].programmer).toBeNull();
      sim.step(held("left"), FRAME_MS);
      expect(Speed.px[player]!).toBeCloseTo(plainSpeed);
    });

    it("Plus: stops again for a second set", () => {
      const { sim, player } = setup("powerPelletProgrammer");
      sim.toggleEnhanced("powerPelletProgrammer");
      const dir = chompAndOpenDir(sim, player);
      for (let i = 0; i < 5; i += 1) {
        press(sim, dir);
      }
      for (
        let frame = 0;
        frame < 240 && sim["learnUpgrades"].programmer?.phase !== "recording";
        frame += 1
      ) {
        sim.step(NO_KEYS_HELD, FRAME_MS);
      }
      expect(sim["learnUpgrades"].programmer).toEqual({
        phase: "recording",
        presses: [],
        setsLeft: 0,
      });
      const stoppedAt = posOf(player);
      for (let frame = 0; frame < 20; frame += 1) {
        sim.step(held(dir), FRAME_MS);
      }
      expect(posOf(player)).toEqual(stoppedAt);
    });

    it("does nothing without the upgrade, and toggling it off frees Maze-Man", () => {
      const plain = setup();
      chompPower(plain.sim, plain.player);
      expect(plain.sim["learnUpgrades"].programmer).toBeNull();

      const { sim, player } = setup("powerPelletProgrammer");
      chompPower(sim, player);
      expect(sim["learnUpgrades"].programmer).not.toBeNull();
      sim.toggleUpgrade("powerPelletProgrammer");
      expect(sim["learnUpgrades"].programmer).toBeNull();
      const draw = sim.step(held("left"), FRAME_MS).find((event) => event.type === "draw")!;
      expect(draw.type === "draw" && draw.options.programmerQueue).toBeNull();
    });
  });

  describe("Hyperspeed", () => {
    function chomp(sim: LearnSim, player: number): void {
      moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
      sim.step(NO_KEYS_HELD, FRAME_MS);
    }

    function speedAfterChomp(...ids: Parameters<LearnSim["toggleUpgrade"]>[0][]): number {
      const { sim, player } = setup(...ids);
      chomp(sim, player);
      sim.step(held("left"), FRAME_MS);
      return Speed.px[player]!;
    }

    it("runs at 10x speed for 2s after a power pellet", () => {
      const plain = speedAfterChomp();
      const hyper = speedAfterChomp("powerPelletHyperspeed");
      expect(hyper).toBeCloseTo(plain * 10);
      const { sim, player } = setup("powerPelletHyperspeed");
      chomp(sim, player);
      expect(sim["learnUpgrades"].hyperspeedRemainingMs).toBeGreaterThan(1900);
      runMs(sim, 2100);
      expect(sim["learnUpgrades"].hyperspeedRemainingMs).toBe(0);
    });

    it("Hyperspeed+ arms 3s and a shield that absorbs the first catch", () => {
      const { sim, player } = setup("powerPelletHyperspeed");
      sim.toggleEnhanced("powerPelletHyperspeed");
      chomp(sim, player);
      expect(sim["learnUpgrades"].hyperspeedRemainingMs).toBeGreaterThan(2900);
      expect(sim["learnUpgrades"].hyperspeedShieldRemainingMs).toBeGreaterThan(1900);
      expect(popups(catchByGhost(sim, player))).toEqual([]);
      expect(sim["learnUpgrades"].hyperspeedShieldRemainingMs).toBe(0);
      expect(sim["learnUpgrades"].invulnRemainingMs).toBeGreaterThan(0);
    });

    it("holds movement for 200ms after a turn", () => {
      const { sim, player } = setup("powerPelletHyperspeed");
      const spawn = posOf(player);
      chomp(sim, player);
      moveTo(player, spawn);
      sim.step(held("right"), FRAME_MS);
      sim.step(held("left"), FRAME_MS);
      expect(sim["learnUpgrades"].hyperspeedTurnDelayMs).toBeGreaterThan(150);
      const x = Position.x[player]!;
      sim.step(held("left"), FRAME_MS);
      expect(Position.x[player]).toBe(x);
    });

    it("arms turn catch grace on a perpendicular turn and skips the demo catch", () => {
      const { sim, player } = setup("passiveDeathsHarvest");
      const { playerSolids, cols, rows } = getActiveLayout();
      const open = (col: number, row: number, dx: number, dy: number) =>
        canEnterDirection(cellCenterX(col), cellCenterY(row), dx, dy, playerSolids);
      let turn: { col: number; row: number } | null = null;
      for (let row = 1; row < rows - 1 && turn === null; row += 1) {
        for (let col = 3; col < cols - 1; col += 1) {
          const straight = [3, 2, 1].every((back) => open(col - back, row, 1, 0));
          const sideless = [3, 2, 1].every(
            (back) => !open(col - back, row, 0, -1) && !open(col - back, row, 0, 1),
          );
          if (straight && sideless && open(col, row, 0, -1)) {
            turn = { col, row };
            break;
          }
        }
      }
      expect(turn).not.toBeNull();
      moveTo(player, { x: cellCenterX(turn!.col) - 3, y: cellCenterY(turn!.row) });
      Facing.direction[player] = DIRECTION.right;
      Input.direction[player] = DIRECTION.right;
      sim.step(held("up"), FRAME_MS);
      expect(Facing.direction[player]).toBe(DIRECTION.up);
      expect(sim["turnCatchGraceMs"]).toBeGreaterThan(0);
      expect(popups(catchByGhost(sim, player))).toEqual([]);
    });

    it("drops the timers when the upgrade is toggled off", () => {
      const { sim, player } = setup("powerPelletHyperspeed");
      chomp(sim, player);
      sim.toggleUpgrade("powerPelletHyperspeed");
      expect(sim["learnUpgrades"].hyperspeedRemainingMs).toBe(0);
    });
  });

  describe("Echo", () => {
    function invulnAfterChompAndEcho(...ids: Parameters<LearnSim["toggleUpgrade"]>[0][]): number {
      const { sim, player } = setup(...ids);
      moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
      sim.step(NO_KEYS_HELD, FRAME_MS);
      runMs(sim, INVULN_MS + 100);
      const draws = sim.step(NO_KEYS_HELD, FRAME_MS).filter((event) => event.type === "draw");
      const last = draws[draws.length - 1]!;
      return last.type === "draw" ? last.options.playerInvulnRemainingMs : 0;
    }

    it("fires the power-pellet effect again 3s later", () => {
      expect(invulnAfterChompAndEcho("passiveEcho", "powerPelletInvuln")).toBeGreaterThan(0);
    });

    it("lets the effect expire without the upgrade", () => {
      expect(invulnAfterChompAndEcho("powerPelletInvuln")).toBe(0);
    });
  });

  describe("Streak Engine", () => {
    function eatPellets(sim: LearnSim, player: number, count: number) {
      const events: ReturnType<LearnSim["step"]> = [];
      for (let eaten = 0; eaten < count; eaten += 1) {
        const pellet = query(sim.world, [Pellet, Position]).find(
          (eid) => !query(sim.world, [PowerPellet]).includes(eid),
        )!;
        moveTo(player, posOf(pellet));
        events.push(...sim.step(NO_KEYS_HELD, FRAME_MS));
      }
      return events;
    }

    function invulnMs(events: ReturnType<LearnSim["step"]>): number {
      const draws = events.filter((event) => event.type === "draw");
      const last = draws[draws.length - 1]!;
      return last.type === "draw" ? last.options.playerInvulnRemainingMs : 0;
    }

    it("fires the power-pellet effects on the 30th pellet and pops 5 through 30", () => {
      const { sim, player } = setup("passiveStreakEngine", "powerPelletInvuln");
      const early = eatPellets(sim, player, 29);
      expect(invulnMs(early)).toBe(0);
      const last = eatPellets(sim, player, 1);
      expect(invulnMs(last)).toBeGreaterThan(0);
      const pops = [...early, ...last].flatMap((event) =>
        event.type === "streakPop" ? [event.value] : [],
      );
      expect(pops).toEqual([5, 10, 15, 20, 25, 30]);
    });

    it("does nothing without the upgrade", () => {
      const { sim, player } = setup("powerPelletInvuln");
      const events = eatPellets(sim, player, 30);
      expect(invulnMs(events)).toBe(0);
      expect(events.some((event) => event.type === "streakPop")).toBe(false);
    });

    it("grants Ghost Proof when enhanced", () => {
      const { sim, player } = setup("passiveStreakEngine");
      sim.toggleEnhanced("passiveStreakEngine");
      expect(invulnMs(eatPellets(sim, player, 30))).toBeGreaterThan(0);
    });
  });

  describe("Tithe", () => {
    function pelletSpeed(sim: LearnSim, player: number): number {
      sim.step(NO_KEYS_HELD, FRAME_MS);
      return Speed.px[player]!;
    }

    function chompPower(sim: LearnSim, player: number): void {
      const power = query(sim.world, [PowerPellet, Position])[0]!;
      moveTo(player, posOf(power));
      sim.step(NO_KEYS_HELD, FRAME_MS);
    }

    it("slows Maze-Man to 0.9x after a power pellet and restores speed on toggle off", () => {
      const { sim, player } = setup("powerPelletTithe");
      const base = pelletSpeed(sim, player);
      chompPower(sim, player);
      expect(pelletSpeed(sim, player)).toBeCloseTo(base * TITHE_SPEED_MUL);
      sim.toggleUpgrade("powerPelletTithe");
      expect(pelletSpeed(sim, player)).toBeCloseTo(base);
    });

    it("counts pellets twice toward the Streak Engine while active", () => {
      const { sim, player } = setup("powerPelletTithe", "passiveStreakEngine");
      chompPower(sim, player);
      const events: ReturnType<LearnSim["step"]> = [];
      for (let eaten = 0; eaten < 15; eaten += 1) {
        const pellet = query(sim.world, [Pellet, Position]).find(
          (eid) => !query(sim.world, [PowerPellet]).includes(eid),
        )!;
        moveTo(player, posOf(pellet));
        events.push(...sim.step(NO_KEYS_HELD, FRAME_MS));
      }
      const pops = events.flatMap((event) => (event.type === "streakPop" ? [event.value] : []));
      expect(pops).toEqual([5, 10, 15, 20, 25, 30]);
    });
  });

  describe("Gleaning", () => {
    it("lets a ghost crumb on a cleared tile feed the Streak Engine", () => {
      const { sim, player } = setup("passiveGleaning", "passiveStreakEngine");
      sim.toggleEnhanced("passiveStreakEngine");
      const pellets = query(sim.world, [Pellet, Position]).filter(
        (eid) => !query(sim.world, [PowerPellet]).includes(eid),
      );
      const cleared = posOf(pellets[0]!);
      const events: ReturnType<LearnSim["step"]> = [];
      for (const pellet of pellets.slice(0, 29)) {
        moveTo(player, posOf(pellet));
        events.push(...sim.step(NO_KEYS_HELD, FRAME_MS));
      }
      const ghost = query(sim.world, [GhostPhase, Position])[0]!;
      Position.x[ghost] = cleared.x;
      Position.y[ghost] = cleared.y;
      GhostPhase.value[ghost] = GHOST_PHASE.active;
      const last = sim.step(NO_KEYS_HELD, FRAME_MS);
      const draws = last.filter((event) => event.type === "draw");
      const final = draws[draws.length - 1]!;
      expect(final.type === "draw" ? final.options.playerInvulnRemainingMs : 0).toBeGreaterThan(0);
      expect(query(sim.world, [Crumb, Position])).toHaveLength(1);
    });
  });

  it("Myogenesis regains one life when the board refills, without a popup", () => {
    const { sim, player } = setup("passiveMyogenesis");
    catchByGhost(sim, player);
    runMs(sim, 1_600);
    catchByGhost(sim, player);
    expect(sim.statusText()).toContain("LIVES 2");
    for (const eid of query(sim.world, [Pellet])) {
      removeEntity(sim.world, eid);
    }
    expect(popups(sim.step(NO_KEYS_HELD, FRAME_MS))).toEqual([]);
    expect(sim.statusText()).toContain("LIVES 3");
  });

  it.each([
    ["passiveInheritance", []],
    ["passiveInheritancePlus", ["+1 Q"]],
  ] as const)("%s pays on board refill for a saved death", (id, payout) => {
    const { sim, player } = setup(id, "passiveDefyDeath");
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    sim.step(NO_KEYS_HELD, FRAME_MS);
    expect(popups(catchByGhost(sim, player))).toEqual(["SAVED"]);
    for (const eid of query(sim.world, [Pellet])) {
      removeEntity(sim.world, eid);
    }
    expect(popups(sim.step(NO_KEYS_HELD, FRAME_MS))).toEqual(payout);
  });

  it("Inheritance pays a Quarter per empty life slot when the board refills", () => {
    const { sim, player } = setup("passiveInheritance");
    catchByGhost(sim, player);
    runMs(sim, 1_600);
    catchByGhost(sim, player);
    runMs(sim, 1_600);
    for (const eid of query(sim.world, [Pellet])) {
      removeEntity(sim.world, eid);
    }
    expect(popups(sim.step(NO_KEYS_HELD, FRAME_MS))).toEqual(["+2 Q"]);
  });

  it("Fruit Fecundity runs a timed fruit that lasts twice as long", () => {
    const { sim } = setup("fruitFecundity");
    expect(query(sim.world, [Fruit]).length).toBe(0);
    expect(sim.statusText()).toContain("NEXT FRUIT AT 70 PELLETS");
    (sim as unknown as { boardCollected: number }).boardCollected = 70;
    sim.step(NO_KEYS_HELD, FRAME_MS);
    expect(query(sim.world, [Fruit]).length).toBe(1);
    expect(sim.statusText()).toContain("FRUIT LEAVES IN 20.0S");
    runMs(sim, 20_500);
    expect(query(sim.world, [Fruit]).length).toBe(0);
    sim.toggleUpgrade("fruitFecundity");
    expect(query(sim.world, [Fruit]).length).toBe(1);
  });

  describe("Cornucopia", () => {
    const fruitCount = (sim: LearnSim): number => query(sim.world, [Fruit]).length;

    const settle = (sim: LearnSim): void => {
      (sim as unknown as { msSinceFruitSpawn: number }).msSinceFruitSpawn = Infinity;
    };

    function eatPower(sim: LearnSim, player: number): void {
      moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
      sim.step(NO_KEYS_HELD, FRAME_MS);
      moveTo(player, { x: 0, y: 0 });
    }

    it("spawns a fruit on a power pellet when the board has none", () => {
      const { sim, player } = setup("powerPelletCornucopia");
      for (const eid of query(sim.world, [Fruit])) {
        removeEntity(sim.world, eid);
      }
      settle(sim);
      eatPower(sim, player);
      expect(fruitCount(sim)).toBe(1);
    });

    it("debounces a power pellet eaten right after a fruit spawned", () => {
      const { sim, player } = setup("powerPelletCornucopiaPlus");
      const before = fruitCount(sim);
      eatPower(sim, player);
      expect(fruitCount(sim)).toBe(before);
      runMs(sim, CORNUCOPIA_SPAWN_DEBOUNCE_MS + 100);
      expect(fruitCount(sim)).toBe(before + 1);
    });

    it("does nothing while a fruit is out, but Plus always spawns one", () => {
      const base = setup("powerPelletCornucopia");
      const before = fruitCount(base.sim);
      eatPower(base.sim, base.player);
      expect(fruitCount(base.sim)).toBe(before);

      const plus = setup("powerPelletCornucopiaPlus");
      settle(plus.sim);
      eatPower(plus.sim, plus.player);
      settle(plus.sim);
      eatPower(plus.sim, plus.player);
      expect(fruitCount(plus.sim)).toBe(before + 2);
    });

    it("the last power pellet spawns one fruit, not two, when the board regenerates under the player", () => {
      const { sim, player } = setup("powerPelletCornucopiaPlus");
      let before = fruitCount(sim);
      for (let eaten = 1; eaten <= 4; eaten += 1) {
        settle(sim);
        moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
        sim.step(NO_KEYS_HELD, FRAME_MS);
        sim.step(NO_KEYS_HELD, FRAME_MS);
        expect(fruitCount(sim)).toBe(before + 1);
        before += 1;
      }
      expect(query(sim.world, [PowerPellet]).length).toBe(0);
      moveTo(player, { x: 0, y: 0 });
      sim.step(NO_KEYS_HELD, FRAME_MS);
      expect(query(sim.world, [PowerPellet]).length).toBe(4);
    });

    it("Pickup Range widens how far the regeneration waits for Maze-Man to step away", () => {
      const { sim, player } = setup("powerPelletCornucopiaPlus", "passivePickupRange");
      for (let eaten = 0; eaten < 4; eaten += 1) {
        moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
        sim.step(NO_KEYS_HELD, FRAME_MS);
      }
      const last = posOf(player);
      moveTo(player, { x: last.x + 1.5 * getActiveLayout().tileSize, y: last.y });
      sim.step(NO_KEYS_HELD, FRAME_MS);
      expect(query(sim.world, [PowerPellet]).length).toBe(0);
    });

    it("does nothing without the upgrade", () => {
      const { sim, player } = setup();
      for (const eid of query(sim.world, [Fruit])) {
        removeEntity(sim.world, eid);
      }
      eatPower(sim, player);
      expect(fruitCount(sim)).toBe(0);
    });

    it("eating its fruit leaves the always-present fruit and its respawn alone", () => {
      const { sim, player } = setup("powerPelletCornucopiaPlus");
      settle(sim);
      eatPower(sim, player);
      expect(fruitCount(sim)).toBe(2);
      const [cornucopia] = (
        sim as unknown as { cornucopiaFruit: Map<number, number> }
      ).cornucopiaFruit.keys();
      const regular = posOf(query(sim.world, [Fruit]).find((eid) => eid !== cornucopia)!);
      const at = posOf(cornucopia!);
      moveTo(player, { x: at.x + (at.x - regular.x) * 0.45, y: at.y });
      sim.step(NO_KEYS_HELD, FRAME_MS);
      expect(fruitCount(sim)).toBe(1);
      runMs(sim, 5_000);
      expect(fruitCount(sim)).toBe(1);
    });

    it("spawns on a scheduled-fruit board and swallows the scheduled fruit while out", () => {
      const { sim, player } = setup("powerPelletCornucopia");
      sim.toggleUpgrade("fruitFeast");
      expect(fruitCount(sim)).toBe(0);
      settle(sim);
      eatPower(sim, player);
      expect(fruitCount(sim)).toBe(1);
      (sim as unknown as { boardCollected: number }).boardCollected = 60;
      runMs(sim, 6_000);
      expect(fruitCount(sim)).toBe(1);
    });
  });

  it("scheduled fruit loops: a fruit at the threshold restarts the pellet count from zero", () => {
    const { sim } = setup("fruitFeast");
    const board = sim as unknown as { boardCollected: number };
    board.boardCollected = 85;
    runMs(sim, 100);
    expect(query(sim.world, [Fruit]).length).toBe(1);
    expect(board.boardCollected).toBe(0);
    runMs(sim, 10_500);
    expect(query(sim.world, [Fruit]).length).toBe(0);
    expect(sim.statusText()).toContain("NEXT FRUIT AT 60 PELLETS (0)");
    runMs(sim, 5_000);
    board.boardCollected = 60;
    runMs(sim, 100);
    expect(query(sim.world, [Fruit]).length).toBe(1);
  });

  it("Fruit Fecundity also loops after its fruit expires", () => {
    const { sim } = setup("fruitFecundity");
    const board = sim as unknown as { boardCollected: number };
    board.boardCollected = 70;
    runMs(sim, 100);
    expect(query(sim.world, [Fruit]).length).toBe(1);
    expect(board.boardCollected).toBe(0);
    runMs(sim, 20_500);
    expect(query(sim.world, [Fruit]).length).toBe(0);
    expect(sim.statusText()).toContain("NEXT FRUIT AT 70 PELLETS (0)");
    board.boardCollected = 70;
    runMs(sim, 100);
    expect(query(sim.world, [Fruit]).length).toBe(1);
  });

  it("a Cornucopia fruit expires, so it cannot hold scheduled fruit back forever", () => {
    const { sim, player } = setup("fruitFeast", "powerPelletCornucopia");
    (sim as unknown as { msSinceFruitSpawn: number }).msSinceFruitSpawn = Infinity;
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    sim.step(NO_KEYS_HELD, FRAME_MS);
    moveTo(player, { x: 0, y: 0 });
    expect(query(sim.world, [Fruit]).length).toBe(1);
    const board = sim as unknown as { boardCollected: number };
    board.boardCollected = 85;
    runMs(sim, 5_000);
    expect(board.boardCollected).toBe(85);
    runMs(sim, 6_000);
    expect(board.boardCollected).toBe(0);
    expect(query(sim.world, [Fruit]).length).toBe(1);
  });

  describe("power pellet effects", () => {
    function chomp(sim: LearnSim, player: number): ReturnType<LearnSim["step"]> {
      moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
      return sim.step(NO_KEYS_HELD, FRAME_MS);
    }

    const state = (sim: LearnSim) => sim["learnUpgrades"];

    function wallPassMsAfterChomp(...ids: Parameters<LearnSim["toggleUpgrade"]>[0][]): number {
      const { sim, player } = setup(...ids);
      chomp(sim, player);
      return state(sim).wallPassRemainingMs;
    }

    it("Freeze locks the nearest ghost", () => {
      const { sim, player } = setup("powerPelletFreeze");
      chomp(sim, player);
      expect(state(sim).freezeRemainingMs).toBeGreaterThan(0);
      expect(state(sim).frozenGhostEid).toBe(sim.ghostEid);
    });

    it("Warp Farthest flings Maze-Man away from the pellet", () => {
      const { sim, player } = setup("powerPelletWarpFarthest");
      chomp(sim, player);
      expect(sim["warpGlide"]).not.toBeNull();
    });

    it("Extra Hungry eats far pellets, more with Plus", () => {
      const eaten = (...ids: Parameters<LearnSim["toggleUpgrade"]>[0][]): number => {
        const { sim, player } = setup(...ids);
        const before = query(sim.world, [Pellet]).length;
        chomp(sim, player);
        return before - query(sim.world, [Pellet]).length;
      };
      const plain = eaten();
      expect(eaten("powerPelletExtraHungry")).toBe(plain + 8);
      expect(eaten("powerPelletExtraHungryPlus")).toBe(plain + 14);
    });

    it("Wall Pass, Speed Burst and Ghost Harvester arm their timers", () => {
      const { sim, player } = setup(
        "powerPelletWallPass",
        "powerPelletSpeedBurst",
        "powerPelletGhostHarvester",
      );
      chomp(sim, player);
      expect(state(sim).wallPassRemainingMs).toBeGreaterThan(0);
      expect(state(sim).speedBurstRemainingMs).toBeGreaterThan(0);
      expect(state(sim).ghostHarvestRemainingMs).toBeGreaterThan(0);
    });

    it("Fruit Power fires one random power effect; Plus fires all", () => {
      const base = setup("fruitPowerPellet", "powerPelletSpeedBurst", "powerPelletInvuln");
      eatFruit(base.sim, base.player);
      const baseState = state(base.sim);
      expect(
        Number(baseState.speedBurstRemainingMs > 0) + Number(baseState.invulnRemainingMs > 0),
      ).toBe(1);

      const plus = setup("fruitPowerPelletPlus", "powerPelletSpeedBurst", "powerPelletInvuln");
      eatFruit(plus.sim, plus.player);
      expect(state(plus.sim).speedBurstRemainingMs).toBeGreaterThan(0);
      expect(state(plus.sim).invulnRemainingMs).toBeGreaterThan(0);
    });

    it("Overcharge lengthens the other power pellet timers", () => {
      const plain = wallPassMsAfterChomp("powerPelletWallPass");
      const charged = wallPassMsAfterChomp("powerPelletWallPass", "passiveOvercharge");
      expect(charged).toBeGreaterThan(plain);
    });

    describe("Ghost Recall", () => {
      const inHouse = (eid: number): boolean => GhostPhase.value[eid] === GHOST_PHASE.inHouse;

      it("seats the nearest ghost in the house, then releases it by the house rules", () => {
        const { sim, player } = setup("powerPelletGhostRecall");
        const ghost = sim.ghostEid!;
        const exit = getActiveLayout().ghostHouseExit;
        chomp(sim, player);
        expect(inHouse(ghost)).toBe(true);
        expect(worldToRow(Position.y[ghost]!)).toBeGreaterThan(exit.row);
        let released = false;
        for (let t = 0; t < 5_000 && !released; t += FRAME_MS) {
          sim.step(NO_KEYS_HELD, FRAME_MS);
          released = !inHouse(ghost);
        }
        expect(released).toBe(true);
      });

      it("Plus recalls the two nearest ghosts", () => {
        const recalled = (id: "powerPelletGhostRecall" | "powerPelletGhostRecallPlus"): number => {
          const sim = new LearnSim("learn");
          sim.start();
          sim.selectGhost(GHOST_KIND.inky);
          sim.toggleUpgrade(id);
          const player = query(sim.world, [Player, Position])[0]!;
          chomp(sim, player);
          return [sim.ghostEid!, sim.helperBlinkyEid!].filter(inHouse).length;
        };
        expect(recalled("powerPelletGhostRecall")).toBe(1);
        expect(recalled("powerPelletGhostRecallPlus")).toBe(2);
      });
    });
  });

  describe("fruit and life Plus forms", () => {
    const board = (sim: LearnSim) => sim as unknown as { boardCollected: number };

    it("Hyperspeed eats fruit it passes through", () => {
      const { sim, player } = setup("powerPelletHyperspeed", "fruitQuarterBounty");
      const fruit = posOf(query(sim.world, [Fruit, Position])[0]!);
      moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
      sim.step(NO_KEYS_HELD, FRAME_MS);
      moveTo(player, { x: fruit.x - 2 * TILE_SIZE, y: fruit.y });
      const events = sim.step(held("right"), 200);
      expect(Position.x[player]!).toBeGreaterThan(fruit.x + TILE_SIZE);
      expect(popups(events)).toEqual(["+1 Q"]);
      expect(sim.statusText()).toContain("QUARTERS 1");
    });

    it("Fecundity+ keeps fruit and stacks the next one beside it", () => {
      const fruitCount = (id: "fruitFecundity" | "fruitFecundityPlus"): number => {
        const { sim } = setup(id);
        for (let spawn = 0; spawn < 2; spawn += 1) {
          board(sim).boardCollected = 70;
          runMs(sim, 100);
        }
        return query(sim.world, [Fruit]).length;
      };
      expect(fruitCount("fruitFecundity")).toBe(1);
      expect(fruitCount("fruitFecundityPlus")).toBe(2);
    });

    it("Feast+ schedules its first fruit earlier", () => {
      const { sim } = setup("fruitFeastPlus");
      expect(sim.statusText()).toContain("NEXT FRUIT AT 45 PELLETS");
    });

    it("Quarter Bounty+ pays two Quarters per fruit", () => {
      const { sim, player } = setup("fruitQuarterBountyPlus");
      expect(popups(eatFruit(sim, player))).toEqual(["+2 Q"]);
      expect(sim.statusText()).toContain("QUARTERS 2");
    });

    const refill = (sim: LearnSim): void => {
      for (const eid of query(sim.world, [Pellet])) {
        removeEntity(sim.world, eid);
      }
      sim.step(NO_KEYS_HELD, FRAME_MS);
    };

    it("Extra Life+ grants two lives", () => {
      const { sim, player } = setup("passiveExtraLifePlus");
      expect(sim.statusText()).toContain("LIVES 6");
      catchByGhost(sim, player);
      expect(sim.statusText()).toContain("LIVES 5");
    });

    it("Extra Life+ raises the Myogenesis+ refill floor", () => {
      const livesAfterRefill = (id: "passiveExtraLife" | "passiveExtraLifePlus"): string => {
        const { sim, player } = setup(id, "passiveMyogenesisPlus");
        for (let caught = 0; caught < 3; caught += 1) {
          catchByGhost(sim, player);
          runMs(sim, 1_600);
        }
        refill(sim);
        return sim.statusText();
      };
      expect(livesAfterRefill("passiveExtraLife")).toContain("LIVES 5");
      expect(livesAfterRefill("passiveExtraLifePlus")).toContain("LIVES 6");
    });

    it("Myogenesis+ refills every empty life on a board refill", () => {
      const { sim, player } = setup("passiveMyogenesisPlus");
      catchByGhost(sim, player);
      runMs(sim, 1_600);
      catchByGhost(sim, player);
      runMs(sim, 1_600);
      expect(sim.statusText()).toContain("LIVES 2");
      refill(sim);
      expect(sim.statusText()).toContain("LIVES 4");
    });
  });

  describe("sound", () => {
    const sfx = (events: SimEvent[]) =>
      events.filter((event) => event.type === "pelletSfx" || event.type === "sfx");

    it("chewing a pellet emits a pellet sound, a power pellet the power munch", () => {
      const { sim, player } = setup();
      const pellet = query(sim.world, [Pellet, Position]).find(
        (eid) => !query(sim.world, [PowerPellet]).includes(eid),
      )!;
      moveTo(player, posOf(pellet));
      const chewed = sfx(sim.step(NO_KEYS_HELD, FRAME_MS));
      expect(chewed).toContainEqual({
        type: "pelletSfx",
        previousCollected: 0,
        removed: 1,
        powerRemoved: 0,
      });
      moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
      expect(sfx(sim.step(NO_KEYS_HELD, FRAME_MS))).toContainEqual({
        type: "pelletSfx",
        previousCollected: 1,
        removed: 1,
        powerRemoved: 1,
      });
    });

    it("eating fruit emits the munch sounds", () => {
      const { sim, player } = setup();
      expect(sfx(eatFruit(sim, player))).toEqual([
        { type: "sfx", id: "pelletMunch" },
        { type: "sfx", id: "pelletMunch2" },
      ]);
    });
  });

  it("Fruit Feast schedules three fruit on the Feast thresholds", () => {
    const { sim } = setup("fruitFeast");
    expect(sim.statusText()).toContain("NEXT FRUIT AT 60 PELLETS");
  });

  it("copies of a Trinket step between 1 and the cap, and toggling off clears them all", () => {
    const { sim, player } = setup("lowSpeed");
    expect(sim.upgradeCopies("lowSpeed")).toBe(1);
    sim.adjustUpgradeCopies("lowSpeed", -1);
    expect(sim.upgradeCopies("lowSpeed")).toBe(1);
    sim.adjustUpgradeCopies("lowSpeed", 2);
    expect(sim.upgradeCopies("lowSpeed")).toBe(3);
    sim.step(NO_KEYS_HELD, FRAME_MS);
    expect(Speed.px[player]! / setupSpeed()).toBeCloseTo(1 + 3 * TRINKET_SPEED_ADD);
    sim.adjustUpgradeCopies("lowSpeed", 100);
    expect(sim.upgradeCopies("lowSpeed")).toBe(TRINKET_MAX_COPIES);
    sim.toggleUpgrade("lowSpeed");
    expect(sim.ownedUpgrades).toEqual([]);
    sim.adjustUpgradeCopies("lowSpeed", 1);
    expect(sim.upgradeCopies("lowSpeed")).toBe(0);
  });

  function setupSpeed(): number {
    const { sim, player } = setup();
    sim.step(NO_KEYS_HELD, FRAME_MS);
    return Speed.px[player]!;
  }

  it("Speed speeds Maze-Man up", () => {
    const speed = (...ids: Parameters<LearnSim["toggleUpgrade"]>[0][]): number => {
      const { sim, player } = setup(...ids);
      sim.step(NO_KEYS_HELD, FRAME_MS);
      return Speed.px[player]!;
    };
    expect(speed("lowSpeed") / speed()).toBeCloseTo(1 + TRINKET_SPEED_ADD);
  });

  it("Tunnel Speed speeds Maze-Man up only inside a tunnel", () => {
    const speedAt = (
      col: number,
      row: number,
      ...ids: Parameters<LearnSim["toggleUpgrade"]>[0][]
    ) => {
      const { sim, player } = setup(...ids);
      moveTo(player, { x: cellCenterX(col), y: cellCenterY(row) });
      sim.step(NO_KEYS_HELD, FRAME_MS);
      return Speed.px[player]!;
    };
    const row = horizontalTunnelRows()[0]!;
    expect(speedAt(0, row, "lowTunnelSpeed") / speedAt(0, row)).toBeCloseTo(
      1 + TRINKET_TUNNEL_SPEED_ADD,
    );
    expect(speedAt(13, 11, "lowTunnelSpeed")).toBeCloseTo(speedAt(13, 11));
  });

  it("a ghost slowdown slows the selected ghost only", () => {
    const ghostSpeed = (...ids: Parameters<LearnSim["toggleUpgrade"]>[0][]): number => {
      const { sim } = setup(...ids);
      const ghost = sim.ghostEid!;
      GhostPhase.value[ghost] = GHOST_PHASE.active;
      sim.step(NO_KEYS_HELD, FRAME_MS);
      return Speed.px[ghost]!;
    };
    expect(ghostSpeed("lowSlowdownBlinky") / ghostSpeed()).toBeCloseTo(1 - TRINKET_SLOWDOWN_CUT);
    expect(ghostSpeed("lowSlowdownClyde")).toBeCloseTo(ghostSpeed());
  });

  it("a ghost house delay holds only the selected ghost in the house", () => {
    const held = setup("lowHouseDelayBlinky");
    expect(held.sim.statusText()).toContain("MOVE TO START");
    const free = setup("lowHouseDelayClyde");
    expect(free.sim.statusText()).toBe("");
  });

  it("House Delay holds the ghost until the delayed release", () => {
    const { sim, player } = setup("passiveGhostHouseDelay");
    const ghost = sim.ghostEid!;
    const held = posOf(ghost);
    expect(sim.statusText()).toContain("MOVE TO START");
    moveTo(player, { x: held.x, y: held.y + 400 });
    for (let t = 0; t < 1_900; t += FRAME_MS) {
      sim.step(held_right, FRAME_MS);
    }
    expect(posOf(ghost)).toEqual(held);
    expect(sim.statusText()).toContain("HOUSE RELEASE IN");
    for (let t = 0; t < 400; t += FRAME_MS) {
      sim.step(held_right, FRAME_MS);
    }
    expect(sim.statusText()).toBe("");
    expect(posOf(ghost)).not.toEqual(held);
  });

  it("House Delay also holds the Wardy for the delayed release", () => {
    const { sim, player } = setup("passiveGhostHouseDelay");
    sim.selectGhost(GHOST_KIND.wardy);
    const ghost = sim.ghostEid!;
    const held = posOf(ghost);
    moveTo(player, { x: held.x, y: held.y + 400 });
    for (let t = 0; t < 1_900; t += FRAME_MS) {
      sim.step(held_right, FRAME_MS);
    }
    expect(posOf(ghost)).toEqual(held);
    expect(sim.statusText()).toContain("HOUSE RELEASE IN");
    for (let t = 0; t < 400; t += FRAME_MS) {
      sim.step(held_right, FRAME_MS);
    }
    expect(sim.statusText()).toBe("");
  });

  it("House Delay holds Spunky (relief slot) for pellets, not time", () => {
    const { sim, player } = setup("passiveGhostHouseDelay");
    sim.selectGhost(GHOST_KIND.spunky);
    const ghost = sim.ghostEid!;
    const held = posOf(ghost);
    moveTo(player, { x: held.x, y: held.y + 400 });
    for (let t = 0; t < 2_400; t += FRAME_MS) {
      sim.step(held_right, FRAME_MS);
    }
    expect(posOf(ghost)).toEqual(held);
    expect(sim.statusText()).toContain("PELLETS");
  });

  describe("Tunnel Boring", () => {
    function boreSpot(): {
      col: number;
      row: number;
      dx: number;
      dy: number;
      dir: "left" | "right" | "up" | "down";
    } {
      const layout = getActiveLayout();
      const dirs = [
        { dx: 1, dy: 0, dir: "right" as const },
        { dx: -1, dy: 0, dir: "left" as const },
        { dx: 0, dy: 1, dir: "down" as const },
        { dx: 0, dy: -1, dir: "up" as const },
      ];
      for (let row = 1; row < layout.rows - 1; row += 1) {
        for (let col = 1; col < layout.cols - 1; col += 1) {
          if (!isWalkable(col, row, layout.playerSolids)) {
            continue;
          }
          for (const step of dirs) {
            const target = { col: col + step.dx, row: row + step.dy };
            if (
              !isWalkable(target.col, target.row, layout.playerSolids) &&
              !layout.house[target.row]?.[target.col] &&
              !layout.door[target.row]?.[target.col]
            ) {
              const fromHouse = [
                [0, -1],
                [0, 1],
                [-1, 0],
                [1, 0],
              ].some(
                ([dx, dy]) =>
                  layout.house[target.row + dy!]?.[target.col + dx!] ||
                  layout.door[target.row + dy!]?.[target.col + dx!],
              );
              if (!fromHouse && tunnelBoringCells(col, row, step.dx, step.dy) !== null) {
                return { col, row, ...step };
              }
            }
          }
        }
      }
      throw new Error("no bore spot");
    }

    it("while stopped, pressing into a wall punches through once", () => {
      const { sim, player } = setup("passiveTunnelBoring");
      expect(sim["tunnelBoringCharges"]).toBe(1);
      const spot = boreSpot();
      const expected = tunnelBoringCells(spot.col, spot.row, spot.dx, spot.dy)!;
      moveTo(player, { x: cellCenterX(spot.col), y: cellCenterY(spot.row) });
      Facing.direction[player] = DIRECTION.none;
      Velocity.x[player] = 0;
      Velocity.y[player] = 0;
      sim.step(held(spot.dir), FRAME_MS);
      expect(sim["tunnelBoringCharges"]).toBe(0);
      expect(sim["tunnelBoredCells"]).toEqual(expected);
      const first = boreSteps(expected)[0]!;
      expect(sim.tunnelBoringDebug()).toMatchObject({
        openCells: first.length,
        junkCells: first.length,
      });
      for (
        let t = 0;
        t < 4_000 && sim.tunnelBoringDebug().openCells < expected.length;
        t += FRAME_MS
      ) {
        sim.step(held(spot.dir), FRAME_MS);
      }
      for (const cell of expected) {
        expect(isWalkable(cell.col, cell.row)).toBe(true);
      }
      expect(sim.tunnelBoringDebug().junkCells).toBe(expected.length);
      sim.step(held(spot.dir), FRAME_MS);
      expect(sim["tunnelBoredCells"]).toEqual(expected);
    });

    it("slows Dot-Man 25% while he is inside the bore", () => {
      const { sim, player } = setup("passiveTunnelBoring");
      const spot = boreSpot();
      const expected = tunnelBoringCells(spot.col, spot.row, spot.dx, spot.dy)!;
      moveTo(player, { x: cellCenterX(spot.col), y: cellCenterY(spot.row) });
      Facing.direction[player] = DIRECTION.none;
      Velocity.x[player] = 0;
      Velocity.y[player] = 0;
      sim.step(held(spot.dir), FRAME_MS);
      const inBore = (): boolean =>
        expected.some(
          (cell) =>
            cell.col === worldToCol(Position.x[player]!) &&
            cell.row === worldToRow(Position.y[player]!),
        );
      for (let t = 0; t < 2_000 && !inBore(); t += FRAME_MS) {
        sim.step(held(spot.dir), FRAME_MS);
      }
      expect(inBore()).toBe(true);
      expect(sim.tunnelBoringDebug().slowed).toBe(true);
    });

    it("Plus recharges the drill on a power pellet", () => {
      const { sim, player } = setup("passiveTunnelBoring");
      sim.toggleEnhanced("passiveTunnelBoring");
      const spot = boreSpot();
      moveTo(player, { x: cellCenterX(spot.col), y: cellCenterY(spot.row) });
      Facing.direction[player] = DIRECTION.none;
      sim.step(held(spot.dir), FRAME_MS);
      expect(sim["tunnelBoringCharges"]).toBe(0);
      chompPower(sim, player);
      expect(sim["tunnelBoringCharges"]).toBe(1);
    });

    it("does nothing without the upgrade", () => {
      const { sim, player } = setup();
      const spot = boreSpot();
      const wall = { col: spot.col + spot.dx, row: spot.row + spot.dy };
      expect(isWalkable(wall.col, wall.row)).toBe(false);
      moveTo(player, { x: cellCenterX(spot.col), y: cellCenterY(spot.row) });
      Facing.direction[player] = DIRECTION.none;
      sim.step(held(spot.dir), FRAME_MS);
      expect(isWalkable(wall.col, wall.row)).toBe(false);
      expect(sim["tunnelBoredCells"]).toEqual([]);
    });
  });
});

const held_right = held("right");

const LEARN_OMITS_RENDER_OPTIONS: readonly (keyof SimRenderOptions)[] = [
  "fruitRemainingMs",
  "playerAlpha",
  "entityAlpha",
  "wallAlpha",
  "mazeColorInverted",
  "playerReviveProgress",
  "bossChains",
  "timedTunnel",
  "lava",
  "collapse",
  "sinkhole",
  "speedZones",
  "pupilTarget",
];

function lastDrawOptions(events: SimEvent[]): SimRenderOptions {
  const draw = events.filter((event) => event.type === "draw").at(-1);
  if (draw === undefined || draw.type !== "draw") {
    throw new Error("no draw event");
  }
  return draw.options;
}

describe("LearnSim upgrade registry", () => {
  const listed = UPGRADE_DEFS.filter(
    (def) => !isSpecialist(def.id) && !isEnhancedId(def.id) && !isTrinketId(def.id),
  ).map((def) => def.id as BaseUpgradeId);

  it.each(TRINKET_IDS)("%s toggles on and off and runs, with no Plus form", (id) => {
    const sim = new LearnSim("learn");
    sim.start();
    sim.selectGhost(GHOST_KIND.blinky);
    sim.toggleUpgrade(id);
    expect(sim.ownedUpgrades).toEqual([id]);
    sim.toggleEnhanced(id);
    expect(sim.ownedUpgrades).toEqual([id]);
    for (let i = 0; i < 30; i += 1) {
      sim.step(held("right"), FRAME_MS);
    }
    sim.toggleUpgrade(id);
    expect(sim.ownedUpgrades).toEqual([]);
  });

  it.each(listed)("%s and its Plus form can be toggled and run", (baseId) => {
    const sim = new LearnSim("learn");
    sim.start();
    sim.selectGhost(GHOST_KIND.blinky);
    sim.toggleUpgrade(baseId);
    expect(sim.ownedUpgrades).toEqual([baseId]);
    sim.toggleEnhanced(baseId);
    for (let i = 0; i < 30; i += 1) {
      sim.step(held("right"), FRAME_MS);
    }
    expect(sim.ownedUpgrades.map(baseIdOf)).toEqual([baseId]);
    sim.toggleUpgrade(baseId);
    expect(sim.ownedUpgrades).toEqual([]);
  });
});

describe("LearnSim parity with PlaySim drawing", () => {
  it("passes every render option PlaySim does unless it is listed as intentionally omitted", () => {
    const play = new PlaySim({ ...defaultPlayOptions(), level: 2 }, "parity");
    play.start();
    const playKeys = Object.keys(play.renderOptions());
    const learn = new LearnSim("parity");
    learn.start();
    const learnKeys = Object.keys(lastDrawOptions(learn.step(NO_KEYS_HELD, FRAME_MS)));
    const missing = playKeys.filter(
      (key) =>
        !learnKeys.includes(key) &&
        !LEARN_OMITS_RENDER_OPTIONS.includes(key as keyof SimRenderOptions),
    );
    expect(
      missing,
      "PlaySim render options LEARN does not pass (see docs/learn.md#parity)",
    ).toEqual([]);
  });

  it("draws one bracelet square per banked shield", () => {
    const sim = new LearnSim("shields");
    sim.start();
    expect(lastDrawOptions(sim.step(NO_KEYS_HELD, FRAME_MS)).shields).toBe(0);
    sim.toggleUpgrade("passiveStartingShield");
    expect(lastDrawOptions(sim.step(NO_KEYS_HELD, FRAME_MS)).shields).toBe(1);
  });
});

describe("LearnSim upgrade HUD timers", () => {
  it("pulses a fired upgrade and drains its timer like PlaySim", () => {
    const sim = new LearnSim("learn");
    sim.start();
    sim.toggleUpgrade("powerPelletSpeedBurst");
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    const player = query(sim.world, [Player, Position])[0]!;
    Position.x[player] = Position.x[power]!;
    Position.y[player] = Position.y[power]!;
    const events = sim.step(NO_KEYS_HELD, FRAME_MS);
    expect(events).toContainEqual({ type: "upgradePulse", ids: ["powerPelletSpeedBurst"] });
    expect(sim.upgradeTimerFractions().powerPelletSpeedBurst).toBe(1);
    for (let i = 0; i < 30; i += 1) {
      sim.step(NO_KEYS_HELD, FRAME_MS);
    }
    expect(sim.upgradeTimerFractions().powerPelletSpeedBurst).toBeLessThan(1);
  });
});

describe("Martyr and Possession (LEARN)", () => {
  function setup(...ids: Parameters<LearnSim["toggleUpgrade"]>[0][]) {
    const sim = new LearnSim("learn");
    sim.start();
    sim.selectGhost(GHOST_KIND.blinky);
    for (const id of ids) {
      sim.toggleUpgrade(id);
    }
    const player = query(sim.world, [Player, Position])[0]!;
    return { sim, player };
  }

  function moveTo(player: number, at: { x: number; y: number }): void {
    Position.x[player] = at.x;
    Position.y[player] = at.y;
  }

  function posOf(eid: number): { x: number; y: number } {
    return { x: Position.x[eid]!, y: Position.y[eid]! };
  }

  function popups(events: ReturnType<LearnSim["step"]>): string[] {
    return events.flatMap((event) => (event.type === "learnPopup" ? [event.text] : []));
  }

  function catchByGhost(sim: LearnSim, player: number): ReturnType<LearnSim["step"]> {
    const ghost = sim.ghostEid!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    moveTo(player, posOf(ghost));
    return sim.step(NO_KEYS_HELD, FRAME_MS);
  }

  it("Martyr fires power effects on a demo catch", () => {
    const { sim, player } = setup("passiveMartyr", "powerPelletInvuln");
    const text = popups(catchByGhost(sim, player)).join("\n");
    expect(text).toContain("MARTYR");
    expect(sim["learnUpgrades"].invulnRemainingMs).toBeGreaterThan(0);
  });

  it("Possession starts a controllable fright window on demo catch", () => {
    const { sim, player } = setup("passivePossession");
    const ghost = sim.ghostEid!;
    expect(popups(catchByGhost(sim, player)).join("\n")).toContain("POSSESSING");
    expect(sim["learnUpgrades"].possessionRemainingMs).toBeGreaterThan(0);
    expect(sim["learnUpgrades"].possessedGhostEid).toBe(ghost);
    for (let t = 0; t < 5200; t += FRAME_MS) {
      sim.step(NO_KEYS_HELD, FRAME_MS);
      if (sim["learnUpgrades"].possessionRemainingMs <= 0) {
        break;
      }
    }
    expect(sim["learnUpgrades"].possessionRemainingMs).toBe(0);
    expect(sim["learnUpgrades"].possessedGhostEid).toBeNull();
  });

  it("Possession+ haunts the steered ghost after possession ends", () => {
    const { sim, player } = setup("passivePossessionPlus");
    const ghost = sim.ghostEid!;
    catchByGhost(sim, player);
    for (let t = 0; t < 5200; t += FRAME_MS) {
      sim.step(NO_KEYS_HELD, FRAME_MS);
      if (sim["learnUpgrades"].hauntRemainingMs > 0) {
        break;
      }
    }
    expect(sim["learnUpgrades"].hauntedGhostEid).toBe(ghost);
    expect(sim["learnUpgrades"].hauntRemainingMs).toBe(5000);
    expect({ x: Position.x[ghost]!, y: Position.y[ghost]! }).toEqual(ghostHouseSpawnCenter());
  });
});
