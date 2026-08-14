# Platy Brawl

A 90s arcade-style 2D fighting game. Four platypuses, motion specials, first-to-two rounds, local two-player or versus CPU. The cabinet flow is title → select → VS → fight → rematch.

Play it: [brawl.bobtheplaty.com](https://brawl.bobtheplaty.com)

Click or press a key once so the browser can play sound.

If you are changing code, read [AGENTS.md](AGENTS.md).

## How to play

1. **Title** — Press Enter, Space, or a punch to start.
2. **Select** — P1 picks a platy with A/D and locks with U (or I / J / K). W/S sets CPU Normal or Hard.
3. **VS** — A short intro, then the match.
4. **Fight** — Best of three (first to two rounds). Each round is 99 seconds.
5. **Result** — Rematch or back out with Start / punch.

Default mode is **versus CPU** on **Normal**. After P1 locks, the CPU is assigned one of the characters you did not pick. You cannot steer the CPU cursor.

To play **human versus human**, press a P2 attack (**O**, **P**, **L**, **;**, or numpad 4/5/1/2) *before* P1 locks. Then P2 picks with the arrow keys and locks with **O**.

During a match, press **H** to pause and show both characters' movesets. **H** or **Esc** resumes.

## CPU difficulty

On select, **W/S** (or up/down) switches CPU difficulty before you lock:

| Setting | Behavior |
| --- | --- |
| **Normal** | Default. Same reaction window and special rate as the original CPU. |
| **Hard** | Reacts faster, blocks sooner, and uses specials more often. |

Rematch keeps the last difficulty. Human versus human hides the toggle. The VS screen and fight HUD show **HARD** when that setting is on.

## Roster

| Fighter | Style | Specials |
| --- | --- | --- |
| **Bob the Platy** | All-rounder | **Bill Drill** `↓ ↘ → + P` · **Venom Spur** `→ ↓ ↘ + P` |
| **Ninja Platy** | Rushdown | **Shuriken** `↓ ↘ → + P` · **Shadow Step** `↓ ↙ ← + K` |
| **Cyberplaty** | Zoner | **Plasma** hold `←` then `→ + P` · **Rocket Knee** `↓ ↘ → + K` |
| **Soldier Platy** | Gunner | **Service Pistol** `↓ ↘ → + P` · **Combat Rush** `↓ ↘ → + K` |

Everyone also has standing and crouching punches/kicks, a jump, and a throw (**LP + LK** while close). Light and heavy versions of a special come from the light versus heavy button.

Motions are relative to the way you face (numpad notation):

- **QCF** — Quarter circle forward: `↓ ↘ →`
- **QCB** — Quarter circle back: `↓ ↙ ←`
- **DP** — Dragon punch: `→ ↓ ↘`
- **Charge** — Hold back about 2/3 of a second, then tap forward + punch

## Stages

Each round picks one of three arenas at random, and does not repeat the stage you just fought on:

- **Billabong** — Sunset dock
- **Dojo** — Night ninja courtyard
- **Neon Lab** — Cyborg factory in the rain

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

A standard gamepad works too. The first pad is P1. A second distinct pad is P2. Press a face button once to arm that pad (this ignores stick drift until then). Face buttons are LP / HP / LK / HK. The Start button also starts.

### Debug (optional)

| Key | Effect |
| --- | --- |
| **F1** | Draw hit / hurt / push boxes |
| **F2** | Force P2 to dummy-block |
| **F3** | Frame-step pause (press again to advance one frame; Esc leaves this pause) |

## Run locally

You need Node.js 22+ (or current LTS) and npm.

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

The live site is a Cloudflare Worker that serves the Vite `dist/` folder as static assets (`wrangler.jsonc`).

```bash
npx wrangler login
npm run deploy
```

That publishes to [brawl.bobtheplaty.com](https://brawl.bobtheplaty.com). Hard-refresh if an old JS bundle is still cached.

The repo is [AaronFaby/PlatyBrawl](https://github.com/AaronFaby/PlatyBrawl).

## Project layout

Vanilla TypeScript + Vite + Canvas 2D. No Phaser, no React. The sim runs at a fixed 60 Hz. The view is 480×270, nearest-neighbor scaled and letterboxed.

```
src/
  main.ts            boot, scene switch, game loop
  config.ts          logical resolution, HP, timer, roster meta
  scenes/            title, select, versus, fight, result
  fight/             fighters, combat, physics, projectiles, match
  input/             keyboard + pads, motion buffer
  data/characters/   Bob, Ninja, Cyber, Soldier frame data
  data/moves.ts      overlay / select move lists
  data/stages.ts     stage roster + random pick
  ai/cpu.ts          versus-CPU brain (Normal / Hard)
  audio/             Web Audio SFX + chip BGM
  render/            sprites, stage, HUD, camera
public/sprites/      per-character pose PNGs
public/stage/        billabong, dojo, neonlab
scripts/process_sprites.py   chroma-key + pack generated art
AGENTS.md            notes for coding agents
```

Specials and normals live in `src/data/characters/`. If you change a move name or motion, update `src/data/moves.ts` so the pause overlay stays in sync.
