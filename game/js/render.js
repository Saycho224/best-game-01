// Becak Rush — all art is drawn in code on the canvas: sky per shift, the
// perspective road, buildings, the becak, traffic, passengers and every screen.
import { HORIZON_Y, PLAYER_Y, laneX, roadEdge, scaleAt } from './becak.js';

export const SHIFT_NAMES = ['Pagi', 'Siang', 'Malam'];
export const SHIFT_TARGETS = [100000, 160000, 240000];
export const SHIFT_SECONDS = 75;

/** Deterministic hash in [0, 1) for stable windows, lights and skyline shapes. */
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function formatRp(n) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function skyColors(shiftIndex) {
  if (shiftIndex === 0) return { top: '#7d5ba6', mid: '#ff9d7a', low: '#ffd9a0', sun: '#ffcf5c', sunX: 1020, sunY: 66, glow: 'rgba(255, 207, 92, 0.5)' };
  if (shiftIndex === 1) return { top: '#3f96d8', mid: '#7ec8f0', low: '#d8f2ff', sun: '#fff3b0', sunX: 1060, sunY: 52, glow: 'rgba(255, 243, 176, 0.55)' };
  return { top: '#070d1f', mid: '#16233f', low: '#33456b', sun: '#f4f1de', sunX: 1060, sunY: 54, glow: 'rgba(244, 241, 222, 0.35)' };
}

function drawSky(ctx, state) {
  const c = skyColors(state.shiftIndex);
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y + 8);
  g.addColorStop(0, c.top);
  g.addColorStop(0.6, c.mid);
  g.addColorStop(1, c.low);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, HORIZON_Y + 8);
  if (state.shiftIndex === 2) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 46; i += 1) {
      const x = hash(i * 3 + 1) * 1280;
      const y = hash(i * 7 + 2) * 78;
      const r = 0.6 + hash(i * 5 + 3) * 1.4;
      ctx.globalAlpha = 0.35 + hash(i * 11 + 4) * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // Sun or moon with a soft glow.
  ctx.fillStyle = c.glow;
  ctx.beginPath();
  ctx.arc(c.sunX, c.sunY, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.sun;
  ctx.beginPath();
  ctx.arc(c.sunX, c.sunY, 18, 0, Math.PI * 2);
  ctx.fill();
  if (state.shiftIndex === 2) {
    ctx.fillStyle = '#c9cdd6';
    ctx.beginPath();
    ctx.arc(c.sunX - 7, c.sunY - 5, 13, 0, Math.PI * 2);
    ctx.fill();
  }
  // Drifting clouds by day, thin haze at dawn.
  if (state.shiftIndex !== 2) {
    ctx.fillStyle = state.shiftIndex === 0 ? 'rgba(255, 235, 220, 0.75)' : 'rgba(255, 255, 255, 0.85)';
    for (let i = 0; i < 4; i += 1) {
      const cx = ((i * 340 + state.time * 9) % 1500) - 110;
      const cy = 18 + hash(i * 13 + 8) * 44;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 52, 13, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 34, cy + 4, 36, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Distant skyline silhouette on the horizon.
  ctx.fillStyle = state.shiftIndex === 2 ? '#0d1526' : 'rgba(60, 60, 90, 0.55)';
  let x = 0;
  let i = 0;
  while (x < 1280) {
    const w = 34 + hash(i * 17 + 21) * 52;
    const h = 14 + hash(i * 23 + 22) * 34;
    ctx.fillRect(x, HORIZON_Y + 2 - h, w, h);
    x += w + 6;
    i += 1;
  }
}

function drawBuildings(ctx, state) {
  const off = (state.scroll * 0.55) % 870;
  const palette = state.shiftIndex === 2
    ? ['#1d2b45', '#24344f', '#182238']
    : ['#b5673f', '#c98a4b', '#8f5f7a', '#5f7a8a', '#a85f5f'];
  for (const side of ['left', 'right']) {
    for (let k = 0; k < 7; k += 1) {
      const y = ((k * 150 + off) % 870) - 75;
      const row = Math.floor((state.scroll * 0.55 + k * 150) / 870);
      const seed = row * 7 + k + (side === 'left' ? 0 : 100);
      const h = 120 + hash(seed * 3 + 1) * 40;
      const w = 150 + hash(seed * 5 + 2) * 60;
      const bx = side === 'left' ? 8 + hash(seed * 7 + 3) * 60 : 1280 - 8 - w - hash(seed * 7 + 3) * 60;
      ctx.fillStyle = palette[Math.floor(hash(seed * 11 + 4) * palette.length)];
      ctx.fillRect(bx, y, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(bx, y, w, 8);
      // Windows, some lit at night.
      for (let wy = y + 16; wy < y + h - 12; wy += 24) {
        for (let wx = bx + 12; wx < bx + w - 14; wx += 26) {
          const lit = state.shiftIndex === 2 && hash(seed * 31 + wx + wy) > 0.45;
          ctx.fillStyle = lit ? '#ffd54a' : 'rgba(255,255,255,0.28)';
          ctx.fillRect(wx, wy, 14, 16);
        }
      }
      // A shop awning at the street side.
      ctx.fillStyle = hash(seed * 13 + 5) > 0.5 ? '#2e8b57' : '#c0392b';
      ctx.fillRect(side === 'left' ? bx + w - 26 : bx, y + h - 26, 26, 22);
    }
  }
}

function drawRoad(ctx, state) {
  // Sidewalks.
  ctx.fillStyle = state.shiftIndex === 2 ? '#4a4238' : '#9a938a';
  ctx.beginPath();
  ctx.moveTo(0, HORIZON_Y);
  ctx.lineTo(roadEdge('left', HORIZON_Y), HORIZON_Y);
  ctx.lineTo(roadEdge('left', 720), 720);
  ctx.lineTo(0, 720);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1280, HORIZON_Y);
  ctx.lineTo(roadEdge('right', HORIZON_Y), HORIZON_Y);
  ctx.lineTo(roadEdge('right', 720), 720);
  ctx.lineTo(1280, 720);
  ctx.closePath();
  ctx.fill();
  // Asphalt.
  ctx.fillStyle = state.shiftIndex === 2 ? '#2c313c' : '#3d434e';
  ctx.beginPath();
  ctx.moveTo(roadEdge('left', 720), 720);
  ctx.lineTo(roadEdge('left', HORIZON_Y), HORIZON_Y);
  ctx.lineTo(roadEdge('right', HORIZON_Y), HORIZON_Y);
  ctx.lineTo(roadEdge('right', 720), 720);
  ctx.closePath();
  ctx.fill();
  // Edge lines.
  ctx.strokeStyle = '#f5d76e';
  ctx.lineWidth = 4;
  for (const side of ['left', 'right']) {
    ctx.beginPath();
    ctx.moveTo(roadEdge(side, 720), 720);
    ctx.lineTo(roadEdge(side, HORIZON_Y), HORIZON_Y);
    ctx.stroke();
  }
  // Lane dashes, scrolling with the road.
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 5;
  const dash = 46;
  const gap = 34;
  const period = dash + gap;
  const off = state.scroll % period;
  for (const b of [0.5, 1.5]) {
    for (let y = HORIZON_Y - period + off; y < 720; y += period) {
      const y0 = Math.max(HORIZON_Y, y);
      const y1 = Math.min(720, y + dash);
      if (y1 <= HORIZON_Y) continue;
      const x0 = (laneX(Math.floor(b), y0) + laneX(Math.ceil(b), y0)) / 2;
      const x1 = (laneX(Math.floor(b), y1) + laneX(Math.ceil(b), y1)) / 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }
  // Street lamps glow at night.
  if (state.shiftIndex === 2) {
    ctx.fillStyle = 'rgba(255, 213, 74, 0.16)';
    for (let y = HORIZON_Y + 40; y < 720; y += 170) {
      ctx.beginPath();
      ctx.ellipse(roadEdge('left', y) - 6, y, 60, 90, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(roadEdge('right', y) + 6, y, 60, 90, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawVehicle(ctx, v) {
  const s = scaleAt(v.y);
  const w = v.w * s;
  const h = v.h * s;
  const x = v.x;
  const y = v.y;
  const facingDown = v.fromTop !== false;
  ctx.save();
  ctx.translate(x, y);
  if (v.startled > 0) ctx.translate(Math.sin(v.wobble * 2) * 4 * s, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.42, w * 0.55, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wheels.
  ctx.fillStyle = '#141414';
  const ww = Math.max(5, 9 * s);
  const wh = Math.max(10, 26 * s);
  ctx.fillRect(-w / 2 - 2, -h * 0.28, ww, wh);
  ctx.fillRect(w / 2 - ww + 2, -h * 0.28, ww, wh);
  ctx.fillRect(-w / 2 - 2, h * 0.18, ww, wh);
  ctx.fillRect(w / 2 - ww + 2, h * 0.18, ww, wh);
  // Body.
  ctx.fillStyle = v.color;
  roundRect(ctx, -w / 2, -h / 2, w, h, 10 * s);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, -w / 2, -h / 2, w, h * 0.3, 10 * s);
  ctx.fill();
  if (v.type === 'car') {
    ctx.fillStyle = '#1c2b3a';
    roundRect(ctx, -w * 0.38, -h * 0.18, w * 0.76, h * 0.3, 6 * s);
    ctx.fill();
    ctx.fillStyle = '#bfe6ff';
    roundRect(ctx, -w * 0.34, facingDown ? h * 0.08 : -h * 0.4, w * 0.68, h * 0.14, 4 * s);
    ctx.fill();
    ctx.fillStyle = '#ffe98a';
    ctx.beginPath();
    ctx.arc(-w * 0.28, facingDown ? h * 0.46 : -h * 0.46, 4 * s, 0, Math.PI * 2);
    ctx.arc(w * 0.28, facingDown ? h * 0.46 : -h * 0.46, 4 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (v.type === 'angkot') {
    ctx.fillStyle = '#fff3b0';
    ctx.fillRect(-w / 2 + 4, -h * 0.32, w - 8, h * 0.1);
    ctx.fillStyle = '#123';
    ctx.font = `bold ${Math.max(9, 13 * s)}px Trebuchet MS, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ANKOT', 0, -h * 0.24);
    ctx.fillStyle = '#bfe6ff';
    for (let i = 0; i < 3; i += 1) ctx.fillRect(-w * 0.4 + i * w * 0.3, -h * 0.05, w * 0.22, h * 0.2);
    ctx.fillStyle = '#ffe98a';
    ctx.beginPath();
    ctx.arc(-w * 0.28, facingDown ? h * 0.46 : -h * 0.46, 4 * s, 0, Math.PI * 2);
    ctx.arc(w * 0.28, facingDown ? h * 0.46 : -h * 0.46, 4 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (v.type === 'bajaj') {
    ctx.fillStyle = '#222';
    roundRect(ctx, -w * 0.36, -h * 0.34, w * 0.72, h * 0.42, 8 * s);
    ctx.fill();
    ctx.fillStyle = '#bfe6ff';
    roundRect(ctx, -w * 0.3, facingDown ? h * 0.02 : -h * 0.4, w * 0.6, h * 0.16, 4 * s);
    ctx.fill();
    ctx.fillStyle = '#ffe98a';
    ctx.beginPath();
    ctx.arc(0, facingDown ? h * 0.46 : -h * 0.46, 4.5 * s, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Motorbike + rider.
    ctx.fillStyle = '#222';
    roundRect(ctx, -w * 0.22, -h / 2, w * 0.44, h, 8 * s);
    ctx.fill();
    ctx.fillStyle = v.color;
    ctx.beginPath();
    ctx.arc(0, -h * 0.08, w * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5d76e';
    ctx.beginPath();
    ctx.arc(0, -h * 0.3, w * 0.26, 0, Math.PI * 2);
    ctx.fill();
  }
  if (v.startled > 0) {
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(14, 22 * s)}px Trebuchet MS, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, -h / 2 - 12 * s);
  }
  ctx.restore();
}

function drawBecak(ctx, state) {
  const b = state.becak;
  const s = 1;
  const x = b.x;
  const y = b.y;
  const blink = b.invuln > 0 && Math.floor(state.time * 12) % 2 === 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(b.tilt);
  if (blink) ctx.globalAlpha = 0.35;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 34, 44, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rear wheels.
  ctx.fillStyle = '#141414';
  ctx.beginPath();
  ctx.arc(-34, 22, 13, 0, Math.PI * 2);
  ctx.arc(34, 22, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cfd6dd';
  ctx.lineWidth = 2;
  for (const wx of [-34, 34]) {
    ctx.beginPath();
    ctx.arc(wx, 22, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Body and seat.
  ctx.fillStyle = '#0f766e';
  roundRect(ctx, -36, -6, 72, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#8d5a2b';
  roundRect(ctx, -30, -14, 60, 14, 6);
  ctx.fill();
  // Canopy.
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.moveTo(-38, -12);
  ctx.quadraticCurveTo(0, -52, 38, -12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a6d1d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-38, -12);
  ctx.quadraticCurveTo(0, -52, 38, -12);
  ctx.stroke();
  // Passenger under the canopy.
  if (state.carried) {
    const p = state.carried;
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.arc(0, -26, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.shirt;
    roundRect(ctx, -13, -20, 26, 18, 6);
    ctx.fill();
  }
  // Driver pedalling ahead of the seat.
  const legSwing = Math.sin(b.pedal) * 7;
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.lineTo(-12 + legSwing, 26);
  ctx.moveTo(8, 2);
  ctx.lineTo(12 - legSwing, 26);
  ctx.stroke();
  ctx.fillStyle = '#e74c3c';
  roundRect(ctx, -14, -30, 28, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#8d5a2b';
  ctx.beginPath();
  ctx.arc(0, -38, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.arc(0, -40, 10, Math.PI, 0);
  ctx.fill();
  // Front wheel and handlebar.
  ctx.fillStyle = '#141414';
  ctx.beginPath();
  ctx.arc(0, 30, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cfd6dd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 30, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Headlight cone at night.
  if (state.shiftIndex === 2) {
    ctx.fillStyle = 'rgba(255, 240, 170, 0.10)';
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 40);
    ctx.lineTo(x + 14, y - 40);
    ctx.lineTo(x + 90, y - 330);
    ctx.lineTo(x - 90, y - 330);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPassenger(ctx, p) {
  const wave = Math.sin(p.wave) * 6;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 22, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Flag on a pole.
  ctx.strokeStyle = '#5b4636';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(10, 18);
  ctx.lineTo(10, -34);
  ctx.stroke();
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.moveTo(10, -34);
  ctx.lineTo(32 + wave * 0.3, -28);
  ctx.lineTo(10, -20);
  ctx.closePath();
  ctx.fill();
  // Person.
  ctx.fillStyle = p.skin;
  ctx.beginPath();
  ctx.arc(0, -8, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.shirt;
  roundRect(ctx, -10, 0, 20, 18, 5);
  ctx.fill();
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-4, 18);
  ctx.lineTo(-4, 26);
  ctx.moveTo(4, 18);
  ctx.lineTo(4, 26);
  ctx.stroke();
  // Patience bar.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(-16, -48, 32, 6);
  ctx.fillStyle = p.patience > 40 ? '#7dff9b' : '#ff5d5d';
  ctx.fillRect(-16, -48, 32 * Math.max(0, p.patience / 100), 6);
  ctx.restore();
}

function drawDelivery(ctx, d, time) {
  const x = d.side === 'left' ? roadEdge('left', d.y) - 26 : roadEdge('right', d.y) + 26;
  const bob = Math.sin(time * 4) * 4;
  ctx.save();
  ctx.translate(x, d.y + bob);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, 30 + Math.sin(time * 5) * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5b4636';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(0, -40);
  ctx.stroke();
  ctx.fillStyle = d.color;
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(34, -30);
  ctx.lineTo(0, -18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px Trebuchet MS, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(formatRp(d.fare), 0, 38);
  ctx.restore();
}

function drawPickup(ctx, p) {
  const x = p.x;
  const y = p.y;
  const s = scaleAt(y);
  ctx.save();
  ctx.translate(x, y);
  if (p.kind === 'coin') {
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.arc(0, 0, 13 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe98a';
    ctx.beginPath();
    ctx.arc(0, 0, 8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b8860b';
    ctx.font = `bold ${Math.max(9, 11 * s)}px Trebuchet MS, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Rp', 0, 1);
    ctx.textBaseline = 'alphabetic';
  } else if (p.kind === 'wrench') {
    ctx.rotate(Math.sin(p.spin) * 0.3);
    ctx.fillStyle = '#d7dee6';
    ctx.beginPath();
    ctx.arc(0, -8 * s, 8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d434e';
    ctx.beginPath();
    ctx.arc(0, -8 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d7dee6';
    ctx.fillRect(-2.5 * s, -4 * s, 5 * s, 16 * s);
  } else {
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.moveTo(0, -12 * s);
    ctx.quadraticCurveTo(12 * s, -12 * s, 12 * s, 0);
    ctx.lineTo(-12 * s, 0);
    ctx.quadraticCurveTo(-12 * s, -12 * s, 0, -12 * s);
    ctx.fill();
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(-12 * s, 0, 24 * s, 3 * s);
    ctx.beginPath();
    ctx.arc(0, 6 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles(ctx, state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const pt = state.particles[i];
    pt.t += dt;
    if (pt.t >= pt.life) {
      state.particles.splice(i, 1);
      continue;
    }
    const k = pt.t / pt.life;
    if (pt.kind === 'burst') {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = 1 - k;
      for (let j = 0; j < 8; j += 1) {
        const a = (j / 8) * Math.PI * 2 + pt.t * 2;
        const r = k * 46;
        ctx.beginPath();
        ctx.arc(pt.x + Math.cos(a) * r, pt.y + Math.sin(a) * r - k * 20, 4 * (1 - k) + 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (pt.kind === 'ring') {
      ctx.strokeStyle = '#ffe98a';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 20 + k * 190, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (pt.kind === 'confetti') {
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y + pt.t * 160, 8, 5);
    }
  }
}

function drawFloats(ctx, state, dt) {
  ctx.textAlign = 'center';
  for (let i = state.floats.length - 1; i >= 0; i -= 1) {
    const f = state.floats[i];
    f.t += dt;
    if (f.t >= f.life) {
      state.floats.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = 1 - f.t / f.life;
    ctx.fillStyle = f.color;
    ctx.font = 'bold 22px Trebuchet MS, sans-serif';
    ctx.fillText(f.text, f.x, f.y - f.t * 46);
    ctx.globalAlpha = 1;
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 14, 22, 0.82)';
  ctx.strokeStyle = 'rgba(255, 213, 74, 0.6)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.stroke();
}

function bigText(ctx, text, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px Trebuchet MS, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

function smallText(ctx, text, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.font = `${size}px Trebuchet MS, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(8, 14, 22, 0.62)';
  ctx.fillRect(0, 0, 1280, 720);
  bigText(ctx, 'BECAK RUSH', 640, 190, 84, '#ffd54a');
  smallText(ctx, 'JAKARTA  ·  ANTAR PENUMPANG, KEJAR SETORAN!', 640, 232, 24, '#fff');
  panel(ctx, 390, 268, 500, 196);
  smallText(ctx, 'Penumpang menunggu di trotoar dengan bendera warna.', 640, 306, 19, '#e8f1ff');
  smallText(ctx, 'Dekati mereka di jalur sebelahnya untuk menaikkan,', 640, 336, 19, '#e8f1ff');
  smallText(ctx, 'lalu antar ke bendera tujuan sebelum sabarnya habis.', 640, 366, 19, '#e8f1ff');
  smallText(ctx, 'Hindari mobil, angkot, bajaj & motor. Bel (Spasi) mengusir', 640, 396, 19, '#e8f1ff');
  smallText(ctx, 'lalu lintas di depanmu. 3 shift — setoran harus lunas!', 640, 426, 19, '#e8f1ff');
  if (state.best > 0) smallText(ctx, 'Setoran terbaik: ' + formatRp(state.best), 640, 500, 20, '#7dff9b');
  const blink = Math.floor(state.time * 2) % 2 === 0;
  if (blink) bigText(ctx, 'TEKAN ENTER / KLIK UNTUK MULAI', 640, 560, 28, '#fff');
  smallText(ctx, '← → pindah jalur   ·   ↑ ngebut   ·   ↓ ngerem   ·   Spasi bel   ·   P jeda   ·   M suara', 640, 640, 17, '#cfe3ff');
}

function drawShiftComplete(ctx, state) {
  ctx.fillStyle = 'rgba(8, 14, 22, 0.55)';
  ctx.fillRect(0, 0, 1280, 720);
  bigText(ctx, 'SHIFT ' + SHIFT_NAMES[state.shiftIndex].toUpperCase() + ' SELESAI!', 640, 250, 56, '#7dff9b');
  smallText(ctx, 'Setoran shift ini: ' + formatRp(state.fare) + '  (target ' + formatRp(state.target) + ')', 640, 310, 24, '#fff');
  smallText(ctx, 'Total setoran: ' + formatRp(state.totalFare), 640, 348, 24, '#fff');
  smallText(ctx, 'Bonus: +1 nyawa untuk shift berikutnya.', 640, 386, 20, '#ffd54a');
  const next = SHIFT_NAMES[state.shiftIndex + 1];
  bigText(ctx, 'LANJUT: SHIFT ' + next.toUpperCase(), 640, 460, 30, '#ffd54a');
  const blink = Math.floor(state.time * 2) % 2 === 0;
  if (blink) smallText(ctx, 'Tekan ENTER / klik untuk lanjut', 640, 510, 20, '#fff');
}

function drawWin(ctx, state) {
  ctx.fillStyle = 'rgba(8, 14, 22, 0.6)';
  ctx.fillRect(0, 0, 1280, 720);
  bigText(ctx, 'SETORAN LUNAS!', 640, 210, 72, '#ffd54a');
  smallText(ctx, 'Tiga shift selesai — becakmu juara jalanan Jakarta!', 640, 258, 24, '#fff');
  panel(ctx, 440, 292, 400, 150);
  smallText(ctx, 'Total setoran: ' + formatRp(state.totalFare), 640, 336, 26, '#7dff9b');
  smallText(ctx, 'Penumpang diantar: ' + state.stats.delivered, 640, 372, 20, '#fff');
  smallText(ctx, 'Koin dikumpul: ' + state.stats.coins + '   ·   Tabrakan: ' + state.stats.crashes, 640, 402, 20, '#fff');
  if (state.totalFare >= state.best) smallText(ctx, '★ REKOR BARU! ★', 640, 478, 26, '#ffd54a');
  else smallText(ctx, 'Setoran terbaik: ' + formatRp(state.best), 640, 478, 20, '#cfe3ff');
  const blink = Math.floor(state.time * 2) % 2 === 0;
  if (blink) bigText(ctx, 'TEKAN R / KLIK UNTUK MAIN LAGI', 640, 560, 26, '#fff');
}

function drawOver(ctx, state) {
  ctx.fillStyle = 'rgba(20, 6, 8, 0.6)';
  ctx.fillRect(0, 0, 1280, 720);
  bigText(ctx, 'GAME OVER', 640, 210, 72, '#ff5d5d');
  const reason = state.overReason === 'target'
    ? 'Setoran shift ' + SHIFT_NAMES[state.shiftIndex] + ' tidak tercapai.'
    : 'Becakmu remuk — nyawa habis.';
  smallText(ctx, reason, 640, 258, 24, '#fff');
  panel(ctx, 440, 292, 400, 150);
  smallText(ctx, 'Total setoran: ' + formatRp(state.totalFare), 640, 336, 26, '#ffd54a');
  smallText(ctx, 'Penumpang diantar: ' + state.stats.delivered, 640, 372, 20, '#fff');
  smallText(ctx, 'Koin dikumpul: ' + state.stats.coins + '   ·   Tabrakan: ' + state.stats.crashes, 640, 402, 20, '#fff');
  smallText(ctx, 'Setoran terbaik: ' + formatRp(state.best), 640, 478, 20, '#cfe3ff');
  const blink = Math.floor(state.time * 2) % 2 === 0;
  if (blink) bigText(ctx, 'TEKAN R / KLIK UNTUK COBA LAGI', 640, 560, 26, '#fff');
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(8, 14, 22, 0.6)';
  ctx.fillRect(0, 0, 1280, 720);
  bigText(ctx, 'JEDA', 640, 330, 64, '#fff');
  smallText(ctx, 'Tekan P untuk lanjut', 640, 380, 22, '#cfe3ff');
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Draw the whole frame for the current screen. */
export function drawScene(ctx, state, dt) {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawSky(ctx, state);
  drawBuildings(ctx, state);
  drawRoad(ctx, state);
  if (state.delivery) drawDelivery(ctx, state.delivery, state.time);
  for (const p of state.passengers) drawPassenger(ctx, p);
  for (const p of state.pickups) drawPickup(ctx, p);
  // Traffic behind the becak first, then the becak, then traffic in front.
  const behind = state.traffic.filter((v) => v.y < state.becak.y);
  const ahead = state.traffic.filter((v) => v.y >= state.becak.y);
  for (const v of behind) drawVehicle(ctx, v);
  drawBecak(ctx, state);
  for (const v of ahead) drawVehicle(ctx, v);
  drawParticles(ctx, state, dt);
  if (state.screen !== 'title') drawFloats(ctx, state, dt);
  ctx.restore();
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 40, 40, ${state.flash * 0.5})`;
    ctx.fillRect(0, 0, 1280, 720);
  }
  if (state.screen === 'title') drawTitle(ctx, state);
  else if (state.screen === 'shift') drawShiftComplete(ctx, state);
  else if (state.screen === 'win') drawWin(ctx, state);
  else if (state.screen === 'over') drawOver(ctx, state);
  else if (state.paused) drawPause(ctx);
}
