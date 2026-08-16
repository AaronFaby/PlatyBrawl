# AGENTS.md

Guidance for coding agents that work in this repository.

## Project

Platy Brawl is a 90s arcade 2D fighter: five platypuses, motion specials, first to two rounds, local two-player or versus CPU. Live site: [brawl.bobtheplaty.com](https://brawl.bobtheplaty.com). Player-facing docs live in [README.md](README.md).

Vanilla TypeScript + Vite + Canvas 2D. No Phaser, no React, no extra UI framework. The sim is fixed 60 Hz (`DT = 1/60` in `src/config.ts`). The logical view is 480×270, nearest-neighbor scaled and letterboxed.

## Commands

```bash
npm install
npm run dev       # http://localhost:5173/
npm test          # vitest run, src/**/*.test.ts
npm run build     # tsc && vite build
npm run preview
npm run deploy    # build, then wrangler deploy
```

Node.js 22+ (or current LTS). `npm run build` typechecks; `tsconfig.json` uses bundler resolution, `verbatimModuleSyntax`, and `.ts` import extensions.

## Architecture

```
src/main.ts          boot, scene table, input pump
src/loop.ts          fixed-step accumulator + rAF draw
src/config.ts        resolution, HP, timer, CHAR_IDS, CHAR_META
src/scenes/          title → select → versus → fight → result
src/fight/           fighters, boxes, combat, physics, projectiles, match
src/input/           keyboard + pads, motion / charge buffer
src/data/characters/ per-fighter frame data and specials
src/data/moves.ts    select lines + pause overlay text
src/data/roster.ts   getChar, pickCpuOpponent
src/ai/cpu.ts        CPU brain (normal / hard)
src/render/          sprites, stage, HUD, camera, fallback stick figures
src/audio/           Web Audio SFX + chip BGM
public/sprites/<id>/ pose PNGs
public/stage/        billabong, dojo, neonlab
```

**Sim versus view.** `startLoop` runs `step()` at 60 Hz and draws every animation frame. Match logic, hitboxes, and CPU plans belong in the sim. Drawing reads fighter state; it must not write gameplay state.

**Session.** `Game.session` (`src/fight/types.ts`) is `{ p1, p2, p2Cpu, cpuDifficulty? }`. Default is Bob versus CPU Ninja on Normal (`DEFAULT_SESSION` in `src/scenes/context.ts`). Rematch reuses the session. `cpuDifficulty` is optional so older `createMatch({ p1, p2, p2Cpu })` tests stay valid; treat a missing value as `'normal'`.

**Roster IDs.** `CHAR_IDS` in `src/config.ts` is the source of the `CharId` union. `ROSTER_ORDER` in `src/scenes/context.ts` is select/title order. Keep both in sync. Select wrap uses `ROSTER_ORDER.length`, not a hardcoded three.

**Scenes.** Each scene is `{ id, enter, exit, update, draw }`. `game.switchTo(id)` exits the current scene and enters the next. Fight creates a new `FightWorld` on enter. Result receives `{ winner, world }`.

## Add a character

Touch every layer. A missing one compiles in isolation and fails in play.

1. **Id and meta** — Add the id to `CHAR_IDS` and `CHAR_META` in `src/config.ts`. Add it to `ROSTER_ORDER`.
2. **Frame data** — New file `src/data/characters/<id>.ts` exporting a `CharDef`. Copy the normal set (stand / crouch / jump punches and kicks, throw) from an existing fighter. Give two specials (light + heavy each). Register in `src/data/roster.ts`.
3. **Overlay copy** — `SPECIAL_LINES` and `MOVESET` in `src/data/moves.ts` must include the new id. Pause overlay and select footer read only those tables.
4. **Sprites** — `public/sprites/<id>/` with `idle`, `walk`, `crouch`, `jump`, `punch`, `kick`, `hurt`, `win`, `special1`, `special2` (160×160, transparent), plus `portrait.png` (128×128). `poseForAnim` in `src/assets/manifest.ts` must map the special anim names to `special1` / `special2`.
5. **Projectiles** — If the special fires a shot, add a kind to `AnimFlags.projectile`, `Projectile.kind`, `spawnFrom`, `FightHooks.spawnProjectile`, and `drawProjectiles`. Measure muzzle offset in sprite space (origin 80, 156, scale 0.7); do not reuse torso-height defaults.
6. **CPU** — Teach `src/ai/cpu.ts` only motions that fighter defines. Do not queue Bob's DP (`[6, 2, 3]+P`) for anyone else. Charge specials must be one plan (hold back for `CHARGE_FRAMES +` a few ticks, then forward + button) so cooldown cannot dump the charge.
7. **Fallback draw** — `src/render/platy.ts` still draws if a sprite is missing. Add colors / props for the new id.
8. **Tests** — At least one sim test for a signature special, plus roster coverage. `pickCpuOpponent` must never return P1's id.

Select and title iterate `ROSTER_ORDER` / `CHAR_IDS`. Sprite load iterates `CHAR_IDS` and `POSES`. You do not hand-edit the sprite bank object.

## Sprites

`scripts/process_sprites.py` chroma-keys green and packs to 160×160, bottom-aligned, 4 px pad. Portraits are resized to 128×128 with **no** key (they keep the purple select background). The script's source image path is a leftover session folder; for new art, key and pack the same way rather than pointing at that old path.

Draw:

```
translate(fighter.x, fighter.y)
scale(facing * 0.7, 0.7)
drawImage(img, -80, -156)
```

World offset of sprite pixel `(px, py)` is `((px - 80) * 0.7, (py - 156) * 0.7)`.

## Combat

- Hurt / hit / push boxes are local to the fighter, facing-flipped in `worldBox`.
- Specials are `SpecialDef` rows on the character: `{ motion, button, light, heavy }`. Motions: `qcf`, `qcb`, `dp`, `charge`. Charge needs `CHARGE_FRAMES` (40) of back, then forward + punch, with 14 frames of grace.
- Light versus heavy is the light versus heavy button on that punch/kick, not a separate motion.
- Throw is **LP + LK** while close (`THROW_RANGE`).
- Projectile kinds today: `shuriken` (ninja), `beam` (cyber plasma), `bullet` (soldier pistol, spawn `+58` facing / `-67` y so it leaves the muzzle), `chain` (chainsaw hook, spawn `+30` facing / `-46` y; on hit reels the defender in over several frames).
- Anim flags can also set `invuln`, `invulnHead`, `armorHits`, `teleport`.

If you rename a move, update the character file, `moves.ts`, `poseForAnim`, and any CPU plan that hardcodes that motion.

## CPU

`tickCpu` in `src/ai/cpu.ts`. `createCpu(difficulty)` / `resetCpu` set the start cooldown from `TUNE`. Fight constructs the brain from `session.cpuDifficulty`.

| Difficulty | React | Start cool | Notes |
| --- | --- | --- | --- |
| `normal` | 8 frames | 96 | Default. Existing “stands still while cooling” tests assume this. |
| `hard` | 3 frames | 36 | Faster block, more specials. Anti-airs with a motion that fighter owns. |

Cyber has a dedicated planner (`planCyber`): fire plasma if already charged, Rocket Knee at mid / close, charge+plasma as one plan at long range, otherwise walk in. Do not walk back for fewer than `CHARGE_FRAMES` ticks and then idle — that dumps charge. Close-range knee must be decided **before** the walk-in roll (`r < 0.84`), or it is unreachable.

CPU never mirrors: `pickCpuOpponent` picks from `CHAR_IDS` minus P1.

Select: **W/S** (dir 8/2, edge-triggered) toggles difficulty while versus CPU and unlocked. Human P2 hides the toggle.

## Tests

Vitest, Node environment, `src/**/*.test.ts`. Run `npm test` after sim, roster, input, or CPU changes.

- Match fixtures can omit `cpuDifficulty`.
- Prefer deterministic inputs (`hold` / `tap` helpers in `src/fight/sim.test.ts`) over long random CPU loops when you can.
- CPU tests that inspect `cpu.plan` should set `cool = 0` and empty `plan` first.
- `npx tsc --noEmit` must stay clean (`noUnusedLocals` / `noUnusedParameters`).

## Style

- Import types with `import type`. Import values with `.ts` extensions.
- Match surrounding file: 2-space indent, no semicolons-as-policy (the tree uses them), no new dependencies without a reason.
- Do not add a game engine, React, or a CSS framework.
- Keep comments short and factual. Do not narrate the change in comments.
- Player-facing strings in the overlay stay ALL CAPS to match the cabinet look.

## Deploy

`wrangler.jsonc` serves `./dist` as Worker static assets. `npm run deploy` builds, then deploys. Production hostname is `brawl.bobtheplaty.com`. Hard-refresh after a deploy if the previous JS bundle is cached.
