# Deployment (100% free tier)

Architecture: **GitHub** (code) → **Vercel Hobby** (Next.js site + API + daily cron) → **Neon Free** (PostgreSQL).

## Free-tier services

Limits were checked against vendor docs/pricing pages in October 2026. Free tiers change - confirm on each vendor's pricing page before you rely on them.

| Service | Purpose | Free tier | Limitations that matter here |
|---|---|---|---|
| **GitHub** | Stores code; triggers deploys | Free for public & private repos | None relevant |
| **Vercel (Hobby)** | Hosts the website, REST API and cron; gives the HTTPS URL | $0, no expiry, no card, automatic HTTPS | **Non-commercial use only.** Cron limited to **once per day**, UTC, fired anywhere within the scheduled hour. 1 seat |
| **Neon (Free)** | Managed PostgreSQL | 0.5 GB storage and 100 compute-hours/month per project, no card | Compute **auto-suspends after 5 min idle** (first request after idle takes ~1 s longer). Compute stops if monthly allowance is exhausted |
| **cron-job.org** *(optional)* | Extra/more frequent scheduler | Free | Only if you want recurring jobs more than daily; not needed |

## Part 1 - Production database (Neon)
1. Go to <https://neon.com>, sign up (GitHub login works), **Create project** → name `hisaabkitaab`, choose a region near you (e.g. Singapore for India).
2. On the project dashboard click **Connect**. Copy the **connection string**. Prefer the **pooled** one (hostname contains `-pooler`).
   It looks like `postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require`. Treat it like a password.
3. Create the tables from your own computer (PowerShell, in the project folder):
   ```powershell
   $env:DATABASE_URL = "PASTE_THE_NEON_CONNECTION_STRING"
   $env:DATABASE_SSL = "true"
   npm run db:migrate
   ```
   Expect `apply 001_init.sql` / `Migrations up to date.` Future schema changes: add `database/migrations/002_*.sql`, run the same command.
4. **Do not run `db:seed` on production** (it creates public demo accounts with a known password).

## Part 2 - Put the code on GitHub
```powershell
git init
git add .
git commit -m "HisaabKitaab"
# create an empty repo on github.com first, then:
git remote add origin https://github.com/YOUR_NAME/hisaabkitaab.git
git branch -M main
git push -u origin main
```
`.gitignore` already excludes `.env*`, `node_modules`, `.next`, `.pgdata`. Confirm with `git status` that no `.env.local` is listed before pushing.

## Part 3 - Deploy on Vercel
1. <https://vercel.com/signup> → continue with GitHub (choose **Hobby**).
2. **Add New… → Project** → import your `hisaabkitaab` repo. Framework preset is auto-detected as Next.js. Don't change build settings.
3. Open **Environment Variables** and add (for *Production*, *Preview* optional):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string |
   | `DATABASE_SSL` | `true` |
   | `JWT_SECRET` | new random 32-byte hex (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). **Different from your local one** |
   | `CRON_SECRET` | another random hex. Vercel automatically sends it as `Authorization: Bearer …` on cron calls |
   | `APP_TIMEZONE` | `Asia/Kolkata` (optional) |

4. Click **Deploy**. After ~1-2 minutes you get a URL like `https://hisaabkitaab-xxxx.vercel.app`. That **is** your public HTTPS website.
   Find it later under *Project → Domains*. You can rename it in *Settings → Domains*.
5. **Verify**
   - Open `https://YOUR-URL/api/health` → `{"data":{"status":"ok"}}` (proves the database connection works).
   - Register an account on the site, add a friend/group/expense.
   - *Settings → Cron Jobs* should list `/api/cron/recurring` with schedule `30 0 * * *`.
6. Every `git push` to `main` redeploys automatically. Env var changes need a redeploy.

## Part 4 - Recurring expenses in production
- `vercel.json` registers a **daily** cron (`30 0 * * *` = 00:30 UTC ≈ 06:00 IST; Hobby may run it any time within that hour).
- Vercel calls `GET /api/cron/recurring` with `Authorization: Bearer $CRON_SECRET`; the route rejects anything else (401).
- **No one has to open the website.** Each run generates every occurrence that is due, including any missed days (catch-up), exactly once:
  rows are locked per rule, and a unique index on `(recurring_id, occurrence_date)` makes duplicates impossible even if Vercel delivers an event twice or you trigger it manually.
- Manual trigger (PowerShell): `Invoke-RestMethod https://YOUR-URL/api/cron/recurring -Headers @{Authorization="Bearer YOUR_CRON_SECRET"}`
- Want it more than daily? Use a free external scheduler (cron-job.org or a GitHub Actions `schedule:` workflow) to call the same URL with the same header.

## Installing the website as an app (PWA)
- **Android/Chrome & desktop Chrome/Edge:** open the URL → install icon in address bar / menu → *Install app*; or Profile → **Install HisaabKitaab**.
- **iPhone/iPad (Safari):** Share → **Add to Home Screen**.
- It is install-only: no offline mode (by design); the service worker never caches data.

## Rollbacks and maintenance
- Bad deploy: Vercel → *Deployments* → previous one → **Promote to Production** (does **not** roll back database migrations or the cron config).
- Back up data: Neon dashboard → Branches/Restore, or `pg_dump "$DATABASE_URL" > backup.sql`.

## Production checklist
- [ ] `JWT_SECRET` and `CRON_SECRET` are unique, random, and not committed anywhere
- [ ] `/api/health` is OK on the live URL
- [ ] Seed script was **not** run on production
- [ ] You tested register → create group → add expense → settle up on the live URL
