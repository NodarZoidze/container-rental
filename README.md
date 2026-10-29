# კონტეინერის რეისები

კონტეინერების გაქირავების მართვის მობაილ ვებ-აპლიკაცია: რეისები (მიტანა / შეცვლა / გატანა), კლიენტები, ჩარიცხვები, ასაღები ვალები, შემოსავლები და კონტეინერების ინვენტარი.

- **Frontend:** Vite + React (პროტოტიპის თარგი `src/app/template.html`, ლოგიკა `src/app/logic.js`)
- **Backend:** Supabase (Postgres + Auth, Row Level Security — თითო მფლობელი მხოლოდ საკუთარ მონაცემებს ხედავს)
- **Hosting:** Vercel (GitHub-თან მიბმული, ყოველი push ავტომატურად იტვირთება)

## სტრუქტურა

```
src/
  app/template.html     ეკრანების მარკაპი
  app/logic.js          ბიზნეს-ლოგიკა (ლეჯერი, ვალები, კონტეინერების ჯაჭვი, ფორმები)
  runtime/dc.js         თარგის რენდერერი React-ზე ({{ }}, sc-if, sc-for)
  lib/supabase.js       Supabase კლიენტი
  lib/data.js           მონაცემების ჩატვირთვა
  lib/sync.js           ცვლილებების შენახვა (upsert / delete)
  lib/mapping.js        ობიექტი ⇄ ცხრილის სტრიქონი
  main.js               ავტორიზაცია და აპლიკაციის გაშვება
supabase/migrations/    ბაზის სქემა და RLS წესები
```

## ლოკალურად გაშვება

```bash
npm install
cp .env.example .env      # ჩაწერეთ VITE_SUPABASE_URL და VITE_SUPABASE_ANON_KEY
npm run dev
```

`.env`-ის გარეშე ან მისამართზე `?demo` აპლიკაცია დემო მონაცემებით ჩაირთვება (არაფერი ინახება).

## Supabase

1. SQL Editor-ში გაუშვით `supabase/migrations/20261029000000_init.sql`.
2. **Authentication → URL Configuration:** Site URL = საიტის მისამართი (მაგ. `https://container-rental.vercel.app`), Redirect URLs-ში დაამატეთ იგივე მისამართი და `http://localhost:5173`.
3. **Authentication → Providers:**
   - Email — ჩართულია ნაგულისხმევად (შესვლა ბმულით).
   - Google — საჭიროა Google Cloud-ის OAuth Client ID / Secret; Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
   - Apple — საჭიროა Apple Developer-ის Service ID, Key ID, Team ID და private key.

## Vercel

Environment Variables (Production + Preview):

| სახელი | მნიშვნელობა |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → publishable / anon key |

Build: `npm run build`, Output: `dist` (იხ. `vercel.json`).
