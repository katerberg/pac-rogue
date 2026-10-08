export const PLAYFIELD_WIDTH = 800;
export const PLAYFIELD_HEIGHT = 600;
/** Bottom inset shared by the maze and the lives / shield HUD row. */
export const HUD_BOTTOM_MARGIN_PX = 8;
/**
 * Top inset so the maze clears the BONUS / TIME HUD (bar at y=8, art h=16)
 * with the same 8px gap used at the bottom.
 */
export const HUD_TOP_MARGIN_PX = 8 + 16 + HUD_BOTTOM_MARGIN_PX;
