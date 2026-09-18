export function pickUniformPelletEids(
  candidateEids: readonly number[],
  count: number,
  rng: () => number,
): number[] {
  if (count <= 0 || candidateEids.length === 0) {
    return [];
  }

  const pool = [...candidateEids];
  const take = Math.min(count, pool.length);
  const picked: number[] = [];
  for (let i = 0; i < take; i += 1) {
    const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
    picked.push(pool[index]!);
    pool.splice(index, 1);
  }
  return picked;
}
