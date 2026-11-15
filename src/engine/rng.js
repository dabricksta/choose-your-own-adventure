// Seeded randomness. A run is reproducible from its seed, which is what lets
// the save/replay controls reroll the same world.

export function seedHash(seed) {
  let hash = 2166136261;
  for (const character of String(seed)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

export function randomSeed() {
  try {
    return [...crypto.getRandomValues(new Uint32Array(2))]
      .map(number => number.toString(36))
      .join('');
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function nextRandom(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}
