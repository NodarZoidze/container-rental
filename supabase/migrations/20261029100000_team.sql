-- Team members: the business owner adds employees (email + password).
-- Employees read and write their company's data; only the owner edits the company
-- (profile, prices), manages the team and deletes records (trip cancellation).

create table public.cr_members (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  company_owner_id uuid not null references public.cr_companies (owner_id) on delete cascade,
  name             text not null check (length(trim(name)) > 0),
  email            text not null,
  role             text not null default 'staff' check (role in ('staff')),
  created_at       timestamptz not null default now()
);
create index cr_members_company on public.cr_members (company_owner_id);

-- The company the signed-in user belongs to: their own (owner) or their employer's (staff).
create or replace function public.cr_company_of() returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select c.owner_id from public.cr_companies c where c.owner_id = (select auth.uid())),
    (select m.company_owner_id from public.cr_members m where m.user_id = (select auth.uid()))
  );
$$;
revoke all on function public.cr_company_of() from public, anon;
grant execute on function public.cr_company_of() to authenticated;

-- companies: whole team can read; only the owner writes; staff cannot open a company of their own
drop policy "own company" on public.cr_companies;
create policy "company read"   on public.cr_companies for select to authenticated
  using (owner_id = (select public.cr_company_of()));
create policy "company insert" on public.cr_companies for insert to authenticated
  with check (owner_id = (select auth.uid())
              and not exists (select 1 from public.cr_members m where m.user_id = (select auth.uid())));
create policy "company update" on public.cr_companies for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "company delete" on public.cr_companies for delete to authenticated
  using (owner_id = (select auth.uid()));

-- data tables: team reads / inserts / updates within the company; only the owner deletes
drop policy "own clients"    on public.cr_clients;
drop policy "own containers" on public.cr_containers;
drop policy "own trips"      on public.cr_trips;
drop policy "own payments"   on public.cr_payments;

create policy "team read"    on public.cr_clients for select to authenticated using (owner_id = (select public.cr_company_of()));
create policy "team insert"  on public.cr_clients for insert to authenticated with check (owner_id = (select public.cr_company_of()));
create policy "team update"  on public.cr_clients for update to authenticated using (owner_id = (select public.cr_company_of())) with check (owner_id = (select public.cr_company_of()));
create policy "owner delete" on public.cr_clients for delete to authenticated using (owner_id = (select auth.uid()));

create policy "team read"    on public.cr_containers for select to authenticated using (owner_id = (select public.cr_company_of()));
create policy "team insert"  on public.cr_containers for insert to authenticated with check (owner_id = (select public.cr_company_of()));
create policy "team update"  on public.cr_containers for update to authenticated using (owner_id = (select public.cr_company_of())) with check (owner_id = (select public.cr_company_of()));
create policy "owner delete" on public.cr_containers for delete to authenticated using (owner_id = (select auth.uid()));

create policy "team read"    on public.cr_trips for select to authenticated using (owner_id = (select public.cr_company_of()));
create policy "team insert"  on public.cr_trips for insert to authenticated with check (owner_id = (select public.cr_company_of()));
create policy "team update"  on public.cr_trips for update to authenticated using (owner_id = (select public.cr_company_of())) with check (owner_id = (select public.cr_company_of()));
create policy "owner delete" on public.cr_trips for delete to authenticated using (owner_id = (select auth.uid()));

create policy "team read"    on public.cr_payments for select to authenticated using (owner_id = (select public.cr_company_of()));
create policy "team insert"  on public.cr_payments for insert to authenticated with check (owner_id = (select public.cr_company_of()));
create policy "team update"  on public.cr_payments for update to authenticated using (owner_id = (select public.cr_company_of())) with check (owner_id = (select public.cr_company_of()));
create policy "owner delete" on public.cr_payments for delete to authenticated using (owner_id = (select auth.uid()));

-- members: the owner sees the team, an employee sees their own row; writes go through the cr-team function
alter table public.cr_members enable row level security;
create policy "members read" on public.cr_members for select to authenticated
  using (company_owner_id = (select auth.uid()) or user_id = (select auth.uid()));
revoke all on public.cr_members from anon;
grant select on public.cr_members to authenticated;
