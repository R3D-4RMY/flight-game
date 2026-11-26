// Sunset Courier — the archipelago: a seeded heightfield of islands in a
// sea, with a flattened airfield, per-cell colours, and palm trees.

import { WORLD, PLANE } from './config.js';
import { makeFractalNoise, mulberry32 } from './random.js';

const N = Math.floor(WORLD.size / WORLD.cell); // cells per side
const HALF = WORLD.size / 2;

const ISLANDS = [
  { x: 0, z: 0, r: 950, peak: 52 }, // home island, holds the airfield
  { x: 880, z: 640, r: 520, peak: 96 }, // north-east peak
  { x: -880, z: 420, r: 470, peak: 72 }, // west island
  { x: -320, z: -880, r: 560, peak: 82 }, // south island
  { x: 640, z: -720, r: 260, peak: 30 }, // south-east islet
  { x: -950, z: -720, r: 230, peak: 26 }, // south-west islet
  { x: 1150, z: -250, r: 300, peak: 44 }, // east islet
];

function falloff(d, r) {
  const t = Math.max(0, 1 - d / r);
  return t * t * (3 - 2 * t);
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Blend a value toward a target inside a rectangle, for the airfield. */
function flattenBlend(x, z) {
  const rw = PLANE.runway;
  // The strip runs north-south: halfWidth across x, halfLength along z.
  const dx = Math.max(0, Math.abs(x - rw.x) - (rw.halfWidth + 70));
  const dz = Math.max(0, Math.abs(z - rw.z) - (rw.halfLength + 70));
  const d = Math.hypot(dx, dz);
  return clamp(1 - d / 90, 0, 1);
}

class Terrain {
  constructor() {
    this.n = N;
    this.cell = WORLD.cell;
    this.heights = new Float32Array((N + 1) * (N + 1));
    this.cellColors = new Array(N * N);
    this.cellHeight = new Float32Array(N * N);
    this.trees = [];
    this.generate();
  }

  generate() {
    const noise = makeFractalNoise(WORLD.seed, 420, 4);
    const rand = mulberry32(WORLD.seed + 31);
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const x = -HALF + i * WORLD.cell;
        const z = -HALF + j * WORLD.cell;
        let h = -7; // sea floor
        let mask = 0;
        for (const isle of ISLANDS) {
          const d = Math.hypot(x - isle.x, z - isle.z);
          const f = falloff(d, isle.r);
          if (f > 0) {
            h += isle.peak * f;
            mask = Math.max(mask, f);
          }
        }
        h += (noise(x, z) - 0.5) * 26 * mask;
        // Flatten the airfield so the runway sits on level ground.
        const blend = flattenBlend(x, z);
        h = h * (1 - blend) + PLANE.runway.height * blend;
        this.heights[j * (N + 1) + i] = h;
      }
    }
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const idx = j * N + i;
        const h00 = this.heights[j * (N + 1) + i];
        const h10 = this.heights[j * (N + 1) + i + 1];
        const h01 = this.heights[(j + 1) * (N + 1) + i];
        const h11 = this.heights[(j + 1) * (N + 1) + i + 1];
        const avg = (h00 + h10 + h01 + h11) / 4;
        this.cellHeight[idx] = avg;
        const slope = Math.max(Math.abs(h10 - h00), Math.abs(h01 - h00)) / WORLD.cell;
        this.cellColors[idx] = this.colorFor(avg, slope, rand);
        if (avg > 4 && avg < 42 && rand() < 0.16) {
          const tx = -HALF + (i + rand()) * WORLD.cell;
          const tz = -HALF + (j + rand()) * WORLD.cell;
          this.trees.push({ x: tx, z: tz, s: 5 + rand() * 5, lean: (rand() - 0.5) * 0.3 });
        }
      }
    }
  }

  colorFor(h, slope, rand) {
    let base;
    if (h < 1) base = [222, 196, 132]; // sand
    else if (h < 22) base = [109, 163, 68]; // grass
    else if (h < 48) base = [63, 122, 58]; // forest
    else if (h < 80) base = [138, 122, 104]; // rock
    else if (h < 105) base = [181, 168, 154]; // pale rock
    else base = [232, 230, 224]; // snowcap
    const shade = clamp(1 - slope * 1.6, 0.62, 1) * (0.9 + rand() * 0.2);
    const r = Math.round(base[0] * shade);
    const g = Math.round(base[1] * shade);
    const b = Math.round(base[2] * shade);
    return `rgb(${r},${g},${b})`;
  }

  /** Bilinear height at a world (x, z); sea floor outside the grid. */
  heightAt(x, z) {
    const gx = (x + HALF) / WORLD.cell;
    const gz = (z + HALF) / WORLD.cell;
    const i = clamp(Math.floor(gx), 0, N - 1);
    const j = clamp(Math.floor(gz), 0, N - 1);
    const fx = clamp(gx - i, 0, 1);
    const fz = clamp(gz - j, 0, 1);
    const h00 = this.heights[j * (N + 1) + i];
    const h10 = this.heights[j * (N + 1) + i + 1];
    const h01 = this.heights[(j + 1) * (N + 1) + i];
    const h11 = this.heights[(j + 1) * (N + 1) + i + 1];
    return h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz) + h01 * (1 - fx) * fz + h11 * fx * fz;
  }
}

export const terrain = new Terrain();

// ------------------------------------------------------------------ drawing

/** Paint the sea: a gradient from the horizon down, with a sun glint. */
function drawSea(ctx, camera, sky, width, height) {
  const hy = camera.horizonY();
  if (hy >= height) return; // camera looks at sky only
  const top = Math.max(0, hy);
  const grad = ctx.createLinearGradient(0, top, 0, height);
  grad.addColorStop(0, sky.horizon);
  grad.addColorStop(0.25, '#3f7fae');
  grad.addColorStop(1, '#123a5c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, top, width, height - top);
  // Sun glint: a soft pool of light on the water under the sun.
  const sunX = width * (0.5 + sky.sun.az * 0.55);
  const glint = ctx.createRadialGradient(sunX, top, 0, sunX, top, 300);
  glint.addColorStop(0, 'rgba(255, 230, 170, 0.30)');
  glint.addColorStop(1, 'rgba(255, 230, 170, 0)');
  ctx.fillStyle = glint;
  ctx.beginPath();
  ctx.ellipse(sunX, top + 40, 300, 110, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw the terrain cells, far to near, with distance LOD. */
function drawTerrainCells(ctx, camera) {
  const cam = camera.position;
  const list = [];
  const n = N;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const cx = -HALF + (i + 0.5) * WORLD.cell;
      const cz = -HALF + (j + 0.5) * WORLD.cell;
      const dx = cx - cam[0];
      const dz = cz - cam[2];
      const dist = dx * dx + dz * dz;
      if (dist > WORLD.viewDistance * WORLD.viewDistance) continue;
      const fwd = (dx * camera.forward[0] + dz * camera.forward[2]);
      if (fwd < -120) continue; // behind the camera
      if (terrain.cellHeight[j * n + i] < -1) continue; // under water
      const step = dist > 750 * 750 ? 2 : 1;
      if (step === 2 && (i % 2 !== 0 || j % 2 !== 0)) continue;
      list.push({ i, j, step, dist });
    }
  }
  list.sort((a, b) => b.dist - a.dist);
  for (const cell of list) {
    const { i, j, step } = cell;
    const x0 = -HALF + i * WORLD.cell;
    const z0 = -HALF + j * WORLD.cell;
    const x1 = x0 + WORLD.cell * step;
    const z1 = z0 + WORLD.cell * step;
    const p00 = camera.project([x0, terrain.heightAt(x0, z0), z0]);
    const p10 = camera.project([x1, terrain.heightAt(x1, z0), z0]);
    const p11 = camera.project([x1, terrain.heightAt(x1, z1), z1]);
    const p01 = camera.project([x0, terrain.heightAt(x0, z1), z1]);
    if (!p00 || !p10 || !p11 || !p01) continue;
    ctx.fillStyle = terrain.cellColors[j * n + i];
    ctx.beginPath();
    ctx.moveTo(p00.x, p00.y);
    ctx.lineTo(p10.x, p10.y);
    ctx.lineTo(p11.x, p11.y);
    ctx.lineTo(p01.x, p01.y);
    ctx.closePath();
    ctx.fill();
    // A faint edge keeps the low-poly terrain readable instead of flat.
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.10)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** Draw the runway: asphalt, edge lines, centreline dashes, threshold bars. */
function drawRunway(ctx, camera) {
  const rw = PLANE.runway;
  const y = rw.height + 0.15;
  // Asphalt in 20 m segments, so the part behind the camera is skipped
  // segment by segment instead of dropping the whole strip.
  ctx.fillStyle = '#33383f';
  for (let z = rw.z - rw.halfLength; z < rw.z + rw.halfLength; z += 20) {
    const z1 = Math.min(z + 20, rw.z + rw.halfLength);
    const corners = [
      [rw.x - rw.halfWidth, y, z],
      [rw.x + rw.halfWidth, y, z],
      [rw.x + rw.halfWidth, y, z1],
      [rw.x - rw.halfWidth, y, z1],
    ].map((p) => camera.project(p));
    if (corners.some((p) => p === null)) continue;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (const p of corners.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
  }
  // Centreline dashes.
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 2;
  for (let z = rw.z - rw.halfLength + 14; z < rw.z + rw.halfLength - 8; z += 28) {
    const a = camera.project([rw.x, y + 0.05, z]);
    const b = camera.project([rw.x, y + 0.05, z + 14]);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Threshold bars at both ends.
  ctx.fillStyle = '#e8e8e8';
  for (const end of [-1, 1]) {
    const z = rw.z + end * (rw.halfLength - 8);
    for (let k = -2; k <= 2; k++) {
      const a = camera.project([rw.x + k * 4.4 - 1.4, y + 0.05, z - 4]);
      const b = camera.project([rw.x + k * 4.4 + 1.4, y + 0.05, z - 4]);
      const c = camera.project([rw.x + k * 4.4 + 1.4, y + 0.05, z + 4]);
      const d = camera.project([rw.x + k * 4.4 - 1.4, y + 0.05, z + 4]);
      if (!a || !b || !c || !d) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** Draw palm trees as billboards near the camera. */
function drawTrees(ctx, camera) {
  const cam = camera.position;
  const near = [];
  for (const tree of terrain.trees) {
    const dx = tree.x - cam[0];
    const dz = tree.z - cam[2];
    const dist = dx * dx + dz * dz;
    if (dist > 900 * 900) continue;
    if (dx * camera.forward[0] + dz * camera.forward[2] < -40) continue;
    near.push({ tree, dist });
  }
  near.sort((a, b) => b.dist - a.dist);
  for (const { tree } of near) {
    const base = camera.project([tree.x, terrain.heightAt(tree.x, tree.z), tree.z]);
    if (!base) continue;
    const h = tree.s * base.scale;
    if (h < 2) continue;
    const topX = base.x + tree.lean * h;
    const topY = base.y - h;
    ctx.strokeStyle = '#6b4a2f';
    ctx.lineWidth = Math.max(1, h * 0.08);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(topX, topY);
    ctx.stroke();
    ctx.fillStyle = '#2f6b2f';
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2 + 0.6;
      const fx = topX + Math.cos(ang) * h * 0.42;
      const fy = topY + Math.sin(ang) * h * 0.18 - h * 0.08;
      ctx.beginPath();
      ctx.ellipse(fx, fy, h * 0.3, h * 0.12, ang, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Draw sea, terrain, runway and trees for one frame. */
export function drawWorld(ctx, camera, sky, width, height) {
  drawSea(ctx, camera, sky, width, height);
  drawTerrainCells(ctx, camera);
  drawRunway(ctx, camera);
  drawTrees(ctx, camera);
}
