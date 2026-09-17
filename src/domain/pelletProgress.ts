export type PelletProgress = {
  boardCollected: number;
  pelletsRemaining: number;
  runRecorded: boolean;
};

export function createPelletProgress(totalPellets: number): PelletProgress {
  return {
    boardCollected: 0,
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

  const boardCollected = progress.boardCollected + removed;
  const pelletsRemaining = Math.max(0, progress.pelletsRemaining - removed);
  const shouldRecordClear = !progress.runRecorded && pelletsRemaining === 0 && boardCollected > 0;

  return {
    progress: {
      boardCollected,
      pelletsRemaining,
      runRecorded: progress.runRecorded || shouldRecordClear,
    },
    shouldRecordClear,
  };
}
