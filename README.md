# Pixels Community Board

Community idea board za Pixels Online: svako može da predloži ideju i glasa,
tim vidi šta zajednica najviše želi. Anonimno glasanje radi odmah; Discord
login je opcion (predlog tada nosi tvoj Discord nick).

Stack: React (Vite) + Supabase (Postgres, RLS, Discord OAuth) + Vercel.
Isti stack kao Trade Journal — sve ti je poznato.

## Deploy — korak po korak (~30 min)

### 1. Supabase projekat
1. supabase.com → New project (ime: `pixels-board`, region: EU)
2. SQL Editor → New query → nalepi ceo `supabase-setup.sql` → Run
   (pravi tabele, RLS, trigger i ubacuje 16 seed predloga iz chata)
3. Project Settings → API → prepiši `Project URL` i `anon public` key

### 2. Discord OAuth (opciono, može i kasnije)
1. discord.com/developers → New Application → `Pixels Community Board`
2. OAuth2 → prepiši Client ID i Client Secret
3. U Supabase: Authentication → Providers → Discord → Enable, nalepi ID+Secret
4. U Discord OAuth2 → Redirects dodaj URL koji ti Supabase prikaže
   (`https://<projekat>.supabase.co/auth/v1/callback`)
5. U Supabase: Authentication → URL Configuration → Site URL = tvoj Vercel domen
   (bez ovoga te login posle Discorda vraća na localhost!)

### 3. Lokalno pokretanje
```bash
npm install
# napravi .env fajl:
#   VITE_SUPABASE_URL=https://<projekat>.supabase.co
#   VITE_SUPABASE_ANON_KEY=<anon key>
npm run dev
```

### 4. Vercel
1. Push u GitHub repo (možeš kroz GitHub web UI: novi repo → upload fajlova)
2. vercel.com → Add New Project → izaberi repo (Vite preset, ništa ne diraj)
3. Environment Variables: dodaj `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`
4. Deploy

### 5. Postavi sebe za admina (za menjanje statusa predloga)
1. Uloguj se na sajt kroz Discord (bar jednom)
2. Supabase → Authentication → Users → kopiraj svoj user UUID
3. SQL Editor: `insert into app_admins (user_id) values ('<tvoj-uuid>');`
4. Refresh sajta — pored svakog predloga dobijaš dropdown za status

## Kako radi glasanje
- Anonimni: browser dobija UUID u localStorage; unique constraint u bazi
  sprečava duplo glasanje iz istog browsera. Nije neprobojno (inkognito),
  ali je dovoljno dok board ne poraste — tada uključiti obavezan login.
- Ulogovani: glas vezan za Discord nalog (`is_verified = true` u bazi),
  pa kasnije možeš da prikažeš "X verified votes" ako zatreba.

## Ideje za sledeće verzije
- Komentari na predloge
- "Team response" polje na predlogu
- Filter "posted by verified Discord users"
- Obaveštenje u Discord kanal kad predlog pređe N glasova (webhook)
