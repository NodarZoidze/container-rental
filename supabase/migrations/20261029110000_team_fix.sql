-- Registration fix: the app saves the company with an upsert (INSERT … ON CONFLICT DO UPDATE),
-- and Postgres also checks the SELECT policy against the new row. A new owner has no company yet,
-- so cr_company_of() is null — the owner must also be able to read a row they own directly.
drop policy "company read" on public.cr_companies;
create policy "company read" on public.cr_companies for select to authenticated
  using (owner_id = (select auth.uid()) or owner_id = (select public.cr_company_of()));
