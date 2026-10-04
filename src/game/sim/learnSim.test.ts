import { query, removeEntity } from "bitecs";
import { describe, expect, it } from "vitest";
import { ghostTeleportCell, scatterTargetForKind } from "../../domain/ghostCorner";
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import {
  canEnterDirection,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { WARP_GLIDE_MS } from "../../domain/warpGlide";
import { NO_KEYS_HELD } from "../systems/heldKeys";
import { Fruit } from "../components/Fruit";
import { GhostPhase } from "../components/GhostPhase";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { worldSnapshot } from "../systems/worldSnapshot";
import { LearnSim } from "./learnSim";
import { FRAME_MS, held } from "./simTesting";

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

  function runMs(sim: LearnSim, ms: number): void {
    for (let t = 0; t < ms; t += FRAME_MS) {
      sim.step(NO_KEYS_HELD, FRAME_MS);
    }
  }

  it("Second Chomp brings an eaten power pellet back after ten seconds", () => {
    const { sim, player } = setup("passivePowerPelletRecharge");
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    const at = posOf(power);
    moveTo(player, at);
    sim.step(NO_KEYS_HELD, FRAME_MS);
    const count = () => query(sim.world, [PowerPellet]).length;
    const eaten = count();
    moveTo(player, { x: at.x, y: at.y + 200 });
    runMs(sim, 9_000);
    expect(count()).toBe(eaten);
    runMs(sim, 1_200);
    expect(count()).toBe(eaten + 1);
  });

  it("Defy Death tints Maze-Man while armed by a power pellet", () => {
    const { sim, player } = setup("passiveDefyDeath");
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    const draw = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw")!;
    expect(draw.type === "draw" && draw.options.playerInvulnRemainingMs).toBeGreaterThan(4_000);
  });

  it("Quarter Bounty pays a Quarter per fruit and shows it", () => {
    const { sim, player } = setup("fruitQuarterBounty");
    expect(popups(eatFruit(sim, player))).toEqual(["+1 Q"]);
    expect(sim.statusText()).toContain("QUARTERS 1");
  });

  it("fruit pays bonus charge without Quarter Bounty", () => {
    const { sim, player } = setup("passiveDeathsBounty");
    expect(popups(eatFruit(sim, player))).toEqual(["+150 BONUS"]);
    expect(sim.statusText()).toContain("BONUS 150/300");
  });

  it("a ghost touch stays harmless without a death-side upgrade", () => {
    const { sim, player } = setup();
    expect(popups(catchByGhost(sim, player))).toEqual([]);
    expect(sim.statusText()).toBe("");
  });

  it("Extra Life shows an extra life and a catch costs one", () => {
    const { sim, player } = setup("passiveExtraLife");
    expect(sim.statusText()).toContain("LIVES 4");
    expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST"]);
    expect(sim.statusText()).toContain("LIVES 3");
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

  it("Death's Bounty fills the bonus bar with decaying payouts", () => {
    const { sim, player } = setup("passiveDeathsBounty");
    expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST\n+300 BONUS"]);
    expect(sim.statusText()).toContain("QUARTERS 1");
    runMs(sim, 1_600);
    expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST\n+240 BONUS"]);
  });

  it("an armed Defy Death saves the life and is consumed", () => {
    const { sim, player } = setup("passiveDefyDeath");
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    sim.step(NO_KEYS_HELD, FRAME_MS);
    expect(popups(catchByGhost(sim, player))).toEqual(["SAVED"]);
    expect(sim.statusText()).toContain("LIVES 3");
    runMs(sim, 1_600);
    expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST"]);
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
    expect(popups(catchByGhost(sim, player))).toEqual(["SAVED\n-1 Q"]);
    expect(sim.statusText()).toContain("LIVES 1");
    expect(sim.statusText()).toContain("QUARTERS 0");
    runMs(sim, 1_600);
    expect(popups(catchByGhost(sim, player))).toEqual(["LIVES RESET"]);
  });

  it("Myogenesis regains two lives when the board refills, without a popup", () => {
    const { sim, player } = setup("passiveMyogenesis");
    catchByGhost(sim, player);
    runMs(sim, 1_600);
    catchByGhost(sim, player);
    expect(sim.statusText()).toContain("LIVES 1");
    for (const eid of query(sim.world, [Pellet])) {
      removeEntity(sim.world, eid);
    }
    expect(popups(sim.step(NO_KEYS_HELD, FRAME_MS))).toEqual([]);
    expect(sim.statusText()).toContain("LIVES 3");
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

  it("Fruit Feast schedules three fruit on the Feast thresholds", () => {
    const { sim } = setup("fruitFeast");
    expect(sim.statusText()).toContain("NEXT FRUIT AT 60 PELLETS");
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
});

const held_right = held("right");
