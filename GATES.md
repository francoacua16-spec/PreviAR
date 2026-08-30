# GATES — arreglar "Entrar con Google" (provider is not enabled)

- [x] G1 Diagnostico confirmado: el provider google esta deshabilitado en el proyecto Supabase.
  CHECK: curl /auth/v1/settings del proyecto vwuscszboqavuvbmffmz
  EVIDENCE: respuesta real -> "external": { ... "google": false ... , "email": true }.
  El endpoint authorize devuelve 400 {"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}.

- [x] G2 El codigo de login/callback no tiene bugs propios que rompan el flujo una vez habilitado el provider.
  EVIDENCE: app/auth/callback/route.ts hace exchangeCodeForSession(code) y redirige a origin+next;
  middleware.ts corre sobre /auth/callback solo para refrescar cookies (matcher excluye estaticos), no bloquea.
  El unico defecto real era que /login ignoraba ?error=auth: corregido.

- [x] G3 Dominios de produccion alineados.
  EVIDENCE: NEXT_PUBLIC_APP_URL="https://previar.vercel.app" en Vercel esta desactualizada, pero
  `grep -rn NEXT_PUBLIC_APP_URL` no la encuentra en ningun archivo de codigo (solo README y runbook):
  el callback se arma con window.location.origin, asi que no afecta el login.
  Dominios vivos: previar-efeype.vercel.app y previar-rust.vercel.app (alias de produccion).

- [x] G4 Fallo de login deja mensaje claro en la app, no el JSON crudo de Supabase.
  CHECK: click real en el boton de produccion, lectura del DOM
  EVIDENCE: toast "El ingreso con Google no está habilitado todavía. / Falta activar el proveedor
  Google en Supabase. Escribinos y lo destrabamos.", url sigue en /login (no navega al JSON).

- [x] G5 Build y typecheck pasan.
  EVIDENCE: `npx tsc --noEmit` sin salida; `npm run build` genera las 9 rutas sin errores.

- [x] G6 Cambios deployados a produccion y verificados en el sitio vivo.
  EVIDENCE: verificado sobre https://previar-efeype.vercel.app/login (ver G4). Commit e0e3c63.

- [ ] G7 Google OAuth habilitado en Supabase y login end-to-end funcionando.
  CHECK: curl -s -o /dev/null -w '%{http_code}' "https://vwuscszboqavuvbmffmz.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fpreviar-efeype.vercel.app%2Fauth%2Fcallback"
  EXPECT: 302
  EVIDENCE: pending
  ABANDON: G7 requiere crear un OAuth Client en Google Cloud y pegar client_id/secret en el dashboard
  de Supabase. Son credenciales: no las manipulo yo. Pasos exactos entregados a Franco; la verificacion
  (el CHECK de arriba) la corro apenas los cargue.
