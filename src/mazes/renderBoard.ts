import {
  DOOR_GATE_COLOR,
  MAZE_BACKGROUND_COLOR,
  WALL_CORNER_CURVE_KIND,
  WALL_CORNER_RADIUS,
  WALL_INSET_PX,
  WALL_STROKE_COLOR,
  activateAsciiLayout,
  cellCenterX,
  cellCenterY,
  colorToCssHex,
  doorGateEdges,
  pelletDisplaySize,
  wallPathCommands,
  type MazeLayout,
} from "../domain/maze";
import { pixelWallRects } from "../domain/pixelWall";
import { DEFAULT_TUNING } from "../domain/tuning";

const PELLET_FILL = "#ffb8ae";
const POWER_FILL = "#ffb8ae";

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

function paintBoard(ctx: CanvasRenderingContext2D, layout: MazeLayout): void {
  const { pixelWidth, pixelHeight, offsetX, offsetY, ascii, cols, rows, tileSize } = layout;
  // Caller sets the scale transform; only translate into maze-local space here.
  ctx.fillStyle = colorToCssHex(MAZE_BACKGROUND_COLOR);
  ctx.fillRect(0, 0, pixelWidth, pixelHeight);
  ctx.translate(-offsetX, -offsetY);

  const commands = wallPathCommands(
    layout.walls,
    layout.exterior,
    WALL_CORNER_RADIUS,
    WALL_INSET_PX,
    WALL_CORNER_CURVE_KIND,
    layout.door,
  );
  ctx.fillStyle = colorToCssHex(WALL_STROKE_COLOR);
  for (const rect of pixelWallRects(commands, DEFAULT_TUNING.wallThickness)) {
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  ctx.strokeStyle = colorToCssHex(DOOR_GATE_COLOR);
  ctx.lineWidth = Math.max(2, tileSize * 0.12);
  ctx.lineCap = "butt";
  for (const edge of doorGateEdges(layout.door)) {
    ctx.beginPath();
    ctx.moveTo(edge.x1, edge.y1);
    ctx.lineTo(edge.x2, edge.y2);
    ctx.stroke();
  }

  const lines = ascii.split("\n");
  const pelletR = Math.max(1, pelletDisplaySize(tileSize) * 0.22);
  const powerR = Math.max(2, pelletDisplaySize(tileSize) * 0.42);
  for (let row = 0; row < rows; row += 1) {
    const line = lines[row] ?? "";
    for (let col = 0; col < cols; col += 1) {
      const ch = line[col] ?? "";
      if (ch !== "." && ch !== "@") {
        continue;
      }
      const x = cellCenterX(col);
      const y = cellCenterY(row);
      ctx.fillStyle = ch === "@" ? POWER_FILL : PELLET_FILL;
      ctx.beginPath();
      ctx.arc(x, y, ch === "@" ? powerR : pelletR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function boardPixelSize(ascii: string): { width: number; height: number } {
  const layout = activateAsciiLayout(ascii);
  return { width: layout.pixelWidth, height: layout.pixelHeight };
}

/**
 * Canvas board using the same wall stroke path as PlayScene.
 * Bitmap is scaled up by `scale` (and devicePixelRatio) so CSS height:100% stays sharp.
 */
export function renderBoard(ascii: string, scale = 2): HTMLCanvasElement {
  const layout = activateAsciiLayout(ascii);
  const dpr = typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1;
  const mul = scale * dpr;
  const canvas = document.createElement("canvas");
  canvas.className = "board-canvas";
  canvas.width = Math.round(layout.pixelWidth * mul);
  canvas.height = Math.round(layout.pixelHeight * mul);
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Maze preview");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(mul, 0, 0, mul, 0, 0);
    paintBoard(ctx, layout);
  }
  return canvas;
}
