import ports from "../../scripts/ports.json";

const AGENT_PORTS = new Set([String(ports.agentDev), String(ports.agentPreview)]);

export function isAgentPort(port: string): boolean {
  return AGENT_PORTS.has(port);
}

/** Human ports: on. Agent ports: off unless `?sound=1`. */
export function isSoundEnabled(params: URLSearchParams, port: string): boolean {
  if (!isAgentPort(port)) {
    return true;
  }
  return params.get("sound") === "1";
}
