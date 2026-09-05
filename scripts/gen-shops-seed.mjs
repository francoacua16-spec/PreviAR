/**
 * Arma el seed de `public.shops` en 0010_shops.sql a partir de la caché que
 * deja `fetch-shops.mjs`.
 *
 *   node scripts/fetch-shops.mjs   # baja de OpenStreetMap (lento, reintenta)
 *   npm run gen:shops              # escribe el SQL
 *
 * Se tiran los locales sin nombre: un pin que dice "kiosco" sin marca no le
 * sirve a nadie para encontrarlo en la calle.
 *
 * Datos de OpenStreetMap, ODbL.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = path.join(root, '.shops-cache')
const MIGRATION = path.join(root, 'supabase/migrations/0010_shops.sql')

const BEGIN = '-- >>> BEGIN SEED GENERADO — no editar a mano (npm run gen:shops)'
const END = '-- <<< END SEED GENERADO'

/** Etiqueta que entiende un argentino, no la taxonomía de OSM. */
const KIND = {
  kiosk: 'kiosco',
  alcohol: 'vinoteca',
  wine: 'vinoteca',
  beverages: 'bebidas',
  convenience: 'autoservicio',
  supermarket: 'supermercado',
}

const q = (s) => (s === null || s === undefined ? 'null' : `'${String(s).replace(/'/g, "''")}'`)

const files = (await readdir(CACHE)).filter((f) => f.endsWith('.json'))
if (!files.length) throw new Error('Caché vacía: corré `node scripts/fetch-shops.mjs` primero')

// Los recuadros de ciudades vecinas se pisan (el Gran Buenos Aires sobre todo),
// así que el mismo local aparece en dos archivos. La clave de OSM deduplica.
const seen = new Map()
let sinNombre = 0

for (const f of files) {
  for (const el of JSON.parse(await readFile(path.join(CACHE, f), 'utf8'))) {
    const name = el.tags?.name?.trim()
    if (!name) {
      sinNombre++
      continue
    }
    const kind = KIND[el.tags?.shop]
    if (!kind) continue
    const lat = el.lat ?? el.center?.lat
    const lng = el.lon ?? el.center?.lon
    if (typeof lat !== 'number' || typeof lng !== 'number') continue
    seen.set(`${el.type}/${el.id}`, {
      osm_type: el.type,
      osm_id: el.id,
      name: name.slice(0, 80),
      kind,
      lat,
      lng,
      // Se guarda crudo. Interpretarlo es tarea de `lib/opening-hours.ts`.
      hours: el.tags.opening_hours?.trim() || null,
    })
  }
}

const rows = [...seen.values()]
  .sort((a, b) => a.osm_type.localeCompare(b.osm_type) || a.osm_id - b.osm_id)
  .map(
    (s) =>
      `  (${q(s.osm_type)}, ${s.osm_id}, ${q(s.name)}, ${q(s.kind)}, ` +
      `${s.lat.toFixed(6)}, ${s.lng.toFixed(6)}, ${q(s.hours)})`
  )

if (!rows.length) throw new Error('Ningún local con nombre en la caché')

const conHorario = [...seen.values()].filter((s) => s.hours).length

const seed = [
  BEGIN,
  `-- ${rows.length} locales de ${files.length} ciudades; ${conHorario} con horario cargado en OSM.`,
  '-- Fuente: OpenStreetMap (ODbL).',
  '',
  'insert into public.shops (osm_type, osm_id, name, kind, lat, lng, opening_hours) values',
  rows.join(',\n') + ';',
  '',
  // Upsert: re-aplicar la migración tras un re-import no puede fallar ni
  // duplicar. Un local que cerró se saca aparte, no desde acá.
  END,
]
  .join('\n')
  .replace(
    ';\n\n' + END,
    '\non conflict (osm_type, osm_id) do update set\n' +
      '  name = excluded.name, kind = excluded.kind, lat = excluded.lat,\n' +
      '  lng = excluded.lng, opening_hours = excluded.opening_hours;\n\n' +
      END
  )

const migration = await readFile(MIGRATION, 'utf8')
const a = migration.indexOf(BEGIN)
const b = migration.indexOf(END)
if (a < 0 || b < 0) throw new Error(`Faltan los marcadores de seed en ${MIGRATION}`)
await writeFile(MIGRATION, migration.slice(0, a) + seed + migration.slice(b + END.length), 'utf8')

console.log(
  `gen:shops → ${rows.length} locales (${conHorario} con horario, ${sinNombre} descartados sin nombre)`
)
