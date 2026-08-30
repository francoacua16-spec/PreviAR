# Runbook de deploy — PreviAR (paso a paso con BrowserMCP)

> Estado: el MCP `browsermcp` está configurado en `~/.dsh/cordis.patch.yml`.
> Tras reiniciar el harness, el agente tiene las tools `mcp__browsermcp__browser_*`
> y levanta una ventana de Chrome visible en la máquina (ahí es donde el humano
> se loguea una sola vez en cada servicio).

## Pre-requisitos humanos (una sola vez, en la ventana de Chrome que abre el agente)

1. **Supabase** — login + confirmar email + crear proyecto nuevo (gratis).
2. **Google Cloud** — elegir cuenta y aceptar consent screen (solo para OAuth de login;
   el mapa es Leaflet + OpenStreetMap, sin billing ni API key
   si no se superan). ⚠️ Decisión explícita del dueño.
3. **GitHub** — login (para subir el repo y que Vercel lo importe).
4. **Vercel** — login con GitHub (Hobby, gratis).

## Checklist del agente (en orden)

### A. Supabase
- [ ] Crear proyecto `previar` (región cercana a AR: `us-east-1` / `sa-east-1`).
- [ ] SQL Editor → pegar y ejecutar `supabase/migrations/0001_init.sql`.
- [ ] Auth → URL Configuration: Site URL `https://previar.vercel.app`,
      Redirect `https://previar.vercel.app/auth/callback` y `http://localhost:3000/auth/callback`.
- [ ] Auth → Providers → Google: activar (Client ID/Secret llegan del paso B).
- [ ] Project Settings → API: copiar URL + anon key + service_role key → `.env.local` real.

### B. Google Cloud
- [ ] Crear/abrir proyecto.
- [ ] **OAuth Client ID (Web)** con redirects `http://localhost:3000/auth/callback`
      y `https://previar.vercel.app/auth/callback` → pegar en Supabase Auth.

### C. GitHub + Vercel
- [ ] `git remote add origin` + push de `previar/`.
- [ ] Vercel → Add New Project → importar repo → framework Next.js.
- [ ] Env vars (todas las de `.env.example`, con `NEXT_PUBLIC_APP_URL=https://previar.vercel.app`).
- [ ] Deploy + verificar build; cron ya viene en `vercel.json` (`0 * * * *`).
- [ ] Post-deploy: re-chequear redirects de Supabase/Google OAuth.

### D. Verificación
- [ ] `https://previar.vercel.app` carga → login Google → mapa oscuro con zonas.
- [ ] Crear previa de prueba → modal legal con >40 personas → aprobación → chat.
- [ ] Cron: curl al endpoint con `CRON_SECRET` (debe responder ok).
