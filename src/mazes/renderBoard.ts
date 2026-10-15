export type BoardCellKind = "wall" | "pellet" | "power" | "door" | "house" | "empty" | "spawn";

export function cellKind(ch: string): BoardCellKind {
  switch (ch) {
    case "#":
      return "wall";
    case ".":
      return "pellet";
    case "@":
      return "power";
    case "=":
      return "door";
    case "H":
      return "house";
    case "P":
      return "spawn";
    default:
      return "empty";
  }
}

export function renderBoard(ascii: string, cellPx = 10): HTMLElement {
  const lines = ascii.split("\n");
  const rows = lines.length;
  const cols = lines[0]?.length ?? 0;
  const board = document.createElement("div");
  board.className = "board";
  board.style.gridTemplateColumns = `repeat(${cols}, ${cellPx}px)`;
  board.style.gridTemplateRows = `repeat(${rows}, ${cellPx}px)`;
  for (const line of lines) {
    for (const ch of line) {
      const cell = document.createElement("div");
      cell.className = `cell ${cellKind(ch)}`;
      board.appendChild(cell);
    }
  }
  return board;
}
