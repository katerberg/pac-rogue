import { inBounds, isSolid, worldToCol, worldToRow, type SolidGrid } from "./maze";

export function hasPelletLineOfSight(
  playerX: number,
  playerY: number,
  pelletX: number,
  pelletY: number,
  solids: SolidGrid,
): boolean {
  const startCol = worldToCol(playerX);
  const startRow = worldToRow(playerY);
  const endCol = worldToCol(pelletX);
  const endRow = worldToRow(pelletY);
  if (!inBounds(startCol, startRow) || !inBounds(endCol, endRow)) {
    return false;
  }
  if (startCol === endCol && startRow === endRow) {
    return true;
  }

  let col = startCol;
  let row = startRow;
  const stepCol = Math.sign(endCol - startCol);
  const stepRow = Math.sign(endRow - startRow);
  while (col !== endCol || row !== endRow) {
    if (col !== endCol) {
      col += stepCol;
    }
    if (row !== endRow) {
      row += stepRow;
    }
    if (col === endCol && row === endRow) {
      return true;
    }
    if (isSolid(col, row, solids)) {
      return false;
    }
  }
  return true;
}
