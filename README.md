# Pixels Community Board

Community idea board za Pixels Online: svako može da predloži ideju i glasa,
tim vidi šta zajednica najviše želi. **Čitanje je otvoreno za sve.** Za
glasanje/predlaganje treba login (Discord ili email) — jedan nalog, jedan glas
po ideji, pa brojevi stvarno nešto znače.

Stack: React (Vite) + Supabase (Postgres, RLS, Discord + email auth) + Vercel.
Isti stack kao Trade Journal — sve ti je poznato.

## Deploy — korak po korak

### 1. Supabase projekat
1. supabase.com → New project (ime: `pixels-board`, region: EU)
2. SQL Editor → New query → nalepi ceo `supabase-setup.sql` → Run
   (pravi tabele, RLS, trigger i ubacuje 16 seed predloga iz chata)
3. Project Settings → API → (Legacy) `anon` `public` key + Data API → `Project URL`

### 2. Login provajderi (Authentication → Providers)
- **Email** — uključen po defaultu, magic link radi odmah.
  Napomena: Supabase ugrađeni mejl je limitiran na ~2 mejla/sat i samo za dev.
  Za javni rast postaviti custom SMTP (Resend/SendGrid) — podiže limit i brendira
  pošiljaoca. Izmena email šablona ionako zahteva custom SMTP.
- **Discord** — glavni put za Pixels zajednicu (nema mejl limit):
  1. discord.com/developers → New Application → `Pixels Community Board`
  2. OAuth2 → prepiši Client ID i Client Secret
  3. Supabase → Providers → Discord → Enable, nalepi ID+Secret → Save
  4. Kopiraj Callback URL koji Supabase prikaže → Discord OAuth2 → Redirects → Add
  5. Supabase → Authentication → URL Configuration:
     - Site URL = tvoj Vercel domen (bez ovoga login vraća na localhost!)
     - Redirect URLs → dodaj `https://<vercel-domen>/**`

### 3. RLS zakrpa (OBAVEZNO za integritet)
SQL Editor → nalepi `supabase-rls-patch.sql` → Run.
Zatvara anon upis kroz API — samo ulogovani mogu da glasaju/predlažu, i to
vezano za svoj `auth.uid()`. (Već ugrađeno u `supabase-setup.sql` za sveže setupe;
zakrpa je za baze napravljene ranijom verzijom.)

### 4. Lokalno pokretanje (opciono)
```bash
npm install
# napravi .env fajl:
#   VITE_SUPABASE_URL=https://<projekat>.supabase.co
#   VITE_SUPABASE_ANON_KEY=<anon key>
npm run dev
```

### 5. Vercel
1. Push u GitHub repo
2. vercel.com → Add New Project → izaberi repo (Vite preset, ništa ne diraj)
3. Environment Variables: dodaj `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`
4. Deploy

### 6. Postavi sebe za admina (za menjanje statusa predloga)
1. Uloguj se na sajt (Discord ili email) bar jednom
2. Supabase → Authentication → Users → kopiraj svoj User UID
3. SQL Editor: `insert into app_admins (user_id) values ('<tvoj-uuid>');`
4. Refresh sajta — pored svakog predloga dobijaš dropdown za status

## Kako radi glasanje
- **Čitanje:** otvoreno za sve, bez logina.
- **Glasanje/predlaganje:** traži login (Discord ili email magic link). Glas je
  vezan za `auth.uid()`, a `unique (suggestion_id, voter_key)` sprečava duplo
  glasanje. Jedan nalog = jedan glas po ideji.
- RLS (`insert ... to authenticated with check ...`) sprečava zaobilaženje kroz
  API — anon key ne može da ubaci glas ni predlog.

## Ideje za sledeće verzije
- Komentari na predloge
- "Team response" polje na predlogu
- Custom SMTP (Resend) za brendirani email + veći limit
- Obaveštenje u Discord kanal kad predlog pređe N glasova (webhook)
