import { MAZE_COLS, cellCenterX, cellCenterY, getActiveLayout, isDoor, isHouse } from "./maze";

export const HOUSE_SEAT_COUNT = 4;

export type HouseSeat = { x: number; y: number };

export type HouseSeatGhost = {
  eid: number;
  x: number;
  y: number;
};

function houseFloorColsOnSpawnRow(): number[] {
  const { ghostHouseSpawn } = getActiveLayout();
  const row = ghostHouseSpawn.row;
  const cols: number[] = [];
  for (let col = 0; col < MAZE_COLS; col += 1) {
    if (isHouse(col, row) && !isDoor(col, row)) {
      cols.push(col);
    }
  }
  if (cols.length < HOUSE_SEAT_COUNT) {
    throw new Error(
      `ghost house spawn row ${row} has ${cols.length} floor cells; need ${HOUSE_SEAT_COUNT}`,
    );
  }
  return cols;
}

export function ghostHouseSeatCenters(): HouseSeat[] {
  const floorCols = houseFloorColsOnSpawnRow();
  const row = getActiveLayout().ghostHouseSpawn.row;
  const seats: HouseSeat[] = [];
  for (let i = 0; i < HOUSE_SEAT_COUNT; i += 1) {
    const t = i / (HOUSE_SEAT_COUNT - 1);
    const idx = Math.round(t * (floorCols.length - 1));
    const col = floorCols[idx]!;
    seats.push({ x: cellCenterX(col), y: cellCenterY(row) });
  }
  const distinct = new Set(seats.map((s) => `${s.x},${s.y}`));
  if (distinct.size < HOUSE_SEAT_COUNT) {
    throw new Error("ghost house seat derivation produced overlapping seats");
  }
  return seats;
}

export function nearestHouseSeatIndex(x: number, y: number, seats: readonly HouseSeat[]): number {
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < seats.length; i += 1) {
    const seat = seats[i]!;
    const dist = (x - seat.x) ** 2 + (y - seat.y) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

export function assignHouseSeats(
  ghosts: readonly HouseSeatGhost[],
  orderedEids: readonly number[],
  seats: readonly HouseSeat[],
): Map<number, number> {
  const n = orderedEids.length;
  if (n === 0) {
    return new Map();
  }

  const currentSeatByEid = new Map<number, number>();
  for (const ghost of ghosts) {
    currentSeatByEid.set(ghost.eid, nearestHouseSeatIndex(ghost.x, ghost.y, seats));
  }

  const bySeatAsc = [...ghosts].sort(
    (a, b) => (currentSeatByEid.get(a.eid) ?? 0) - (currentSeatByEid.get(b.eid) ?? 0),
  );
  const currentOrder = bySeatAsc.map((g) => g.eid);
  const uniqueSeats = new Set([...currentSeatByEid.values()]);
  const orderMatches =
    uniqueSeats.size === n &&
    currentOrder.length === orderedEids.length &&
    currentOrder.every((eid, i) => eid === orderedEids[i]);

  if (orderMatches) {
    return currentSeatByEid;
  }

  const occupiedIndices = [...new Set(ghosts.map((g) => currentSeatByEid.get(g.eid) ?? 0))].sort(
    (a, b) => a - b,
  );

  if (occupiedIndices.length === n) {
    return new Map(orderedEids.map((eid, i) => [eid, occupiedIndices[i]!]));
  }

  return new Map(orderedEids.map((eid, i) => [eid, i]));
}
