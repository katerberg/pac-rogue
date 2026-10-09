import {
  formatPercent,
  formatReach,
  sortUpgradeRows,
  summarize,
  upgradeRows,
  type RunScope,
  type SortKey,
  type UpgradeRow,
} from "../domain/runAnalytics";
import type { RunLogRecord } from "../domain/runLog";
import { UPGRADE_SCHOOL_LABELS } from "../domain/upgrades";

export type DataPageState = { scope: RunScope; sort: SortKey };

const SORT_COLUMNS: readonly { key: SortKey; label: string }[] = [
  { key: "runs", label: "Runs" },
  { key: "medianReach", label: "Median reach" },
  { key: "completeRate", label: "Win %" },
  { key: "pickRate", label: "Pick %" },
];

const SVG_NS = "http://www.w3.org/2000/svg";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) {
    node.setAttribute(name, String(value));
  }
  return node;
}

function share(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}

function reachChart(
  counts: readonly number[],
  baseline: readonly number[],
  size: { barWidth: number; height: number; labels: boolean },
): SVGSVGElement {
  const total = counts.reduce((sum, n) => sum + n, 0);
  const baseTotal = baseline.reduce((sum, n) => sum + n, 0);
  const peak = Math.max(
    ...counts.map((n) => share(n, total)),
    ...baseline.map((n) => share(n, baseTotal)),
    0.01,
  );
  const labelHeight = size.labels ? 14 : 0;
  const width = counts.length * size.barWidth;
  const chart = svg("svg", {
    width,
    height: size.height + labelHeight,
    class: "reach-chart",
    role: "img",
  });
  chart.append(svg("line", { x1: 0, x2: width, y1: size.height, y2: size.height, class: "axis" }));
  for (let bin = 0; bin < counts.length; bin += 1) {
    const x = bin * size.barWidth;
    const own = share(counts[bin]!, total);
    const base = share(baseline[bin]!, baseTotal);
    const baseHeight = (base / peak) * size.height;
    const ownHeight = (own / peak) * size.height;
    const inner = size.barWidth - 2;
    chart.append(
      svg("rect", {
        x: x + 1,
        y: size.height - baseHeight,
        width: inner,
        height: baseHeight,
        class: "bar-baseline",
      }),
    );
    if (ownHeight > 0) {
      chart.append(
        svg("rect", {
          x: x + 2,
          y: size.height - ownHeight,
          width: inner - 2,
          height: ownHeight,
          rx: Math.min(2, (inner - 2) / 2),
          class: "bar-own",
        }),
      );
    }
    if (size.labels) {
      const label = svg("text", {
        x: x + size.barWidth / 2,
        y: size.height + 11,
        class: "bin-label",
      });
      label.textContent = formatReach(bin + 1);
      chart.append(label);
    }
    const hit = svg("rect", { x, y: 0, width: size.barWidth, height: size.height, class: "hit" });
    const title = svg("title", {});
    title.textContent = `${formatReach(bin + 1)}: ${counts[bin]} of ${total} runs (${formatPercent(
      total === 0 ? null : own,
    )}) · all runs ${formatPercent(baseTotal === 0 ? null : base)}`;
    hit.append(title);
    chart.append(hit);
  }
  return chart;
}

function tile(label: string, value: string): HTMLElement {
  const box = el("div", "tile");
  box.append(el("div", "tile-value", value), el("div", "tile-label", label));
  return box;
}

function upgradeRow(row: UpgradeRow, baseline: readonly number[]): HTMLTableRowElement {
  const tr = el("tr", row.runs === 0 ? "unowned" : row.lowSample ? "low-sample" : "");
  tr.dataset.upgrade = row.id;
  const name = el("td", "name", row.label);
  if (row.lowSample && row.runs > 0) {
    name.append(el("span", "tag", "low sample"));
  }
  const chart = el("td", "chart");
  if (row.runs > 0) {
    chart.append(reachChart(row.reach, baseline, { barWidth: 12, height: 26, labels: false }));
  }
  tr.append(
    name,
    el("td", "school", UPGRADE_SCHOOL_LABELS[row.school]),
    el("td", "num", String(row.runs)),
    chart,
    el("td", "num", formatReach(row.medianReach)),
    el("td", "num", formatPercent(row.completeRate)),
    el("td", "num", row.medianLevelTaken === null ? "—" : formatReach(row.medianLevelTaken)),
    el("td", "num", row.runs === 0 ? "—" : String(row.plusRuns)),
    el(
      "td",
      "num",
      row.offered === 0 ? "—" : `${formatPercent(row.pickRate)} (${row.picked}/${row.offered})`,
    ),
  );
  return tr;
}

function checkbox(
  key: keyof RunScope,
  label: string,
  checked: boolean,
  onChange: (on: boolean) => void,
): HTMLElement {
  const wrap = el("label", "toggle");
  const input = el("input");
  input.type = "checkbox";
  input.dataset.toggle = key;
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  wrap.append(input, document.createTextNode(` ${label}`));
  return wrap;
}

export function renderDataPage(
  root: HTMLElement,
  data: { runs: readonly RunLogRecord[]; unreadable: number },
  state: DataPageState,
  options: { allowDebugToggle: boolean; onChange: (next: DataPageState) => void },
): void {
  const summary = summarize(data.runs, state.scope);
  const header = el("header");
  header.append(el("h1", "", "RUN DATA"));
  const notes = [
    `${summary.runs} runs`,
    summary.versions.length === 0 ? "" : `versions ${summary.versions.join(", ")}`,
    state.scope.includeDebug ? "debug runs included" : `${summary.debugRuns} debug runs hidden`,
    data.unreadable === 0 ? "" : `${data.unreadable} unreadable`,
  ].filter((note) => note !== "");
  header.append(el("p", "notes", notes.join(" · ")));

  const controls = el("div", "controls");
  controls.append(
    checkbox("includeUnfinished", "Include quit / abandoned", state.scope.includeUnfinished, (on) =>
      options.onChange({ ...state, scope: { ...state.scope, includeUnfinished: on } }),
    ),
  );
  if (options.allowDebugToggle) {
    controls.append(
      checkbox("includeDebug", "Include debug runs (agent port)", state.scope.includeDebug, (on) =>
        options.onChange({ ...state, scope: { ...state.scope, includeDebug: on } }),
      ),
    );
  }

  if (summary.runs === 0) {
    const empty = el("section", "empty");
    const back = el("a", "", "Back to the game");
    back.href = "../";
    empty.append(el("h2", "", "NO RUNS YET"), back);
    root.replaceChildren(header, controls, empty);
    return;
  }

  const strip = el("section", "summary");
  const overall = el("div", "overall");
  overall.append(
    el("div", "tile-label", "Where all runs ended"),
    reachChart(summary.reach, summary.reach, { barWidth: 28, height: 60, labels: true }),
  );
  strip.append(
    tile("Runs", String(summary.runs)),
    tile("Win rate", formatPercent(summary.completeRate)),
    tile("Median reach", formatReach(summary.medianReach)),
    overall,
  );

  const legend = el("div", "legend");
  legend.append(
    el("span", "swatch swatch-own"),
    document.createTextNode(" runs with this upgrade   "),
    el("span", "swatch swatch-baseline"),
    document.createTextNode(" all runs · bars run L1–L9, then WIN"),
  );

  const table = el("table", "upgrades");
  const head = el("tr");
  const headers: (string | SortKey)[] = [
    "Upgrade",
    "School",
    "runs",
    "Where runs ended",
    "medianReach",
    "completeRate",
    "Median level taken",
    "Plus",
    "pickRate",
  ];
  for (const column of headers) {
    const sortable = SORT_COLUMNS.find((c) => c.key === column);
    const th = el("th");
    if (sortable === undefined) {
      th.textContent = column;
    } else {
      const button = el(
        "button",
        state.sort === sortable.key ? "sort active" : "sort",
        sortable.label,
      );
      button.dataset.sort = sortable.key;
      button.addEventListener("click", () => options.onChange({ ...state, sort: sortable.key }));
      th.append(button);
    }
    head.append(th);
  }
  const body = el("tbody");
  for (const row of sortUpgradeRows(upgradeRows(data.runs, state.scope), state.sort)) {
    body.append(upgradeRow(row, summary.reach));
  }
  table.append(el("thead"), body);
  table.tHead!.append(head);

  const tableWrap = el("div", "table-wrap");
  tableWrap.append(table);
  root.replaceChildren(header, controls, strip, legend, tableWrap);
}
