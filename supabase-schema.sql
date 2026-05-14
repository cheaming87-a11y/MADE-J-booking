create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_date date not null,
  booking_time time not null,
  customer_name text not null,
  phone text not null,
  note text,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create unique index if not exists bookings_unique_confirmed_slot
on public.bookings (booking_date, booking_time)
where status = 'confirmed';

alter table public.bookings enable row level security;

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
with check (status in ('confirmed', 'cancelled'));

revoke all on public.bookings from anon;
revoke all on public.booked_slots from anon;
grant select on public.booked_slots to authenticated;
grant insert, select, update on public.bookings to authenticated;
