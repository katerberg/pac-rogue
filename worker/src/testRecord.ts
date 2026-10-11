import { beginLevelLog, createRunLog, type RunLogRecord } from "../../src/domain/runLog";

export const INSTALL_ID = "11111111-1111-4111-8111-111111111111";
export const RUN_ID = "22222222-2222-4222-8222-222222222222";

export function finishedRecord(overrides: Partial<RunLogRecord> = {}): RunLogRecord {
  const record = createRunLog(
    {
      id: RUN_ID,
      installId: INSTALL_ID,
      gameVersion: "abc1234",
      startedAt: "2026-10-12T10:00:00.000Z",
      params: {},
    },
    "seed",
    false,
  );
  beginLevelLog(record, {
    level: 1,
    layout: "maze1",
    inverted: false,
    boss: false,
    countdownStart: 999,
    livesStart: 3,
  });
  return { ...record, outcome: "death", finalLevel: 1, pelletsCollected: 120, ...overrides };
}
