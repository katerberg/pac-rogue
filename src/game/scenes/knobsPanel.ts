import { PLAYFIELD_WIDTH } from "../../domain/playfield";
import {
  DEFAULT_TUNING,
  effectiveGhostTilesPerSec,
  parseHexColor,
  type Tuning,
  type TuningKey,
} from "../../domain/tuning";
import {
  formatKnobValue,
  LEFT_KNOB_GROUPS,
  RIGHT_KNOB_GROUPS,
  TUNING_KNOBS,
  type KnobDef,
  type KnobGroup,
} from "../../domain/tuningKnobs";
import { colorToCssHex } from "../../domain/maze";

export type KnobsPanelLayout = { offsetX: number; mazeBottomY: number };

export type KnobsPanelOptions = {
  canvas: HTMLCanvasElement;
  tuning: Tuning;
  level: number;
  layout: () => KnobsPanelLayout;
  onChange: (tuning: Tuning) => void;
  onRestart: () => void;
  onReset: () => void;
};

export type KnobsPanel = {
  sync: (level: number) => void;
  destroy: () => void;
};

type KnobRow = { knob: KnobDef; sync: (value: Tuning[TuningKey]) => void };

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: HTMLElement[] = [],
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

export function createKnobsPanel(opts: KnobsPanelOptions): KnobsPanel {
  let tuning = opts.tuning;
  let level = opts.level;
  const rows: KnobRow[] = [];
  const ghostEffective = el("div", { id: "knob-ghost-effective", className: "knob-readout" });

  const setValue = (key: TuningKey, value: Tuning[TuningKey]): void => {
    tuning = { ...tuning, [key]: value };
    for (const row of rows) {
      if (row.knob.key === key) {
        row.sync(value);
      }
    }
    refreshReadout();
    opts.onChange(tuning);
  };

  const refreshReadout = (): void => {
    ghostEffective.textContent = `Ghost speed now: ${effectiveGhostTilesPerSec(tuning, level).toFixed(2)} tiles/s`;
  };

  const resetButton = (key: TuningKey): HTMLButtonElement => {
    const button = el("button", { className: "knob-reset", textContent: "↺", title: "Default" });
    button.addEventListener("click", () => setValue(key, DEFAULT_TUNING[key]));
    return button;
  };

  const buildRow = (knob: KnobDef): HTMLElement => {
    const reset = resetButton(knob.key);
    const header = el("div", { className: "knob-header" }, [
      el("span", { className: "knob-label", textContent: knob.label }),
    ]);
    const row = el("div", { className: "knob-row" }, [header]);
    row.dataset.knob = knob.key;
    const markDefault = (value: Tuning[TuningKey]): void => {
      reset.style.visibility = value === DEFAULT_TUNING[knob.key] ? "hidden" : "visible";
    };

    if (knob.kind === "range") {
      const valueText = el("span", { id: `knob-${knob.key}-value`, className: "knob-value" });
      const input = el("input", {
        id: `knob-${knob.key}`,
        type: "range",
        min: String(knob.min),
        max: String(knob.max),
        step: String(knob.step),
      });
      input.addEventListener("input", () => setValue(knob.key, Number(input.value)));
      input.addEventListener("change", () => input.blur());
      header.append(valueText, reset);
      row.append(input);
      rows.push({
        knob,
        sync: (value) => {
          input.value = String(value);
          valueText.textContent = formatKnobValue(knob, Number(value));
          markDefault(value);
        },
      });
    } else if (knob.kind === "color") {
      const picker = el("input", { id: `knob-${knob.key}-picker`, type: "color" });
      const hex = el("input", { id: `knob-${knob.key}-hex`, type: "text", className: "knob-hex" });
      picker.addEventListener("input", () => {
        const color = parseHexColor(picker.value);
        if (color !== null) {
          setValue(knob.key, color);
        }
      });
      const commitHex = (): void => {
        const color = parseHexColor(hex.value);
        if (color === null) {
          hex.value = colorToCssHex(Number(tuning[knob.key]));
          return;
        }
        setValue(knob.key, color);
      };
      hex.addEventListener("change", commitHex);
      hex.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          hex.blur();
        }
      });
      header.append(reset);
      row.append(el("div", { className: "knob-color" }, [picker, hex]));
      rows.push({
        knob,
        sync: (value) => {
          picker.value = colorToCssHex(Number(value));
          hex.value = colorToCssHex(Number(value));
          markDefault(value);
        },
      });
    } else {
      const box = el("input", { id: `knob-${knob.key}`, type: "checkbox" });
      box.addEventListener("change", () => {
        setValue(knob.key, box.checked);
        box.blur();
      });
      header.append(box, reset);
      rows.push({
        knob,
        sync: (value) => {
          box.checked = value === true;
          markDefault(value);
        },
      });
    }
    return row;
  };

  const buildPanel = (id: string, groups: readonly KnobGroup[]): HTMLDivElement => {
    const panel = el("div", { id, className: "knobs-panel" });
    for (const group of groups) {
      panel.append(el("h3", { textContent: group }));
      for (const knob of TUNING_KNOBS.filter((k) => k.group === group)) {
        panel.append(buildRow(knob));
      }
      if (group === "Ghost speed") {
        panel.append(ghostEffective);
      }
    }
    panel.addEventListener("keydown", (event) => event.stopPropagation());
    panel.addEventListener("keyup", (event) => event.stopPropagation());
    return panel;
  };

  const left = buildPanel("knobs-left", LEFT_KNOB_GROUPS);
  const resetAll = el("button", {
    id: "knobs-reset",
    className: "knobs-reset",
    textContent: "RESET OPTIONS",
  });
  resetAll.addEventListener("click", () => opts.onReset());
  left.prepend(resetAll);
  const right = buildPanel("knobs-right", RIGHT_KNOB_GROUPS);
  const restart = el("button", {
    id: "knobs-restart",
    className: "knobs-restart",
    textContent: "RESTART",
  });
  restart.addEventListener("click", () => opts.onRestart());

  for (const row of rows) {
    row.sync(tuning[row.knob.key]);
  }
  refreshReadout();

  let laidOut = "";
  const relayout = (): void => {
    const rect = opts.canvas.getBoundingClientRect();
    const { offsetX, mazeBottomY } = opts.layout();
    const key = [rect.left, rect.top, rect.width, rect.height, offsetX, mazeBottomY].join();
    if (key === laidOut) {
      return;
    }
    laidOut = key;
    const scale = rect.width / PLAYFIELD_WIDTH;
    const width = `${Math.max(0, offsetX * scale)}px`;
    for (const [panel, x] of [
      [left, rect.left],
      [right, rect.left + (PLAYFIELD_WIDTH - offsetX) * scale],
    ] as const) {
      panel.style.left = `${x}px`;
      panel.style.top = `${rect.top}px`;
      panel.style.width = width;
      panel.style.height = `${rect.height}px`;
    }
    restart.style.left = `${rect.left + rect.width / 2}px`;
    restart.style.top = `${rect.top + mazeBottomY * scale + 2}px`;
  };

  document.body.append(left, right, restart);
  relayout();
  window.addEventListener("resize", relayout);

  return {
    sync: (next) => {
      if (next !== level) {
        level = next;
        refreshReadout();
      }
      relayout();
    },
    destroy: () => {
      window.removeEventListener("resize", relayout);
      left.remove();
      right.remove();
      restart.remove();
    },
  };
}
