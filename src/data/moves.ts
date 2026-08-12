import type { CharId } from '../config.ts'

export const SPECIAL_LINES: Record<CharId, string[]> = {
  bob: ['BILL DRILL  QCF+P', 'VENOM SPUR  DP+P'],
  ninja: ['SHURIKEN  QCF+P', 'SHADOW STEP  QCB+K'],
  cyber: ['PLASMA  CHARGE B+F+P', 'ROCKET KNEE  QCF+K'],
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
}
