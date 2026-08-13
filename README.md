# Platy Brawl

A 90s arcade-style 2D fighting game. Three platypuses, motion specials, first-to-two rounds, local 2-player or vs CPU. Built as a Street Fighter II / Mortal Kombat cabinet slice: title → select → VS → fight → rematch.

Play it: [platybrawl.aaron-faby.workers.dev](https://platybrawl.aaron-faby.workers.dev)

Click or press a key once so the browser will play sound.

## How to play

1. **Title** — press Enter, Space, or a punch to start.
2. **Select** — P1 picks a platy with A/D and locks with U (or I / J / K).
3. **VS** — a short intro, then the match.
4. **Fight** — best of three (first to 2 rounds). Each round is 99 seconds.
5. **Result** — rematch or back out with Start / punch.

Default mode is **vs CPU**. After P1 locks, the CPU is assigned one of the two characters you did *not* pick. You cannot steer the CPU cursor.

To play **human vs human**, press a P2 attack (**O**, **P**, **L**, **;**, or numpad 4/5/1/2) *before* P1 locks. Then P2 picks with the arrow keys and locks with **O**.

During a match, press **H** to pause and show both characters’ movesets. **H** or **Esc** resumes.

## Roster

| Fighter | Style | Specials |
| --- | --- | --- |
| **Bob the Platy** | All-rounder | **Bill Drill** `↓ ↘ → + P` · **Venom Spur** `→ ↓ ↘ + P` |
| **Ninja Platy** | Rushdown | **Shuriken** `↓ ↘ → + P` · **Shadow Step** `↓ ↙ ← + K` |
| **Cyberplaty** | Zoner | **Plasma** hold `←` then `→ + P` · **Rocket Knee** `↓ ↘ → + K` |

Everyone also has standing and crouching punches/kicks, a jump, and a throw (**LP + LK** while close). Light and heavy versions of a special come from the light vs heavy button.

Motions are relative to the way you are facing (numpad notation):

- **QCF** — quarter circle forward: `↓ ↘ →`
- **QCB** — quarter circle back: `↓ ↙ ←`
- **DP** — dragon punch: `→ ↓ ↘`
- **Charge** — hold back ~2/3 of a second, then tap forward + punch

## Stages

Each round picks one of three arenas at random, and will not repeat the stage you just fought on:

- **Billabong** — sunset dock
- **Dojo** — night ninja courtyard
- **Neon Lab** — cyborg factory in the rain

## Controls

### Player 1

| Action | Keys |
| --- | --- |
| Move / crouch / jump | **A D S W** |
| Light / heavy punch | **U** / **I** |
| Light / heavy kick | **J** / **K** |
| Start | **Enter** or **Space** |

### Player 2

| Action | Keys |
| --- | --- |
| Move / crouch / jump | **← → ↓ ↑** |
| Light / heavy punch | **O** / **P** (or numpad **4** / **5**) |
| Light / heavy kick | **L** / **;** (or numpad **1** / **2**) |

### System

| Action | Keys |
| --- | --- |
| Mute / unmute music | **M** (saved in the browser) |
| Pause + moveset overlay | **H** (Esc also resumes) |

A standard gamepad works too. The first pad is P1, a second distinct pad is P2. Press a face button once to arm that pad (this ignores stick drift until then). Face buttons are LP / HP / LK / HK; the Start button also starts.

### Debug (optional)

| Key | Effect |
| --- | --- |
| **F1** | Draw hit / hurt / push boxes |
| **F2** | Force P2 to dummy-block |
| **F3** | Frame-step pause (press again to advance one frame; Esc leaves this pause) |

## Run locally

Needs Node.js 22+ (or current LTS) and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/). Press a key or click once so audio can start.

Other scripts:

```bash
npm test          # vitest, once
npm run build     # typecheck + Vite production build
npm run preview   # serve the production build locally
npm run deploy    # build, then wrangler deploy
```

## Deploy

The live site is a Cloudflare Worker serving the Vite `dist/` folder as static assets (`wrangler.jsonc`).

```bash
npx wrangler login
npm run deploy
```

That publishes to [platybrawl.aaron-faby.workers.dev](https://platybrawl.aaron-faby.workers.dev). Hard-refresh if an old JS bundle is still cached.

The repo is [AaronFaby/PlatyBrawl](https://github.com/AaronFaby/PlatyBrawl).

## Project layout

Vanilla TypeScript + Vite + Canvas 2D. No Phaser, no React. The sim runs at a fixed 60 Hz; the view is 480×270, nearest-neighbor scaled and letterboxed.

```
src/
  main.ts            boot, scene switch, game loop
  config.ts          logical resolution, HP, timer, roster meta
  scenes/            title, select, versus, fight, result
  fight/             fighters, combat, physics, projectiles, match
  input/             keyboard + pads, motion buffer
  data/characters/   Bob, Ninja, Cyber frame data
  data/moves.ts      overlay / select move lists
  data/stages.ts     stage roster + random pick
  ai/cpu.ts          vs-CPU brain
  audio/             Web Audio SFX + chip BGM
  render/            sprites, stage, HUD, camera
public/sprites/      per-character pose PNGs
public/stage/        billabong, dojo, neonlab
scripts/process_sprites.py   chroma-key + pack generated art
```

Specials and normals live in `src/data/characters/`. If you change a move name or motion, update `src/data/moves.ts` so the pause overlay stays in sync.
