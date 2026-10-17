import * as THREE from 'three'

const JP_FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif'
const DISPLAY_FONT = '"Helvetica Neue", "Arial Narrow", "Hiragino Sans", sans-serif'

let maxAnisotropy = 8

export function configureTextures(renderer: THREE.WebGLRenderer) {
  maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
}

function makeTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  options: { srgb?: boolean; repeat?: boolean; anisotropy?: number } = {},
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  draw(ctx, width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = options.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace
  texture.anisotropy = options.anisotropy ?? maxAnisotropy
  if (options.repeat) {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
  }
  texture.needsUpdate = true
  return texture
}

function noise(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, alpha: number) {
  for (let i = 0; i < amount; i++) {
    const g = Math.floor(Math.random() * 255)
    ctx.fillStyle = `rgba(${g},${g},${g},${alpha * Math.random()})`
    const r = Math.random() * 2.2 + 0.3
    ctx.fillRect(Math.random() * w, Math.random() * h, r, r)
  }
}

const cache = new Map<string, THREE.Texture>()

function cached(key: string, factory: () => THREE.Texture): THREE.Texture {
  const existing = cache.get(key)
  if (existing) return existing
  const texture = factory()
  cache.set(key, texture)
  return texture
}

/* ------------------------------------------------------------------ */
/*  Ground                                                             */
/* ------------------------------------------------------------------ */

export function asphaltTexture(): THREE.Texture {
  return cached('asphalt', () =>
    makeTexture(
      1024,
      1024,
      (ctx, w, h) => {
        ctx.fillStyle = '#2a2c2e'
        ctx.fillRect(0, 0, w, h)
        // Coarse aggregate.
        for (let i = 0; i < 26000; i++) {
          const g = 34 + Math.floor(Math.random() * 45)
          ctx.fillStyle = `rgba(${g},${g + 1},${g + 2},${0.25 + Math.random() * 0.55})`
          const r = Math.random() * 2.6 + 0.4
          ctx.fillRect(Math.random() * w, Math.random() * h, r, r)
        }
        // Long wet tire polish bands.
        for (let i = 0; i < 12; i++) {
          const x = Math.random() * w
          const grad = ctx.createLinearGradient(x - 30, 0, x + 30, 0)
          grad.addColorStop(0, 'rgba(10,11,13,0)')
          grad.addColorStop(0.5, `rgba(10,11,13,${0.08 + Math.random() * 0.1})`)
          grad.addColorStop(1, 'rgba(10,11,13,0)')
          ctx.fillStyle = grad
          ctx.fillRect(x - 30, 0, 60, h)
        }
        // Patches and cracks.
        ctx.strokeStyle = 'rgba(12,13,15,0.55)'
        for (let i = 0; i < 18; i++) {
          ctx.lineWidth = Math.random() * 1.8 + 0.4
          ctx.beginPath()
          let x = Math.random() * w
          let y = Math.random() * h
          ctx.moveTo(x, y)
          for (let s = 0; s < 8; s++) {
            x += (Math.random() - 0.5) * 46
            y += Math.random() * 28
            ctx.lineTo(x, y)
          }
          ctx.stroke()
        }
        for (let i = 0; i < 28; i++) {
          ctx.fillStyle = `rgba(18,19,20,${0.1 + Math.random() * 0.18})`
          const x = Math.random() * w
          const y = Math.random() * h
          ctx.beginPath()
          ctx.ellipse(x, y, 20 + Math.random() * 100, 8 + Math.random() * 40, Math.random() * Math.PI, 0, Math.PI * 2)
          ctx.fill()
        }
        noise(ctx, w, h, 9000, 0.04)
      },
      { repeat: true },
    ),
  )
}

export function asphaltRoughnessTexture(): THREE.Texture {
  return cached('asphaltRoughness', () =>
    makeTexture(
      512,
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#8a8a8a'
        ctx.fillRect(0, 0, w, h)
        for (let i = 0; i < 60; i++) {
          const x = Math.random() * w
          const y = Math.random() * h
          const grad = ctx.createRadialGradient(x, y, 0, x, y, 30 + Math.random() * 90)
          const dark = Math.random() > 0.5 ? 'rgba(35,35,35,0.5)' : 'rgba(160,160,160,0.35)'
          grad.addColorStop(0, dark)
          grad.addColorStop(1, 'rgba(138,138,138,0)')
          ctx.fillStyle = grad
          ctx.fillRect(0, 0, w, h)
        }
        noise(ctx, w, h, 16000, 0.15)
      },
      { srgb: false, repeat: true },
    ),
  )
}

export function sidewalkTexture(): THREE.Texture {
  return cached('sidewalk', () =>
    makeTexture(
      1024,
      1024,
      (ctx, w, h) => {
        ctx.fillStyle = '#4b4c4c'
        ctx.fillRect(0, 0, w, h)
        const tile = 128
        for (let y = 0; y < h; y += tile) {
          for (let x = 0; x < w; x += tile) {
            const g = 68 + Math.floor(Math.random() * 14)
            ctx.fillStyle = `rgb(${g},${g + 1},${g + 2})`
            ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4)
          }
        }
        ctx.strokeStyle = 'rgba(18,19,20,0.9)'
        ctx.lineWidth = 3
        for (let i = 0; i <= w; i += tile) {
          ctx.beginPath()
          ctx.moveTo(i, 0)
          ctx.lineTo(i, h)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(0, i)
          ctx.lineTo(w, i)
          ctx.stroke()
        }
        noise(ctx, w, h, 15000, 0.08)
        for (let i = 0; i < 30; i++) {
          ctx.fillStyle = `rgba(20,22,23,${Math.random() * 0.15})`
          ctx.beginPath()
          ctx.ellipse(Math.random() * w, Math.random() * h, 15 + Math.random() * 80, 8 + Math.random() * 40, Math.random() * 3, 0, Math.PI * 2)
          ctx.fill()
        }
      },
      { repeat: true },
    ),
  )
}

export function concreteTexture(tint = '#5a5a58'): THREE.Texture {
  return cached(`concrete-${tint}`, () =>
    makeTexture(
      512,
      512,
      (ctx, w, h) => {
        ctx.fillStyle = tint
        ctx.fillRect(0, 0, w, h)
        noise(ctx, w, h, 9000, 0.18)
        for (let i = 0; i < 30; i++) {
          ctx.fillStyle = `rgba(20,20,22,${Math.random() * 0.12})`
          ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 120, Math.random() * 8)
        }
        for (let i = 0; i < 14; i++) {
          ctx.fillStyle = `rgba(0,0,0,${0.06 + Math.random() * 0.12})`
          ctx.fillRect(Math.random() * w, 0, 1 + Math.random() * 3, h)
        }
      },
      { repeat: true },
    ),
  )
}

/* ------------------------------------------------------------------ */
/*  Buildings                                                          */
/* ------------------------------------------------------------------ */

const WINDOW_TINTS = [
  ['#f4dfb0', '#c9b98c', '#f7e6bb', '#8f9fae', '#d8c58f'],
  ['#d6e8ef', '#e6f1f4', '#b7c5cf', '#f4dfb0', '#a9b6c0'],
  ['#efe1bd', '#9aa7b1', '#f0dcb1', '#c5d3db', '#d8c58f'],
]

export function buildingTexture(variant: number): THREE.Texture {
  return cached(`building-${variant}`, () =>
    makeTexture(
      512,
      1024,
      (ctx, w, h) => {
        const base = ['#26282b', '#2b2c2e', '#232528', '#303033'][variant % 4]
        ctx.fillStyle = base
        ctx.fillRect(0, 0, w, h)
        // Concrete seams.
        ctx.strokeStyle = 'rgba(12,12,14,0.55)'
        ctx.lineWidth = 2
        for (let y = 0; y < h; y += 64) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(w, y)
          ctx.stroke()
        }
        for (let x = 0; x < w; x += 128) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, h)
          ctx.stroke()
        }
        // Window grid.
        const cols = 4
        const rows = 15
        const cellW = w / cols
        const cellH = h / rows
        const tints = WINDOW_TINTS[variant % WINDOW_TINTS.length]
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = col * cellW
            const y = row * cellH
            const ww = cellW * 0.55
            const wh = cellH * 0.42
            const wx = x + (cellW - ww) / 2
            const wy = y + cellH * 0.16
            if (Math.random() < 0.32) {
              const tint = tints[Math.floor(Math.random() * tints.length)]
              const lit = 0.55 + Math.random() * 0.45
              ctx.fillStyle = tint
              ctx.globalAlpha = lit
              ctx.fillRect(wx, wy, ww, wh)
              ctx.globalAlpha = 1
              // Blinds and silhouettes.
              if (Math.random() < 0.4) {
                ctx.fillStyle = 'rgba(20,20,22,0.45)'
                for (let b = 0; b < 5; b++) {
                  ctx.fillRect(wx, wy + (wh / 5) * b, ww, wh / 14)
                }
              }
              if (Math.random() < 0.25) {
                ctx.fillStyle = 'rgba(18,18,20,0.6)'
                ctx.fillRect(wx + ww * Math.random() * 0.7, wy + wh * 0.3, 2, wh * 0.7)
              }
            } else {
              ctx.fillStyle = 'rgba(8,11,15,0.92)'
              ctx.fillRect(wx, wy, ww, wh)
              // Faint interior bounce.
              ctx.fillStyle = 'rgba(100,115,130,0.05)'
              ctx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4)
            }
            // Frames.
            ctx.strokeStyle = 'rgba(15,16,18,0.9)'
            ctx.lineWidth = 3
            ctx.strokeRect(wx, wy, ww, wh)
            // AC unit every so often.
            if (Math.random() < 0.08) {
              ctx.fillStyle = '#3e4042'
              ctx.fillRect(wx + ww + 6, wy + wh * 0.25, 22, 16)
              ctx.strokeStyle = 'rgba(120,120,120,0.2)'
              ctx.strokeRect(wx + ww + 6, wy + wh * 0.25, 22, 16)
            }
          }
        }
        // Grime at the bottom and top.
        const grad = ctx.createLinearGradient(0, h * 0.7, 0, h)
        grad.addColorStop(0, 'rgba(8,9,10,0)')
        grad.addColorStop(1, 'rgba(6,7,9,0.6)')
        ctx.fillStyle = grad
        ctx.fillRect(0, h * 0.7, w, h * 0.3)
        noise(ctx, w, h, 5000, 0.06)
      },
      { repeat: true },
    ),
  )
}

/* ------------------------------------------------------------------ */
/*  Signage                                                            */
/* ------------------------------------------------------------------ */

interface SignOptions {
  text: string
  sub?: string
  bg?: string
  fg?: string
  accent?: string
  vertical?: boolean
  glow?: boolean
  thin?: boolean
}

export function signTexture(options: SignOptions): THREE.Texture {
  const { text, sub = '', bg = '#111318', fg = '#f2f1e8', accent = '#d8342a', vertical = false, thin = false } = options
  const key = `sign-${text}-${sub}-${bg}-${fg}-${accent}-${vertical}-${thin}`
  return cached(key, () => {
    const width = vertical ? 320 : 1024
    const height = vertical ? 1024 : 320
    return makeTexture(width, height, (ctx, w, h) => {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      // Slight panel gradient and border.
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, 'rgba(255,255,255,0.10)')
      grad.addColorStop(0.4, 'rgba(255,255,255,0.02)')
      grad.addColorStop(1, 'rgba(0,0,0,0.18)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(255,255,255,0.16)'
      ctx.lineWidth = 6
      ctx.strokeRect(3, 3, w - 6, h - 6)
      if (thin) {
        ctx.fillStyle = accent
        ctx.fillRect(0, h - 22, w, 22)
      }
      ctx.fillStyle = fg
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (vertical) {
        const chars = text.split('')
        const available = h - (sub ? 150 : 60)
        const size = Math.min(160, (available / chars.length) * 0.76)
        ctx.font = `700 ${size}px ${JP_FONT}`
        const start = (h - chars.length * size * 1.02) / 2 + size * 0.1
        chars.forEach((char, i) => {
          ctx.fillText(char, w / 2, start + i * size * 1.02)
        })
        if (sub) {
          ctx.fillStyle = accent
          ctx.font = `600 ${Math.min(46, w * 0.14)}px ${DISPLAY_FONT}`
          ctx.fillText(sub, w / 2, h - 78)
        }
      } else {
        const subSize = sub ? h * 0.18 : 0
        const size = thin ? h * 0.36 : Math.min(h * (sub ? 0.44 : 0.56), (w * 0.86) / Math.max(1, text.length * 0.62))
        ctx.font = `800 ${size}px ${JP_FONT}`
        ctx.fillText(text, w / 2, sub ? h * 0.42 : h * 0.52)
        if (sub) {
          ctx.fillStyle = accent
          ctx.font = `600 ${subSize}px ${JP_FONT}`
          ctx.fillText(sub, w / 2, h * 0.78)
        }
      }
      // Neon bleed / scanline texture.
      for (let y = 0; y < h; y += 3) {
        ctx.fillStyle = `rgba(0,0,0,${0.035 + Math.random() * 0.035})`
        ctx.fillRect(0, y, w, 1)
      }
      noise(ctx, w, h, 3000, 0.03)
    })
  })
}

export function sevenElevenSign(): THREE.Texture {
  return cached('7eleven-main', () =>
    makeTexture(2048, 144, (ctx, w, h) => {
      ctx.fillStyle = '#f4f2ea'
      ctx.fillRect(0, 0, w, h)
      // Brand stripes.
      const stripeY = h * 0.07
      const stripeH = h * 0.085
      const colors = ['#ef7d22', '#e23a2e', '#1c8a4b']
      colors.forEach((color, i) => {
        ctx.fillStyle = color
        ctx.fillRect(0, stripeY + i * (stripeH + 3), w, stripeH)
      })
      // Centered wordmark: red 7 + dark ELEVEN.
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.font = `italic 900 ${h * 0.76}px "Helvetica Neue", Arial, sans-serif`
      const sevenW = ctx.measureText('7').width
      ctx.font = `800 ${h * 0.6}px "Helvetica Neue", Arial, sans-serif`
      const elevenW = ctx.measureText('ELEVEN').width
      const gap = h * 0.025
      const x0 = w * 0.5 - (sevenW + gap + elevenW) / 2
      ctx.fillStyle = '#e4422f'
      ctx.font = `italic 900 ${h * 0.76}px "Helvetica Neue", Arial, sans-serif`
      ctx.fillText('7', x0, h * 0.59)
      ctx.fillStyle = '#163f2c'
      ctx.font = `800 ${h * 0.6}px "Helvetica Neue", Arial, sans-serif`
      ctx.fillText('ELEVEN', x0 + sevenW + gap, h * 0.65)
      // Small Japanese line under the wordmark.
      ctx.textAlign = 'center'
      ctx.fillStyle = '#4e5a53'
      ctx.font = `600 ${h * 0.075}px ${JP_FONT}`
      ctx.fillText('セブン-イレブン  渋谷センター街店', w * 0.5, h * 0.965)
      // Thin frame and light falloff.
      ctx.strokeStyle = 'rgba(20,24,22,0.55)'
      ctx.lineWidth = 4
      ctx.strokeRect(3, 3, w - 6, h - 6)
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, 'rgba(255,255,255,0.3)')
      grad.addColorStop(0.65, 'rgba(255,255,255,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0.08)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
    }),
  )
}

export function sevenElevenBlade(): THREE.Texture {
  return cached('7eleven-blade', () =>
    makeTexture(320, 1024, (ctx, w, h) => {
      ctx.fillStyle = '#f3f1e8'
      ctx.fillRect(0, 0, w, h)
      ;['#ef7d22', '#e23a2e', '#1c8a4b'].forEach((color, i) => {
        ctx.fillStyle = color
        ctx.fillRect(0, 12 + i * 24, w, 16)
      })
      ctx.save()
      ctx.translate(w * 0.52, h * 0.53)
      ctx.rotate(-Math.PI / 2)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#1c3f2d'
      ctx.font = `800 214px "Helvetica Neue", Arial, sans-serif`
      ctx.fillText('7-ELEVEN', 0, 0)
      ctx.restore()
      ctx.save()
      ctx.translate(w * 0.52, h * 0.83)
      ctx.rotate(-Math.PI / 2)
      ctx.fillStyle = '#d4372d'
      ctx.font = `600 62px ${JP_FONT}`
      ctx.textAlign = 'center'
      ctx.fillText('セブン-イレブン', 0, 0)
      ctx.restore()
      ctx.strokeStyle = 'rgba(20,22,20,0.5)'
      ctx.lineWidth = 8
      ctx.strokeRect(4, 4, w - 8, h - 8)
    }),
  )
}

export function posterTexture(index: number): THREE.Texture {
  const palettes = [
    ['#f1e6cf', '#a82f28', 'SALE', 'おにぎり'],
    ['#1b2e4a', '#f1d060', 'NEW', 'ホット'],
    ['#e6e2d6', '#2c5b3a', '24H', 'コーヒー'],
    ['#24242a', '#e07039', 'ATM', 'コンビニ'],
  ]
  const p = palettes[index % palettes.length]
  return cached(`poster-${index}`, () =>
    makeTexture(320, 512, (ctx, w, h) => {
      ctx.fillStyle = p[0]
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = p[1]
      ctx.fillRect(0, 0, w, 24)
      ctx.fillRect(0, h - 24, w, 24)
      ctx.textAlign = 'center'
      ctx.fillStyle = p[1]
      ctx.font = `800 100px ${DISPLAY_FONT}`
      ctx.fillText(p[2], w / 2, h * 0.32)
      ctx.fillStyle = '#24221f'
      ctx.font = `700 68px ${JP_FONT}`
      ctx.fillText(p[3], w / 2, h * 0.58)
      ctx.fillStyle = 'rgba(30,30,30,0.55)'
      ctx.font = `500 30px ${JP_FONT}`
      ctx.fillText('渋谷店限定', w / 2, h * 0.72)
      ctx.font = `400 24px ${DISPLAY_FONT}`
      ctx.fillText('OPEN 24/7', w / 2, h * 0.84)
    }),
  )
}

export function vendingTexture(variant = 0): THREE.Texture {
  const bg = ['#e9ece7', '#1d2f52', '#c8362c'][variant % 3]
  return cached(`vending-${variant}`, () =>
    makeTexture(512, 1024, (ctx, w, h) => {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      // Top brand strip.
      ctx.fillStyle = variant === 1 ? '#f1efe7' : '#d2382f'
      ctx.fillRect(0, 0, w, 70)
      ctx.fillStyle = variant === 1 ? '#1d2f52' : '#fff6e0'
      ctx.font = `800 44px ${JP_FONT}`
      ctx.textAlign = 'center'
      ctx.fillText('DRINKS · つめたい', w / 2, 48)
      // Product rows behind glass.
      const colors = ['#d44b31', '#e9c04a', '#3d8c6b', '#2f6da3', '#ecebe6', '#b0472d', '#6f8f4a', '#d8d2bd']
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
          const x = 24 + col * 94
          const y = 110 + row * 152
          ctx.fillStyle = 'rgba(8,12,14,0.32)'
          ctx.fillRect(x, y, 76, 126)
          ctx.fillStyle = colors[(row * 5 + col + variant) % colors.length]
          ctx.fillRect(x + 7, y + 12, 62, 84)
          ctx.fillStyle = 'rgba(255,255,255,0.6)'
          ctx.fillRect(x + 16, y + 28, 44, 8)
          ctx.fillRect(x + 16, y + 44, 30, 5)
          ctx.fillStyle = '#dad7cf'
          ctx.fillRect(x + 5, y + 102, 66, 17)
        }
      }
      // Selection panel.
      ctx.fillStyle = '#171b1d'
      ctx.fillRect(0, h - 250, w, 250)
      ctx.fillStyle = '#f4f1e6'
      ctx.font = `600 28px ${DISPLAY_FONT}`
      ctx.textAlign = 'left'
      ctx.fillText('SELECT', 36, h - 200)
      const buttonColors = ['#d9d6cb', '#d9d6cb', '#d9d6cb', '#e05a35']
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = buttonColors[i % buttonColors.length]
        ctx.fillRect(36 + i * 54, h - 160, 38, 34)
      }
      ctx.fillStyle = '#927b3a'
      ctx.fillRect(36, h - 92, 150, 22)
      ctx.fillStyle = '#2c2f31'
      ctx.fillRect(w - 150, h - 100, 110, 40)
      // Glass reflection.
      const grad = ctx.createLinearGradient(0, 80, w, h * 0.8)
      grad.addColorStop(0, 'rgba(255,255,255,0.25)')
      grad.addColorStop(0.35, 'rgba(255,255,255,0)')
      grad.addColorStop(0.7, 'rgba(255,255,255,0.09)')
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 80, w, h - 330)
    }),
  )
}

export function glassStreakTexture(): THREE.Texture {
  return cached('glass-streaks', () =>
    makeTexture(512, 512, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h)
      // Long rain trails.
      for (let i = 0; i < 48; i++) {
        const x = Math.random() * w
        const startY = Math.random() * h * 0.55
        const len = 40 + Math.random() * 260
        const grad = ctx.createLinearGradient(0, startY, 0, startY + len)
        grad.addColorStop(0, 'rgba(220,235,245,0)')
        grad.addColorStop(0.2, `rgba(220,235,245,${0.06 + Math.random() * 0.1})`)
        grad.addColorStop(0.8, `rgba(220,235,245,${0.04 + Math.random() * 0.08})`)
        grad.addColorStop(1, 'rgba(220,235,245,0)')
        ctx.strokeStyle = grad
        ctx.lineWidth = 0.6 + Math.random() * 1.6
        ctx.beginPath()
        ctx.moveTo(x, startY)
        ctx.bezierCurveTo(x + (Math.random() - 0.5) * 8, startY + len * 0.3, x + (Math.random() - 0.5) * 10, startY + len * 0.7, x, startY + len)
        ctx.stroke()
      }
      // Droplets.
      for (let i = 0; i < 190; i++) {
        const x = Math.random() * w
        const y = Math.random() * h
        const r = Math.random() * 2.2 + 0.4
        ctx.fillStyle = `rgba(220,238,248,${0.08 + Math.random() * 0.2})`
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }, { repeat: true }),
  )
}

export function splashTexture(): THREE.Texture {
  return cached('splash', () =>
    makeTexture(
      64,
      64,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h)
        const cx = w / 2
        const cy = h * 0.62
        // Thin crown ring.
        ctx.strokeStyle = 'rgba(232,246,255,0.95)'
        ctx.lineWidth = 3.2
        ctx.beginPath()
        ctx.ellipse(cx, cy, w * 0.34, h * 0.15, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = 'rgba(200,228,248,0.55)'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.ellipse(cx, cy, w * 0.24, h * 0.10, 0, 0, Math.PI * 2)
        ctx.stroke()
        // Flying droplets.
        for (let i = 0; i < 9; i++) {
          const a = -Math.PI + (i / 8) * Math.PI
          const r = w * (0.36 + (i % 3) * 0.04)
          const x = cx + Math.cos(a) * r
          const y = cy + Math.sin(a) * h * 0.24
          ctx.fillStyle = `rgba(226,242,255,${0.5 + (i % 2) * 0.3})`
          ctx.beginPath()
          ctx.arc(x, y, 0.9 + (i % 3) * 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      },
      { srgb: false },
    ),
  )
}

export function lightShaftTexture(): THREE.Texture {
  return cached('light-shaft', () =>
    makeTexture(
      128,
      256,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h)
        const grad = ctx.createLinearGradient(0, 0, 0, h)
        grad.addColorStop(0, 'rgba(255,246,224,0.9)')
        grad.addColorStop(0.45, 'rgba(255,235,200,0.35)')
        grad.addColorStop(1, 'rgba(255,230,190,0)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
        ctx.globalCompositeOperation = 'destination-out'
        for (let i = 0; i < 46; i++) {
          const x = Math.random() * w
          const len = 8 + Math.random() * 70
          ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.18})`
          ctx.fillRect(x, Math.random() * h, 1 + Math.random() * 2, len)
        }
        ctx.globalCompositeOperation = 'source-over'
      },
      { srgb: false },
    ),
  )
}

export function glassSheenTexture(): THREE.Texture {
  return cached('glass-sheen', () =>
    makeTexture(
      512,
      512,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h)
        const top = ctx.createLinearGradient(0, 0, 0, h)
        top.addColorStop(0, 'rgba(196,218,235,0.22)')
        top.addColorStop(0.42, 'rgba(170,198,220,0.06)')
        top.addColorStop(1, 'rgba(150,180,205,0)')
        ctx.fillStyle = top
        ctx.fillRect(0, 0, w, h)
        for (let i = 0; i < 5; i++) {
          ctx.save()
          ctx.translate(w * (0.08 + i * 0.21), h * 0.48)
          ctx.rotate(-0.38)
          const bw = w * (0.05 + (i % 3) * 0.035)
          const g = ctx.createLinearGradient(-bw, 0, bw, 0)
          g.addColorStop(0, 'rgba(210,232,248,0)')
          g.addColorStop(0.5, `rgba(215,236,250,${0.10 + (i % 3) * 0.04})`)
          g.addColorStop(1, 'rgba(210,232,248,0)')
          ctx.fillStyle = g
          ctx.fillRect(-bw, -h * 0.5, bw * 2, h)
          ctx.restore()
        }
      },
      { srgb: false },
    ),
  )
}

export function glassWaterTexture(): THREE.Texture {
  return cached('glass-water', () =>
    makeTexture(
      512,
      1024,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h)
        // Vertical runnels of rain on the glass, darker than the lit interior.
        for (let i = 0; i < 90; i++) {
          const x = Math.random() * w
          const y = Math.random() * h
          const len = 30 + Math.random() * 260
          const width = 1 + Math.random() * 3.4
          const grad = ctx.createLinearGradient(x, y, x, y + len)
          grad.addColorStop(0, 'rgba(8,18,28,0)')
          grad.addColorStop(0.25, `rgba(8,18,28,${0.10 + Math.random() * 0.16})`)
          grad.addColorStop(0.75, `rgba(8,18,28,${0.05 + Math.random() * 0.12})`)
          grad.addColorStop(1, 'rgba(8,18,28,0)')
          ctx.strokeStyle = grad
          ctx.lineWidth = width
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.bezierCurveTo(x + (Math.random() - 0.5) * 8, y + len * 0.35, x + (Math.random() - 0.5) * 8, y + len * 0.7, x + (Math.random() - 0.5) * 4, y + len)
          ctx.stroke()
        }
        // Fine droplets and beaded condensation.
        for (let i = 0; i < 420; i++) {
          const x = Math.random() * w
          const y = Math.random() * h
          const r = 0.7 + Math.random() * 2.2
          ctx.fillStyle = `rgba(210,232,246,${0.10 + Math.random() * 0.22})`
          ctx.beginPath()
          ctx.ellipse(x, y, r, r * (1.2 + Math.random()), 0, 0, Math.PI * 2)
          ctx.fill()
        }
        // Condensation creeping up from the bottom edge.
        const haze = ctx.createLinearGradient(0, h * 0.72, 0, h)
        haze.addColorStop(0, 'rgba(200,220,235,0)')
        haze.addColorStop(1, 'rgba(180,205,222,0.20)')
        ctx.fillStyle = haze
        ctx.fillRect(0, h * 0.72, w, h * 0.28)
      },
    ),
  )
}

export function glassReflectionTexture(): THREE.Texture {
  return cached('glass-reflection', () =>
    makeTexture(
      512,
      512,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h)
        const grad = ctx.createLinearGradient(0, 0, 0, h)
        grad.addColorStop(0, 'rgba(14,27,45,0.86)')
        grad.addColorStop(0.32, 'rgba(22,38,58,0.52)')
        grad.addColorStop(0.72, 'rgba(26,42,58,0.14)')
        grad.addColorStop(1, 'rgba(20,30,40,0)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
        for (let i = 0; i < 9; i++) {
          const x = (i / 9) * w + Math.sin(i * 3.2) * 18
          const bw = 12 + Math.random() * 34
          const g = ctx.createLinearGradient(x, 0, x + bw, 0)
          g.addColorStop(0, 'rgba(150,180,205,0)')
          g.addColorStop(0.5, `rgba(${160 + (i % 3) * 20},${184 + (i % 2) * 14},212,${0.18 + (i % 4) * 0.05})`)
          g.addColorStop(1, 'rgba(150,180,205,0)')
          ctx.fillStyle = g
          ctx.fillRect(x, h * 0.08, bw, h * 0.55)
        }
        for (let i = 0; i < 4; i++) {
          const x = 40 + i * (w / 4.4)
          const g = ctx.createLinearGradient(x, 0, x + 60, 0)
          g.addColorStop(0, 'rgba(8,14,22,0)')
          g.addColorStop(0.5, 'rgba(8,14,22,0.34)')
          g.addColorStop(1, 'rgba(8,14,22,0)')
          ctx.fillStyle = g
          ctx.fillRect(x, 0, 60, h * 0.5)
        }
      },
      { srgb: false },
    ),
  )
}

export function glowTexture(color = 'rgba(255,240,205,1)'): THREE.Texture {
  return cached(`glow-${color}`, () =>
    makeTexture(256, 256, (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
      grad.addColorStop(0, color)
      grad.addColorStop(0.25, color.replace(/[\d.]+\)$/, '0.45)'))
      grad.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'))
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
    }),
  )
}

export function radialShadowTexture(): THREE.Texture {
  return cached('radial-shadow', () =>
    makeTexture(
      256,
      256,
      (ctx, w, h) => {
        const grad = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2)
        grad.addColorStop(0, 'rgba(0,0,0,0.72)')
        grad.addColorStop(0.6, 'rgba(0,0,0,0.28)')
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      },
      { srgb: false },
    ),
  )
}

export function roadTextTexture(text: string, sub = ''): THREE.Texture {
  return cached(`roadtext-${text}`, () =>
    makeTexture(512, 512, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(225,228,220,0.85)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `800 150px ${JP_FONT}`
      ctx.fillText(text, w / 2, h * 0.4)
      if (sub) {
        ctx.font = `600 58px ${DISPLAY_FONT}`
        ctx.fillText(sub, w / 2, h * 0.7)
      }
    }),
  )
}
