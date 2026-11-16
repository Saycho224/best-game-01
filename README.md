# Becak Rush — Jakarta

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Saycho224/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Saycho224/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Built for [make.fun's "Make the best game" bounty](https://make.fun/bounty/best-game-01) — a $1,000 best-game competition.

An original 2D canvas arcade game. You ride a becak (Indonesian pedicab) through
Jakarta streets: pick up passengers waiting on the sidewalk with a coloured flag,
deliver them to the matching flag before their patience runs out, dodge cars,
angkot minibuses, bajaj and motorbikes, and ring your bell to clear traffic ahead.

## Goal

Clear three shifts — **Pagi**, **Siang**, **Malam** — each 75 seconds with a growing
fare target (Rp 100.000 / Rp 160.000 / Rp 240.000). Finish all three and the
setoran is paid: **Setoran Lunas!** Lose all 3 lives, or miss a shift's target
when the timer ends, and it's game over. Your best total fare is saved.

## How to play

- **← → / A D** — change lane (three lanes)
- **↑ / W** — pedal faster · **↓ / S** — brake
- **Space** — ring the bell: traffic ahead swerves away or speeds off (3 s cooldown)
- **P** — pause · **R** — restart (on win / game over) · **M** — mute
- Mouse: click to start / continue / restart.

Passengers wait on the sidewalk — drive past in the lane next to them to pick
them up. A delivery flag then appears up the road: drive past it in its lane to
earn the fare. Coins on the road are worth Rp 2.000, a wrench repairs +1 life
(max 3), a bell charge readies your bell at once.

## Run it

Serve `game/` with any static file server and open `game/index.html` in desktop
Chrome. No network requests, no build step, no external assets: all art is
drawn in code and all sound is synthesised with WebAudio.

Screenshots are taken with the game's deterministic shot mode:
`game/index.html?shot=title|play|win|over`.

## License

MIT — see LICENSE.
