# Pixels Community Board — backlog (feature ideje)

Ideje za sledeće verzije. Nije obavezujuće; prioritet po trakciji.

## Zatraženo od zajednice
- **Dual voting po Discord roli** (zatražio Zozul | Casper, land-owners, 11.7.).
  Prikaz po predlogu: koliko glasova od **land-ownera** vs **običnih igrača**.
  Izvodljivo: Discord OAuth scope `guilds.members.read` → pročitati role
  ulogovanog korisnika na Pixels serveru → `is_owner` flag na glasu → UI podela.
  Trud: ~par sati. Radi samo za Discord login (ne za email). Traži malo veći
  OAuth pristanak.

## Marko ideje
- **Chat sa strane na sajtu** (11.7.). Live chat pored boarda.
  Izvodljivo preko Supabase Realtime (`messages` tabela + realtime subscribe),
  login-gated (isti Discord auth). Glavno za isplanirati: moderacija/spam, i da
  li skreće fokus sa „voting board" ka mini-forumu. Za razmatranje kad board uzme maha.

## Ranije zabeleženo (tehnički dug / QoL)
- Nick za email korisnike (sad ispadnu „Anonymous farmer").
- Admin brisanje duplikata/spama (sad samo status).
- Un-vote (poništavanje glasa).
- Custom domen (ako zatreba veći kredibilitet / bypass filtera).
