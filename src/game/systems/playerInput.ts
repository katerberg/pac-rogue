import Phaser from "phaser";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import {
  followStickOrigin,
  stickDirection,
  TOUCH_STICK_RADIUS,
  type StickDirection,
  type StickPoint,
} from "../../domain/touchStick";
import { mergeHeldKeys, NO_KEYS_HELD, type HeldKeys } from "./heldKeys";

type MoveKey = Phaser.Input.Keyboard.Key;

const TOUCH_STICK_DEPTH = 2000;
const TOUCH_STICK_COLOR = 0xffffff;

export function createHeldKeysReader(scene: Phaser.Scene): () => HeldKeys {
  const keyboard = scene.input.keyboard;
  if (!keyboard) {
    throw new Error("playerInput requires Phaser's keyboard plugin");
  }
  const cursors = keyboard.createCursorKeys();
  const wasd = keyboard.addKeys("W,A,S,D") as Record<"W" | "A" | "S" | "D", MoveKey>;
  const latestDown = (keys: MoveKey[]): number | null => {
    let time: number | null = null;
    for (const key of keys) {
      if (key.isDown && (time === null || key.timeDown >= time)) {
        time = key.timeDown;
      }
    }
    return time;
  };
  const readTouch = createTouchStick(scene);
  return () =>
    mergeHeldKeys(
      {
        up: latestDown([cursors.up, wasd.W]),
        down: latestDown([cursors.down, wasd.S]),
        left: latestDown([cursors.left, wasd.A]),
        right: latestDown([cursors.right, wasd.D]),
      },
      readTouch(),
    );
}

type Stick = {
  touchId: number;
  origin: StickPoint;
  finger: StickPoint;
  direction: StickDirection | null;
  since: number;
};

// A floating stick: it appears wherever a touch lands (canvas or the black margins) unless that
// touch hit an interactive object, and vanishes on release. Phaser reports canvas touches (with
// the objects under them); margin touches come straight from the DOM. Mouse input never creates one.
function createTouchStick(scene: Phaser.Scene): () => HeldKeys {
  let stick: Stick | null = null;
  const graphics = scene.add.graphics().setDepth(TOUCH_STICK_DEPTH);

  const draw = (): void => {
    graphics.clear();
    if (stick === null) {
      return;
    }
    const { origin, finger } = stick;
    graphics
      .lineStyle(2, TOUCH_STICK_COLOR, 0.35)
      .strokeCircle(origin.x, origin.y, TOUCH_STICK_RADIUS);
    graphics
      .fillStyle(TOUCH_STICK_COLOR, 0.35)
      .fillCircle(finger.x, finger.y, TOUCH_STICK_RADIUS / 2);
  };

  const toWorld = (touch: Touch): StickPoint => {
    const rect = scene.game.canvas.getBoundingClientRect();
    return {
      x: ((touch.clientX - rect.left) / rect.width) * PLAYFIELD_WIDTH,
      y: ((touch.clientY - rect.top) / rect.height) * PLAYFIELD_HEIGHT,
    };
  };

  const begin = (touchId: number, at: StickPoint): void => {
    stick = { touchId, origin: at, finger: at, direction: null, since: 0 };
    draw();
  };

  const onPointerDown = (
    pointer: Phaser.Input.Pointer,
    over: Phaser.GameObjects.GameObject[],
  ): void => {
    if (stick === null && pointer.wasTouch && over.length === 0) {
      begin(pointer.identifier, { x: pointer.worldX, y: pointer.worldY });
    }
  };

  const onMarginTouchStart = (event: TouchEvent): void => {
    const touch = event.changedTouches[0];
    if (stick === null && touch !== undefined && event.target !== scene.game.canvas) {
      begin(touch.identifier, toWorld(touch));
    }
  };

  const onTouchMove = (event: TouchEvent): void => {
    if (stick === null) {
      return;
    }
    for (const touch of Array.from(event.changedTouches)) {
      if (touch.identifier !== stick.touchId) {
        continue;
      }
      stick.finger = toWorld(touch);
      stick.origin = followStickOrigin(stick.origin, stick.finger);
      const direction = stickDirection(stick.origin, stick.finger);
      if (direction !== stick.direction) {
        stick.direction = direction;
        stick.since = performance.now();
      }
      draw();
    }
  };

  const onTouchEnd = (event: TouchEvent): void => {
    if (
      stick !== null &&
      Array.from(event.changedTouches).some((t) => t.identifier === stick?.touchId)
    ) {
      stick = null;
      draw();
    }
  };

  scene.input.on(Phaser.Input.Events.POINTER_DOWN, onPointerDown);
  window.addEventListener("touchstart", onMarginTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("touchcancel", onTouchEnd, { passive: true });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.input.off(Phaser.Input.Events.POINTER_DOWN, onPointerDown);
    window.removeEventListener("touchstart", onMarginTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onTouchEnd);
  });

  return () => {
    if (stick?.direction == null) {
      return NO_KEYS_HELD;
    }
    return { ...NO_KEYS_HELD, [stick.direction]: stick.since };
  };
}
