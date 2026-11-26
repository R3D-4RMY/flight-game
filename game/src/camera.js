// Sunset Courier — chase camera: a 3D point projects to the canvas through
// a camera that trails the plane, banks with it a little, and looks ahead.

import { CAMERA } from './config.js';

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

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** A chase camera that follows the plane with a soft lag. */
export class ChaseCamera {
  constructor() {
    this.position = [0, 6, -CAMERA.distance];
    this.forward = [0, 0, 1];
    this.right = [1, 0, 0];
    this.up = [0, 1, 0];
    this.focal = 1;
    this.cx = 0;
    this.cy = 0;
  }

  /** Resize the view: the focal length follows the canvas height. */
  resize(width, height) {
    this.cx = width / 2;
    this.cy = height / 2;
    this.focal = (height / 2) / Math.tan(((CAMERA.fov / 2) * Math.PI) / 180);
  }

  /**
   * Ease the camera toward its trailing slot behind the plane and aim it
   * at a point ahead of the plane. `roll` is the plane's bank, `dt` seconds.
   */
  update(plane, dt) {
    const fwd = plane.forwardVector();
    const targetPos = [
      plane.position[0] - fwd[0] * CAMERA.distance,
      plane.position[1] - fwd[1] * CAMERA.distance + CAMERA.height,
      plane.position[2] - fwd[2] * CAMERA.distance,
    ];
    const k = 1 - Math.exp(-CAMERA.smoothing * dt);
    for (let i = 0; i < 3; i++) this.position[i] += (targetPos[i] - this.position[i]) * k;
    const lookAt = [
      plane.position[0] + fwd[0] * CAMERA.lookAhead,
      plane.position[1] + fwd[1] * CAMERA.lookAhead + 1.2,
      plane.position[2] + fwd[2] * CAMERA.lookAhead,
    ];
    let forward = normalize(sub(lookAt, this.position));
    // Roll the camera with the plane, but only part of the way, so the
    // horizon tilts without ever fighting the pilot.
    let right = normalize(cross(forward, [0, 1, 0]));
    let up = cross(right, forward);
    const bank = plane.roll * CAMERA.rollFollow;
    const cos = Math.cos(bank);
    const sin = Math.sin(bank);
    const rolledRight = [
      right[0] * cos - up[0] * sin,
      right[1] * cos - up[1] * sin,
      right[2] * cos - up[2] * sin,
    ];
    const rolledUp = [
      right[0] * sin + up[0] * cos,
      right[1] * sin + up[1] * cos,
      right[2] * sin + up[2] * cos,
    ];
    this.forward = forward;
    this.right = rolledRight;
    this.up = rolledUp;
  }

  /** Project a world point to screen space; null when behind the camera. */
  project(point) {
    const d = sub(point, this.position);
    const depth = dot(d, this.forward);
    if (depth < 1.5) return null;
    const x = dot(d, this.right);
    const y = dot(d, this.up);
    return {
      x: this.cx + (x / depth) * this.focal,
      y: this.cy - (y / depth) * this.focal,
      depth,
      scale: this.focal / depth,
    };
  }

  /** Is a world point in front of the camera at all? */
  inFront(point) {
    return dot(sub(point, this.position), this.forward) > 0;
  }

  /**
   * Aim the camera from `from` at `target`, with an optional roll, for
   * shots that are not the chase view (the title screen's slow orbit).
   */
  aimAt(from, target, roll = 0) {
    this.position = [...from];
    const forward = normalize(sub(target, from));
    let right = normalize(cross(forward, [0, 1, 0]));
    let up = cross(right, forward);
    const cos = Math.cos(roll);
    const sin = Math.sin(roll);
    this.right = [
      right[0] * cos - up[0] * sin,
      right[1] * cos - up[1] * sin,
      right[2] * cos - up[2] * sin,
    ];
    this.up = [
      right[0] * sin + up[0] * cos,
      right[1] * sin + up[1] * cos,
      right[2] * sin + up[2] * cos,
    ];
    this.forward = forward;
  }

  /** The horizon's screen y for the camera's current pitch. */
  horizonY() {
    const pitch = Math.asin(Math.max(-1, Math.min(1, this.forward[1])));
    return this.cy - Math.tan(pitch) * this.focal;
  }
}
