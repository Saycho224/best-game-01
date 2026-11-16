// Becak Rush — game loop, state machine (title / play / shift / win / over / pause),
// keyboard + mouse input, the HUD, and the deterministic ?shot= scenes.
import { createBecak, updateBecak, ringBell, crashBecak, mulberry32, laneX, HORIZON_Y, PLAYER_Y } from './becak.js';
import { updateTrafficSpawns, updateTraffic, checkTrafficCollision } from './traffic.js';
import {
  updatePassengerSpawns, updatePassengers, tryPickupPassenger,
  tryDeliverPassenger, updateRoadPickups, tryCollectRoadPickup,
} from './passengers.js';
import { drawScene, formatRp, SHIFT_NAMES, SHIFT_TARGETS, SHIFT_SECONDS } from './render.js';
import {
  initAudio, startMusic, stopMusic, setMusicShift, toggleMute,
  clickSfx, shiftSfx, winSfx, loseSfx,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const STEP = 1 / 60;

const el = {
  hud: document.getElementById('hud'),
  shiftName: document.getElementById('shift-name'),
  timer: document.getElementById('timer'),
  fare: document.getElementById('fare'),
  target: document.getElementById('target'),
  fareFill: document.getElementById('fare-fill'),
  lives: document.getElementById('lives'),
  speed: document.getElementById('speed'),
  carry: document.getElementById('carry'),
  carryFare: document.getElementById('carry-fare'),
  patienceFill: document.getElementById('patience-fill'),
  bell: document.getElementById('bell'),
  toast: document.getElementById('toast'),
};

function loadBest() {
  try {
    return parseInt(window.localStorage.getItem('becakRushBest') || '0', 10) || 0;
  } catch (e) {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem('becakRushBest', String(value));
  } catch (e) {
    /* storage unavailable — best fare just isn't kept */
  }
}

export function createState(rand) {
  return {
    screen: 'title',
    paused: false,
    shiftIndex: 0,
    shiftTime: SHIFT_SECONDS,
    fare: 0,
    totalFare: 0,
    target: SHIFT_TARGETS[0],
    lives: 3,
    speed: 310,
    scroll: 0,
    time: 0,
    becak: createBecak(),
    traffic: [],
    passengers: [],
    carried: null,
    delivery: null,
    pickups: [],
    particles: [],
    floats: [],
    shake: 0,
    flash: 0,
    spawnTimers: { traffic: 0.6, passenger: 1.2, pickup: 1.8 },
    stats: { delivered: 0, coins: 0, crashes: 0, pickedUp: 0, crashLog: [] },
    best: loadBest(),
    overReason: '',
    toastT: 0,
    rand: rand || Math.random,
  };
}

const state = createState();
const input = { left: false, right: false, up: false, down: false };
let shotMode = false;

window.__game = state;

function showToast(text, seconds) {
  el.toast.textContent = text;
  el.toast.classList.remove('hidden');
  state.toastT = seconds || 1.6;
}

function startShift(index) {
  state.shiftIndex = index;
  state.shiftTime = SHIFT_SECONDS;
  state.fare = 0;
  state.target = SHIFT_TARGETS[index];
  state.traffic.length = 0;
  state.passengers.length = 0;
  state.pickups.length = 0;
  state.carried = null;
  state.delivery = null;
  state.becak = createBecak();
  state.spawnTimers = { traffic: 0.6, passenger: 1.0, pickup: 1.5 };
  setMusicShift(index);
  state.screen = 'play';
}

function startGame() {
  const fresh = createState(state.rand);
  Object.keys(fresh).forEach((k) => { state[k] = fresh[k]; });
  state.best = loadBest();
  initAudio();
  startMusic(0);
  startShift(0);
  showToast('Shift Pagi — kejar ' + formatRp(state.target) + '!', 2);
  clickSfx();
}

function endShift() {
  if (state.fare >= state.target) {
    if (state.shiftIndex >= 2) {
      state.screen = 'win';
      if (state.totalFare > state.best) {
        state.best = state.totalFare;
        saveBest(state.best);
      }
      stopMusic();
      winSfx();
      for (let i = 0; i < 60; i += 1) {
        state.particles.push({
          kind: 'confetti', x: 80 + state.rand() * 1120, y: -20 - state.rand() * 200,
          t: 0, life: 3, color: ['#ffd54a', '#ff5d5d', '#7dff9b', '#6ec6ff'][i % 4],
        });
      }
    } else {
      state.screen = 'shift';
      state.lives = Math.min(3, state.lives + 1);
      shiftSfx();
    }
  } else {
    state.screen = 'over';
    state.overReason = 'target';
    if (state.totalFare > state.best) {
      state.best = state.totalFare;
      saveBest(state.best);
    }
    stopMusic();
    loseSfx();
  }
}

/** One fixed step of the world (used by the live loop and the shot scenes). */
export function stepWorld(dt) {
  state.time += dt;
  state.scroll += state.speed * dt;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.4);
  updateBecak(state.becak, input, dt, state);
  updateTrafficSpawns(state, dt);
  updateTraffic(state, dt);
  updatePassengerSpawns(state, dt);
  updatePassengers(state, dt);
  updateRoadPickups(state, dt);
  tryPickupPassenger(state);
  tryDeliverPassenger(state);
  tryCollectRoadPickup(state);
  const hit = checkTrafficCollision(state);
  if (hit) {
    crashBecak(state, hit);
    if (state.screen === 'over') {
      if (state.totalFare > state.best) {
        state.best = state.totalFare;
        saveBest(state.best);
      }
      stopMusic();
      loseSfx();
    }
  }
  if (state.screen === 'play') {
    state.shiftTime -= dt;
    if (state.shiftTime <= 0) {
      state.shiftTime = 0;
      endShift();
    }
  }
}

function updateHud() {
  const showHud = state.screen === 'play' || state.screen === 'shift';
  el.hud.style.display = showHud ? 'flex' : 'none';
  el.shiftName.textContent = SHIFT_NAMES[state.shiftIndex];
  el.timer.textContent = Math.ceil(state.shiftTime);
  el.timer.classList.toggle('low', state.shiftTime <= 10 && state.screen === 'play');
  el.fare.textContent = formatRp(state.fare);
  el.target.textContent = '/ ' + formatRp(state.target);
  el.fareFill.style.width = Math.min(100, (state.fare / state.target) * 100) + '%';
  el.lives.textContent = '♥'.repeat(Math.max(0, state.lives)) + '♡'.repeat(Math.max(0, 3 - state.lives));
  el.speed.textContent = Math.round(state.speed * 0.12) + ' km/j';
  if (state.carried && showHud) {
    el.carry.classList.remove('hidden');
    el.carryFare.textContent = formatRp(state.carried.fare);
    el.patienceFill.style.width = Math.max(0, state.carried.patience) + '%';
  } else {
    el.carry.classList.add('hidden');
  }
  const bellReady = state.becak.bellCd <= 0;
  el.bell.classList.toggle('hidden', !showHud);
  el.bell.classList.toggle('cooling', !bellReady);
  el.bell.innerHTML = bellReady
    ? '🔔 BEL SIAP <span id="bell-key">[Spasi]</span>'
    : '🔔 bel isi ulang… ' + state.becak.bellCd.toFixed(1) + ' dtk';
  if (state.toastT > 0) {
    state.toastT -= 1 / 60;
    if (state.toastT <= 0) el.toast.classList.add('hidden');
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!shotMode) {
    if (state.screen === 'title') {
      // Attract mode: the street lives behind the title.
      stepWorld(dt);
      state.screen = 'title';
    } else if (state.screen === 'play' && !state.paused) {
      stepWorld(dt);
    } else if (state.screen === 'win' || state.screen === 'over') {
      state.time += dt;
      for (const pt of state.particles) pt.t += dt * 0.4;
    }
    drawScene(ctx, state, dt);
    updateHud();
  }
  requestAnimationFrame(frame);
}

function primaryAction() {
  if (state.screen === 'title') {
    startGame();
  } else if (state.screen === 'shift') {
    clickSfx();
    startShift(state.shiftIndex + 1);
    showToast('Shift ' + SHIFT_NAMES[state.shiftIndex] + ' — kejar ' + formatRp(state.target) + '!', 2);
  } else if (state.screen === 'win' || state.screen === 'over') {
    startGame();
  }
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
    return;
  }
  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      input.left = true;
      e.preventDefault();
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      input.right = true;
      e.preventDefault();
      break;
    case 'ArrowUp':
    case 'w':
    case 'W':
      input.up = true;
      e.preventDefault();
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      input.down = true;
      e.preventDefault();
      break;
    case ' ':
      ringBell(state);
      e.preventDefault();
      break;
    case 'Enter':
      primaryAction();
      break;
    case 'p':
    case 'P':
      if (state.screen === 'play') {
        state.paused = !state.paused;
        clickSfx();
      }
      break;
    case 'r':
    case 'R':
      if (state.screen === 'win' || state.screen === 'over') startGame();
      break;
    case 'm':
    case 'M':
      toggleMute();
      break;
    default:
      break;
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      input.up = false;
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      input.down = false;
      break;
    default:
      break;
  }
});

canvas.addEventListener('click', () => {
  if (state.screen !== 'play' || state.paused) primaryAction();
  else initAudio();
});

// --- Shot mode: deterministic scenes for screenshots (?shot=title|play|win|over) ---
// The autopilot steers toward passengers and coins and away from traffic, so the
// play scene is a frame a real short game produces from a fixed seed. Danger is
// judged by each vehicle's real x position (a bell-startled vehicle mid-swerve
// still counts), looking ahead and behind for anything closing on the becak.
function laneDanger(lane) {
  const b = state.becak;
  for (const v of state.traffic) {
    if (v.y < b.y - 420 || v.y > b.y + 120) continue;
    const laneCentre = laneX(lane, Math.max(HORIZON_Y, Math.min(700, v.y)));
    if (Math.abs(v.x - laneCentre) < 80) return true;
  }
  return false;
}

/** A lane the becak can cross right now: nothing in the immediate collision zone. */
function laneCrossable(lane) {
  const b = state.becak;
  for (const v of state.traffic) {
    if (Math.abs(v.y - b.y) > 170) continue;
    const laneCentre = laneX(lane, Math.max(HORIZON_Y, Math.min(700, v.y)));
    if (Math.abs(v.x - laneCentre) < 80) return false;
  }
  return true;
}

function autopilot() {
  const b = state.becak;
  const safe = [0, 1, 2].map((lane) => !laneDanger(lane));
  const scores = [0, 1, 2].map((lane) => {
    if (!safe[lane]) return -1;
    let score = 10;
    for (const p of state.passengers) {
      if (p.lane === lane && p.y > b.y - 520 && p.y < b.y) score += 40;
    }
    for (const p of state.pickups) {
      if (p.lane === lane && p.y > b.y - 420 && p.y < b.y) score += 12;
    }
    if (state.delivery && state.delivery.lane === lane) score += 60;
    if (lane === b.lane) score += 3;
    return score;
  });
  let bestLane = b.lane;
  for (let lane = 0; lane < 3; lane += 1) {
    if (scores[lane] > scores[bestLane]) bestLane = lane;
  }
  if (safe[b.lane]) {
    // Current lane is clear: only leave it for a clearly better safe lane,
    // and only through a lane that is safe too — never cross an unsafe lane
    // to chase a fare, so the becak never zigzags through traffic for a coin.
    if (scores[bestLane] > scores[b.lane] + 15) {
      const next = bestLane < b.lane ? b.lane - 1 : b.lane + 1;
      if (safe[next]) {
        if (next < b.lane) input.left = true;
        else if (next > b.lane) input.right = true;
      }
    }
    input.up = true;
    input.down = false;
  } else if (scores[bestLane] >= 0) {
    // Dodge to the best safe lane, one step at a time, but only through a
    // lane that is crossable right now; otherwise brake and ring the bell.
    const next = bestLane < b.lane ? b.lane - 1 : b.lane + 1;
    if (laneCrossable(next)) {
      if (next < b.lane) input.left = true;
      else if (next > b.lane) input.right = true;
      input.up = false;
      input.down = false;
    } else {
      input.up = false;
      input.down = true;
      ringBell(state);
    }
  } else {
    // No safe lane at all: brake and ring the bell to clear the way.
    input.up = false;
    input.down = true;
    ringBell(state);
  }
}

function runSim(seconds, pilot) {
  const steps = Math.floor(seconds / STEP);
  state.trace = [];
  for (let i = 0; i < steps; i += 1) {
    if (pilot) autopilot();
    stepWorld(STEP);
    if (i % 15 === 0) {
      state.trace.push({
        t: +state.time.toFixed(2),
        lane: state.becak.lane,
        x: Math.round(state.becak.x),
        speed: Math.round(state.speed),
        safe: [0, 1, 2].map((l) => !laneDanger(l)),
        bellCd: +state.becak.bellCd.toFixed(1),
        traffic: state.traffic.map((v) => ({ ty: v.type[0], ln: v.lane, y: Math.round(v.y), x: Math.round(v.x) })),
      });
    }
    if (state.screen === 'over' || state.screen === 'win' || state.screen === 'shift') break;
  }
}

function stageShot(name) {
  state.rand = mulberry32(20261116);
  const fresh = createState(state.rand);
  Object.keys(fresh).forEach((k) => { state[k] = fresh[k]; });
  state.best = 412000;
  if (name === 'play') {
    state.screen = 'play';
    runSim(24, true);
    state.screen = 'play';
    if (!state.carried) {
      // Stage a passenger aboard so the shot shows the full loop.
      const p = { kind: 'passenger', side: 'right', lane: 2, x: 0, y: PLAYER_Y, fare: 18000, patience: 72, color: '#ffd54a', colorName: 'kuning', skin: '#c68642', shirt: '#3498db', wave: 0, picked: true };
      state.carried = p;
      state.delivery = { kind: 'delivery', side: 'left', lane: 0, y: 300, color: '#ffd54a', fare: 18000 };
    }
    state.fare = 64000;
    state.totalFare = 64000;
  } else if (name === 'win') {
    state.screen = 'win';
    state.shiftIndex = 2;
    state.target = SHIFT_TARGETS[2];
    state.totalFare = 412000;
    state.fare = 248000;
    state.stats = { delivered: 21, coins: 34, crashes: 2, pickedUp: 23 };
    for (let i = 0; i < 60; i += 1) {
      state.particles.push({
        kind: 'confetti', x: 80 + state.rand() * 1120, y: -20 - state.rand() * 200,
        t: state.rand() * 0.8, life: 3, color: ['#ffd54a', '#ff5d5d', '#7dff9b', '#6ec6ff'][i % 4],
      });
    }
    runSim(0.5, false);
    state.screen = 'win';
  } else if (name === 'over') {
    state.screen = 'play';
    // A hurried player who never steers: traffic catches the becak out.
    runSim(600, false);
    state.floats = []; // stray fare floats from the sim would peek out behind the panel
    if (state.screen !== 'over') {
      state.screen = 'over';
      state.overReason = 'crash';
      state.lives = 0;
    }
    state.totalFare = 86000;
    state.stats.delivered = 4;
  } else {
    // title: a living street behind the menu.
    state.screen = 'title';
    runSim(5, true);
    state.screen = 'title';
  }
  // Freeze the blink phase so the start / restart prompt is visible in the shot.
  state.time = Math.floor(state.time) + 0.25;
  drawScene(ctx, state, 0);
  updateHud();
  window.__shotReady = true;
}

const params = new URLSearchParams(window.location.search);
if (params.has('shot')) {
  shotMode = true;
  stageShot(params.get('shot') || 'title');
} else {
  requestAnimationFrame(frame);
}
