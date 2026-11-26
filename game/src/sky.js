// Sunset Courier — the sky: a three-stop gradient, a glowing sun, and
// soft drifting clouds drawn as billboards.

import { mulberry32 } from './random.js';

const CLOUDS = [];
{
  const rand = mulberry32(777);
  for (let i = 0; i < 16; i++) {
    CLOUDS.push({
      x: (rand() - 0.5) * 3200,
      y: 230 + rand() * 160,
      z: (rand() - 0.5) * 3200,
      w: 120 + rand() * 220,
      drift: 1.5 + rand() * 2.5,
    });
  }
}

/** Paint the sky gradient and the sun disc. */
export function drawSky(ctx, camera, sky, width, height) {
  const hy = camera.horizonY();
  const grad = ctx.createLinearGradient(0, 0, 0, Math.max(height, hy + 1));
  grad.addColorStop(0, sky.top);
  grad.addColorStop(0.55, sky.mid);
  grad.addColorStop(1, sky.horizon);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, Math.max(height, hy + 1));
  // Sun: a disc far away along its azimuth and elevation.
  const az = sky.sun.az;
  const el = sky.sun.el;
  const sunDir = [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
  const sunPos = [
    camera.position[0] + sunDir[0] * 2600,
    camera.position[1] + sunDir[1] * 2600,
    camera.position[2] + sunDir[2] * 2600,
  ];
  const s = camera.project(sunPos);
  if (s) {
    const r = Math.max(18, 2600 * 0.022 * s.scale);
    const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 4);
    glow.addColorStop(0, sky.sun.glow);
    glow.addColorStop(0.35, sky.sun.glow + '55');
    glow.addColorStop(1, 'rgba(255, 160, 80, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sky.sun.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Draw the clouds, far to near, after the sky and before the terrain. */
export function drawClouds(ctx, camera, time) {
  const list = [];
  for (const cloud of CLOUDS) {
    const x = cloud.x + time * cloud.drift;
    const p = camera.project([x, cloud.y, cloud.z]);
    if (!p) continue;
    list.push({ p, w: cloud.w * p.scale });
  }
  list.sort((a, b) => b.p.depth - a.p.depth);
  for (const { p, w } of list) {
    if (w < 6) continue;
    const h = w * 0.32;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, w * 0.6);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, w * 0.6, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x - w * 0.28, p.y + h * 0.25, w * 0.35, h * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x + w * 0.3, p.y + h * 0.2, w * 0.38, h * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
