-- =====================================================================
-- Pixels Community Board — Supabase setup
-- Pokreni ceo fajl u Supabase SQL editoru (Dashboard > SQL Editor > New query)
-- =====================================================================

-- ---------- TABELE ----------

create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) between 8 and 120),
  description text check (char_length(description) <= 2000),
  category text not null default 'other'
    check (category in ('qol','content','economy','bug','other')),
  status text not null default 'new'
    check (status in ('new','considering','planned','done','declined')),
  author_name text not null default 'Anonymous farmer',
  author_id uuid references auth.users(id),
  votes_count integer not null default 0
);

create table if not exists votes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  suggestion_id uuid not null references suggestions(id) on delete cascade,
  voter_key text not null,          -- anon: browser UUID; logged in: user id
  is_verified boolean not null default false,
  unique (suggestion_id, voter_key)
);

create table if not exists app_admins (
  user_id uuid primary key references auth.users(id)
);

-- ---------- TRIGGER: održava votes_count ----------

create or replace function bump_votes() returns trigger
language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update suggestions set votes_count = votes_count + 1 where id = new.suggestion_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update suggestions set votes_count = greatest(votes_count - 1, 0) where id = old.suggestion_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists trg_bump_votes on votes;
create trigger trg_bump_votes
  after insert or delete on votes
  for each row execute function bump_votes();

-- ---------- RLS ----------

alter table suggestions enable row level security;
alter table votes enable row level security;
alter table app_admins enable row level security;

-- svi (i anonimni) mogu da čitaju
create policy "read suggestions" on suggestions for select using (true);
create policy "read votes" on votes for select using (true);
create policy "read admins" on app_admins for select using (true);

-- svi mogu da dodaju predlog (constrainti na tabeli ograničavaju sadržaj)
create policy "insert suggestions" on suggestions for insert with check (true);

-- svi mogu da glasaju (unique constraint sprečava duplo glasanje po ključu)
create policy "insert votes" on votes for insert with check (true);

-- samo admin menja status (i ništa drugo ne može da se menja spolja)
create policy "admin update suggestions" on suggestions for update
  using (exists (select 1 from app_admins where user_id = auth.uid()))
  with check (exists (select 1 from app_admins where user_id = auth.uid()));

-- ---------- SEED: predlozi iz land-owner chata (jul 2026) ----------

insert into suggestions (title, description, category, author_name) values
('Permanent Infiniportable as a chase item',
 'A permanent (non-breaking) Infiniportable would be a huge QoL for everyone, including F2P. The item already exists in-game — make the permanent version a chase item in events/MS instead of leaving boots nobody buys on the market.',
 'qol', 'RGPixels & Kirin'),
('Batch crafting for T5 cooking recipes',
 'T5 cooking has no batch option — each food is 2h+. Even a 6x batch (12-18h) would matter for players pushing cooking to level 100. Could also work as a T6 VIP utility.',
 'qol', 'ChuckFresco & RGPixels'),
('Portals between your own farms',
 'If you own 2+ farms, a direct portal between them. Multi-land owners travel constantly; this is a natural multi-land bonus.',
 'qol', 'Brad C³'),
('Direct teleport into your land''s house',
 'Small QoL: teleport straight into the house on your land instead of walking in every time.',
 'qol', 'Bud Spencer'),
('Release more potion tables (limited batch)',
 'Potion tables were carnival prizes, supply unknown (~140?), price ~590k and rising. Only early players benefit. Release a small controlled batch via gacha/competition/MS so newer players can participate without tanking existing owners.',
 'economy', 'Dynamic Warrior & Nenzy'),
('New Merchant Ship rewards — controlled animal batches',
 'MS needs new rewards or players hoard buoy bucks like Neon Zone (600 players hold 10k+, 20 hold 500k+). Suggested: small controlled batches (20-25) of dragons/ducks/goats/pigs — NOT a mass release that tanks values like CH2 pets.',
 'economy', 'GebesTurtle, Kirin & Jocca'),
('Adjust T4 baby animal drop rates for current DAU',
 'T4 babies are so rare that recipes depending on them are unaffordable. Rates were tuned for a bigger player base — revisit them for current DAU.',
 'economy', 'ChuckFresco'),
('Remove banned accounts'' items from lands',
 'Banned botters just move their land to a fresh account and keep benefiting. Removing banned accounts'' items/benefits from lands would make bans actually matter.',
 'economy', 'mixyero'),
('Ensure Stacked offer tasks can actually appear',
 'Some Stacked offers require tasks (e.g. T5 turn-ins) that never appear on the taskboard no matter how many tasks you submit. A blocker should be about skill/resources, not about the system never giving you the task.',
 'bug', 'nozomi & pOrenji'),
('Pet battles with limited fights per pet',
 'Pet battle mode where each pet can only battle X times — creates a reason to own multiple pets without hurting genesis utility.',
 'content', 'RGPixels'),
('Pets that assist while farming',
 'Give pets a small active role during farming. Increases pet usefulness, helps the pet economy, and makes long farming sessions less of a grind.',
 'content', 'Bud Spencer'),
('Composter as a new chase item',
 'Composters already exist in-game and players want more — a natural chase item candidate for events or MS.',
 'content', 'RGPixels'),
('Equip two pets at high level',
 'Allow dual pets for high-level players (e.g. 600+). A prestige perk that also drives demand for pets.',
 'content', 'Brad C³'),
('Fix the winery loop before adding new content',
 'Winery content was devalued after players invested heavily in it. Fix that loop (e.g. wine demand in MS contracts, goose bar turn-ins) before releasing more content on top.',
 'economy', 'Kirin & RGPixels'),
('Goose bar: turn in wines for surprise rewards',
 'Let players bring wines to Goose for surprise items. Creates real wine demand and a social hub — the bar is empty now.',
 'content', 'mixyero'),
('Communicate staking rewards & community treasury status',
 'In-game pixel staking rewards are a month late and there''s zero news about the community treasury. Even a short monthly status update would rebuild trust.',
 'economy', 'Golf');
