// Sunset Courier — the target rings: a course of glowing hoops. The next
// ring shines gold, later ones are dim blue, a passed ring flashes green.

import { PLANE } from './config.js';

function normalize(v) {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** One ring: centre, radius, the direction pilots arrive from, and state. */
class Ring {
  constructor(def, radius) {
    this.center = [...def.at];
    this.radius = radius;
    this.normal = normalize(def.facing);
    // A basis for the ring's plane, so its circle can be drawn in 3D.
    const up = Math.abs(this.normal[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    this.u = normalize(cross(up, this.normal));
    this.v = cross(this.normal, this.u);
    this.passed = false;
    this.flash = 0; // seconds of green flash after being flown
    this.prevSide = null; // signed distance last frame, for crossing checks
  }

  /** Did the plane cross this ring's plane inside the hoop this frame? */
  checkCrossing(plane) {
    if (this.passed) return false;
    const rel = [
      plane.position[0] - this.center[0],
      plane.position[1] - this.center[1],
      plane.position[2] - this.center[2],
    ];
    const side = dot(rel, this.normal);
    const lateral = Math.hypot(
      dot(rel, this.u),
      dot(rel, this.v),
    );
    let crossed = false;
    if (this.prevSide !== null && Math.sign(side) !== Math.sign(this.prevSide)) {
      crossed = lateral < this.radius * 0.95;
    }
    this.prevSide = side;
    return crossed;
  }
}

/** The ring course of one level. */
export class RingCourse {
  constructor(level) {
    this.rings = level.rings.map((def) => new Ring(def, level.ringRadius));
    this.nextIndex = 0;
  }

  get next() {
    return this.rings[this.nextIndex] ?? null;
  }

  get done() {
    return this.nextIndex >= this.rings.length;
  }

  get passedCount() {
    return this.nextIndex;
  }

  get total() {
    return this.rings.length;
  }

  /** Check the next ring for a crossing; returns the ring when flown. */
  update(plane, dt) {
    for (const ring of this.rings) ring.flash = Math.max(0, ring.flash - dt);
    const ring = this.next;
    if (!ring) return null;
    if (ring.checkCrossing(plane)) {
      ring.passed = true;
      ring.flash = 1.2;
      this.nextIndex++;
      return ring;
    }
    return null;
  }

  /** Draw every unpassed ring, nearest last so near rings overlap far ones. */
  draw(ctx, camera, time) {
    const items = [];
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      if (ring.passed && ring.flash <= 0) continue;
      const p = camera.project(ring.center);
      if (!p) continue;
      items.push({ ring, p, i });
    }
    items.sort((a, b) => b.p.depth - a.p.depth);
    for (const { ring, p, i } of items) {
      const radius = ring.radius * p.scale;
      if (radius < 3) continue;
      const isNext = i === this.nextIndex;
      const pulse = isNext ? 1 + Math.sin(time * 4) * 0.12 : 1;
      const color = ring.passed
        ? '#39d353'
        : isNext
          ? '#ffd23e'
          : 'rgba(90, 180, 255, 0.75)';
      ctx.save();
      ctx.lineWidth = Math.max(2, radius * 0.09 * pulse);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = isNext ? 18 : 8;
      ctx.globalAlpha = ring.passed ? Math.max(0.15, ring.flash) : 0.95;
      ctx.beginPath();
      const segments = 20;
      for (let k = 0; k <= segments; k++) {
        const a = (k / segments) * Math.PI * 2;
        const pt = [
          ring.center[0] + (Math.cos(a) * ring.u[0] + Math.sin(a) * ring.v[0]) * ring.radius,
          ring.center[1] + (Math.cos(a) * ring.u[1] + Math.sin(a) * ring.v[1]) * ring.radius,
          ring.center[2] + (Math.cos(a) * ring.u[2] + Math.sin(a) * ring.v[2]) * ring.radius,
        ];
        const s = camera.project(pt);
        if (!s) continue;
        if (k === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      }
      ctx.closePath();
      ctx.stroke();
      // Inner disc, faint, so the hoop reads as a target.
      ctx.globalAlpha = ring.passed ? 0.05 : isNext ? 0.1 : 0.05;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
      // A floating marker above the next ring, pointing the way.
      if (isNext) {
        const top = camera.project([
          ring.center[0],
          ring.center[1] + ring.radius + 14,
          ring.center[2],
        ]);
        if (top) {
          const bounce = Math.sin(time * 3) * 4;
          ctx.fillStyle = '#ffd23e';
          ctx.font = `bold ${Math.max(11, Math.min(20, radius * 0.22))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('▼', top.x, top.y + bounce);
        }
      }
    }
  }
}
