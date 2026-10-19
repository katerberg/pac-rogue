export function parseSlotMachineFlag(params: URLSearchParams): boolean {
  return params.get("slotMachine") === "1";
}
