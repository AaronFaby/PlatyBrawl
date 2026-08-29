import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const OUT = process.env.PLAYTEST_OUT ?? '/tmp/platy-play'
const URL = process.env.PLAYTEST_URL ?? 'http://localhost:5173/'

const BROWSER_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

function browserPath() {
  const found = BROWSER_CANDIDATES.find((p) => existsSync(p))
  if (!found) {
    throw new Error(
      'No Chrome/Brave binary found. Set PUPPETEER_EXECUTABLE_PATH or CHROME_PATH.',
    )
  }
  return found
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot', name)
}

async function tap(page, ...codes) {
  for (const code of codes) await page.keyboard.down(code)
  await new Promise((r) => setTimeout(r, 50))
  for (const code of [...codes].reverse()) await page.keyboard.up(code)
}

async function hold(page, code, ms) {
  await page.keyboard.down(code)
  await new Promise((r) => setTimeout(r, ms))
  await page.keyboard.up(code)
}

async function mash(page, code, times, gap = 120) {
  for (let i = 0; i < times; i++) {
    await tap(page, code)
    await new Promise((r) => setTimeout(r, gap))
  }
}

async function waitMs(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

async function lockThroughArena(page) {
  await tap(page, 'KeyU')
  await waitMs(400)
  await tap(page, 'KeyU')
}

async function main() {
  const res = await fetch(URL, { signal: AbortSignal.timeout(3000) }).catch(() => null)
  if (!res?.ok) {
    throw new Error(`Dev server is not reachable at ${URL}. Start it with npm run dev.`)
  }

  const browser = await puppeteer.launch({
    executablePath: browserPath(),
    headless: true,
    args: ['--window-size=1280,800', '--disable-gpu'],
    defaultViewport: { width: 1280, height: 800 },
  })
  await mkdir(OUT, { recursive: true })
  const page = await browser.newPage()
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 20000 })
  await waitMs(600)
  await shot(page, '01-title')

  await tap(page, 'Enter')
  await waitMs(350)
  await shot(page, '02-select-bob')

  await lockThroughArena(page)
  await waitMs(500)
  await shot(page, '03-versus')
  await waitMs(2200)
  await shot(page, '04-bob-fight')

  await hold(page, 'KeyD', 500)
  await mash(page, 'KeyI', 8)
  await shot(page, '05-bob-punches')

  await tap(page, 'KeyS')
  await waitMs(40)
  await page.keyboard.down('KeyS')
  await page.keyboard.down('KeyD')
  await waitMs(40)
  await page.keyboard.up('KeyS')
  await waitMs(40)
  await tap(page, 'KeyU')
  await page.keyboard.up('KeyD')
  await waitMs(300)
  await shot(page, '06-bob-special')

  await waitMs(2500)
  await shot(page, '07-bob-mid')

  await page.reload({ waitUntil: 'networkidle0' })
  await waitMs(400)
  await tap(page, 'Enter')
  await waitMs(250)
  await tap(page, 'KeyD')
  await waitMs(150)
  await tap(page, 'KeyD')
  await waitMs(150)
  await shot(page, '08-select-cyber')
  await lockThroughArena(page)
  await waitMs(2200)
  await shot(page, '09-cyber-fight')
  await hold(page, 'KeyA', 800)
  await page.keyboard.down('KeyD')
  await tap(page, 'KeyI')
  await page.keyboard.up('KeyD')
  await waitMs(400)
  await shot(page, '10-cyber-beam-try')

  await page.setViewport({ width: 800, height: 520 })
  await waitMs(200)
  await shot(page, '11-narrow')

  await browser.close()
  console.log('playtest done')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
