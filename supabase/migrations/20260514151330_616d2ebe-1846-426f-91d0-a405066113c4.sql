
-- Role enum
do $$ begin
  create type public.app_role as enum ('admin','user');
exception when duplicate_object then null; end $$;

-- Roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

alter table public.user_roles enable row level security;

-- has_role helper (security definer to avoid RLS recursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Policies
drop policy if exists "users view own roles" on public.user_roles;
create policy "users view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "admins view all roles" on public.user_roles;
create policy "admins view all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(),'admin'));

drop policy if exists "admins insert roles" on public.user_roles;
create policy "admins insert roles" on public.user_roles
  for insert to authenticated with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "admins update roles" on public.user_roles;
create policy "admins update roles" on public.user_roles
  for update to authenticated using (public.has_role(auth.uid(),'admin'));

drop policy if exists "admins delete roles" on public.user_roles;
create policy "admins delete roles" on public.user_roles
  for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- Seed built-in Admin user
do $$
declare
  admin_id uuid;
begin
  select id into admin_id from auth.users where email = 'admin@voicers.local';

  if admin_id is null then
    admin_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) values (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated','authenticated',
      'admin@voicers.local',
      crypt('Admin@voice.2026', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"Admin"}'::jsonb,
      false
    );

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), admin_id,
      jsonb_build_object('sub', admin_id::text, 'email','admin@voicers.local'),
      'email', 'admin@voicers.local',
      now(), now(), now()
    );
  end if;

  insert into public.user_roles (user_id, role)
  values (admin_id, 'admin')
  on conflict do nothing;
end $$;
