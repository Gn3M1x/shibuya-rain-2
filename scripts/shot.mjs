import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const URL = process.argv[2] || 'http://127.0.0.1:5174/'
const OUT = process.argv[3] || '/tmp/shibuya-shot.png'
const WAIT = Number(process.argv[4] || 7000)
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PROFILE = '/tmp/shibuya-chrome-profile'
const PORT = 9333

rmSync(PROFILE, { recursive: true, force: true })
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--window-size=1600,1000',
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
  const message = JSON.parse(event.data)
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result)
    return
  }
  if (message.method === 'Runtime.consoleAPICalled') {
    logs.push(`[console.${message.params.type}] ` + message.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
  }
  if (message.method === 'Runtime.exceptionThrown') {
    const d = message.params.exceptionDetails
    logs.push(`[exception] ${d.text} ${d.exception?.description || ''}`)
  }
  if (message.method === 'Log.entryAdded') {
    logs.push(`[log.${message.params.entry.level}] ${message.params.entry.text}`)
  }
})

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})

function send(method, params = {}) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}

await send('Runtime.enable')
await send('Log.enable')
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: URL })
await sleep(WAIT)

const info = await send('Runtime.evaluate', {
  expression: `(() => {
    const c = document.querySelector('canvas');
    const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
    let renderer = null;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    }
    return {
      title: document.title,
      canvas: c ? { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight } : null,
      webgl: !!gl,
      renderer,
      bodyText: document.body.innerText.slice(0, 400),
      hud: !!document.querySelector('.dock'),
    };
  })()`,
  returnByValue: true,
})
console.log('PAGE INFO', JSON.stringify(info.result.value, null, 2))
console.log('LOGS:\n' + logs.join('\n'))

const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false })
mkdirSync('/tmp', { recursive: true })
writeFileSync(OUT, Buffer.from(shot.data, 'base64'))
console.log('WROTE', OUT)

ws.close()
chrome.kill('SIGTERM')
await sleep(500)
process.exit(0)
