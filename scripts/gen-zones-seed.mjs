/**
 * Genera el seed SQL de `cities` / `zones` a partir de `lib/zones.ts`.
 *
 * El catálogo se autora en TypeScript porque la app necesita resolver nombres
 * de zona de forma síncrona durante el render. Para que la base no sea una
 * segunda lista que pueda divergir, el seed se genera desde ese mismo archivo
 * y se escribe entre marcadores dentro de la migración 0009.
 *
 *   npm run gen:zones
 *
 * No parsea TypeScript: recorta el literal `CITIES` (que es JSON con azúcar)
 * y lo evalúa como módulo JS con el helper `z` inyectado. Si alguien mete
 * lógica de verdad ahí adentro, esto rompe fuerte y a propósito.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ZONES = path.join(root, 'lib/zones.ts')
const MIGRATION = path.join(root, 'supabase/migrations/0009_cities_zones.sql')
const BEGIN = '-- >>> BEGIN SEED GENERADO — no editar a mano (npm run gen:zones)'
const END = '-- <<< END SEED GENERADO'

const src = await readFile(ZONES, 'utf8')
const open = src.indexOf('export const CITIES')
if (open < 0) throw new Error('No encontré `export const CITIES` en lib/zones.ts')
const start = src.indexOf('[', open)
const end = src.search(/\n\];?\n/)
if (end < 0 || end < start) throw new Error('No encontré el cierre del literal CITIES')
const literal = src.slice(start, end + 2)

const mod = `const z = (key, label, lat, lng) => ({ key, label, lat, lng })\nexport default ${literal}\n`
const { default: cities } = await import(
  'data:text/javascript;base64,' + Buffer.from(mod, 'utf8').toString('base64')
)

const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const num = (n) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`Coordenada inválida: ${n}`)
  return String(n)
}

const seenCity = new Set()
const cityRows = []
const zoneRows = []

cities.forEach((c, i) => {
  if (seenCity.has(c.key)) throw new Error(`Ciudad duplicada: ${c.key}`)
  seenCity.add(c.key)
  if (!/^[a-z0-9_]+$/.test(c.key)) throw new Error(`Clave de ciudad inválida: ${c.key}`)
  cityRows.push(
    `  (${q(c.key)}, ${q(c.label)}, ${q(c.short)}, ${q(c.province)}, ` +
      `${num(c.center.lat)}, ${num(c.center.lng)}, ${num(c.radiusM)}, ${num(c.legalLimit)}, ${i})`
  )
  const seenZone = new Set()
  for (const zone of c.zones) {
    if (seenZone.has(zone.key)) throw new Error(`Zona duplicada en ${c.key}: ${zone.key}`)
    seenZone.add(zone.key)
    // `zone_text` viaja en URLs y se compara contra lo ya guardado en
    // `parties`: si la clave lleva acentos, el round-trip se rompe.
    if (!/^[a-z0-9-]+$/.test(zone.key)) throw new Error(`Clave de zona inválida: ${c.key}/${zone.key}`)
    zoneRows.push(
      `  (${q(c.key)}, ${q(zone.key)}, ${q(zone.label)}, ${num(zone.lat)}, ${num(zone.lng)})`
    )
  }
})

const seed = [
  BEGIN,
  `-- ${cityRows.length} ciudades, ${zoneRows.length} zonas.`,
  '',
  'insert into public.cities (key, label, short, province, lat, lng, radius_m, legal_limit, sort) values',
  cityRows.join(',\n'),
  // Upsert y no delete: una vez que `parties.city` referencia a `cities`, no se
  // puede borrar una ciudad que tenga previas. Re-aplicar la migración tiene
  // que ser inofensivo.
  'on conflict (key) do update set',
  '  label = excluded.label, short = excluded.short, province = excluded.province,',
  '  lat = excluded.lat, lng = excluded.lng, radius_m = excluded.radius_m,',
  '  legal_limit = excluded.legal_limit, sort = excluded.sort;',
  '',
  'insert into public.zones (city_key, key, label, lat, lng) values',
  zoneRows.join(',\n'),
  'on conflict (city_key, key) do update set',
  '  label = excluded.label, lat = excluded.lat, lng = excluded.lng;',
  '',
  END,
].join('\n')

const migration = await readFile(MIGRATION, 'utf8')
const a = migration.indexOf(BEGIN)
const b = migration.indexOf(END)
if (a < 0 || b < 0) throw new Error(`Faltan los marcadores de seed en ${MIGRATION}`)
await writeFile(MIGRATION, migration.slice(0, a) + seed + migration.slice(b + END.length), 'utf8')

console.log(`gen:zones → ${cityRows.length} ciudades, ${zoneRows.length} zonas en 0009_cities_zones.sql`)
