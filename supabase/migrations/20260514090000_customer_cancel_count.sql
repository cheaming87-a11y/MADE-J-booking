alter table public.customers
add column if not exists cancel_count integer not null default 0;
