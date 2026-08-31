-- ════════════════════════════════════════════════════════════════
-- PREVIAR · Migración 0002: perfil básico (nombre, foto, verificación)
-- Ejecutar EN ORDEN en: Supabase Dashboard → SQL Editor → New query
-- Idempotente (se puede correr de nuevo sin romper nada).
-- ════════════════════════════════════════════════════════════════

-- ───────────────────────── 1. COLUMNAS ─────────────────────────

alter table public.users
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists verified boolean not null default false,
  add column if not exists didit_session_id text;

-- El usuario puede editar su propio nombre y foto (no su verificación:
-- eso solo lo toca el webhook de Didit vía service_role).
grant update (display_name, avatar_url) on public.users to authenticated;

-- ───────────────────────── 2. STORAGE: bucket de avatares ───────
-- Público de lectura (foto de perfil visible para todos), pero cada
-- usuario solo puede escribir dentro de su propia carpeta `<uid>/...`.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
