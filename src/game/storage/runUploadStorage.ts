import { parseUploadState, type UploadState } from "../../domain/runUpload";

export const RUN_UPLOAD_STORAGE_KEY = "pac-rogue.run-upload.v1";

function readStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function write(storage: Storage, state: UploadState): void {
  try {
    storage.setItem(RUN_UPLOAD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}

function storedState(storage: Storage | null): UploadState | null {
  try {
    return parseUploadState(storage?.getItem(RUN_UPLOAD_STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

export function loadUploadState(): UploadState {
  const storage = readStorage();
  const state = storedState(storage);
  if (state !== null) {
    return state;
  }
  const fresh = { since: new Date().toISOString(), uploaded: [] };
  if (storage !== null) {
    write(storage, fresh);
  }
  return fresh;
}

export function markUploaded(id: string): void {
  const storage = readStorage();
  const state = loadUploadState();
  if (storage !== null && !state.uploaded.includes(id)) {
    write(storage, { ...state, uploaded: [...state.uploaded, id] });
  }
}

export function forgetUploaded(ids: readonly string[]): void {
  const storage = readStorage();
  const state = storedState(storage);
  if (storage !== null && state !== null) {
    write(storage, { ...state, uploaded: state.uploaded.filter((id) => !ids.includes(id)) });
  }
}
