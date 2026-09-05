/**
 * Baja de OpenStreetMap los locales donde se compra para una previa (kioscos,
 * vinotecas, bebidas, autoservicios) y deja un JSON crudo por ciudad.
 *
 *   node scripts/fetch-shops.mjs
 *
 * Se separa del generador de SQL a propósito: Overpass es lento y se cae
 * seguido ("server too busy"), así que esto cachea por ciudad en disco y se
 * puede volver a correr las veces que haga falta — las ciudades ya bajadas se
 * saltean. El SQL lo arma `gen-shops-seed.mjs` a partir de esta caché.
 *
 * Los datos son de OpenStreetMap, ODbL: la atribución ya está en el mapa.
 */
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = path.join(root, '.shops-cache')

const SHOPS = '^(alcohol|wine|kiosk|convenience|beverages)$'
/** Medio lado del recuadro por ciudad, en grados de latitud (~13 km). */
const HALF_LAT = 0.12

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

/**
 * Corte del lado del cliente. Sin esto una mirror colgada dejaba el `fetch`
 * esperando para siempre y la corrida entera se quedaba muda: el reintento
 * nunca llegaba a dispararse.
 */
const REQUEST_TIMEOUT_MS = 90_000

async function loadCities() {
  const src = await readFile(path.join(root, 'lib/zones.ts'), 'utf8')
  const open = src.indexOf('export const CITIES')
  if (open < 0) throw new Error('No encontré `export const CITIES` en lib/zones.ts')
  const start = src.indexOf('[', open)
  const end = src.search(/\n\];?\n/)
  if (end < 0 || end < start) throw new Error('No encontré el cierre del literal CITIES')
  const mod = `const z = (key, label, lat, lng) => ({ key, label, lat, lng })\nexport default ${src.slice(start, end + 2)}\n`
  const { default: cities } = await import(
    'data:text/javascript;base64,' + Buffer.from(mod, 'utf8').toString('base64')
  )
  return cities
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function overpass(query) {
  let lastErr
  for (let attempt = 0; attempt < 12; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length]
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // Overpass rechaza a los clientes anónimos: sin User-Agent propio
          // contesta "Please include a meaningful User-Agent string with your
          // requests to avoid rate-limiting" y no baja nada.
          'User-Agent': 'PreviAR/1.0 (mapa de previas; contacto: fran.acua@hotmail.com)',
        },
        body: new URLSearchParams({ data: query }),
        // Corte del lado del cliente: una mirror colgada dejaba el fetch
        // esperando para siempre y el reintento nunca llegaba a dispararse.
        signal: AbortSignal.timeout(90_000),
      })
      const text = await res.text()
      // Overpass devuelve 200 con un HTML de error cuando está saturado.
      if (!text.trimStart().startsWith('{')) throw new Error(text.slice(0, 160))
      return JSON.parse(text)
    } catch (err) {
      lastErr = err
      await sleep(Math.min(60000, 5000 * (attempt + 1)))
    }
  }
  throw lastErr
}

const cities = await loadCities()
await mkdir(CACHE, { recursive: true })
const done = new Set((await readdir(CACHE)).map((f) => f.replace(/\.json$/, '')))

let n = 0
let failed = 0
for (const c of cities) {
  n++
  if (done.has(c.key)) {
    console.log(`[${n}/${cities.length}] ${c.key} — ya estaba`)
    continue
  }
  const halfLng = HALF_LAT / Math.cos((c.center.lat * Math.PI) / 180)
  const bbox = [
    c.center.lat - HALF_LAT,
    c.center.lng - halfLng,
    c.center.lat + HALF_LAT,
    c.center.lng + halfLng,
  ]
    .map((v) => v.toFixed(4))
    .join(',')
  const query = `[out:json][timeout:90];nwr["shop"~"${SHOPS}"](${bbox});out center;`
  // Una ciudad que falla no puede tirar abajo la corrida entera: Overpass se
  // satura seguido. Se saltea y la próxima pasada la levanta.
  try {
    const data = await overpass(query)
    await writeFile(path.join(CACHE, `${c.key}.json`), JSON.stringify(data.elements ?? []))
    console.log(`[${n}/${cities.length}] ${c.key} — ${data.elements?.length ?? 0}`)
  } catch (err) {
    failed++
    console.log(`[${n}/${cities.length}] ${c.key} — FALLÓ: ${String(err.message ?? err).slice(0, 100)}`)
  }
  await sleep(1500)
}
console.log(failed ? `faltan ${failed} ciudades — volvé a correr` : 'listo')
process.exit(failed ? 1 : 0)
