# Platy Brawl

A 90s-style 2D fighting game with three platypuses: Bob the Platy, Ninja Platy, and Cyberplaty.

Play it: [platybrawl.aaron-faby.workers.dev](https://platybrawl.aaron-faby.workers.dev)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173/ and press a key to start audio.

## Deploy

```bash
npx wrangler login
npm run deploy
```

## Controls

- **P1:** WASD move, U/I punch, J/K kick
- **P2:** arrows move, O/P punch, L/; kick
- **M:** mute music
- **H:** pause the match and show both movesets (Esc to resume)
- CPU is the default opponent. After you lock P1 it picks one of the two characters you did not choose.

Specials: quarter-circle + punch/kick, dragon punch + punch (Bob), charge back then forward + punch (Cyberplaty).
