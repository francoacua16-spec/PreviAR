/**
 * Lectura del campo `opening_hours` de OpenStreetMap.
 *
 * OSM guarda los horarios en una mini-gramática propia ("Mo-Fr 08:00-21:00;
 * Sa 09:00-13:00"). La librería oficial que la interpreta entera pesa más de
 * 100 kB, y acá el dato es opcional: la mayoría de los kioscos argentinos no
 * lo tiene cargado. Así que se cubre el subconjunto que aparece de verdad y
 * lo que no se entiende se devuelve como `null`, para que la UI muestre el
 * texto crudo en vez de mentir con un "abierto".
 *
 * Nunca inventa: si no hay dato, o no se entiende, no dice si está abierto.
 */

const DAYS = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'] as const

export interface OpenState {
  /** Si está abierto en el momento consultado. */
  open: boolean
  /** Hora "HH:MM" a la que cierra (si está abierto) o abre (si está cerrado). */
  until: string | null
}

/** Minuto del día (0..1439) y día de semana (0=domingo) en hora argentina. */
function nowInArgentina(at: Date): { day: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(at)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const day = DAYS.indexOf(get('weekday').toLowerCase().slice(0, 2) as (typeof DAYS)[number])
  // Intl devuelve "24" a la medianoche en hour12:false.
  const hour = Number(get('hour')) % 24
  return { day: day < 0 ? 0 : day, minutes: hour * 60 + Number(get('minute')) }
}

const toMinutes = (hhmm: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 24 || min > 59) return null
  return h * 60 + min
}

const pad = (mins: number) => {
  const m = ((mins % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * "Mo-Fr", "Sa,Su", "Mo" → índices de día.
 *
 * `PH` (feriados) se ignora: no tenemos calendario de feriados argentinos, y
 * tratarlo como un día más daría respuestas equivocadas los 355 días que no
 * lo son. Una regla que habla SÓLO de feriados devuelve lista vacía y el que
 * llama la saltea.
 */
function parseDays(spec: string): number[] | null {
  const out: number[] = []
  let sawPH = false
  for (const chunk of spec.split(',')) {
    const range = chunk.trim().toLowerCase()
    if (!range) continue
    if (range === 'ph' || range === 'sh') {
      sawPH = true
      continue
    }
    const m = /^([a-z]{2})(?:-([a-z]{2}))?$/.exec(range)
    if (!m) return null
    const from = DAYS.indexOf(m[1] as (typeof DAYS)[number])
    if (from < 0) return null
    if (!m[2]) {
      out.push(from)
      continue
    }
    const to = DAYS.indexOf(m[2] as (typeof DAYS)[number])
    if (to < 0) return null
    // Los rangos dan la vuelta: "Sa-Mo" es sábado, domingo y lunes.
    for (let i = from; ; i = (i + 1) % 7) {
      out.push(i)
      if (i === to) break
    }
  }
  if (!out.length && sawPH) return []
  return out.length ? out : null
}

/** Intervalos [desde, hasta) en minutos, ya proyectados sobre el día pedido. */
function parseTimes(spec: string): Array<[number, number]> | null {
  const out: Array<[number, number]> = []
  for (const chunk of spec.split(',')) {
    const t = chunk.trim()
    // "12:00+": abre a esa hora y OSM no dice cuándo cierra. Se toma hasta el
    // final del día — es lo único que el dato soporta.
    const openEnded = /^(\d{1,2}:\d{2})\s*\+$/.exec(t)
    if (openEnded) {
      const from = toMinutes(openEnded[1])
      if (from === null) return null
      out.push([from, 1440])
      continue
    }
    const m = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(t)
    if (!m) return null
    const from = toMinutes(m[1])
    const to = toMinutes(m[2])
    if (from === null || to === null) return null
    out.push([from, to])
  }
  return out.length ? out : null
}

/**
 * Devuelve si el local está abierto, o `null` si el horario falta o no se
 * entiende. `null` no significa cerrado: significa que no sabemos.
 */
const DAY_TOK = '(?:Mo|Tu|We|Th|Fr|Sa|Su|PH|SH)'
const DAY_SPEC = `${DAY_TOK}(?:\\s*-\\s*${DAY_TOK})?(?:\\s*,\\s*${DAY_TOK}(?:\\s*-\\s*${DAY_TOK})?)*`
const TIME = '\\d{1,2}:\\d{2}\\s*(?:-\\s*\\d{1,2}:\\d{2}|\\+)'

/**
 * Una regla es "DÍAS HORARIOS". Se escanean todas de corrido en vez de cortar
 * por ";": OSM también separa reglas con coma ("Mo-Sa 08:00-22:00, Su 11:00-20:00")
 * y esa misma coma aparece dentro de una lista de días ("Su,PH") y de horarios
 * ("08:00-12:00,16:00-20:00"). Cortar por coma rompía los tres casos.
 */
const RULE_RE = new RegExp(`(${DAY_SPEC})\\s+(off|closed|${TIME}(?:\\s*,\\s*${TIME})*)`, 'gi')

export function isOpenNow(spec: string | null | undefined, at: Date = new Date()): OpenState | null {
  if (!spec) return null
  const text = spec.trim()
  if (!text) return null

  const { day, minutes } = nowInArgentina(at)

  if (/^24\s*\/\s*7$/.test(text)) return { open: true, until: null }

  // Cada día arranca cerrado; las reglas se aplican en orden y la última que
  // toca el día de hoy gana, que es la semántica de OSM ("Mo-Su 09:00-20:00;
  // Su off").
  let openNow: boolean | null = null
  let edge: number | null = null
  let sawRule = false
  let covered = 0

  const apply = (days: number[], timesSpec: string): boolean => {
    sawRule = true
    if (!days.includes(day)) return true

    if (/^(off|closed)$/i.test(timesSpec)) {
      openNow = false
      edge = null
      return true
    }
    const times = parseTimes(timesSpec)
    if (!times) return false

    openNow = false
    edge = null
    for (const [from, to] of times) {
      // Cruce de medianoche: "22:00-02:00" abre hoy y cierra mañana.
      // from === to ("12:00-12:00", "00:00-00:00") es el modo de OSM de decir
      // 24 horas, y cae acá.
      const spansMidnight = to <= from
      const inside = spansMidnight
        ? minutes >= from || minutes < to
        : minutes >= from && minutes < to
      if (inside) {
        openNow = true
        edge = spansMidnight && to === from ? null : to
        break
      }
      if (!spansMidnight && minutes < from && (edge === null || from < edge)) edge = from
    }
    return true
  }

  let m: RegExpExecArray | null
  RULE_RE.lastIndex = 0
  while ((m = RULE_RE.exec(text)) !== null) {
    covered += m[0].length
    const days = parseDays(m[1])
    if (!days) return null
    if (!apply(days, m[2].trim())) return null
  }

  if (!sawRule) {
    // Sin días adelante ("08:00-20:00", "08:30-12:30,15:30-20:00") el horario
    // vale todos los días. Es la forma más común en los kioscos argentinos.
    if (!apply([0, 1, 2, 3, 4, 5, 6], text)) return null
    const e: number | null = edge
    return { open: openNow === true, until: e === null ? null : pad(e) }
  }

  // Lo que las reglas no consumieron tiene que ser puro separador. Si sobra
  // cualquier otra cosa (rangos de meses, "sunrise", comentarios entre
  // comillas) preferimos no saber a arriesgar una respuesta inventada.
  if (text.replace(RULE_RE, '').replace(/[;,\s]/g, '') !== '') return null
  if (covered === 0) return null

  if (openNow === null) return { open: false, until: null }
  return { open: openNow, until: edge === null ? null : pad(edge) }
}

/** Etiqueta corta para la UI. Nunca afirma nada que no sepa. */
export function openLabel(spec: string | null | undefined): string {
  const state = isOpenNow(spec)
  if (!state) return spec ? spec : 'Horario no cargado'
  if (state.open) return state.until ? `Abierto · cierra ${state.until}` : 'Abierto ahora'
  return state.until ? `Cerrado · abre ${state.until}` : 'Cerrado ahora'
}
