update public.services
set is_active = false
where name in ('상담', '기본 시술', '프리미엄 시술', '관리');

insert into public.services (name, duration_minutes, sort_order)
values
  ('네일', 120, 10),
  ('패디', 60, 20),
  ('네일+패디', 180, 30),
  ('보수', 30, 40),
  ('제거', 30, 50)
on conflict (name) do update
set duration_minutes = excluded.duration_minutes,
    sort_order = excluded.sort_order,
    is_active = true;
