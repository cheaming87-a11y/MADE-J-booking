alter table public.bookings
drop constraint if exists bookings_status_check;

alter table public.bookings
add constraint bookings_status_check
check (status in ('confirmed', 'cancelled', 'completed'));

drop policy if exists "Admins can update bookings" on public.bookings;

create policy "Admins can update bookings"
on public.bookings
for update
to authenticated
using (true)
with check (status in ('confirmed', 'cancelled', 'completed'));

grant update, delete on public.bookings to authenticated;
