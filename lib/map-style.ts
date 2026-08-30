// Tiles oscuros de Esri "Dark Gray Canvas" (datos HERE/OpenStreetMap contributors).
// Sin API key ni billing. CARTO quedó descartado: ahora estampa "API KEY REQUIRED".
export const TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'

// Capa separada de nombres de calles/lugares, encima de los pines de fondo.
export const LABELS_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'

export const TILE_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; datos &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// Esri Dark Gray Canvas sirve hasta z16.
export const MAX_ZOOM = 16
