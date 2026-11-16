// Becak Rush — passengers, fares and road pickups.
// A passenger waits on a sidewalk with a flag. Drive past in the lane next to them
// to pick them up; a delivery flag then appears further up the road — drive past it
// in its lane before the passenger's patience runs out to earn the fare.
import { HORIZON_Y, PLAYER_Y, laneX, roadEdge } from './becak.js';
import { addFloat, collectPickup } from './becak.js';
import { pickupSfx } from './audio.js';

const FLAG_COLORS = ['#ff5d5d', '#ffd54a', '#7dff9b', '#6ec6ff', '#ff9de2'];
const FLAG_NAMES = { '#ff5d5d': 'merah', '#ffd54a': 'kuning', '#7dff9b': 'hijau', '#6ec6ff': 'biru', '#ff9de2': 'pink' };
const SKINS = ['#8d5a2b', '#c68642', '#6b4423', '#e0ac69'];
const SHIRTS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

export function makeFare(rand) {
  return 12000 + Math.floor(rand() * 17) * 1000;
}

export function spawnPassenger(state) {
  const rand = state.rand;
  const side = rand() < 0.5 ? 'left' : 'right';
  const lane = side === 'left' ? 0 : 2;
  const y = HORIZON_Y + 30 + rand() * 60;
  const color = FLAG_COLORS[Math.floor(rand() * FLAG_COLORS.length)];
  state.passengers.push({
    kind: 'passenger',
    side,
    lane,
    x: side === 'left' ? roadEdge('left', y) - 34 : roadEdge('right', y) + 34,
    y,
    fare: makeFare(rand),
    patience: 100,
    color,
    colorName: FLAG_NAMES[color],
    skin: SKINS[Math.floor(rand() * SKINS.length)],
    shirt: SHIRTS[Math.floor(rand() * SHIRTS.length)],
    wave: rand() * Math.PI * 2,
    picked: false,
  });
}

export function updatePassengerSpawns(state, dt) {
  state.spawnTimers.passenger -= dt;
  if (state.spawnTimers.passenger > 0) return;
  state.spawnTimers.passenger = state.shiftIndex === 2 ? 2.4 : 3.2;
  if (state.passengers.length < 3 && !state.carried) spawnPassenger(state);
}

/** Waiting passengers drift down with the road; their patience slowly drains. */
export function updatePassengers(state, dt) {
  const drain = state.shiftIndex === 2 ? 3.4 : 2.4;
  for (let i = state.passengers.length - 1; i >= 0; i -= 1) {
    const p = state.passengers[i];
    p.y += state.speed * dt;
    p.wave += dt * 5;
    p.patience -= drain * dt;
    if (p.patience <= 0) {
      addFloat(state, p.x, p.y - 46, 'Keburu pergi…', '#cfe3ff');
      state.passengers.splice(i, 1);
    } else if (p.y > 780) {
      state.passengers.splice(i, 1);
    }
  }
  if (state.carried) {
    const drainCarried = state.shiftIndex === 2 ? 8.5 : 6.5;
    state.carried.patience -= drainCarried * dt;
    if (state.carried.patience <= 0) {
      addFloat(state, state.becak.x, state.becak.y - 96, 'Penumpang marah, turun!', '#ff9d5c');
      state.carried = null;
      state.delivery = null;
    }
  }
  if (state.delivery) {
    state.delivery.y += state.speed * dt;
    if (state.delivery.y > 780) {
      // Missed the drop-off: the passenger gives up.
      addFloat(state, state.becak.x, state.becak.y - 96, 'Kelewatan tujuan!', '#ff9d5c');
      state.carried = null;
      state.delivery = null;
    }
  }
}

/** Pick up a waiting passenger when the becak passes in the lane next to them. */
export function tryPickupPassenger(state) {
  if (state.carried) return;
  const b = state.becak;
  for (let i = 0; i < state.passengers.length; i += 1) {
    const p = state.passengers[i];
    if (p.lane === b.lane && Math.abs(p.y - b.y) < 85) {
      state.passengers.splice(i, 1);
      state.carried = p;
      state.stats.pickedUp += 1;
      pickupSfx();
      addFloat(state, b.x, b.y - 96, 'Naik! Antar ke bendera ' + p.colorName, '#7dff9b');
      const destSide = state.rand() < 0.5 ? 'left' : 'right';
      state.delivery = {
        kind: 'delivery',
        side: destSide,
        lane: destSide === 'left' ? 0 : 2,
        y: HORIZON_Y + 20,
        color: p.color,
        fare: p.fare,
      };
      return;
    }
  }
}

/** Deliver the carried passenger at the matching flag. */
export function tryDeliverPassenger(state) {
  if (!state.carried || !state.delivery) return;
  const b = state.becak;
  const d = state.delivery;
  if (d.lane === b.lane && Math.abs(d.y - b.y) < 85) {
    const fare = d.fare;
    state.fare += fare;
    state.totalFare += fare;
    state.stats.delivered += 1;
    pickupSfx();
    addFloat(state, b.x, b.y - 96, '+Rp ' + fare.toLocaleString('id-ID'), '#ffd54a');
    state.particles.push({ kind: 'burst', x: b.x, y: b.y - 40, t: 0, life: 0.6, color: '#ffd54a' });
    state.particles.push({ kind: 'burst', x: b.x, y: b.y - 40, t: 0, life: 0.6, color: '#7dff9b' });
    state.carried = null;
    state.delivery = null;
  }
}

/** Coins, wrenches and bell charges scattered on the road. */
export function spawnRoadPickup(state) {
  const rand = state.rand;
  const roll = rand();
  const kind = roll < 0.62 ? 'coin' : roll < 0.82 ? 'wrench' : 'bell';
  const lane = Math.floor(rand() * 3);
  const y = HORIZON_Y + 20 + rand() * 40;
  state.pickups.push({ kind, lane, x: laneX(lane, y), y, spin: rand() * Math.PI * 2 });
}

export function updateRoadPickups(state, dt) {
  state.spawnTimers.pickup -= dt;
  if (state.spawnTimers.pickup <= 0) {
    state.spawnTimers.pickup = 2.6 + state.rand() * 2.2;
    if (state.pickups.length < 5) spawnRoadPickup(state);
  }
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const p = state.pickups[i];
    p.y += state.speed * dt;
    p.spin += dt * 4;
    p.x = laneX(p.lane, p.y);
    if (p.y > 780) state.pickups.splice(i, 1);
  }
}

/** Collect a road pickup the becak overlaps. */
export function tryCollectRoadPickup(state) {
  const b = state.becak;
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const p = state.pickups[i];
    if (p.lane === b.lane && Math.abs(p.y - b.y) < 70) {
      state.pickups.splice(i, 1);
      collectPickup(state, p);
    }
  }
}
