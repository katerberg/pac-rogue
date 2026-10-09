import { query, removeEntity } from "bitecs";
import { describe, expect, it } from "vitest";
import { ECHO_DELAY_MS } from "../../domain/echo";
import { ghostTeleportCell, scatterTargetForKind } from "../../domain/ghostCorner";
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import {
  canEnterDirection,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  ghostHouseSpawnCenter,
  hasLeftGhostHouse,
  horizontalTunnelRows,
  TILE_SIZE,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { NEAR_MISS_CHARGE } from "../../domain/upgrades";
import { WARP_GLIDE_MS } from "../../domain/warpGlide";
import { NO_KEYS_HELD } from "../systems/heldKeys";
import { Fruit } from "../components/Fruit";
import { GhostPhase } from "../components/GhostPhase";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { PowerPellet } from "../components/PowerPellet";
import { worldSnapshot } from "../systems/worldSnapshot";
import { BLINKY_DRAWABLE_ID, INKY_DRAWABLE_ID, PLAYER_DRAWABLE_ID } from "../../domain/playfield";
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

  it("Afterburner speeds the player up faster entering an empty cell and slower entering a pellet cell", () => {
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
    sim.toggleUpgrade("passiveAfterburner");
    place();
    expect(speedWhenMoving(1)).toBeCloseTo(base * 0.9);
    place();
    expect(speedWhenMoving(-1)).toBeCloseTo(base * 1.3);
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

  it("emits pelletAbsorb when Dot-Man eats a neon regular pellet", () => {
    const sim = new LearnSim("absorb-learn");
    sim.start();
    sim.setGhostStyle("neon");
    const events: import("./simEvents").SimEvent[] = [];
    for (let i = 0; i < 60; i += 1) {
      events.push(...sim.step(held("left"), FRAME_MS));
    }
    expect(events.some((event) => event.type === "pelletAbsorb")).toBe(true);
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
      expect(left).toBe(i < total - 1 ? total - 1 - i : total);
    }
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

describe("LearnSim ghost style", () => {
  function lastDraw(sim: LearnSim) {
    return sim
      .step(NO_KEYS_HELD, FRAME_MS)
      .flatMap((e) => (e.type === "draw" ? [e.options] : []))
      .at(-1)!;
  }

  it("draws pixel art by default, and neon/lined line art when set", () => {
    const sim = new LearnSim("learn");
    sim.start();
    sim.selectGhost(GHOST_KIND.inky);
    expect(lastDraw(sim).lineArtDrawableIds).toEqual([]);
    sim.setGhostStyle("neon");
    expect([...lastDraw(sim).lineArtDrawableIds!].sort()).toEqual(
      [PLAYER_DRAWABLE_ID, BLINKY_DRAWABLE_ID, INKY_DRAWABLE_ID].sort(),
    );
    sim.setGhostStyle("lined");
    expect([...lastDraw(sim).lineArtDrawableIds!].sort()).toEqual(
      [PLAYER_DRAWABLE_ID, BLINKY_DRAWABLE_ID, INKY_DRAWABLE_ID].sort(),
    );
    sim.setGhostStyle("pixel");
    expect(lastDraw(sim).lineArtDrawableIds).toEqual([]);
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

  it("Near Miss charges the BONUS bar when the ghost brushes past", () => {
    const { sim, player } = setup("passiveNearMiss");
    const ghost = sim.ghostEid!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    const at = posOf(ghost);
    moveTo(player, { x: at.x + 0.5 * TILE_SIZE, y: at.y });
    expect(popups(sim.step(NO_KEYS_HELD, FRAME_MS))).toEqual([]);
    moveTo(player, { x: at.x, y: at.y + 200 });
    expect(popups(sim.step(NO_KEYS_HELD, FRAME_MS))).toEqual([`+${NEAR_MISS_CHARGE} BONUS`]);
    expect(sim.statusText()).toContain(`BONUS ${NEAR_MISS_CHARGE}/300`);
  });

  it("does not pay a Near Miss that finished while the upgrade was off", () => {
    const { sim, player } = setup("passiveNearMiss");
    const ghost = sim.ghostEid!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    const at = posOf(ghost);
    moveTo(player, { x: at.x + 0.5 * TILE_SIZE, y: at.y });
    expect(popups(sim.step(NO_KEYS_HELD, FRAME_MS))).toEqual([]);
    sim.toggleUpgrade("passiveNearMiss");
    moveTo(player, { x: at.x, y: at.y + 200 });
    expect(popups(sim.step(NO_KEYS_HELD, FRAME_MS))).toEqual([]);
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
    moveTo(player, { x: at.x, y: at.y + 200 });
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
    moveTo(player, { x: positions[0]!.x, y: positions[0]!.y + 200 });
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
    expect(sim.statusText()).toContain("LIVES 4");
    runMs(sim, 1_600);
    expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST"]);
  });

  it("Shield fires pickup effects and banks a shield; its break fires nothing", () => {
    const { sim, player } = setup("passiveShieldPellets", "powerPelletInvuln");
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    const draw = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw")!;
    expect(draw.type === "draw" && draw.options.playerInvulnRemainingMs).toBeGreaterThan(0);
    expect(sim.statusText()).toContain("SHIELDS 1/1");
    runMs(sim, 3_100);
    expect(popups(catchByGhost(sim, player))).toEqual(["SHIELD BROKEN"]);
    const after = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw")!;
    expect(after.type === "draw" && after.options.playerInvulnRemainingMs).toBeLessThanOrEqual(
      1000,
    );
  });

  it("Shield Break holds pickup effects until a catch breaks the shield", () => {
    const { sim, player } = setup(
      "passiveShieldPellets",
      "passiveShieldBreak",
      "powerPelletInvuln",
    );
    expect(sim.statusText()).toContain("SHIELDS 0/1");
    moveTo(player, posOf(query(sim.world, [PowerPellet, Position])[0]!));
    const draw = sim.step(NO_KEYS_HELD, FRAME_MS).find((event) => event.type === "draw")!;
    expect(draw.type === "draw" && draw.options.playerInvulnRemainingMs).toBe(0);
    expect(sim.statusText()).toContain("SHIELDS 1/1");
    expect(popups(catchByGhost(sim, player))).toEqual(["SHIELD BROKEN"]);
    expect(sim.statusText()).toContain("SHIELDS 0/1");
    expect(sim.statusText()).toContain("LIVES 4");
    runMs(sim, 3_100);
    expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST"]);
  });

  it("Shield drops shields over the cap when toggled down or off", () => {
    const { sim, player } = setup("passiveShieldPellets");
    sim.toggleEnhanced("passiveShieldPellets");
    for (const power of [...query(sim.world, [PowerPellet, Position])]) {
      moveTo(player, posOf(power));
      sim.step(NO_KEYS_HELD, FRAME_MS);
    }
    expect(sim.statusText()).toContain("SHIELDS 3/3");
    sim.toggleEnhanced("passiveShieldPellets");
    expect(sim.statusText()).toContain("SHIELDS 1/1");
    sim.toggleUpgrade("passiveShieldPellets");
    sim.toggleUpgrade("passiveExtraLife");
    expect(popups(catchByGhost(sim, player))).toEqual(["LIFE LOST"]);
  });

  it("Starting Shield gives a shield now and after a board refill, and breaks on a catch", () => {
    const { sim, player } = setup("passiveStartingShieldPlus");
    expect(sim.statusText()).toContain("SHIELDS 2/2");
    expect(popups(catchByGhost(sim, player))).toEqual(["SHIELD BROKEN"]);
    expect(sim.statusText()).toContain("SHIELDS 1/2");
    sim.toggleEnhanced("passiveStartingShield");
    expect(sim.statusText()).toContain("SHIELDS 1/1");
    sim.toggleUpgrade("passiveStartingShield");
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

  it("Hunter frightens the ghost; eating it pays BONUS and seats it in the house briefly", () => {
    const { sim, player } = setup("powerPelletHunter");
    const ghost = sim.ghostEid!;
    const draw = chompPower(sim, player).find((event) => event.type === "draw")!;
    expect(draw.type === "draw" && draw.options.frightenedGhosts?.eids).toEqual([ghost]);
    expect(popups(catchByGhost(sim, player))).toEqual(["+75 BONUS"]);
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
      expect(popups(catchByGhost(sim, player))).toEqual(["SHIELD BROKEN"]);
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
      runMs(sim, ECHO_DELAY_MS + 500);
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
