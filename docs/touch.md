# Touch play

Phones and tablets can play with a floating virtual stick. The goal is "explorable, level 1 playable", not parity with keyboard play; the limitations below are known and accepted.

## Controls

- **Stick:** put a finger down anywhere that is not a button (the maze, the HUD gutters or the black page margins) and drag. The stick steers like the arrow keys: the dominant drag axis wins, and the ring follows the finger so reversing never needs a long swipe back. Lifting the finger releases the "key". Thresholds are in `src/domain/touchStick.ts`; the bridge is `createTouchStick` in `src/game/systems/playerInput.ts`, merged with the keyboard through `mergeHeldKeys`, so `PlayScene` and LEARN both get it.
- **Taps:** any tap counts as the "any key" press that dismisses the starting-upgrade card or a BONUS slot result. Menus, the level-clear upgrade cards, store prompts and the run-end menu were already pointer-driven.
- The faint ring and knob draw only while a finger is down on the canvas; a stick started in the page margin works but is not drawn.

## Desktop is unchanged

The stick only reacts to touches (`pointer.wasTouch` and DOM touch events), so mouse clicks and the keyboard behave exactly as before. The CSS on `#game-container` (`touch-action: none`, no text selection or callout) only stops browser gestures on the game area.

## Limitations

- **No pause on touch:** pausing needs Escape, so a phone run cannot open the pause menu or quit mid-run (reload instead).
- **Hover-only info:** upgrade hover previews (HUD icons, LEARN checklist) need a mouse.
- **Small text:** the canvas is fitted to the screen, so card text is small on a phone; landscape is best. Portrait works and leaves a large margin under the canvas for the stick.
- **One finger:** a second finger is ignored while the stick is held.
- Untested on real devices so far; verified with Playwright touch emulation only.

## Verifying

`npm run probe -- --touch --viewport 844x390` emulates a touchscreen; `tap:`, `touchDown:`, `touchMove:` and `touchUp` take game coordinates, and values outside the playfield land in the page margin (`npm run probe -- --help`).
