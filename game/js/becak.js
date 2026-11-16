// Becak Rush — the player's becak: three lanes, speed, and the bell.
// The road is drawn in a light perspective: lanes converge toward the horizon,
// so a lane's screen x and an object's scale both depend on its y.
import { bellSfx, coinSfx, crashSfx, pickupSfx } from './audio.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HORIZON_Y = 96;
export const GROUND_Y = 700;
export const PLAYER_Y = 565;
export const LANES_BOTTOM = [430, 640, 850];
export const LANES_TOP = [560, 640, 720];
export const BELL_RANGE = 330;
export const BELL_COOLDOWN = 3;

/** Deterministic RNG (mulberry32) for shot mode; gameplay uses Math.random. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Screen x of `lane` (0, 1, 2) at height `y`: lanes converge toward the horizon. */
export function laneX(lane, y) {
  const t = Math.min(1, Math.max(0, (y - HORIZON_Y) / (GROUND_Y - HORIZON_Y)));
  return LANES_TOP[lane] + (LANES_BOTTOM[lane] - LANES_TOP[lane]) * t;
}

/** Draw scale of an object at height `y` (small near the horizon, full size at the ground). */
export function scaleAt(y) {
  const t = Math.min(1, Math.max(0, (y - HORIZON_Y) / (GROUND_Y - HORIZON_Y)));
  return 0.45 + 0.55 * t;
}

/** Left / right road edge x at height `y` (the road is a trapezoid). */
export function roadEdge(side, y) {
  const t = Math.min(1, Math.max(0, (y - HORIZON_Y) / (GROUND_Y - HORIZON_Y)));
  if (side === 'left') return 540 + (300 - 540) * t;
  return 740 + (980 - 740) * t;
}

export function createBecak() {
  return {
    lane: 1,
    x: laneX(1, PLAYER_Y),
    y: PLAYER_Y,
    tilt: 0,
    invuln: 0,
    bellCd: 0,
    bellReadyFlash: 0,
    pedal: 0,
  };
}

/**
 * Move the becak toward its lane, steer the speed toward the pedal/brake target,
 * and count the bell cooldown down. `input` is {left, right, up, down}.
 */
export function updateBecak(becak, input, dt, state) {
  const targetX = laneX(becak.lane, becak.y);
  const settled = Math.abs(targetX - becak.x) < 45;
  if (settled) {
    if (input.left) becak.lane = Math.max(0, becak.lane - 1);
    if (input.right) becak.lane = Math.min(2, becak.lane + 1);
  }
  // A lane change is only taken while the becak is settled in its lane:
  // without this the pilot (or a fast key) can stack two changes while the
  // becak is still crossing the middle, and its x lags its lane field.
  input.left = false;
  input.right = false;
  const nextX = laneX(becak.lane, becak.y);
  const dx = nextX - becak.x;
  becak.x += dx * Math.min(1, dt * 22);
  becak.tilt = Math.max(-0.14, Math.min(0.14, dx * 0.004));
  const want = input.up ? 500 : input.down ? 150 : 310;
  state.speed += (want - state.speed) * Math.min(1, dt * 1.6);
  becak.pedal += dt * (4 + state.speed / 60);
  if (becak.invuln > 0) becak.invuln -= dt;
  if (becak.bellCd > 0) becak.bellCd -= dt;
  if (becak.bellReadyFlash > 0) becak.bellReadyFlash -= dt;
}

/**
 * Ring the bell: traffic ahead of the becak swerves out of the way or speeds off.
 * Returns how many vehicles were startled (0 when the bell is on cooldown).
 */
export function ringBell(state) {
  const becak = state.becak;
  if (becak.bellCd > 0 || state.screen !== 'play') return 0;
  becak.bellCd = BELL_COOLDOWN;
  bellSfx();
  let startled = 0;
  for (const v of state.traffic) {
    const ahead = becak.y - v.y;
    if (ahead < 0 || ahead > BELL_RANGE) continue;
    if (v.swerve !== 0) continue;
    startled += 1;
    v.startled = 1.2;
    const away = v.lane <= becak.lane ? -1 : 1;
    const nextLane = v.lane + away;
    if (nextLane >= 0 && nextLane <= 2 && !state.traffic.some((o) => o !== v && o.lane === nextLane && Math.abs(o.y - v.y) < 120)) {
      v.lane = nextLane;
      v.swerve = away;
    } else {
      v.speedBoost = 160;
    }
  }
  state.particles.push({ kind: 'ring', x: becak.x, y: becak.y - 30, t: 0, life: 0.5 });
  return startled;
}

/** A crash: lose a life, drop the passenger, shake the screen, brief invulnerability. */
export function crashBecak(state, vehicle) {
  const becak = state.becak;
  if (becak.invuln > 0 || state.screen !== 'play') return false;
  state.lives -= 1;
  state.stats.crashes += 1;
  state.stats.crashLog.push({
    t: +state.time.toFixed(2),
    lane: becak.lane,
    vLane: vehicle ? vehicle.lane : -1,
    vType: vehicle ? vehicle.type : '',
    vY: vehicle ? Math.round(vehicle.y) : 0,
    vX: vehicle ? Math.round(vehicle.x) : 0,
    bX: Math.round(becak.x),
    speed: Math.round(state.speed),
  });
  becak.invuln = 1.6;
  state.shake = 14;
  state.flash = 0.45;
  crashSfx();
  state.particles.push({ kind: 'burst', x: becak.x, y: becak.y - 20, t: 0, life: 0.7, color: '#ff5d5d' });
  if (state.carried) {
    addFloat(state, becak.x, becak.y - 90, 'Penumpang kabur!', '#ff9d5c');
    state.carried = null;
    state.delivery = null;
  }
  if (vehicle) vehicle.crashed = true;
  if (state.lives <= 0) {
    state.screen = 'over';
    state.overReason = 'crash';
  }
  return true;
}

/** Floating score text that rises and fades; stacked texts stagger so they stay readable. */
export function addFloat(state, x, y, text, color) {
  let stack = 0;
  for (const f of state.floats) if (Math.abs(f.x - x) < 140) stack += 1;
  state.floats.push({
    x: x + ((stack % 3) - 1) * 70,
    y: y - stack * 26,
    text,
    color: color || '#ffd54a',
    t: 0,
    life: 1.1,
  });
}

/** Collect a road pickup (coin / wrench / bell charge). */
export function collectPickup(state, pickup) {
  if (pickup.kind === 'coin') {
    state.fare += 2000;
    state.totalFare += 2000;
    state.stats.coins += 1;
    coinSfx();
    addFloat(state, pickup.x, pickup.y - 20, '+Rp 2.000', '#7dff9b');
    state.particles.push({ kind: 'burst', x: pickup.x, y: pickup.y, t: 0, life: 0.5, color: '#ffd54a' });
  } else if (pickup.kind === 'wrench') {
    state.lives = Math.min(3, state.lives + 1);
    pickupSfx();
    addFloat(state, pickup.x, pickup.y - 20, '+1 NYAWA', '#7dff9b');
  } else if (pickup.kind === 'bell') {
    state.becak.bellCd = 0;
    state.becak.bellReadyFlash = 1.5;
    pickupSfx();
    addFloat(state, pickup.x, pickup.y - 20, 'BEL SIAP!', '#7dff9b');
  }
}
