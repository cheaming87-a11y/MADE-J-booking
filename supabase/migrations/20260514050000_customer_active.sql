alter table public.customers
add column if not exists is_active boolean not null default true;

grant select, insert, update on public.customers to authenticated;
