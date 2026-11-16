// Becak Rush — Jakarta traffic: cars, angkot minibuses, bajaj and motorbikes.
// Vehicles have their own speed; on screen they move at (player speed - their speed),
// so slow traffic drifts down toward the becak and fast bikes pull away upward.
import { HORIZON_Y, laneX, scaleAt } from './becak.js';

export const VEHICLE_TYPES = {
  car: { w: 78, h: 150, minSpeed: 165, maxSpeed: 235, colors: ['#d94f3d', '#3d7dd9', '#e8e8e8', '#5cb85c', '#f2c14e'] },
  angkot: { w: 84, h: 172, minSpeed: 140, maxSpeed: 195, colors: ['#2aa198', '#e67e22', '#8e44ad'] },
  bajaj: { w: 62, h: 112, minSpeed: 200, maxSpeed: 265, colors: ['#f39c12', '#e67e22'] },
  motor: { w: 42, h: 92, minSpeed: 265, maxSpeed: 335, colors: ['#c0392b', '#2c3e50', '#16a085', '#d4d4d4'] },
};

/** Pick a vehicle type, weighted by shift (later shifts bring more bikes and bajaj). */
function pickType(rand, shiftIndex) {
  const r = rand();
  if (shiftIndex === 0) return r < 0.45 ? 'car' : r < 0.7 ? 'angkot' : r < 0.88 ? 'bajaj' : 'motor';
  if (shiftIndex === 1) return r < 0.38 ? 'car' : r < 0.6 ? 'angkot' : r < 0.82 ? 'bajaj' : 'motor';
  return r < 0.3 ? 'car' : r < 0.5 ? 'angkot' : r < 0.76 ? 'bajaj' : 'motor';
}

export function spawnVehicle(state, lane) {
  const rand = state.rand;
  const type = pickType(rand, state.shiftIndex);
  const spec = VEHICLE_TYPES[type];
  const speed = spec.minSpeed + rand() * (spec.maxSpeed - spec.minSpeed) + state.shiftIndex * 22;
  const fromTop = speed < state.speed;
  const y = fromTop ? HORIZON_Y - 40 : 760;
  state.traffic.push({
    kind: 'vehicle',
    type,
    lane,
    x: laneX(lane, y),
    y,
    w: spec.w,
    h: spec.h,
    speed,
    speedBoost: 0,
    fromTop,
    color: spec.colors[Math.floor(rand() * spec.colors.length)],
    swerve: 0,
    startled: 0,
    wobble: rand() * Math.PI * 2,
    crashed: false,
  });
}

/** Spawn timer: denser and quicker as shifts go on. */
export function updateTrafficSpawns(state, dt) {
  state.spawnTimers.traffic -= dt;
  if (state.spawnTimers.traffic > 0) return;
  const base = state.shiftIndex === 0 ? 1.3 : state.shiftIndex === 1 ? 1.0 : 0.8;
  state.spawnTimers.traffic = base * (0.7 + state.rand() * 0.6);
  // Pick the lane once, and never stack two vehicles in the same lane at the top.
  const lane = Math.floor(state.rand() * 3);
  const crowded = state.traffic.some((v) => v.lane === lane && v.y < 340);
  if (!crowded) spawnVehicle(state, lane);
}

/** Move every vehicle; bell-startled ones swerve lanes or speed off. */
export function updateTraffic(state, dt) {
  for (let i = state.traffic.length - 1; i >= 0; i -= 1) {
    const v = state.traffic[i];
    if (v.speedBoost > 0) v.speedBoost = Math.max(0, v.speedBoost - dt * 160);
    if (v.startled > 0) v.startled -= dt;
    const rel = state.speed - (v.speed + v.speedBoost);
    v.y += rel * dt;
    const targetX = laneX(v.lane, v.y);
    v.x += (targetX - v.x) * Math.min(1, dt * 6);
    v.wobble += dt * 6;
    if (v.y < HORIZON_Y - 220 || v.y > 860) state.traffic.splice(i, 1);
  }
}

/** The first vehicle overlapping the becak (scaled hitbox), or null. */
export function checkTrafficCollision(state) {
  const b = state.becak;
  if (b.invuln > 0) return null;
  const bw = 46;
  const bh = 62;
  for (const v of state.traffic) {
    const s = scaleAt(v.y);
    const vw = v.w * s;
    const vh = v.h * s;
    const overlapX = Math.abs(v.x - b.x) < (vw + bw) / 2 - 6;
    const overlapY = Math.abs(v.y - b.y) < (vh + bh) / 2 - 10;
    if (overlapX && overlapY) return v;
  }
  return null;
}
