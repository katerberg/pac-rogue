type AgentLogPayload = {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: number;
};

const LOG_PATH = "/opt/cursor/logs/debug.log";

type FsAppend = { appendFileSync: (path: string, data: string) => void };

let cachedFs: FsAppend | null | undefined;

function nodeFs(): FsAppend | null {
  if (cachedFs !== undefined) {
    return cachedFs;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedFs = require("node:fs") as FsAppend;
    return cachedFs;
  } catch {
    /* continue */
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedFs = require("fs") as FsAppend;
    return cachedFs;
  } catch {
    cachedFs = null;
    return null;
  }
}

function appendLine(line: string): void {
  const fs = nodeFs();
  if (fs) {
    try {
      fs.appendFileSync(LOG_PATH, line);
      return;
    } catch {
      /* fall through to fetch */
    }
  }
  try {
    void fetch("/__agent_debug_log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: line,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function agentLog(payload: AgentLogPayload): void {
  // #region agent log
  appendLine(
    JSON.stringify({
      ...payload,
      data: payload.data ?? {},
      timestamp: payload.timestamp ?? Date.now(),
    }) + "\n",
  );
  // #endregion
}
