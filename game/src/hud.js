// Sunset Courier — the instruments: airspeed, altitude, compass tape,
// fuel, score and a little artificial horizon, all drawn lit on glass.

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 18, 30, 0.62)';
  ctx.strokeStyle = 'rgba(120, 220, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
}

function label(ctx, text, x, y) {
  ctx.fillStyle = '#8fd8ff';
  ctx.font = '600 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

function value(ctx, text, x, y, size = 30) {
  ctx.fillStyle = '#eafcff';
  ctx.font = `700 ${size}px "SF Mono", Consolas, monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

/** The compass tape across the top: ticks, cardinal letters, centre caret. */
function drawCompass(ctx, heading, w) {
  const cx = w / 2;
  const y = 46;
  ctx.fillStyle = 'rgba(8, 18, 30, 0.62)';
  ctx.beginPath();
  ctx.roundRect(cx - 200, 18, 400, 42, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 220, 255, 0.35)';
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 200, 18, 400, 42);
  ctx.clip();
  const pxPerDeg = 3.2;
  for (let d = -60; d <= 60; d += 5) {
    const deg = ((Math.round(heading) + d) % 360 + 360) % 360;
    const x = cx + d * pxPerDeg;
    const major = deg % 30 === 0;
    ctx.strokeStyle = major ? '#eafcff' : 'rgba(160, 220, 255, 0.6)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x, y + (major ? 8 : 2));
    ctx.stroke();
    if (major) {
      const name = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[deg];
      ctx.fillStyle = '#eafcff';
      ctx.font = '700 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name ?? String(deg).padStart(3, '0'), x, y + 20);
    }
  }
  ctx.restore();
  // Centre caret and the digital heading.
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(cx - 7, 18);
  ctx.lineTo(cx + 7, 18);
  ctx.lineTo(cx, 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.font = '700 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(heading)).padStart(3, '0') + '°', cx, 74);
}

/** The artificial horizon: a small ball that rolls and pitches. */
function drawAttitude(ctx, plane, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-plane.roll);
  const pitchPx = plane.pitch * r * 1.4;
  ctx.fillStyle = '#2f7fc9';
  ctx.fillRect(-r, -r - pitchPx, r * 2, r + pitchPx);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-r, -pitchPx, r * 2, r + pitchPx);
  ctx.strokeStyle = '#eafcff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, -pitchPx);
  ctx.lineTo(r, -pitchPx);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(120, 220, 255, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings marker.
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y);
  ctx.lineTo(x - r * 0.15, y);
  ctx.moveTo(x + r * 0.15, y);
  ctx.lineTo(x + r * 0.55, y);
  ctx.stroke();
}

/** Draw the whole HUD for one frame. */
export function drawHud(ctx, game, w, h) {
  const plane = game.plane;
  const level = game.level;
  // Airspeed, top left.
  panel(ctx, 16, 16, 150, 74);
  label(ctx, 'AIRSPEED', 28, 34);
  value(ctx, String(plane.knots()), 28, 68);
  ctx.fillStyle = '#8fd8ff';
  ctx.font = '600 11px sans-serif';
  ctx.fillText('KT', 118, 68);
  // Throttle bar under the airspeed.
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(28, 76, 126, 5);
  ctx.fillStyle = plane.throttle > 0.85 ? '#ffb13e' : '#39d353';
  ctx.fillRect(28, 76, 126 * plane.throttle, 5);

  // Altitude, top right.
  panel(ctx, w - 166, 16, 150, 74);
  label(ctx, 'ALTITUDE', w - 154, 34);
  value(ctx, String(plane.altitudeFeet()), w - 154, 68);
  ctx.fillStyle = '#8fd8ff';
  ctx.font = '600 11px sans-serif';
  ctx.fillText('FT', w - 62, 68);
  const vs = Math.round(plane.verticalSpeed * 196.85);
  ctx.fillStyle = vs >= 0 ? '#39d353' : '#ffb13e';
  ctx.font = '600 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText((vs >= 0 ? '+' : '') + vs + ' FPM', w - 28, 86);

  drawCompass(ctx, plane.headingDegrees(), w);

  // Fuel, bottom left.
  panel(ctx, 16, h - 66, 190, 50);
  label(ctx, 'FUEL', 28, h - 48);
  const fuelW = 166;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(28, h - 40, fuelW, 10);
  ctx.fillStyle = plane.fuel < 25 ? '#ff5a3c' : plane.fuel < 50 ? '#ffb13e' : '#39d353';
  ctx.fillRect(28, h - 40, fuelW * (plane.fuel / 100), 10);
  ctx.fillStyle = '#eafcff';
  ctx.font = '700 13px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(Math.round(plane.fuel) + '%', 28, h - 20);

  // Score and rings, bottom right.
  panel(ctx, w - 226, h - 66, 210, 50);
  label(ctx, 'SCORE  ·  RINGS', w - 214, h - 48);
  ctx.fillStyle = '#eafcff';
  ctx.font = '700 16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(String(game.score).padStart(5, '0'), w - 214, h - 24);
  ctx.fillStyle = '#ffd23e';
  ctx.font = '700 16px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(game.rings.passedCount + '/' + game.rings.total, w - 28, h - 24);

  // Attitude ball, bottom centre.
  drawAttitude(ctx, plane, w / 2, h - 42, 30);
  ctx.fillStyle = '#8fd8ff';
  ctx.font = '600 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(level.name.toUpperCase(), w / 2, h - 84);
  if (level.wind.x !== 0 || level.wind.z !== 0) {
    ctx.fillStyle = '#ffb13e';
    ctx.fillText('WIND ' + Math.round(Math.hypot(level.wind.x, level.wind.z) * 1.94) + ' KT', w / 2, h - 96);
  }
  if (plane.speed < 26 && !plane.grounded) {
    ctx.fillStyle = '#ff5a3c';
    ctx.font = '700 18px sans-serif';
    ctx.fillText('STALL — NOSE DOWN, ADD THROTTLE', w / 2, h * 0.32);
  }
  if (plane.fuel < 25 && plane.engineOn) {
    ctx.fillStyle = '#ff5a3c';
    ctx.font = '700 18px sans-serif';
    ctx.fillText('LOW FUEL', w / 2, h * 0.32 + 24);
  }
}
