import { summarize } from "../domain/runAnalytics";
import { isAgentPort } from "../domain/soundFlag";
import { loadAllRuns } from "../game/storage/runLogStorage";
import { renderDataPage, type DataPageState } from "./dataPage";
import "./data.css";

const root = document.getElementById("data-root")!;
const agentPort = isAgentPort(location.port);
const data = loadAllRuns();
let state: DataPageState = {
  scope: { includeUnfinished: false, includeDebug: false },
  sort: "medianReach",
};

function render(): void {
  renderDataPage(root, data, state, {
    allowDebugToggle: agentPort,
    onChange: (next) => {
      state = next;
      render();
    },
  });
}

render();

if (agentPort) {
  (window as unknown as { __PAC_ROGUE_DEBUG__: unknown }).__PAC_ROGUE_DEBUG__ = {
    snapshot: () => {
      const rows = [...root.querySelectorAll<HTMLTableRowElement>("tbody tr")];
      return {
        data: {
          stored: data.runs.length,
          shownRuns: summarize(data.runs, state.scope).runs,
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
