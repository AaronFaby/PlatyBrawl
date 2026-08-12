import puppeteer from 'puppeteer-core'
import { mkdir } from 'node:fs/promises'

const OUT = '/tmp/platy-play'
const BRAVE = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'

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

const browser = await puppeteer.launch({
  executablePath: BRAVE,
  headless: 'new',
  args: ['--window-size=1280,800', '--disable-gpu'],
  defaultViewport: { width: 1280, height: 800 },
})
await mkdir(OUT, { recursive: true })
const page = await browser.newPage()
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 20000 })
await new Promise((r) => setTimeout(r, 600))
await shot(page, '01-title')

await tap(page, 'Enter')
await new Promise((r) => setTimeout(r, 350))
await shot(page, '02-select-bob')

await tap(page, 'KeyU')
await new Promise((r) => setTimeout(r, 500))
await shot(page, '03-versus')
await new Promise((r) => setTimeout(r, 1600))
await shot(page, '04-bob-fight')

await hold(page, 'KeyD', 500)
await mash(page, 'KeyI', 8)
await shot(page, '05-bob-punches')

await tap(page, 'KeyS')
await new Promise((r) => setTimeout(r, 40))
await page.keyboard.down('KeyS')
await page.keyboard.down('KeyD')
await new Promise((r) => setTimeout(r, 40))
await page.keyboard.up('KeyS')
await new Promise((r) => setTimeout(r, 40))
await tap(page, 'KeyU')
await page.keyboard.up('KeyD')
await new Promise((r) => setTimeout(r, 300))
await shot(page, '06-bob-special')

await new Promise((r) => setTimeout(r, 2500))
await shot(page, '07-bob-mid')

// restart to pick cyber
await page.reload({ waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 400))
await tap(page, 'Enter')
await new Promise((r) => setTimeout(r, 250))
await tap(page, 'KeyD')
await new Promise((r) => setTimeout(r, 150))
await tap(page, 'KeyD')
await new Promise((r) => setTimeout(r, 150))
await shot(page, '08-select-cyber')
await tap(page, 'KeyU')
await new Promise((r) => setTimeout(r, 2200))
await shot(page, '09-cyber-fight')
await hold(page, 'KeyA', 800)
await page.keyboard.down('KeyD')
await tap(page, 'KeyI')
await page.keyboard.up('KeyD')
await new Promise((r) => setTimeout(r, 400))
await shot(page, '10-cyber-beam-try')

await page.setViewport({ width: 800, height: 520 })
await new Promise((r) => setTimeout(r, 200))
await shot(page, '11-narrow')

await browser.close()
console.log('playtest done')
