export type PelletProgress = {
  collectedCount: number;
  pelletsRemaining: number;
  runRecorded: boolean;
};

export function createPelletProgress(totalPellets: number): PelletProgress {
  return {
    collectedCount: 0,
    pelletsRemaining: Math.max(0, totalPellets),
    runRecorded: false,
  };
}

export function applyPelletCollect(
  progress: PelletProgress,
  removed: number,
): { progress: PelletProgress; shouldRecordClear: boolean } {
  if (removed <= 0) {
    return { progress, shouldRecordClear: false };
  }

  const collectedCount = progress.collectedCount + removed;
  const pelletsRemaining = Math.max(0, progress.pelletsRemaining - removed);
  const shouldRecordClear = !progress.runRecorded && pelletsRemaining === 0 && collectedCount > 0;

  return {
    progress: {
      collectedCount,
      pelletsRemaining,
      runRecorded: progress.runRecorded || shouldRecordClear,
    },
    shouldRecordClear,
  };
}
