import {
  MAZE_CURATOR_STORAGE_KEY,
  candidatesFingerprint,
  decideCandidate,
  exportPool,
  keptCount,
  nextUndecidedIndex,
  parseCandidatesFile,
  parseCuratorState,
  remainingCount,
  undoLastDecision,
  type MazeCandidate,
  type MazeCandidatesFile,
  type MazeCandidateDecision,
  type MazeCuratorState,
} from "../domain/mazeCandidate";
import { renderBoard } from "./renderBoard";
import "./mazes.css";

const root = document.getElementById("mazes-root")!;

type LoadResult =
  { kind: "ok"; file: MazeCandidatesFile } | { kind: "missing" } | { kind: "unreadable" };

async function loadCandidates(): Promise<LoadResult> {
  try {
    const res = await fetch("./candidates.json", { cache: "no-store" });
    if (res.status === 404 || res.status === 204) {
      return { kind: "missing" };
    }
    if (!res.ok) {
      return { kind: "unreadable" };
    }
    const parsed = parseCandidatesFile(await res.json());
    if (parsed === null) {
      return { kind: "unreadable" };
    }
    return { kind: "ok", file: parsed };
  } catch {
    return { kind: "unreadable" };
  }
}

function saveState(state: MazeCuratorState): void {
  localStorage.setItem(MAZE_CURATOR_STORAGE_KEY, JSON.stringify(state));
}

function downloadPool(candidates: readonly MazeCandidate[], state: MazeCuratorState): void {
  const pool = exportPool(candidates, state);
  const blob = new Blob([`${JSON.stringify(pool, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "maze-pool.json";
  a.click();
  URL.revokeObjectURL(url);
}

function button(
  label: string,
  className: string,
  onClick: () => void,
  disabled = false,
): HTMLButtonElement {
  const node = document.createElement("button");
  node.type = "button";
  node.className = className;
  node.textContent = label;
  node.disabled = disabled;
  node.addEventListener("click", onClick);
  return node;
}

function emptyMessage(kind: "missing" | "unreadable"): HTMLElement {
  const box = document.createElement("div");
  box.className = "empty-state";
  if (kind === "missing") {
    box.innerHTML =
      "<p>No candidates found.</p><p>Run <code>npm run maze:generate</code> (default 500), then reload this page.</p>";
  } else {
    box.innerHTML =
      "<p>Candidates file is unreadable. Regenerate with <code>npm run maze:generate</code>.</p>";
  }
  return box;
}

function mountCurator(file: MazeCandidatesFile): void {
  const fingerprint = candidatesFingerprint(file);
  let state = parseCuratorState(localStorage.getItem(MAZE_CURATOR_STORAGE_KEY), fingerprint);
  saveState(state);

  const title = document.createElement("h1");
  title.textContent = "MAZE CURATOR";
  const notes = document.createElement("p");
  notes.className = "notes";
  notes.textContent =
    "Yes keeps a board for the pool export. No skips it. Decisions persist in this browser until Reset.";

  const hud = document.createElement("div");
  hud.className = "hud";
  const boardWrap = document.createElement("div");
  boardWrap.className = "board-wrap";
  const actions = document.createElement("div");
  actions.className = "actions";
  const done = document.createElement("div");
  done.className = "done-state";
  done.hidden = true;

  root.replaceChildren(title, notes, hud, boardWrap, actions, done);

  function paint(): void {
    const idx = nextUndecidedIndex(file.candidates, state);
    const kept = keptCount(state);
    const remaining = remainingCount(file.candidates, state);
    const current = file.candidates[idx];

    hud.replaceChildren();
    const stats: Array<[string, string]> = [
      ["Progress", `${Math.min(idx + 1, file.candidates.length)} / ${file.candidates.length}`],
      ["Kept", String(kept)],
      ["Remaining", String(remaining)],
      ["Reviewed", String(Object.keys(state.decisions).length)],
    ];
    if (current) {
      stats.push(["Id", String(current.id)]);
      stats.push(["Pellets", String(current.pelletCount)]);
      stats.push(["Tunnels", String(current.tunnels.length)]);
      stats.push(["Seed", current.seedUsed]);
    }
    for (const [label, value] of stats) {
      const span = document.createElement("span");
      span.append(`${label}: `);
      const strong = document.createElement("strong");
      strong.textContent = value;
      span.appendChild(strong);
      hud.appendChild(span);
    }

    boardWrap.replaceChildren();
    actions.replaceChildren();
    done.hidden = true;

    if (!current) {
      done.hidden = false;
      done.replaceChildren();
      const p1 = document.createElement("p");
      p1.append(`All ${file.candidates.length} candidates reviewed. Kept `);
      const keptStrong = document.createElement("strong");
      keptStrong.textContent = String(kept);
      p1.append(keptStrong, ".");
      const p2 = document.createElement("p");
      p2.append("Download ");
      const code = document.createElement("code");
      code.textContent = "maze-pool.json";
      p2.append(code, " for the follow-up wiring PR.");
      done.append(p1, p2);
      actions.append(...sharedActions(kept));
      return;
    }

    boardWrap.appendChild(renderBoard(current.ascii));
    actions.append(
      button("NO", "no", () => decide(current.id, "no")),
      button("YES", "yes", () => decide(current.id, "yes")),
      ...sharedActions(kept),
    );
    const keys = document.createElement("span");
    keys.className = "keys";
    keys.textContent = "Keys: Y / → yes · N / ← no · U undo";
    actions.appendChild(keys);
  }

  const commit = (next: MazeCuratorState): void => {
    state = next;
    saveState(state);
    paint();
  };
  const decide = (id: number, decision: MazeCandidateDecision): void => {
    commit(decideCandidate(state, id, decision));
  };
  const undo = (): void => {
    commit(undoLastDecision(state));
  };
  const reset = (): void => {
    commit(parseCuratorState(null, fingerprint));
  };
  const sharedActions = (kept: number): HTMLButtonElement[] => [
    button("UNDO", "", undo, state.order.length === 0),
    button("DOWNLOAD POOL", "", () => downloadPool(file.candidates, state), kept === 0),
    button("RESET", "", reset),
  ];

  window.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    const key = event.key.toLowerCase();
    const current = file.candidates[nextUndecidedIndex(file.candidates, state)];
    if ((key === "y" || key === "arrowright") && current) {
      event.preventDefault();
      decide(current.id, "yes");
    } else if ((key === "n" || key === "arrowleft") && current) {
      event.preventDefault();
      decide(current.id, "no");
    } else if (key === "u") {
      event.preventDefault();
      undo();
    }
  });

  paint();
}

async function boot(): Promise<void> {
  root.replaceChildren();
  const title = document.createElement("h1");
  title.textContent = "MAZE CURATOR";
  const loading = document.createElement("p");
  loading.className = "notes";
  loading.textContent = "Loading candidates…";
  root.append(title, loading);

  const loaded = await loadCandidates();
  if (loaded.kind !== "ok") {
    root.replaceChildren(title, emptyMessage(loaded.kind));
    return;
  }
  mountCurator(loaded.file);
}

void boot();
