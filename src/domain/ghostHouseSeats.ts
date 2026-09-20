import { cellCenterX, cellCenterY, getActiveLayout, isDoor, isHouse } from "./maze";

export const HOUSE_SEAT_COUNT = 4;

export type HouseSeat = { x: number; y: number };

export type HouseSeatGhost = {
  eid: number;
  x: number;
  y: number;
};

function houseFloorColsOnSpawnRow(): number[] {
  const { ghostHouseSpawn, cols } = getActiveLayout();
  const row = ghostHouseSpawn.row;
  const colsOnRow: number[] = [];
  for (let col = 0; col < cols; col += 1) {
    if (isHouse(col, row) && !isDoor(col, row)) {
      colsOnRow.push(col);
    }
  }
  if (colsOnRow.length < HOUSE_SEAT_COUNT) {
    throw new Error(
      `ghost house spawn row ${row} has ${colsOnRow.length} floor cells; need ${HOUSE_SEAT_COUNT}`,
    );
  }
  return colsOnRow;
}

export function ghostHouseSeatCenters(): HouseSeat[] {
  const floorCols = houseFloorColsOnSpawnRow();
  const row = getActiveLayout().ghostHouseSpawn.row;
  const y = cellCenterY(row);
  const leftX = cellCenterX(floorCols[0]!);
  const rightX = cellCenterX(floorCols[floorCols.length - 1]!);
  const seats: HouseSeat[] = [];
  for (let i = 0; i < HOUSE_SEAT_COUNT; i += 1) {
    const t = i / (HOUSE_SEAT_COUNT - 1);
    seats.push({ x: leftX + t * (rightX - leftX), y });
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
