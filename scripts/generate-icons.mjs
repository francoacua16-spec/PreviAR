// Genera los íconos PWA de PreviAR (logo "P en forma de pin") como PNG
// sin dependencias: encoder PNG puro + zlib de Node.
// Uso: npm run icons
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// ── Encoder PNG mínimo (RGBA 8-bit) ──────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0 // filtro "none"
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Dibujo del pin (geometría idéntica al app/icon.svg) ─────────
const DARK = [10, 10, 10]
const PINK = [255, 45, 146]
const CYAN = [0, 245, 255]
const lerp = (a, b, t) => a + (b - a) * t
const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2)

// Devuelve [r,g,b,a] para el punto (x,y) en espacio 512, pin con escala `scale`.
function samplePixel(x, y, scale, fullBleed) {
  // fondo redondeado
  const margin = fullBleed ? 0 : 512 * 0.13
  const radius = fullBleed ? 0 : 512 * 0.2
  const half = 512 / 2
  let inBg = false
  if (x >= margin && x <= 512 - margin && y >= margin && y <= 512 - margin) {
    const cx = x < half ? margin + radius : 512 - margin - radius
    const cy = y < half ? margin + radius : 512 - margin - radius
    if (x >= margin + radius && x <= 512 - margin - radius) inBg = true
    else if (y >= margin + radius && y <= 512 - margin - radius) inBg = true
    else inBg = dist(x, y, cx, cy) <= radius
  }
  if (!inBg) return [0, 0, 0, 0]

  // coordenadas del pin (escala centrada en 256,256)
  const px = 256 + (x - 256) * scale
  const py = 256 + (y - 256) * scale

  // cabeza circular + cola triangular
  const head = { x: 256, y: 208, r: 118 }
  const inHead = dist(px, py, head.x, head.y) <= head.r
  let inTail = false
  if (!inHead) {
    const baseY = 300
    const tipY = 448
    if (py > baseY && py < tipY) {
      const t = (py - baseY) / (tipY - baseY)
      const hw = 78 * (1 - t)
      inTail = Math.abs(px - head.x) <= hw
    }
  }
  const inPin = inHead || inTail
  if (!inPin) return [0, 0, 0, 0]

  // gradiente diagonal rosa → cian
  const g = (px + py) / 1024
  const color = [lerp(PINK[0], CYAN[0], g), lerp(PINK[1], CYAN[1], g), lerp(PINK[2], CYAN[2], g)]

  // letra P en oscuro: vástago + cuenco + agujero
  const inStem = px >= 210 && px <= 242 && py >= 140 && py <= 300
  const inBowlRect = px >= 242 && px <= 276 && py >= 172 && py <= 276
  const inBowlArc = px >= 276 && dist(px, py, 276, 224) <= 52
  const inHole = dist(px, py, 252, 224) <= 28
  if ((inStem || inBowlRect || inBowlArc) && !inHole) return [...DARK, 255]
  return [...color, 255]
}

// 2x supersampling
function render(size, scale, fullBleed) {
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const ux = ((x + (sx + 0.5) / 2) / size) * 512
          const uy = ((y + (sy + 0.5) / 2) / size) * 512
          const [pr, pg, pb, pa] = samplePixel(ux, uy, scale, fullBleed)
          r += pr * pa; g += pg * pa; b += pb * pa; a += pa
        }
      }
      if (a > 0) {
        const i = (y * size + x) * 4
        buf[i] = Math.round(r / a)
        buf[i + 1] = Math.round(g / a)
        buf[i + 2] = Math.round(b / a)
        buf[i + 3] = Math.round(a / 4)
      }
    }
  }
  return buf
}

const jobs = [
  { file: 'icon-512.png', size: 512, scale: 1, fullBleed: false },
  { file: 'icon-192.png', size: 192, scale: 1, fullBleed: false },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.76, fullBleed: true },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.94, fullBleed: true },
]

for (const job of jobs) {
  const png = encodePng(job.size, render(job.size, job.scale, job.fullBleed))
  writeFileSync(join(outDir, job.file), png)
  console.log('✓', job.file)
}
console.log('Íconos generados en public/icons/')
