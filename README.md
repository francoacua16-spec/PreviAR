# 🍻 PreviAR

> El mapa privado y efímero donde se arman las previas reales de **La Plata**, **CABA** y **Bariloche**.
> No es para boliches. Es para casas, quintas y deptos.

**Branding:** fondo `#0A0A0A` · acento `#FF2D92` y `#00F5FF` · logo: la "P" en forma de pin.

---

## Stack

- **Next.js 14** (App Router, RSC + Route Handlers) — TypeScript estricto
- **Tailwind CSS** + **shadcn/ui** (Radix primitives)
- **Supabase** (Auth Google, Postgres, RLS, Realtime)
- **@vis.gl/react-google-maps** (mapa oscuro, autocomplete de Places)
- **PWA** instalable (manifest + service worker + íconos generados)

## Estructura

```
previar/
├── app/
│   ├── page.tsx                 # Mapa full-screen + overlays
│   ├── login/page.tsx           # Login con Google
│   ├── party/[id]/page.tsx      # Pantalla de la previa (server → RPC seguro)
│   ├── auth/callback/route.ts   # Exchange de código OAuth
│   ├── api/cron/cleanup/route.ts# Cron horario de limpieza
│   ├── manifest.ts              # PWA manifest
│   └── icon.svg                 # Favicon (logo P-pin)
├── components/
│   ├── map/                     # Shell, canvas oscuro, markers, zone sheet, city picker
│   ├── create/                  # FAB → formulario → modal legal obligatorio
│   ├── party/                   # Acciones, chat efímero, panel host, reporte, mini-mapa
│   └── ui/                      # Primitivas shadcn
├── lib/
│   ├── supabase/                # client (browser) · server (RSC) · middleware
│   ├── api.ts                   # Wrappers tipados de las RPC + errores amigables
│   ├── zones.ts                 # Ciudades y zonas con centroides
│   ├── distance.ts              # Haversine + colores 🟢🟡🔴 por distancia
│   └── constants.ts             # Límites legales, anti-spam, duración 8h
├── supabase/migrations/0001_init.sql  # TODO el backend en un archivo
└── scripts/generate-icons.mjs   # Genera los PNG de la PWA sin dependencias
```

## Seguridad (el corazón del producto)

1. **Dirección oculta por arquitectura.** `lat_hidden / lng_hidden / address_hidden`
   **nunca** se otorgan por columna (`REVOKE` + grants selectivos). Solo salen por
   funciones `SECURITY DEFINER` que devuelven los campos ocultos **si y solo si**
   el usuario es el host o tiene solicitud `approved`.
2. **RLS por tabla**:
   - `parties`: lectura solo de fiestas `active` y no expiradas, y solo columnas públicas.
   - `party_requests`: el solicitante y el host ven sus filas (necesario para Realtime).
   - `party_messages`: solo miembros aprobados leen y escriben.
   - `reports`: cualquiera puede reportar; nadie puede leer.
3. **Toda mutación pasa por RPC con chequeos de negocio**:
   - Anti-spam: máximo **3 previas / usuario / 24 hs** (server-side).
   - Anti-clavo: `request_to_join` → el host ve **nombre + reputación** antes de aprobar.
   - `check_in` idempotente por usuario (suma `attendees_count` una sola vez).
   - Límite de capacidad chequeado al aprobar y al entrar.
4. **Efímero real**: `expires_at = start_at + 8h`; el cron borra la fila y por
   **cascada** solicitudes, mensajes y reportes. No queda rastro.
5. **Modal legal obligatorio** con doble control (UI + servidor): más de
   **50 personas en La Plata** o **40 en CABA/Bariloche** exige aceptar la
   declaración de responsabilidad; `create_party` rechaza sin `legal_ok`.

## Setup local

### 1) Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com) (plan Free alcanza).
2. Abrí **SQL Editor → New query**, pegá el contenido de
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) y ejecutalo.
   (Crea tablas, triggers, RLS, Realtime y todas las funciones. Es idempotente.)
3. **Auth → Providers → Google**: activá y pegá tu Client ID / Secret (paso 2 de Google Cloud).
4. **Auth → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback` y (tras el deploy) `https://TU-DOMINIO.vercel.app/auth/callback`
5. **Project Settings → API**: copiá URL, `anon key` y `service_role key` (este último es secreto, solo server).

### 2) Google Cloud

1. Creá un proyecto y activá las APIs: **Maps JavaScript API** y **Places API**.
2. **APIs & Services → Credentials → OAuth Client ID (Web)** con Authorized redirect URIs:
   `http://localhost:3000/auth/callback` y `https://TU-DOMINIO.vercel.app/auth/callback`
   → ese Client ID/Secret van a Supabase Auth.
3. **API Key**: creá una y restringila por HTTP referrer
   (`localhost:3000/*`, `TU-DOMINIO.vercel.app/*`). Es la `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

### 3) Variables de entorno

```bash
cp .env.example .env.local   # y completá los valores
npm install
npm run dev                  # http://localhost:3000
```

### 4) Íconos PWA

```bash
npm run icons                # regenera public/icons/*.png (logo P-pin)
```

## Deploy en Vercel

1. Subí el repo a GitHub (la carpeta `previar/`).
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importá el repo.
   Vercel detecta Next.js solo (framework preset: `Next.js`).
3. En **Settings → Environment Variables** agregá **todas** las de `.env.example`
   (con `NEXT_PUBLIC_APP_URL=https://TU-DOMINIO.vercel.app` en producción).
4. **Deploy**. Después del primer deploy:
   - Sumá `https://TU-DOMINIO.vercel.app/auth/callback` a las redirect URLs de **Supabase** y de **Google OAuth**.
   - Si cambiaste el dominio, actualizá el referrer permitido de la Google API Key.
5. **Cron horario**: viene en `vercel.json` (`0 * * * *` → `/api/cron/cleanup`, protegido con `CRON_SECRET`).
   ⚠️ Nota de plan: en Vercel **Hobby** los cron corren como máximo **1 vez por día**;
   en **Pro** corren cada hora. Igual, la RLS ya esconde cualquier previa expirada
   (filtros `status='active' AND expires_at > now()`), así que el cron es higiene,
   no seguridad. Alternativa: `pg_cron` en Supabase (add-on pago).

## Notas legales

- El modal legal usa el texto del documento maestro (ordenanza municipal por ciudad:
  50 La Plata / 40 CABA y Bariloche) y exige checkbox obligatorio **antes** de crear.
- PreviAR es solo un tablón entre privados: no vende entradas ni organiza eventos.
  Cada anfitrión es responsable de su inmueble, ruidos y habilitaciones.

## Diferencias intencionales vs. documento maestro

| Documento | Implementación |
|---|---|
| Tabla `parties` sin `description` | Se mantiene `description` (el formulario la pide) |
| 2 tablas | + `party_messages` (el chat lo exige) y `reports` (botón Reportar del Pilar B) |
| `party_requests` sin estado propio de presencia | Se agrega `checked_in` para que "Estoy acá" no sume dos veces |
| host_id en requests | Denormalizado a propósito: habilita filtros Realtime sin joins |
| Cron "cada hora" | Vercel Cron con `CRON_SECRET` (Hobby = diario, Pro = horario) |
| Límite legal >40 fijo | 50 en La Plata / 40 en CABA-Bariloche, con control server-side (`legal_accepted`) |

## Roadmap (del documento maestro)

- **Día 1-2**: esta V1 en Vercel ✅
- **Día 3**: beta cerrado con embajadores por ciudad
- **Día 7**: métrica: ¿10 previas activas por ciudad el sábado a la noche?
- **Día 30**: app nativa + Mercado Pago (V2: 10% entradas · 15% kiosco con partners)
