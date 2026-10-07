/** Focus row indices for SettingsScene (music, sfx, maze color, style, back). */
export const SETTINGS_FOCUS_GHOST_STYLE = 3;
export const SETTINGS_FOCUS_COUNT = 5;

/**
 * Resolve the Settings list focus after create / STYLE restart.
 * Invalid or missing values fall back to the top row (0).
 */
export function resolveSettingsFocusIndex(
  focusIndex: number | undefined,
  focusCount: number = SETTINGS_FOCUS_COUNT,
): number {
  if (
    focusIndex === undefined ||
    !Number.isInteger(focusIndex) ||
    focusIndex < 0 ||
    focusIndex >= focusCount
  ) {
    return 0;
  }
  return focusIndex;
}
