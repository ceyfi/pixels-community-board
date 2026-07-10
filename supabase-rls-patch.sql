-- =====================================================================
-- Pixels Community Board — RLS zakrpa: login OBAVEZAN za glasanje/predlaganje
-- Pokreni u Supabase SQL editoru NAD postojećom bazom (posle supabase-setup.sql).
-- Cilj: samo ulogovani (Discord ili email) mogu da glasaju/predlažu, i to
-- vezano za SVOJ identitet — anon key preko API-ja više ne može da ubacuje.
-- =====================================================================

-- --- VOTES: samo authenticated, voter_key mora biti = auth.uid() ---
drop policy if exists "insert votes" on votes;
create policy "insert votes (authenticated)" on votes
  for insert to authenticated
  with check (voter_key = auth.uid()::text);

-- --- SUGGESTIONS: samo authenticated, author_id mora biti = auth.uid() ---
drop policy if exists "insert suggestions" on suggestions;
create policy "insert suggestions (authenticated)" on suggestions
  for insert to authenticated
  with check (author_id = auth.uid());

-- --- Očisti test/anon glasove iz faze testiranja (opciono, ali preporučeno) ---
-- Uklanja glasove koji nisu vezani za nalog; trigger sam smanji votes_count.
delete from votes where is_verified = false;

-- Provera posle pokretanja:
--   select policyname, cmd, roles from pg_policies where tablename in ('votes','suggestions');
--   select count(*) from votes;   -- treba 0 posle čišćenja
