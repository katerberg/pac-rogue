/** Temporary debug-mode sink → Vite middleware → /opt/cursor/logs/debug.log */
export function agentDebugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {},
): void {
  // #region agent log
  const body = JSON.stringify({
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  });
  fetch("/__agent_debug_log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
  // #endregion
}
