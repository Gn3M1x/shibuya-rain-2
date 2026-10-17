import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const URL = process.argv[2] || 'http://127.0.0.1:5174/'
const OUTDIR = process.argv[3] || '/tmp/shibuya-verify'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PROFILE = '/tmp/shibuya-chrome-verify'
const PORT = 9334

mkdirSync(OUTDIR, { recursive: true })
rmSync(PROFILE, { recursive: true, force: true })
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--window-size=1440,900',
  '--force-device-scale-factor=1',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] })
let chromeErr = ''
chrome.stderr.on('data', (d) => { chromeErr += d.toString() })

async function waitForDevtools() {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) return
    } catch {}
    await sleep(150)
  }
  throw new Error('DevTools never came up: ' + chromeErr.slice(-800))
}

await waitForDevtools()
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let nextId = 1
const pending = new Map()
const logs = []
ws.addEventListener('message', (event) => {
  const m = JSON.parse(event.data)
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
    return
  }
  if (m.method === 'Runtime.consoleAPICalled') logs.push(`[console.${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
  if (m.method === 'Runtime.exceptionThrown') logs.push(`[exception] ${m.params.exceptionDetails.text} ${m.params.exceptionDetails.exception?.description || ''}`)
  if (m.method === 'Log.entryAdded') logs.push(`[log.${m.params.entry.level}] ${m.params.entry.text}`)
})
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})
const send = (method, params = {}) => {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text)
  return r.result.value
}
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  const path = `${OUTDIR}/${name}.png`
  writeFileSync(path, Buffer.from(r.data, 'base64'))
  return path
}
const report = { url: URL, steps: [], screenshots: [], errors: [], console: [] }
const check = (name, pass, detail = '') => {
  report.steps.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${detail}`)
}

await send('Runtime.enable')
await send('Log.enable')
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: URL })
await sleep(7000)

const base = await evaluate(`(() => {
  const c = document.querySelector('canvas');
  const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return {
    canvas: c ? { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight } : null,
    renderer: gl ? (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : null,
    dock: !!document.querySelector('.dock'),
    rainLabel: document.querySelector('.row-label em')?.textContent,
    activeQuality: [...document.querySelectorAll('.segment button')].find((b) => b.classList.contains('is-active') && ['Low','Med','High'].includes(b.textContent))?.textContent,
    cinematic: document.querySelector('[aria-label="Cinematic camera"]')?.getAttribute('aria-checked'),
    brand: getComputedStyle(document.querySelector('.scene-brand')).display,
  };
})()`)
report.initial = base
check('webgl canvas present', !!base.canvas, JSON.stringify(base.canvas))
check('HUD dock present', !!base.dock)
check('quality indicator present', ['Low','Med','High'].includes(base.activeQuality), String(base.activeQuality))
check('cinematic on', base.cinematic === 'true')
check('brand visible', base.brand !== 'none')
report.screenshots.push(await shot('01-high-night'))

// Low quality
await evaluate(`[...document.querySelectorAll('.segment button')].find((b) => b.textContent.trim() === 'Low').click()`)
await sleep(3000)
const lowState = await evaluate(`(() => {
  const c = document.querySelector('canvas');
  return { active: [...document.querySelectorAll('.segment button')].find((b) => b.classList.contains('is-active') && ['Low','Med','High'].includes(b.textContent))?.textContent,
    canvas: c ? {w:c.width,h:c.height} : null };
})()`)
check('low quality selected', lowState.active === 'Low', JSON.stringify(lowState))
report.screenshots.push(await shot('02-low-night'))

// Medium
await evaluate(`[...document.querySelectorAll('.segment button')].find((b) => b.textContent.trim() === 'Med').click()`)
await sleep(2500)
check('medium quality selected', (await evaluate(`[...document.querySelectorAll('.segment button')].find((b) => b.classList.contains('is-active') && ['Low','Med','High'].includes(b.textContent))?.textContent`)) === 'Med')
report.screenshots.push(await shot('03-medium-night'))

// Back to high, dusk
await evaluate(`[...document.querySelectorAll('.segment button')].find((b) => b.textContent.trim() === 'High').click()`)
await sleep(2000)
await evaluate(`[...document.querySelectorAll('.segment button')].find((b) => b.textContent.trim() === 'Dusk').click()`)
await sleep(2500)
check('dusk selected', (await evaluate(`[...document.querySelectorAll('.segment button')].find((b) => b.classList.contains('is-active') && ['Night','Dusk'].includes(b.textContent))?.textContent`)) === 'Dusk')
report.screenshots.push(await shot('04-high-dusk'))

// Rain slider
await evaluate(`(() => { const s = document.querySelector('input[type=range]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, '0.3'); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); })()`)
await sleep(1200)
const rainLabel = await evaluate(`document.querySelector('.row-label em')?.textContent`)
check('rain slider updates', rainLabel === '30%', String(rainLabel))
report.screenshots.push(await shot('05-low-rain-dusk'))

await evaluate(`(() => { const s = document.querySelector('input[type=range]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, '0.78'); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); })()`)
await evaluate(`[...document.querySelectorAll('.segment button')].find((b) => b.textContent.trim() === 'Night').click()`)
await sleep(1500)

// Photo mode
await evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Photo')).click()`)
await sleep(900)
const photoState = await evaluate(`(() => { const b = getComputedStyle(document.querySelector('.scene-brand')); const d = getComputedStyle(document.querySelector('.dock')); return { hudClass: document.querySelector('.hud')?.className, brandOpacity: b.opacity, brandVisibility: b.visibility, dockOpacity: d.opacity, dockVisibility: d.visibility }; })()`)
check('photo mode hides UI', photoState.brandVisibility === 'hidden' && photoState.dockVisibility === 'hidden', JSON.stringify(photoState))
report.screenshots.push(await shot('06-photo-mode'))
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'h', code: 'KeyH', windowsVirtualKeyCode: 72 })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'h', code: 'KeyH', windowsVirtualKeyCode: 72 })
await sleep(800)
const afterPhoto = await evaluate(`getComputedStyle(document.querySelector('.dock')).visibility`)
check('H exits photo mode', afterPhoto === 'visible', String(afterPhoto))

// Drag orbit
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 520, button: 'left', clickCount: 1 })
for (let i = 1; i <= 10; i++) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700 + i * 12, y: 520 - i * 2, button: 'left', buttons: 1 })
  await sleep(20)
}
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 820, y: 500, button: 'left', clickCount: 1 })
await sleep(1200)
report.screenshots.push(await shot('07-drag-orbit'))

// Wheel dolly
await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 500, deltaX: 0, deltaY: -420 })
await sleep(1200)
report.screenshots.push(await shot('08-wheel-dolly'))

// WASD
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 })
await sleep(900)
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 })
await sleep(500)
report.screenshots.push(await shot('09-wasd-walk'))

// Reset camera
await evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Reset')).click()`)
await sleep(1600)
report.screenshots.push(await shot('10-reset-camera'))

// Cinematic toggle off/on
const cinematicBefore = await evaluate(`document.querySelector('[aria-label="Cinematic camera"]').getAttribute('aria-checked')`)
await evaluate(`document.querySelector('[aria-label="Cinematic camera"]').click()`)
await sleep(600)
const cinematicAfter = await evaluate(`document.querySelector('[aria-label="Cinematic camera"]').getAttribute('aria-checked')`)
check('cinematic toggle flips state', cinematicBefore !== cinematicAfter, `${cinematicBefore} -> ${cinematicAfter}`)
await evaluate(`document.querySelector('[aria-label="Cinematic camera"]').click()`)
await sleep(400)

// Screenshot function (canvas readback + flash)
const readback = await evaluate(`(() => { const c = document.querySelector('canvas'); return c.toDataURL('image/png').length; })()`)
check('canvas screenshot readback', readback > 100000, String(readback))
await evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Shoot')).click()`)
await sleep(120)
const flashOn = await evaluate(`document.querySelector('.flash')?.classList.contains('is-active')`)
check('screenshot flash feedback', flashOn === true, String(flashOn))
report.screenshots.push(await shot('11-screenshot-flash'))

// Rain sound toggle (may be blocked in headless but should not throw)
await evaluate(`document.querySelector('[aria-label="Rain sound"]').click()`)
await sleep(800)
const soundState = await evaluate(`document.querySelector('[aria-label="Rain sound"]').getAttribute('aria-checked')`)
check('rain sound toggle state', soundState === 'true', String(soundState))
await sleep(500)

report.console = logs
report.errors = logs.filter((l) => l.startsWith('[exception]') || l.startsWith('[console.error]') || l.startsWith('[log.error]'))
check('no runtime exceptions', report.errors.length === 0, report.errors.join(' | ').slice(0, 500))

writeFileSync(`${OUTDIR}/report.json`, JSON.stringify(report, null, 2))
console.log('\nReport written to', `${OUTDIR}/report.json`)
ws.close()
chrome.kill('SIGTERM')
await sleep(400)
process.exit(report.steps.some((s) => !s.pass) ? 1 : 0)
