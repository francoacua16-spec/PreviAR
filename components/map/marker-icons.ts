/** Íconos SVG inline como data-URLs para los markers de Google Maps. */

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

/** Pin de zona con contador de previas. Color según distancia del usuario. */
export function zonePinDataUrl({ count, color }: { count: number; color: string }) {
  const label = count > 0 ? String(count) : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="72" viewBox="0 0 64 72">
    <path d="M32 1.5C15.2 1.5 1.5 15.2 1.5 32c0 23.6 30.5 38.5 30.5 38.5S62.5 55.6 62.5 32C62.5 15.2 48.8 1.5 32 1.5z" fill="${color}"/>
    <circle cx="32" cy="30" r="22" fill="#0A0A0A"/>
    <circle cx="32" cy="30" r="21.2" fill="none" stroke="${color}" stroke-opacity="0.35" stroke-width="1.6"/>
    <text x="32" y="37.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="22" fill="#FFFFFF">${label}</text>
  </svg>`
  return svgToDataUrl(svg)
}

/** Pin exacto (solo visible para aprobados / host). */
export function exactPinDataUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="66" viewBox="0 0 64 72">
    <path d="M32 1.5C15.2 1.5 1.5 15.2 1.5 32c0 23.6 30.5 38.5 30.5 38.5S62.5 55.6 62.5 32C62.5 15.2 48.8 1.5 32 1.5z" fill="#B299F1"/>
    <circle cx="32" cy="30" r="20" fill="#0A0A0A"/>
    <circle cx="32" cy="30" r="8.5" fill="#D6C8F9"/>
  </svg>`
  return svgToDataUrl(svg)
}

/** Punto de ubicación del usuario. */
export function userDotDataUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="13" fill="#B299F1" fill-opacity="0.18"/>
    <circle cx="14" cy="14" r="7.5" fill="#B299F1" stroke="#0A0A0A" stroke-width="3"/>
  </svg>`
  return svgToDataUrl(svg)
}

/**
 * Mismo pin, pero como HTML para un `divIcon` de Leaflet en vez de un
 * data-URL para un `<img>`. Un `<img>` sólo se puede animar entero; con HTML
 * real adentro del mapa se puede latir el anillo sin mover el pin, que es lo
 * que hace que una previa con lugar se note sin marear.
 *
 * Devuelve un string porque `L.divIcon` recibe HTML, no JSX.
 */
export function zonePinHtml({
  count,
  color,
  pulse,
  glow,
}: {
  count: number
  color: string
  pulse: boolean
  glow: boolean
}) {
  const label = count > 0 ? String(count) : ''
  const ring = pulse
    ? `<span class="pin-pulse" style="--pin-color:${color}"></span>`
    : ''
  return `<div class="pin-wrap${glow ? ' pin-glow' : ''}" style="--pin-color:${color}">
    ${ring}
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="54" viewBox="0 0 64 72">
      <path d="M32 1.5C15.2 1.5 1.5 15.2 1.5 32c0 23.6 30.5 38.5 30.5 38.5S62.5 55.6 62.5 32C62.5 15.2 48.8 1.5 32 1.5z" fill="${color}"/>
      <circle cx="32" cy="30" r="22" fill="#0A0A0A"/>
      <circle cx="32" cy="30" r="21.2" fill="none" stroke="${color}" stroke-opacity="0.35" stroke-width="1.6"/>
      <text x="32" y="37.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="22" fill="#FFFFFF">${label}</text>
    </svg>
  </div>`
}

/**
 * Pin apagado para zonas sin ninguna previa. Sólo se dibuja cuando en todo el
 * recuadro visible no hay nada: en un mapa con previas serían ruido gris, pero
 * en un mapa vacío son la única salida que tiene el usuario.
 */
export function emptyZonePinHtml(label: string) {
  return `<div class="pin-empty">
    <span class="pin-empty-dot"></span>
    <span class="pin-empty-label">${label}</span>
  </div>`
}

/** Velero a la deriva. Decorativo: no se toca, no abre nada. */
export function boatHtml(flip: boolean) {
  // El scaleX va en un wrapper y no en `.boat`: una animación CSS pisa la
  // `transform` inline, y el velero perdía el espejado al empezar a cabecear.
  return `<div style="transform:scaleX(${flip ? -1 : 1})"><div class="boat">
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M12 2.5 12 15" stroke="#D6C8F9" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M13 4.2c3.2 2.3 4.6 5.1 5 8.3H13z" fill="#B299F1"/>
      <path d="M11 6.5C9.2 8.4 8.2 10.4 7.8 12.5H11z" fill="#8E6FE0"/>
      <path d="M4.5 16h15l-2.2 3.6a2 2 0 0 1-1.7 1H8.4a2 2 0 0 1-1.7-1z" fill="#D6C8F9"/>
    </svg>
  </div></div>`
}
