# Sunset Courier

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/R3D-4RMY/flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/R3D-4RMY/flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

An original browser flight game for the [Make the best flight game](https://make.fun/bounty/best-flight-game-20261126-0057) bounty on make.fun.

## The game

You fly N77, a twin-prop mail plane, over a sunset archipelago. Each of the
three levels is a courier run: fly through the glowing rings in order, watch
your fuel, then bring the plane back down on the strip. Land too hard, hit a
hill, or ditch in the sea and the run is over.

- **First Light** — four wide rings over the lagoon, gentle morning light.
- **Island Hop** — six tighter rings with a crosswind off the sea.
- **Sunset Run** — eight narrow rings into the sunset, fuel is tight.

## How to fly

| Input | Does |
| --- | --- |
| ↑ / ↓ | Pitch up / down |
| ← / → or A / D | Bank and turn |
| W / S (or Shift / Ctrl, + / −) | Throttle up / down |
| Hold mouse button | Steer toward the pointer |
| P | Pause · M mute · R retry the level |

The HUD shows airspeed, altitude and vertical speed, a compass tape with
heading, a fuel gauge, the ring count, the score, and an artificial horizon.
Stall below 50 knots and the wing gives up — add throttle and push the nose
down. Every ring pays 100 points and 14 fuel; a clean landing pays 500 plus
a fuel bonus.

## How it works

No libraries, no network: plain Canvas 2D and WebAudio, all synthesised in
code. The terrain is a seeded heightfield (the same islands every run), the
camera is a chase camera that banks with the plane, and the engine hum, wind
rush, ring chimes and landing thud are all generated with oscillators and
filtered noise.

```
game/
  index.html        the page
  src/
    main.js         states, the loop, scoring, screenshot staging
    config.js       tuning, levels, skies
    random.js       seeded RNG and value noise
    terrain.js      the archipelago, its colours, the runway, palms
    camera.js       the chase camera and projection
    sky.js          gradient sky, sun, drifting clouds
    flight.js       the aircraft's flight model
    rings.js        the target-ring course
    plane.js        the chase-view aircraft and its shadow
    hud.js          airspeed, altitude, compass, fuel, attitude ball
    audio.js        synthesised engine, wind and chimes
    input.js        keyboard and mouse
```

## Play it

Serve `game/` with any static server and open `index.html` in a desktop
browser:

```sh
cd game && python3 -m http.server 8080
```

## Hand it in

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to `/output` and writes `/output/dossier.json` with the
vendored `vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
