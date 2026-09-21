export function shouldAutoPlay(params: URLSearchParams): boolean {
  return params.get("play") === "1";
}
