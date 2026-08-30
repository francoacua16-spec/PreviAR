# GATES — arreglar "Entrar con Google" (provider not enabled)

- [ ] G1 Diagnostico confirmado: el provider google esta deshabilitado en el proyecto Supabase.
  CHECK: curl -s https://vwuscszboqavuvbmffmz.supabase.co/auth/v1/settings -H "apikey: $ANON" | python3 -c "import sys,json;print(json.load(sys.stdin)['external']['google'])"
  EXPECT: contiene True o False (lectura real, no supuesto)
  EVIDENCE: pending

- [ ] G2 El codigo de login/callback no tiene bugs propios que rompan el flujo una vez habilitado el provider.
  EVIDENCE: pending

- [ ] G3 Los dominios de produccion reales estan alineados (NEXT_PUBLIC_APP_URL, redirect URLs, callback de Supabase).
  EVIDENCE: pending

- [ ] G4 Fallo de login deja mensaje claro en la app, no el JSON crudo de Supabase.
  CHECK: grep -c "provider is not enabled\|no esta habilitado" components/login-button.tsx
  EXPECT: >= 1
  EVIDENCE: pending

- [ ] G5 Build y typecheck pasan.
  CHECK: npx tsc --noEmit && NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npm run build 2>&1 | tail -2
  EXPECT: Compiled successfully / sin errores de tipos
  EVIDENCE: pending

- [ ] G6 Cambios deployados a produccion y verificados en el sitio vivo.
  EVIDENCE: pending

- [ ] G7 Google OAuth habilitado en Supabase y login end-to-end funcionando.
  CHECK: curl -s -o /dev/null -w '%{http_code}' "https://vwuscszboqavuvbmffmz.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fpreviar-efeype.vercel.app%2Fauth%2Fcallback"
  EXPECT: 302
  EVIDENCE: pending
