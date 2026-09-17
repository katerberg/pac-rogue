import { getActiveLayout } from "./maze";
import type { GhostTarget } from "./ghostTarget";

export function leavingHouseTarget(ghostCol: number, ghostRow: number): GhostTarget {
  const exit = getActiveLayout().ghostHouseExit;
  if (ghostCol !== exit.col) {
    return { col: exit.col, row: ghostRow };
  }
  return exit;
}
