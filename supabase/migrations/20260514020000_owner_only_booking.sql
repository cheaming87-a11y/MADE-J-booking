drop policy if exists "Anyone can create bookings" on public.bookings;
drop policy if exists "Admins can create bookings" on public.bookings;

create policy "Admins can create bookings"
on public.bookings
for insert
to authenticated
with check (status = 'confirmed');

revoke all on public.bookings from anon;
revoke all on public.booked_slots from anon;
grant select on public.booked_slots to authenticated;
grant insert, select, update on public.bookings to authenticated;
