import { hasComponent, query, type World } from "bitecs";
import Phaser from "phaser";
import { pipeEdges, WALL_COLOR, wrappedTwinPosition } from "../../domain/maze";
import { Drawable } from "../components/Drawable";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export function createRender(scene: Phaser.Scene): (world: World) => void {
  const drawableObjects = new Map<string, Phaser.GameObjects.Arc>();
  const wallGraphics = scene.add.graphics();
  let pipesDrawn = false;

  return (world: World) => {
    if (!pipesDrawn) {
      wallGraphics.clear();
      wallGraphics.lineStyle(2, WALL_COLOR, 1);
      for (const edge of pipeEdges()) {
        wallGraphics.lineBetween(edge.x1, edge.y1, edge.x2, edge.y2);
      }
      pipesDrawn = true;
    }

    const alive = new Set<string>();
    for (const eid of query(world, [Position, Drawable])) {
      const primaryKey = String(eid);
      const twinKey = `${eid}:twin`;
      alive.add(primaryKey);

      const x = Position.x[eid] ?? 0;
      const y = Position.y[eid] ?? 0;
      const color = Drawable.color[eid] ?? 0xffe066;
      const radius = Drawable.radius[eid] ?? 16;
      const id = Drawable.id[eid] ?? "unknown";

      let go = drawableObjects.get(primaryKey);
      if (!go) {
        go = scene.add.circle(x, y, radius, color);
        drawableObjects.set(primaryKey, go);
      }

      go.setName(id);
      go.setFillStyle(color);
      go.setRadius(radius);
      go.setPosition(x, y);

      if (hasComponent(world, eid, Player)) {
        const twin = wrappedTwinPosition(x, y, radius);
        if (twin) {
          alive.add(twinKey);
          let twinGo = drawableObjects.get(twinKey);
          if (!twinGo) {
            twinGo = scene.add.circle(twin.x, twin.y, radius, color);
            drawableObjects.set(twinKey, twinGo);
          }
          twinGo.setName(`${id}:twin`);
          twinGo.setFillStyle(color);
          twinGo.setRadius(radius);
          twinGo.setPosition(twin.x, twin.y);
        }
      }
    }

    for (const [key, go] of drawableObjects) {
      if (!alive.has(key)) {
        go.destroy();
        drawableObjects.delete(key);
      }
    }
  };
}
