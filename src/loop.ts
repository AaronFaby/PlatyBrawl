import { DT, MAX_FRAME_TIME } from './config.ts'

export function startLoop(step: () => void, draw: (alpha: number) => void): void {
  let acc = 0
  let last = performance.now() / 1000

  const frame = (ms: number) => {
    const now = ms / 1000
    let frameTime = now - last
    last = now
    if (frameTime > MAX_FRAME_TIME) frameTime = MAX_FRAME_TIME
    acc += frameTime
    while (acc >= DT) {
      step()
      acc -= DT
    }
    draw(acc / DT)
    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
}
