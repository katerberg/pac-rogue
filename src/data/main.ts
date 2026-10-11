import { summarize } from "../domain/runAnalytics";
import { parseRunExport, type RunExport } from "../domain/runExport";
import { isAgentPort } from "../domain/soundFlag";
import { loadAllRuns } from "../game/storage/runLogStorage";
import { renderDataPage, type DataPageState } from "./dataPage";
import "./data.css";

type Source = "local" | "global";
type GlobalData = RunExport | "loading" | "missing" | "unreadable" | null;

const root = document.getElementById("data-root")!;
const agentPort = isAgentPort(location.port);
const local = loadAllRuns();
let source: Source = "local";
let globalData: GlobalData = null;
let state: DataPageState = {
  scope: { includeUnfinished: false, includeDebug: false },
  sort: "medianReach",
};

function shownData(): { runs: RunExport["runs"]; unreadable: number } | null {
  if (source === "local") {
    return local;
  }
  return typeof globalData === "object" && globalData !== null ? globalData : null;
}

function button(label: string, onClick: () => void, active = false): HTMLButtonElement {
  const node = document.createElement("button");
  node.className = active ? "source active" : "source";
  node.textContent = label;
  node.addEventListener("click", onClick);
  return node;
}

function sourceBar(): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "source-bar";
  const browser = button("THIS BROWSER", () => select("local"), source === "local");
  browser.dataset.source = "local";
  const global = button("GLOBAL (PULLED)", () => select("global"), source === "global");
  global.dataset.source = "global";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "application/json,.json";
  fileInput.hidden = true;
  fileInput.dataset.load = "file";
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file !== undefined) {
      void file.text().then((text) => useExport(text));
    }
  });
  const load = button("LOAD FILE…", () => fileInput.click());
  bar.append(browser, global, load, fileInput);
  if (source === "global" && typeof globalData === "object" && globalData !== null) {
    const note = document.createElement("span");
    note.className = "source-note";
    note.textContent = `exported ${globalData.exportedAt.slice(0, 16).replace("T", " ")} UTC · ${globalData.runs.length} runs`;
    bar.append(note);
  }
  return bar;
}

function useExport(text: string): void {
  let parsed: RunExport | null = null;
  try {
    parsed = parseRunExport(JSON.parse(text));
  } catch {
    parsed = null;
  }
  globalData = parsed ?? "unreadable";
  source = "global";
  render();
}

function select(next: Source): void {
  source = next;
  if (source === "global" && globalData === null) {
    globalData = "loading";
    fetch("./export.json", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok || response.status === 204) {
          globalData = "missing";
          render();
          return;
        }
        useExport(await response.text());
      })
      .catch(() => {
        globalData = "missing";
        render();
      });
  }
  render();
}

function message(text: string): HTMLElement {
  const section = document.createElement("section");
  section.className = "empty";
  const heading = document.createElement("h2");
  heading.textContent = text;
  section.append(heading);
  return section;
}

function render(): void {
  const data = shownData();
  if (data === null) {
    const text =
      globalData === "loading"
        ? "LOADING…"
        : globalData === "unreadable"
          ? "UNREADABLE EXPORT"
          : "NO PULLED DATA — RUN npm run data:pull";
    root.replaceChildren(sourceBar(), message(text));
    return;
  }
  renderDataPage(root, data, state, {
    allowDebugToggle: agentPort,
    onChange: (next) => {
      state = next;
      render();
    },
  });
  root.prepend(sourceBar());
}

render();

if (agentPort) {
  (window as unknown as { __PAC_ROGUE_DEBUG__: unknown }).__PAC_ROGUE_DEBUG__ = {
    snapshot: () => {
      const data = shownData();
      const rows = [...root.querySelectorAll<HTMLTableRowElement>("tbody tr")];
      return {
        data: {
          source,
          globalState:
            typeof globalData === "string" ? globalData : globalData === null ? null : "ok",
          stored: data?.runs.length ?? 0,
          shownRuns: data === null ? 0 : summarize(data.runs, state.scope).runs,
          rows: rows.length,
          charts: root.querySelectorAll("td.chart svg").length,
          topUpgrade: rows[0]?.dataset.upgrade ?? null,
          sort: state.sort,
          empty: root.querySelector(".empty") !== null,
        },
      };
    },
  };
}
