// Sunset Courier — the game itself: states, the loop, scoring, and the
// screenshot staging used to frame the game's own renders.

import { LEVELS, SKIES, PLANE } from './config.js';
import { ChaseCamera } from './camera.js';
import { terrain, drawWorld } from './terrain.js';
import { drawSky, drawClouds } from './sky.js';
import { Aircraft } from './flight.js';
import { RingCourse } from './rings.js';
import { drawPlane, drawPlaneShadow } from './plane.js';
import { drawHud } from './hud.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';

const params = new URLSearchParams(window.location.search);
const STAGE = params.get('stage'); // cover | rings | runway | landed
const STAGE_LEVEL = Math.max(0, Math.min(2, parseInt(params.get('level') || '0', 10) || 0));

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.camera = new ChaseCamera();
    this.plane = new Aircraft();
    this.sounds = new SoundBank();
    this.state = 'title';
    this.levelIndex = 0;
    this.level = LEVELS[0];
    this.rings = new RingCourse(this.level);
    this.score = 0;
    this.time = 0;
    this.levelTime = 0;
    this.message = null;
    this.levelBonus = 0;
    this.stoppedHintUntil = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    const wake = () => this.sounds.ensure();
    window.addEventListener('keydown', wake, { once: true });
    window.addEventListener('pointerdown', wake, { once: true });
    if (STAGE) this.applyStage();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.camera.resize(this.canvas.width, this.canvas.height);
  }

  get width() {
    return this.canvas.width;
  }

  get height() {
    return this.canvas.height;
  }

  startLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.rings = new RingCourse(this.level);
    this.plane.resetOnRunway();
    this.plane.fuel = this.level.fuel;
    this.levelTime = 0;
    this.levelBonus = 0;
    this.state = 'flying';
    this.showMessage(this.level.name, this.level.brief, 3.4);
  }

  showMessage(text, sub, seconds) {
    this.message = { text, sub: sub || '', until: this.time + seconds };
  }

  /** The screenshot autopilot: holds the plane steady on its course. */
  autopilot() {
    if (!STAGE) return null;
    const target = this.rings.done
      ? [PLANE.runway.x, PLANE.runway.height + 4, PLANE.runway.z]
      : this.rings.next.center;
    const dx = target[0] - this.plane.position[0];
    const dz = target[2] - this.plane.position[2];
    const desired = Math.atan2(dx, dz);
    // Gentle bank toward the target: a screenshot hold, not a race line.
    const roll = clamp(wrapAngle(desired - this.plane.heading) * 0.8, -0.5, 0.5);
    let pitch = 0;
    if (STAGE === 'runway') pitch = -0.18; // gentle final descent
    else pitch = clamp((60 - this.plane.position[1]) * 0.04, -0.6, 0.6);
    // The control vector moves the throttle lever, so steer it toward the
    // cruise setting instead of pushing it open every frame.
    const throttle = clamp((0.6 - this.plane.throttle) * 3, -1, 1);
    return { roll, pitch, throttle };
  }

  update(dt) {
    this.time += dt;
    if (this.state === 'title') {
      if (this.input.wasPressed('Enter') || this.input.mouse.down) {
        this.sounds.ensure();
        this.startLevel(0);
      }
      return;
    }
    if (this.state === 'paused') {
      if (
        this.input.wasPressed('p') ||
        this.input.wasPressed('P') ||
        this.input.wasPressed('Escape')
      ) {
        this.state = 'flying';
      }
      return;
    }
    if (this.state === 'crashed' || this.state === 'landed' || this.state === 'complete') {
      if (
        this.input.wasPressed('Enter') ||
        this.input.wasPressed('r') ||
        this.input.wasPressed('R') ||
        this.input.mouse.down
      ) {
        if (this.state === 'crashed') this.startLevel(this.levelIndex);
        else if (this.state === 'landed') {
          if (this.levelIndex + 1 < LEVELS.length) this.startLevel(this.levelIndex + 1);
          else this.state = 'complete';
        } else this.state = 'title';
      }
      return;
    }
    // Flying.
    this.levelTime += dt;
    if (this.input.wasPressed('p') || this.input.wasPressed('P') || this.input.wasPressed('Escape')) {
      this.state = 'paused';
      return;
    }
    if (this.input.wasPressed('m') || this.input.wasPressed('M')) {
      this.sounds.toggleMute();
    }
    const ctl = this.autopilot() || this.input.flightControls();
    const result = this.plane.update(dt, ctl, this.level.wind);
    const flown = this.rings.update(this.plane, dt);
    if (flown) {
      this.score += PLANE.ringScore;
      this.plane.fuel = Math.min(100, this.plane.fuel + PLANE.fuelPerRing);
      this.sounds.ringChime();
      this.showMessage(
        'RING ' + this.rings.passedCount + ' / ' + this.rings.total,
        '+' + PLANE.ringScore + ' PTS  ·  +' + PLANE.fuelPerRing + ' FUEL',
        1.6,
      );
    }
    if (result === 'crashed') {
      this.state = 'crashed';
      this.sounds.crashBurst();
    } else if (result === 'stopped') {
      if (this.rings.done) {
        this.levelBonus = PLANE.landingScore + Math.round(this.plane.fuel) * 5;
        this.score += this.levelBonus;
        this.state = 'landed';
        this.sounds.landingThud();
      } else {
        this.stoppedHintUntil = this.time + 2.5;
      }
    }
    this.sounds.update(this.plane);
  }

  /** Place the plane for a screenshot stage (used only with ?stage=). */
  applyStage() {
    const level = LEVELS[STAGE_LEVEL];
    this.levelIndex = STAGE_LEVEL;
    this.level = level;
    this.rings = new RingCourse(level);
    if (STAGE === 'cover') {
      this.plane.position = [100, 62, 170];
      this.plane.heading = -0.38; // aimed at the first ring
      this.plane.speed = 56;
      this.plane.throttle = 0.6;
      this.state = 'flying';
    } else if (STAGE === 'rings') {
      this.rings.rings[0].passed = true;
      this.rings.rings[1].passed = true;
      this.rings.nextIndex = 2; // approach the third ring, island behind it
      this.plane.position = [520, 70, 680];
      this.plane.heading = 2.36; // aimed at the third ring
      this.plane.speed = 60;
      this.plane.throttle = 0.6;
      this.score = 200;
      this.state = 'flying';
    } else if (STAGE === 'runway') {
      for (const ring of this.rings.rings) ring.passed = true;
      this.rings.nextIndex = this.rings.rings.length;
      this.plane.position = [0, 65, -280];
      this.plane.heading = 0;
      this.plane.speed = 55;
      this.plane.throttle = 0.55;
      this.plane.pitch = -0.1;
      this.score = 800;
      this.state = 'flying';
    } else if (STAGE === 'landed') {
      for (const ring of this.rings.rings) ring.passed = true;
      this.rings.nextIndex = this.rings.rings.length;
      this.plane.position = [0, PLANE.runway.height + 1.6, 40];
      this.plane.heading = 0;
      this.plane.speed = 0;
      this.plane.grounded = true;
      this.score = 1240;
      this.levelBonus = 640;
      this.state = 'landed';
    }
  }

  render() {
    const { ctx, width: w, height: h } = this;
    const sky = SKIES[this.level.sky];
    if (this.state === 'title') {
      // Slow orbit around the airfield for the title backdrop.
      const a = this.time * 0.045;
      this.camera.aimAt(
        [Math.sin(a) * 320, 95, Math.cos(a) * 320],
        [0, 18, 0],
      );
    } else {
      this.camera.update(this.plane, 0.016);
    }
    drawSky(ctx, this.camera, sky, w, h);
    drawClouds(ctx, this.camera, this.time);
    drawWorld(ctx, this.camera, sky, w, h);
    if (this.state !== 'landed' && this.state !== 'complete') {
      this.rings.draw(ctx, this.camera, this.time);
    }
    if (this.state !== 'title') {
      drawPlaneShadow(ctx, this.camera, this.plane);
      if (this.state !== 'landed') {
        drawPlane(ctx, this.camera, this.plane, this.time, w, h);
      } else {
        // Parked on the strip: draw the plane small, seen from the side.
        drawPlane(ctx, this.camera, this.plane, this.time, w, h);
      }
      drawHud(ctx, this, w, h);
    }
    if (this.message && this.time < this.message.until && this.state === 'flying') {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(8, 18, 30, 0.55)';
      const mw = 460;
      ctx.beginPath();
      ctx.roundRect(w / 2 - mw / 2, h * 0.2 - 34, mw, 64, 12);
      ctx.fill();
      ctx.fillStyle = '#ffd23e';
      ctx.font = '700 30px sans-serif';
      ctx.fillText(this.message.text, w / 2, h * 0.2 + 4);
      if (this.message.sub) {
        ctx.fillStyle = '#eafcff';
        ctx.font = '600 14px sans-serif';
        ctx.fillText(this.message.sub, w / 2, h * 0.2 + 24);
      }
    }
    if (this.state === 'flying' && this.time < this.stoppedHintUntil) {
      ctx.fillStyle = '#ffd23e';
      ctx.font = '700 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ON THE STRIP — THROTTLE UP (W) TO TAKE OFF AGAIN', w / 2, h * 0.3);
    }
    if (this.state === 'title') this.renderTitle();
    if (this.state === 'paused') this.renderCenter('PAUSED', 'P or Esc to resume · M to mute', 'rgba(8, 18, 30, 0.55)');
    if (this.state === 'crashed') {
      this.renderCenter('CRASHED', 'Press R to fly this level again', 'rgba(60, 10, 10, 0.6)');
    }
    if (this.state === 'landed') {
      const last = this.levelIndex + 1 >= LEVELS.length;
      this.renderCenter(
        'LEVEL COMPLETE — ' + this.level.name.toUpperCase(),
        'Landing bonus +' + this.levelBonus + '  ·  Score ' + this.score +
          (last ? '  ·  Press Enter for the final screen' : '  ·  Press Enter for the next level'),
        'rgba(8, 40, 20, 0.45)',
      );
    }
    if (this.state === 'complete') {
      this.renderCenter(
        'ALL LEVELS COMPLETE',
        'Final score ' + this.score + '  ·  Thanks for flying Sunset Courier  ·  Press Enter for the title',
        'rgba(8, 40, 20, 0.6)',
      );
    }
  }

  renderCenter(title, sub, bg) {
    const { ctx, width: w, height: h } = this;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23e';
    ctx.font = '700 44px sans-serif';
    ctx.fillText(title, w / 2, h / 2 - 8);
    ctx.fillStyle = '#eafcff';
    ctx.font = '600 17px sans-serif';
    ctx.fillText(sub, w / 2, h / 2 + 26);
  }

  renderTitle() {
    const { ctx, width: w, height: h } = this;
    ctx.fillStyle = 'rgba(8, 18, 30, 0.35)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23e';
    ctx.font = '700 64px sans-serif';
    ctx.fillText('SUNSET COURIER', w / 2, h * 0.3);
    ctx.fillStyle = '#eafcff';
    ctx.font = '600 20px sans-serif';
    ctx.fillText('Fly the mail plane through the rings. Land on the strip. Mind the fuel.', w / 2, h * 0.3 + 36);
    ctx.font = '600 16px sans-serif';
    ctx.fillStyle = '#8fd8ff';
    const lines = [
      '↑ ↓  pitch    ← →  bank    W / S  throttle    hold mouse to steer',
      'P pause    M mute    R retry a level',
      '',
      'Level 1  First Light  ·  Level 2  Island Hop  ·  Level 3  Sunset Run',
      '',
      'PRESS ENTER OR CLICK TO FLY',
    ];
    lines.forEach((line, i) => {
      ctx.fillText(line, w / 2, h * 0.52 + i * 26);
    });
    if (Math.floor(this.time * 1.6) % 2 === 0) {
      ctx.fillStyle = '#ffd23e';
      ctx.font = '700 22px sans-serif';
      ctx.fillText('— PRESS ENTER —', w / 2, h * 0.52 + lines.length * 26 + 18);
    }
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.lastNow) / 1000 || 0.016);
    this.lastNow = now;
    this.update(dt);
    this.render();
    this.input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }

  start() {
    this.lastNow = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }
}

const canvas = document.getElementById('game');
const game = new Game(canvas);
window.__game = game; // for play-testing from the console
game.start();
