import type { CharId } from '../config.ts'

export const SPECIAL_LINES: Record<CharId, string[]> = {
  bob: ['BILL DRILL  QCF+P', 'VENOM SPUR  DP+P'],
  ninja: ['SHURIKEN  QCF+P', 'SHADOW STEP  QCB+K'],
  cyber: ['PLASMA  CHARGE B+F+P', 'ROCKET KNEE  QCF+K'],
  soldier: ['SERVICE PISTOL  QCF+P', 'COMBAT RUSH  QCF+K'],
  chainsaw: ['CHAIN HOOK  QCF+P', 'SAW SLASH  QCF+K'],
}

export const MOVESET: Record<CharId, string[]> = {
  bob: [
    'MOVE / CROUCH / JUMP',
    'PUNCH / KICK   CROUCH+BTN LOWS',
    'BILL DRILL  ↓↘→ + P',
    'VENOM SPUR  →↓↘ + P',
    'THROW       LP+LK',
  ],
  ninja: [
    'MOVE / CROUCH / JUMP',
    'PUNCH / KICK   CROUCH+BTN LOWS',
    'SHURIKEN    ↓↘→ + P',
    'SHADOW STEP ↓↙← + K',
    'THROW       LP+LK',
  ],
  cyber: [
    'MOVE / CROUCH / JUMP',
    'PUNCH / KICK   CROUCH+BTN LOWS',
    'PLASMA      HOLD ←, → + P',
    'ROCKET KNEE ↓↘→ + K',
    'THROW       LP+LK',
  ],
  soldier: [
    'MOVE / CROUCH / JUMP',
    'PUNCH / KICK   CROUCH+BTN LOWS',
    'PISTOL      ↓↘→ + P',
    'COMBAT RUSH ↓↘→ + K',
    'THROW       LP+LK',
  ],
  chainsaw: [
    'MOVE / CROUCH / JUMP',
    'PUNCH / KICK   CROUCH+BTN LOWS',
    'CHAIN HOOK  ↓↘→ + P',
    'SAW SLASH   ↓↘→ + K',
    'THROW       LP+LK',
  ],
}
