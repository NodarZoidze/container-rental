-- Container rental app: schema + row-level security.
-- Tables use the cr_ prefix so they can live alongside another app in the same Supabase project.
-- Every row belongs to the signed-in owner (auth.uid()); owners only ever see their own data.

create table public.cr_companies (
  owner_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  form        text not null default 'შპს',
  code        text,
  phone       text,
  city        text,
  owner_name  text,
  provider    text,
  email       text,
  logo        text,                       -- small data-URL image (≤256 px, resized in the browser)
  prices      jsonb not null default '{}'::jsonb,   -- { "<volume m³>": price ₾ } for delivery & swap
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.cr_clients (
  id          uuid primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  seq         bigint generated always as identity,
  name        text not null check (length(trim(name)) > 0),
  kind        text not null default 'company' check (kind in ('company', 'person')),
  code        text,
  phone       text,
  address     text,
  created_at  timestamptz not null default now(),
  unique (owner_id, id)
);

create table public.cr_containers (
  id          uuid primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  seq         bigint generated always as identity,
  code        text not null,
  vol         numeric(6, 2) not null check (vol > 0),
  added       date not null default current_date,
  created_at  timestamptz not null default now(),
  unique (owner_id, code)
);

create table public.cr_trips (
  id          uuid primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  seq         bigint generated always as identity,
  date        date not null,
  type        text not null check (type in ('deliver', 'pickup', 'swap')),
  client_id   uuid not null,
  cont        text not null,
  new_cont    text,
  address     text,
  driver      text,
  price       numeric(12, 2) not null default 0 check (price >= 0),
  created_at  timestamptz not null default now(),
  unique (owner_id, id),
  foreign key (owner_id, client_id) references public.cr_clients (owner_id, id) on delete restrict
);

create table public.cr_payments (
  id          uuid primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  seq         bigint generated always as identity,
  date        date not null,
  client_id   uuid not null,
  amount      numeric(12, 2) not null check (amount > 0),
  method      text not null check (method in ('cash', 'bank')),
  trip_id     uuid,
  trip_ids    uuid[],
  created_at  timestamptz not null default now(),
  foreign key (owner_id, client_id) references public.cr_clients (owner_id, id) on delete restrict,
  foreign key (owner_id, trip_id) references public.cr_trips (owner_id, id) on delete set null (trip_id)
);

create index cr_clients_owner_seq    on public.cr_clients (owner_id, seq);
create index cr_containers_owner_seq on public.cr_containers (owner_id, seq);
create index cr_trips_owner_seq      on public.cr_trips (owner_id, seq);
create index cr_trips_owner_date     on public.cr_trips (owner_id, date);
create index cr_trips_client         on public.cr_trips (owner_id, client_id);
create index cr_payments_owner_seq   on public.cr_payments (owner_id, seq);
create index cr_payments_owner_date  on public.cr_payments (owner_id, date);
create index cr_payments_client      on public.cr_payments (owner_id, client_id);
create index cr_payments_trip        on public.cr_payments (owner_id, trip_id);

-- keep companies.updated_at fresh
create or replace function public.cr_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger cr_companies_touch before update on public.cr_companies
  for each row execute function public.cr_touch_updated_at();

-- Row-level security: owner-only access on every table
alter table public.cr_companies  enable row level security;
alter table public.cr_clients    enable row level security;
alter table public.cr_containers enable row level security;
alter table public.cr_trips      enable row level security;
alter table public.cr_payments   enable row level security;

create policy "own company"    on public.cr_companies  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "own clients"    on public.cr_clients    for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "own containers" on public.cr_containers for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "own trips"      on public.cr_trips      for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "own payments"   on public.cr_payments   for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

revoke all on public.cr_companies, public.cr_clients, public.cr_containers, public.cr_trips, public.cr_payments from anon;
grant select, insert, update, delete on public.cr_companies, public.cr_clients, public.cr_containers, public.cr_trips, public.cr_payments to authenticated;
