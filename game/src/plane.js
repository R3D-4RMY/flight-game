// Sunset Courier — the aircraft as the pilot sees it: a twin-prop bush
// plane from behind and above, banking with the turn, propellers spinning,
// and its shadow on the ground below.

import { terrain } from './terrain.js';

/**
 * Draw the plane sprite in screen space, centred on the chase camera's
 * aim. `w`/`h` are the canvas size, `roll`/`pitch` the plane's attitude,
 * `throttle` how fast the props spin, `time` the clock.
 */
export function drawPlane(ctx, camera, plane, time, w, h) {
  const cx = w / 2;
  const cy = h * 0.60 + plane.pitch * h * 0.22;
  const s = Math.min(w, h) / 760; // sprite scale follows the window
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(plane.roll * 0.9);
  ctx.scale(s, s);

  // Fuselage: a tapered body pointing away from the viewer (up-screen).
  const body = ctx.createLinearGradient(0, -120, 0, 90);
  body.addColorStop(0, '#f7ead0');
  body.addColorStop(0.55, '#f2d8a8');
  body.addColorStop(1, '#c9a06a');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -128);
  ctx.quadraticCurveTo(26, -96, 24, -40);
  ctx.quadraticCurveTo(22, 30, 30, 78);
  ctx.quadraticCurveTo(0, 96, -30, 78);
  ctx.quadraticCurveTo(-22, 30, -24, -40);
  ctx.quadraticCurveTo(-26, -96, 0, -128);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 50, 20, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Sunset livery stripe down the fuselage.
  ctx.fillStyle = '#e8604c';
  ctx.beginPath();
  ctx.moveTo(-6, -120);
  ctx.lineTo(6, -120);
  ctx.lineTo(10, 70);
  ctx.lineTo(-10, 70);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2f7f8f';
  ctx.beginPath();
  ctx.moveTo(-10, 20);
  ctx.lineTo(10, 20);
  ctx.lineTo(11, 44);
  ctx.lineTo(-11, 44);
  ctx.closePath();
  ctx.fill();

  // Main wings, spanning left and right.
  const wing = ctx.createLinearGradient(0, -30, 0, 26);
  wing.addColorStop(0, '#f7ead0');
  wing.addColorStop(1, '#d9b078');
  ctx.fillStyle = wing;
  ctx.beginPath();
  ctx.moveTo(-178, -18);
  ctx.quadraticCurveTo(-120, -34, -26, -26);
  ctx.lineTo(-24, 8);
  ctx.quadraticCurveTo(-110, 16, -172, 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(178, -18);
  ctx.quadraticCurveTo(120, -34, 26, -26);
  ctx.lineTo(24, 8);
  ctx.quadraticCurveTo(110, 16, 172, 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Wingtip navigation lights: red port, green starboard.
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(-176, 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#34d17b';
  ctx.beginPath();
  ctx.arc(176, 2, 5, 0, Math.PI * 2);
  ctx.fill();

  // Tail fin with the courier's registration.
  ctx.fillStyle = '#2f7f8f';
  ctx.beginPath();
  ctx.moveTo(-14, 66);
  ctx.lineTo(-20, 118);
  ctx.lineTo(20, 118);
  ctx.lineTo(14, 66);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f7ead0';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N77', 0, 104);

  // Horizontal stabilisers.
  ctx.fillStyle = '#e8c890';
  ctx.beginPath();
  ctx.moveTo(-64, 78);
  ctx.lineTo(-16, 70);
  ctx.lineTo(-14, 88);
  ctx.lineTo(-60, 96);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(64, 78);
  ctx.lineTo(16, 70);
  ctx.lineTo(14, 88);
  ctx.lineTo(60, 96);
  ctx.closePath();
  ctx.fill();

  // Propellers: blurred discs with spinning blades, speed by throttle.
  const spin = time * (6 + plane.throttle * 42);
  for (const px of [-52, 52]) {
    ctx.save();
    ctx.translate(px, -8);
    ctx.fillStyle = 'rgba(40, 40, 40, 0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30, 30, 30, 0.75)';
    ctx.lineWidth = 4;
    for (let b = 0; b < 2; b++) {
      const a = spin + (b * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * -30, Math.sin(a) * -30);
      ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30);
      ctx.stroke();
    }
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** The plane's shadow: a soft ellipse on the terrain below it. */
export function drawPlaneShadow(ctx, camera, plane) {
  const ground = terrain.heightAt(plane.position[0], plane.position[2]);
  if (plane.position[1] - ground < 0.5) return;
  const p = camera.project([plane.position[0], ground + 0.4, plane.position[2]]);
  if (!p) return;
  const alt = plane.position[1] - ground;
  const size = Math.max(6, (46 - Math.min(alt, 40)) * p.scale * 0.5);
  const alpha = Math.max(0.06, 0.3 - alt * 0.004);
  ctx.fillStyle = `rgba(10, 20, 30, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, size * 1.6, size * 0.6, plane.roll * 0.4, 0, Math.PI * 2);
  ctx.fill();
}
