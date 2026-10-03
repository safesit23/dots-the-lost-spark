# DOTS: The Lost Spark

A complete, dependency-free Canvas adventure across five floating islands. Ten cosmetic characters share identical movement and collisions. All pixel artwork and the original pentatonic score are generated in the browser; no external assets, requests, accounts, or API keys are needed.

## Run

Requires Node.js 18+ for the optional preview server:

```sh
npm start
```

Open **http://localhost:4173**. You can also open `index.html` directly; localStorage behavior for `file:` URLs depends on the browser. Keep the same browser and URL to retain your save. After loading, gameplay has no network dependency. There is no service worker, so an offline reload requires the local files/server.

## Controls

| Action | Keyboard | Console |
| --- | --- | --- |
| Move | Arrows or WASD | D-pad |
| Interact / crouch | Up / down | D-pad up / down |
| Jump; hold airborne to float | Space or Z | A |
| Inhale / spit one object | X or J | B |
| Drop held object | Down + X/J | Down + B |
| Pause | Enter or Escape | Start |
| Map | Tab | Map |

Release B after a shot before inhaling again. Float has no time limit. Objects in the little wells refill in 2.5 seconds. Spit the matching object into soil, a mill, or a lantern to open a gate. Optional starlings are above the main route. Checkpoint flags refill hearts; falling or running out of hearts returns you quickly to the last flag. Bosses cannot be inhaled. The crab's shield needs a spark; the Keeper's core asks for seed, wind, and spark in order.

Character changes are available in the pause menu or at the village sign (Up). Settings include sound, assist mode, and reduced motion. Audio is initially muted and unlocked by a user gesture. The map unlocks worlds in sequence, offers completed worlds for replay, and has an optional timed replay toggle. The timer counts active play including respawns, and pauses in menus. Assist mode times share the same personal best category.

The last world opens a playable village celebration. Press Up at each of five lanterns to share the sparks and see the epilogue. Exploration and replays remain available afterward.

## Save behavior

Progress, character, settings, collectibles, best times, and safe checkpoints use the versioned `dots.lost-spark.v1` localStorage entry. Continue resumes the most recently visited adventure checkpoint, or the village after all islands are restored. Solved gates persist. Boss damage and enemies reset on respawn or reload. New adventure asks before replacing progress. Storage failures produce an in-game notice; malformed saves recover safely.

## Verification

```sh
npm test
```

The deterministic test harness runs the actual game script with a lightweight DOM/Canvas adapter. It covers movement and floating, keyboard and simultaneous pointer input, cancellation/blur cleanup, all ten saved characters, object handling and replenishment, all five stage definitions, projectile-based puzzles, boss shields and the final object order, progression, checkpoint restoration, overwrite confirmation, timed replays, and the playable ending. Development hooks are only exposed when the URL includes `?test`.

Browser checks cover the live Canvas render, selection, Continue, keyboard pause, clickable controls, settings, map, and portrait/landscape/desktop layout bounds. Real-device multitouch behavior and audio quality have not been tested on physical phones. The game is designed for modern browsers with Canvas, Pointer Events, and Web Audio.

## Inspiration

Approachable handheld platforming inspired by Kirby's Dream Land, with original worlds, guardians, story, generated artwork, and music. Character cosmetics interpret the supplied OpenAI Dots descriptions and public Dots group photography: https://www.theguardian.com/technology/2026/sep/29/openai-announces-dots-agent-safety-concerns

This is an independent fan-inspired prototype, not an official OpenAI or Nintendo product.
