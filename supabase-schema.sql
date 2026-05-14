create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_date date not null,
  booking_time time not null,
  end_time time,
  customer_id uuid,
  service_id uuid,
  service_name text,
  duration_minutes integer not null default 60,
  customer_name text not null,
  phone text not null,
  note text,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now()
);

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

create unique index if not exists bookings_unique_confirmed_slot
on public.bookings (booking_date, booking_time)
where status = 'confirmed';

alter table public.bookings enable row level security;
alter table public.customers enable row level security;
alter table public.services enable row level security;

create or replace view public.booked_slots as
select booking_date, booking_time
from public.bookings
where status = 'confirmed';

drop policy if exists "Anyone can create bookings" on public.bookings;
create policy "Admins can create bookings"
on public.bookings
for insert
to authenticated
with check (status = 'confirmed');

drop policy if exists "Admins can read bookings" on public.bookings;
create policy "Admins can read bookings"
on public.bookings
for select
to authenticated
using (true);

drop policy if exists "Admins can update bookings" on public.bookings;
create policy "Admins can update bookings"
on public.bookings
for update
to authenticated
using (true)
with check (status in ('confirmed', 'cancelled', 'completed'));

drop policy if exists "Admins can delete bookings" on public.bookings;
create policy "Admins can delete bookings"
on public.bookings
for delete
to authenticated
using (true);

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

revoke all on public.bookings from anon;
revoke all on public.booked_slots from anon;
grant select on public.booked_slots to authenticated;
grant insert, select, update, delete on public.bookings to authenticated;
grant select, insert, update on public.customers to authenticated;
grant select on public.services to authenticated;
