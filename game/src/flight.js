// Sunset Courier — the aircraft: position, attitude and speed, flown by
// an arcade model where throttle sets speed, bank turns, pitch climbs.

import { PLANE } from './config.js';
import { terrain } from './terrain.js';

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** The player's aircraft and its flight state. */
export class Aircraft {
  constructor() {
    this.resetOnRunway();
    this.speed = 0;
    this.throttle = 0;
    this.verticalSpeed = 0;
    this.fuel = 100;
    this.engineOn = true;
    this.grounded = true;
    this.airborne = false; // true once the plane has left the ground
  }

  resetOnRunway() {
    const rw = PLANE.runway;
    this.position = [rw.x, rw.height + 1.6, rw.z - rw.halfLength + 30];
    this.heading = 0; // facing +z, down the strip
    this.pitch = 0;
    this.roll = 0;
    this.speed = 0;
    this.throttle = 0;
    this.verticalSpeed = 0;
    this.fuel = 100;
    this.engineOn = true;
    this.grounded = true;
    this.airborne = false;
  }

  /** Unit forward vector from heading and pitch. */
  forwardVector() {
    const cp = Math.cos(this.pitch);
    return [Math.sin(this.heading) * cp, Math.sin(this.pitch), Math.cos(this.heading) * cp];
  }

  /** True airspeed in knots, for the HUD. */
  knots() {
    return Math.round(this.speed * 1.94384);
  }

  /** Altitude above sea level in feet, for the HUD. */
  altitudeFeet() {
    return Math.round(this.position[1] * 3.28084);
  }

  /** Heading in degrees 0..360, for the HUD compass. */
  headingDegrees() {
    let deg = (this.heading * 180) / Math.PI;
    deg = ((deg % 360) + 360) % 360;
    return Math.round(deg);
  }

  /**
   * Advance the flight model one step. `ctl` is { roll: -1..1, pitch: -1..1,
   * throttle: -1..1 } from the input; `wind` is a world-space push.
   * Returns 'flying' | 'crashed' | 'stopped' (stopped = rolled to a halt
   * on the strip after flying; the caller decides what a stop means).
   */
  update(dt, ctl, wind) {
    // Throttle: the lever moves, the engine follows.
    this.throttle = clamp(this.throttle + ctl.throttle * PLANE.throttleRate * dt, 0, 1);
    if (this.fuel <= 0) {
      this.engineOn = false;
      this.throttle = Math.max(0, this.throttle - dt * 0.5);
    } else if (this.throttle > 0.05) {
      this.engineOn = true;
    }

    // Attitude: bank and pitch ease toward the commanded angles.
    const stalled = this.speed < PLANE.stallSpeed && !this.grounded;
    const authority = stalled ? 0.45 : 1;
    const targetRoll = ctl.roll * PLANE.maxRoll * authority;
    const targetPitch = ctl.pitch * PLANE.maxPitch * authority;
    const rollK = 1 - Math.exp(-PLANE.rollRate * dt);
    const pitchK = 1 - Math.exp(-PLANE.pitchRate * dt);
    this.roll += (targetRoll - this.roll) * rollK;
    this.pitch += (targetPitch - this.pitch) * pitchK;

    // Turn rate follows the bank: a coordinated turn, with an arcade
    // assist (2.2x) so the plane answers at cruise speed instead of
    // wallowing through every turn like a real bush plane.
    const turnRate = (-Math.tan(this.roll) * 9.81) / Math.max(this.speed, 12) * 2.2;
    this.heading += turnRate * dt;

    // Speed: throttle pulls toward its top speed; climbing bleeds speed,
    // descending adds it; drag always nibbles.
    const targetSpeed = this.throttle * PLANE.maxSpeed;
    const climbBleed = Math.sin(this.pitch) * 22;
    const accel = (targetSpeed - this.speed) * 0.55 - climbBleed - this.speed * 0.012;
    this.speed = Math.max(0, this.speed + accel * dt);

    // Move: along the nose, plus the wind.
    const fwd = this.forwardVector();
    const prevY = this.position[1];
    this.position[0] += (fwd[0] * this.speed + wind.x) * dt;
    this.position[1] += fwd[1] * this.speed * dt;
    this.position[2] += (fwd[2] * this.speed + wind.z) * dt;
    this.verticalSpeed = (this.position[1] - prevY) / Math.max(dt, 0.001);

    // Stall: below flying speed the wing stops holding the plane up.
    if (stalled) {
      this.position[1] -= (PLANE.stallSpeed - this.speed) * 0.4 * dt;
      this.pitch += (0 - this.pitch) * 0.3 * dt; // nose drops
    }

    // Fuel burn follows the throttle.
    if (this.engineOn) {
      this.fuel = Math.max(0, this.fuel - (0.25 + this.throttle * PLANE.fuelDrain) * dt);
    }

    // Ground and water contact.
    const ground = terrain.heightAt(this.position[0], this.position[2]);
    const rw = PLANE.runway;
    const onStrip =
      Math.abs(this.position[0] - rw.x) < rw.halfWidth &&
      Math.abs(this.position[2] - rw.z) < rw.halfLength;
    if (this.position[1] <= Math.max(ground, onStrip ? rw.height : -Infinity) + 1.6) {
      if (onStrip && this.speed < 46 && this.verticalSpeed > -7 && Math.abs(this.roll) < 0.25) {
        // On the strip: settle and roll. The nose stays near level on the
        // ground, though the pilot may rotate a little for takeoff; the
        // wing only lifts the plane once it is past stall speed.
        this.position[1] = rw.height + 1.6;
        this.grounded = true;
        this.pitch = clamp(this.pitch, -0.05, 0.25);
        this.roll *= 0.8;
        if (this.airborne) {
          // A landing rollout: the brakes bite.
          this.speed = Math.max(0, this.speed - 26 * dt);
          // Only counts as stopped when the plane actually flew first; the
          // parked plane at the start of a level just sits on the strip.
          if (this.speed < 2) return 'stopped';
        } else {
          // A takeoff roll: only light rolling resistance.
          this.speed = Math.max(0, this.speed - 1.5 * dt);
        }
        return 'flying';
      }
      return 'crashed';
    }
    this.grounded = false;
    // "Airborne" only counts once the plane has genuinely flown — three
    // metres clear of the ground. A takeoff bounce that never gets that
    // high is still a takeoff roll, so touching down again must not bite
    // the landing brakes and kill the speed.
    if (this.position[1] > Math.max(ground, onStrip ? rw.height : -Infinity) + 1.6 + 3) {
      this.airborne = true;
    }
    return 'flying';
  }
}
