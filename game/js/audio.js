// Becak Rush — every sound is synthesised with WebAudio. No audio files, no network.
// A tiny pentatonic music loop (C major pentatonic) plus one-shot effects.
let ctx = null;
let master = null;
let musicTimer = null;
let musicStep = 0;
let muted = false;
let musicShift = 0;

const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
const BASS = [130.81, 98.0, 110.0, 146.83];
// A cheerful 16-step loop: melody notes (0 = rest) with a bass note every 4 steps.
const MELODY = [0, 5, 0, 7, 6, 0, 5, 0, 4, 0, 5, 0, 7, 8, 0, 0];

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  } catch (e) {
    ctx = null;
  }
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

function tone(freq, dur, type, vol, when, slideTo) {
  if (!ctx || !master) return;
  const t0 = when || ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, lowpass) {
  if (!ctx || !master) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass || 900;
  const gain = ctx.createGain();
  gain.gain.value = vol || 0.3;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start();
}

export function bellSfx() {
  if (!ctx) return;
  tone(1318.5, 0.5, 'sine', 0.22);
  tone(1975.5, 0.4, 'sine', 0.12);
  tone(659.25, 0.25, 'triangle', 0.1);
}

export function coinSfx() {
  if (!ctx) return;
  tone(987.77, 0.09, 'square', 0.1);
  tone(1318.5, 0.16, 'square', 0.1, ctx.currentTime + 0.07);
}

export function pickupSfx() {
  if (!ctx) return;
  tone(523.25, 0.1, 'triangle', 0.16);
  tone(783.99, 0.14, 'triangle', 0.16, ctx.currentTime + 0.08);
}

export function crashSfx() {
  if (!ctx) return;
  noiseBurst(0.35, 0.5, 700);
  tone(110, 0.4, 'sine', 0.35, ctx.currentTime, 45);
}

export function clickSfx() {
  if (!ctx) return;
  tone(660, 0.07, 'triangle', 0.14);
}

export function shiftSfx() {
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(523.25, 0.12, 'triangle', 0.16, t);
  tone(659.25, 0.12, 'triangle', 0.16, t + 0.11);
  tone(783.99, 0.22, 'triangle', 0.18, t + 0.22);
}

export function winSfx() {
  if (!ctx) return;
  const t = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, 0.3, 'triangle', 0.16, t + i * 0.13));
}

export function loseSfx() {
  if (!ctx) return;
  const t = ctx.currentTime;
  [392, 349.23, 311.13, 261.63].forEach((f, i) => tone(f, 0.3, 'sine', 0.16, t + i * 0.16));
}

/** Start the pentatonic loop; `shift` (0 Pagi, 1 Siang, 2 Malam) sets the tempo. */
export function startMusic(shift) {
  if (!ctx || musicTimer) return;
  musicShift = shift || 0;
  musicStep = 0;
  const stepDur = musicShift === 2 ? 0.3 : 0.24;
  musicTimer = setInterval(() => {
    if (!ctx || muted) {
      musicStep = (musicStep + 1) % 16;
      return;
    }
    const idx = MELODY[musicStep % 16];
    if (idx > 0) tone(PENTA[(idx - 1) % PENTA.length], 0.2, 'triangle', 0.07);
    if (musicStep % 4 === 0) tone(BASS[(musicStep / 4) % BASS.length], 0.5, 'sine', 0.09);
    musicStep = (musicStep + 1) % 16;
  }, stepDur * 1000);
}

export function setMusicShift(shift) {
  musicShift = shift || 0;
}

export function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}
