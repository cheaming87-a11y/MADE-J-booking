create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_unique_phone
on public.customers (phone)
where phone is not null and phone <> '';

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  duration_minutes integer not null check (duration_minutes > 0),
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

insert into public.services (name, duration_minutes, sort_order)
values
  ('네일', 120, 10),
  ('패디', 60, 20),
  ('네일+패디', 180, 30),
  ('보수', 30, 40),
  ('제거', 30, 50)
on conflict (name) do nothing;

alter table public.bookings
add column if not exists customer_id uuid references public.customers(id),
add column if not exists service_id uuid references public.services(id),
add column if not exists service_name text,
add column if not exists duration_minutes integer not null default 60,
add column if not exists end_time time;

alter table public.customers enable row level security;
alter table public.services enable row level security;

drop policy if exists "Admins can manage customers" on public.customers;
create policy "Admins can manage customers"
on public.customers
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Admins can read services" on public.services;
create policy "Admins can read services"
on public.services
for select
to authenticated
using (true);

grant select, insert, update on public.customers to authenticated;
grant select on public.services to authenticated;
