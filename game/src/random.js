// Sunset Courier — deterministic randomness: a small seeded generator and
// smooth value noise, so the archipelago is the same every run.

/** mulberry32: a tiny seeded PRNG returning [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A smooth interpolation curve (smootherstep) for noise blending. */
function smooth(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** 2D value noise on a lattice of random values. */
export function makeNoise2D(seed, cellSize) {
  const rand = mulberry32(seed);
  const grid = new Map();
  const lattice = (ix, iz) => {
    const key = ix + ',' + iz;
    let v = grid.get(key);
    if (v === undefined) {
      v = rand();
      grid.set(key, v);
    }
    return v;
  };
  return function noise(x, z) {
    const gx = x / cellSize;
    const gz = z / cellSize;
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = smooth(gx - ix);
    const fz = smooth(gz - iz);
    const a = lattice(ix, iz);
    const b = lattice(ix + 1, iz);
    const c = lattice(ix, iz + 1);
    const d = lattice(ix + 1, iz + 1);
    const top = a + (b - a) * fx;
    const bottom = c + (d - c) * fx;
    return top + (bottom - top) * fz; // 0..1
  };
}

/** Fractal noise: several octaves of value noise summed. */
export function makeFractalNoise(seed, baseCell, octaves) {
  const layers = [];
  for (let o = 0; o < octaves; o++) {
    layers.push({ noise: makeNoise2D(seed + o * 7919, baseCell / Math.pow(2, o)), amp: Math.pow(0.5, o) });
  }
  let total = 0;
  for (const layer of layers) total += layer.amp;
  return function fractal(x, z) {
    let sum = 0;
    for (const layer of layers) sum += layer.noise(x, z) * layer.amp;
    return sum / total; // 0..1
  };
}
