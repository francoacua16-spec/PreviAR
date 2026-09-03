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

/** Dot tenue para zonas sin previas. */
export function dimDotDataUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="5" fill="#3A3A44"/>
  </svg>`
  return svgToDataUrl(svg)
}
