# GATES — batch apple-design: géneros, pin manual, barcos/yates, temas al DJ, QR, IA de la app

Todo se verifica en viewport mobile web (375×812) desde el Browser pane, además de
compilar. `npx tsc` solo no alcanza: es condición necesaria, no suficiente.

---

- [x] **G1 · Dirección obligatoria en crear previa**
  No se puede enviar el formulario sin dirección geocodificada (lat/lng reales).
  Sin fallback silencioso al centroide de la zona.
  CHECK: `grep -c "ADDRESS_REQUIRED\|PIN_REQUIRED" supabase/migrations/0007_*.sql lib/api.ts && grep -n "addressOk\|hasPin" components/create/create-form.tsx`
  EXPECT: presente en la migración y en friendlyError; el form bloquea sin dirección ni pin
  EVIDENCE: `0007_*.sql` 3 hits, `lib/api.ts` 2 hits. En `components/create/create-form.tsx`:
  l.91 `const hasPin = lat !== null && lng !== null`, l.92 `const addressOk = address.trim().length >= 5`,
  l.101 `if (!addressOk) out.push('la dirección')`, l.122 y l.156 cortan el submit
  (`if (!addressOk || lat === null || lng === null || genres.length === 0) return`).

- [x] **G2 · Géneros musicales, multi-select, mínimo 1**
  Catálogo de géneros de fiesta en constants; columna `genres text[]` en `parties`;
  el RPC rechaza array vacío; el form obliga a elegir ≥1; se muestran en la ficha.
  CHECK: `grep -c "MUSIC_GENRES" lib/constants.ts components/create/genre-picker.tsx && grep -n "genres" components/create/create-form.tsx components/party/party-client.tsx`
  EXPECT: catálogo en constants, picker que lo consume, form que exige ≥1, ficha que los pinta
  EVIDENCE: `lib/constants.ts` 4 hits de `MUSIC_GENRES`; `genre-picker.tsx:4` lo importa junto con
  `MAX_GENRES` y lo mapea en l.32. `create-form.tsx:79` `useState<string[]>([])`, l.103 y l.134
  bloquean con 0 géneros, l.228 `<GenrePicker value={genres} onChange={setGenres} />`.
  `party-client.tsx:370-377` pinta `genreEmoji(g)` + `genreLabel(g)`.

- [x] **G3 · PIN manual del mapa**
  El usuario puede arrastrar/tocar el pin para corregir la ubicación exacta,
  y el valor arrastrado es el que se guarda.
  CHECK: `test -f components/create/pin-picker.tsx && grep -c "draggable" components/create/pin-picker-canvas.tsx`
  EXPECT: archivo existe y el marcador es draggable
  EVIDENCE: `components/create/pin-picker.tsx` existe; `pin-picker-canvas.tsx` tiene 2 hits de
  `draggable`. `create-form.tsx:259-261` le pasa `lat`/`lng` y un `fallback` al centroide de zona
  solo como posición inicial del mapa, no como valor enviado (l.156 exige lat/lng no nulos).

- [x] **G4 · Previas en barco / yate / catamarán**
  Columna `venue_type`, catálogo con opciones náuticas, selector en el form,
  badge en la ficha, y copy de dirección adaptado (amarre/puerto).
  CHECK: `grep -in "barco\|yate\|catamaran" lib/constants.ts`
  EXPECT: las tres claves presentes
  EVIDENCE: `lib/constants.ts:88-90` →
  `{ key: 'barco', label: 'Barco', emoji: '🚤', nautical: true }`,
  `{ key: 'yate', label: 'Yate', emoji: '🛥️', nautical: true }`,
  `{ key: 'catamaran', label: 'Catamarán', emoji: '⛵', nautical: true }`.
  l.76 documenta que `nautical: true` cambia el copy de dirección (amarre/puerto).

- [x] **G5 · Temas para el DJ: máximo 2 por persona, opcional, acorde al género**
  Tabla `party_song_requests`, RPC con límite duro de 2 (`SONG_LIMIT`),
  UI para agregar/borrar, y los géneros de la previa visibles en el formulario.
  CHECK: `grep -c "SONG_LIMIT" supabase/migrations/0007_*.sql lib/api.ts`
  EXPECT: definido en SQL y traducido en friendlyError
  EVIDENCE: 1 hit en `0007_*.sql`, 1 en `lib/api.ts`. Tabla en `0007_*.sql:53`
  (`create table if not exists public.party_song_requests`), RLS en l.69, RPCs
  `add_song_request` (l.454), `delete_song_request` (l.497), `list_song_requests` (l.514).
  `party-client.tsx:570-572` monta `<SongRequests partyId genres={party.genres} isHost />`
  solo si `isApproved && !expired && !cancelled && party.genres.length > 0`.

- [x] **G6 · QR para imprimir / invitar + link**
  QR real (no imagen remota) del link de la previa, con opción de imprimir
  y de copiar/compartir el link.
  CHECK: `grep -c "QRCode.toString\|w.print()" components/party/invite-dialog.tsx`
  EXPECT: QR generado local e impresión propia
  EVIDENCE: `invite-dialog.tsx` genera el QR con `QRCode.toString(url, { type: 'svg', ... })`
  del paquete `qrcode` (local, sin request remoto) y lo inyecta inline. `print()` abre una
  ventana aparte y llama `w.print()` — no `window.print()` sobre la app oscura. Botones:
  Copiar link, WhatsApp, Compartir (`navigator.share` con fallback a copiar), Imprimir.

- [x] **G7 · Arquitectura de la app por apartados**
  Barra inferior persistente con Mapa · Buscar · Previas · Perfil (+ Admin si corresponde),
  y la ficha de previa segmentada en secciones navegables.
  CHECK: `ls components/shell/tab-bar.tsx app/buscar/page.tsx app/mis-previas/page.tsx`
  EXPECT: los tres existen
  EVIDENCE: los tres archivos existen. `tab-bar.tsx:20-25` define Mapa/Buscar/Previas/Cuenta,
  l.70-72 suma Admin si `isAdmin`, l.93-100 el FAB central "Crear".
  `party-client.tsx` monta `<SectionNav>` con Lugar/Música/Chat/Gente y anclas `scroll-mt-20`.

- [x] **G8 · Apartado búsqueda funcionando**
  Buscar por texto, filtrar por género y por tipo de lugar, sobre previas activas.
  CHECK: `grep -c "search_parties" supabase/migrations/0007_*.sql lib/api.ts`
  EXPECT: RPC y wrapper
  EVIDENCE: 4 hits en `0007_*.sql` (definición en l.317), 1 wrapper en `lib/api.ts`.
  UI en `components/search/search-client.tsx`, ruta `app/buscar/page.tsx`.

- [x] **G9 · Disciplina apple-design aplicada**
  Easing tipo resorte, feedback en `:active` (no en click), materiales/vidrio con
  jerarquía, tracking/leading por tamaño, y respeto de `prefers-reduced-motion`,
  `prefers-reduced-transparency` y `prefers-contrast`.
  CHECK: `grep -c "prefers-reduced-motion\|prefers-reduced-transparency\|prefers-contrast\|--ease-spring" app/globals.css`
  EXPECT: >=4
  EVIDENCE: 8 hits en `app/globals.css`. Utilidades definidas y en uso: `press`, `press-soft`,
  `glass`, `glass-chip`, `glass-deep`, `materialize`, `scroll-edge-bottom`, `type-display`,
  `type-title`, `type-body`, `type-caption`, `on-glass`.

- [x] **G10 · Compila limpio**
  CHECK: `npx tsc --noEmit && npx next build`
  EXPECT: exit 0, sin errores de tipo ni de build
  EVIDENCE: `npx tsc --noEmit` → exit 0, sin salida. `npx next build` → exit 0;
  13 rutas generadas (`/`, `/buscar`, `/mis-previas`, `/party/[id]`, `/profile`, `/login`,
  `/privacy`, `/admin`, `/auth/callback`, APIs), First Load JS compartido 87.3 kB,
  middleware 85.2 kB. Cero warnings de tipo o build.

- [ ] **G11 · Auditoría en mobile web real (375×812)**
  Recorrer mapa → buscar → crear previa → ficha → chat → admin en el viewport
  mobile, sin errores de consola, sin overlaps, sin scroll horizontal.
  EVIDENCE: parcial. Hecho sin sesión, a 375×812: `/login` sin scroll horizontal
  (`scrollWidth 375 === clientWidth 375`), consola sin errores, red todo 200.
  Bug encontrado y corregido: `h-13` no existe en la escala de Tailwind → el botón
  "Entrar con Google" y todo `Button size="lg"` medían **20px** de alto (medido en vivo).
  Fix en `tailwind.config.ts` (`spacing: { 13: '3.25rem' }`); re-medido: **52px**.
  Segundo fix: header del mapa `z-20` → `z-[35]` (quedaba borroso bajo el LoginGate).
  BLOQUEADO: las rutas con sesión (`/`, `/buscar`, `/mis-previas`, `/profile`, `/admin`,
  ficha de previa, diálogo de creación) no se pueden auditar hasta que Franco inicie
  sesión con Google en el Browser pane — no puedo hacer login yo.

- [x] **G12 · Migración 0007 idempotente y segura**
  `begin/commit`, `add column if not exists`, guards de constraint, `revoke/grant`
  en cada función nueva, y ninguna columna sensible agregada al `grant select` de
  `parties` (la whitelist de realtime tiene que seguir siendo segura).
  CHECK: `grep -c "revoke all on function" supabase/migrations/0007_*.sql && grep -n "grant select" supabase/migrations/0007_*.sql`
  EXPECT: >= número de funciones nuevas; el grant sobre `parties` solo suma columnas no sensibles
  EVIDENCE: `begin;` l.13 / `commit;` l.611. 10 `revoke all on function` para 10 funciones
  (`create_party`, `get_party`, `list_zone_parties`, `search_parties`, `host_update_party`,
  `add_song_request`, `delete_song_request`, `list_song_requests`, `admin_list_parties`,
  `admin_party_songs`). El único grant nuevo sobre `parties` es
  `grant select (genres, venue_type) on public.parties to authenticated;` (l.49) —
  `address_hidden`, `lat_hidden`, `lng_hidden`, `arrival_notes` y `whatsapp_number`
  siguen fuera de la whitelist, así que el payload de Realtime no las puede filtrar.
  `get_party` (l.247-252) mantiene el gating `case when v_is_host or v_approved`.

---

## Pendiente fuera de gates

- **Migración 0007 sin aplicar en Supabase.** Hasta que Franco la pegue en el SQL Editor,
  géneros, tipo de lugar, temas del DJ y `/buscar` fallan contra la base real.
- **Rebrand lila aplicado, con el color medido del logo.** La paleta pasó de
  fucsia+cyan al lila de la marca. El violeta no es una estimación: es el color
  del trazo medido píxel a píxel sobre el archivo original —
  `#B299F1` (8.2:1 sobre `#0A0A0A`, lleva texto e iconos). `#D6C8F9` (tinte,
  12.7:1) y `#8C66EA` (sombra, 4.9:1) son el mismo tono (H 257°), así que los
  tres pasan AA. Tocado: `tailwind.config.ts`, `app/globals.css`,
  `lib/constants.ts` (`PIN_COLORS.neutral`) y `components/map/marker-icons.ts`.
  Barrido: `grep -rn "FF2D92\|00F5FF\|FF00E5\|B18CF5\|E0D0FF\|8A5CF0\|neon-pink\|neon-cyan"
  app components lib tailwind.config.ts` → 0 hits.
- **El logo es el archivo original, no un dibujo.** Se descartó la versión
  redibujada a mano (`app/icon.svg` + paths SVG en `components/logo.tsx`). Ahora
  `public/logo-previar.png` (531×319) sale del PNG de la marca: mismo trazo,
  solo recortado y con el fondo hecho transparente por un-matting
  (`alpha = dist(px,bg)/dist(ink,bg)`), sin ninguna línea nueva.
  `components/logo.tsx` expone un único `Wordmark` que sirve ese archivo —
  `PinLogo` se eliminó porque la copa sola no se lee: está volcada, sin tallo ni
  pie, y el "derrame" es el chorro cayendo al charco por detrás de la "A".
  Los 6 rasterizados (`public/icons/icon-192|512|maskable-512`,
  `apple-touch-icon`, `logo-mark`, `app/icon.png`) salen del mismo original.
