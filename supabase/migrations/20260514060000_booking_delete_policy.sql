drop policy if exists "Admins can delete bookings" on public.bookings;

create policy "Admins can delete bookings"
on public.bookings
for delete
to authenticated
using (true);

grant delete on public.bookings to authenticated;
