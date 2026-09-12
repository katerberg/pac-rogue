import { query, type World } from "bitecs";
import Phaser from "phaser";
import { Drawable } from "../components/Drawable";
import { Position } from "../components/Position";

/**
 * ECS → Phaser presentation. One local GameObject map keyed by eid — not a sync framework.
 * GameObjects only mirror Position + Drawable; they are never the source of truth.
 */
export function createRender(scene: Phaser.Scene): (world: World) => void {
  const objects = new Map<number, Phaser.GameObjects.Arc>();

  return (world: World) => {
    for (const eid of query(world, [Position, Drawable])) {
      const x = Position.x[eid] ?? 0;
      const y = Position.y[eid] ?? 0;
      const color = Drawable.color[eid] ?? 0xffe066;
      const radius = Drawable.radius[eid] ?? 16;
      const id = Drawable.id[eid] ?? "unknown";

      let go = objects.get(eid);
      if (!go) {
        go = scene.add.circle(x, y, radius, color);
        objects.set(eid, go);
      }

      go.setName(id);
      go.setFillStyle(color);
      go.setRadius(radius);
      go.setPosition(x, y);
    }
  };
}
