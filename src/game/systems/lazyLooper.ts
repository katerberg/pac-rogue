import { addComponent, query, removeComponent, type World } from "bitecs";
import { lazyLooperRequiredCells, type LazyLooperRings } from "../../domain/lazyLooper";
import { getActiveLayout, worldToCol, worldToRow } from "../../domain/maze";
import { OptionalPellet } from "../components/OptionalPellet";
import { Position } from "../components/Position";
import { listRegularPelletEids } from "./pelletToPower";

export function tagOptionalPellets(world: World, rings: LazyLooperRings | null): void {
  for (const eid of query(world, [OptionalPellet])) {
    removeComponent(world, eid, OptionalPellet);
  }
  if (rings === null) {
    return;
  }
  const required = new Set(
    lazyLooperRequiredCells(getActiveLayout(), rings).map(({ col, row }) => `${col},${row}`),
  );
  for (const eid of listRegularPelletEids(world)) {
    const cell = `${worldToCol(Position.x[eid] ?? 0)},${worldToRow(Position.y[eid] ?? 0)}`;
    if (!required.has(cell)) {
      addComponent(world, eid, OptionalPellet);
    }
  }
}
