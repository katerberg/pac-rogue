import { query, type World } from "bitecs";
import Phaser from "phaser";
import { pipeEdges, WALL_COLOR } from "../../domain/maze";
import { Drawable } from "../components/Drawable";
import { Position } from "../components/Position";
import { Wall } from "../components/Wall";

/**
 * ECS → Phaser presentation.
 * - Players: Arc GameObjects mirroring Position + Drawable.
 * - Walls: one Graphics pipe outline from domain edges (Wall entities remain ECS truth for layout).
 */
export function createRender(scene: Phaser.Scene): (world: World) => void {
  const playerObjects = new Map<number, Phaser.GameObjects.Arc>();
  const wallGraphics = scene.add.graphics();
  let pipesDrawn = false;

  return (world: World) => {
    if (!pipesDrawn) {
      // Ensure wall entities exist before drawing; pipes come from the maze grid.
      query(world, [Wall, Position]);
      wallGraphics.clear();
      wallGraphics.lineStyle(2, WALL_COLOR, 1);
      for (const edge of pipeEdges()) {
        wallGraphics.lineBetween(edge.x1, edge.y1, edge.x2, edge.y2);
      }
      pipesDrawn = true;
    }

    for (const eid of query(world, [Position, Drawable])) {
      const x = Position.x[eid] ?? 0;
      const y = Position.y[eid] ?? 0;
      const color = Drawable.color[eid] ?? 0xffe066;
      const radius = Drawable.radius[eid] ?? 16;
      const id = Drawable.id[eid] ?? "unknown";

      let go = playerObjects.get(eid);
      if (!go) {
        go = scene.add.circle(x, y, radius, color);
        playerObjects.set(eid, go);
      }

      go.setName(id);
      go.setFillStyle(color);
      go.setRadius(radius);
      go.setPosition(x, y);
    }
  };
}
