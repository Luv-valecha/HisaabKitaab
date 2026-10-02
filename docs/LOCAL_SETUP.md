# Local setup (Windows first, then macOS/Linux notes)

You need: **Node.js 22.9 or newer**, **Git** (optional but recommended), and **a PostgreSQL database**.
Everything is driven from a terminal. These commands use **PowerShell** (Start menu → "PowerShell").

> Honesty note: the commands below were exercised on Linux. The Windows steps use standard tools but were not run on a Windows machine
> by the author. If something differs, the error message plus the "Troubleshooting" section should get you through.

## 1. Install the tools

### Node.js (includes npm)
Option A (installer): download the **LTS** build from <https://nodejs.org> and run it (accept defaults).
Option B (one line): `winget install OpenJS.NodeJS.LTS`

**Close and reopen PowerShell**, then verify:
```powershell
node --version    # must print v22.9.0 or higher (v22.x or v24.x is fine)
npm --version     # prints 10.x or higher
```

### Git (optional)
`winget install Git.Git`, reopen PowerShell, verify with `git --version`.

## 2. Get the project
```powershell
cd $HOME\Documents
# if you received a zip: right-click → Extract All, then:
cd hisaabkitaab
# or from Git:  git clone <your-repo-url> hisaabkitaab ; cd hisaabkitaab
npm install
```

## 3. Create your environment file
```powershell
copy .env.example .env.local
# generate two random secrets (run twice, paste one into JWT_SECRET and the other into CRON_SECRET)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
notepad .env.local
```
Fill in `JWT_SECRET` and `CRON_SECRET`. Leave `DATABASE_URL` as-is if you use Option A below.
`.env.local` is git-ignored: never commit it or share it.

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_SSL` | `false` locally, `true` for hosted databases (Neon etc.) |
| `JWT_SECRET` | Signs login cookies. 32+ random characters. Changing it logs everyone out |
| `CRON_SECRET` | Password protecting `/api/cron/recurring` |
| `APP_TIMEZONE` | Optional. Defaults to `Asia/Kolkata`; decides "today" and "this month" |

## 4. Database - pick ONE option

### Option A - zero-install local Postgres (easiest)
Open a **second** PowerShell window in the project folder and leave it running:
```powershell
npm run db:local
```
First start downloads PostgreSQL binaries through npm (~1-2 min) and prints
`PostgreSQL ready: postgres://hisaab:hisaab@localhost:5432/hisaabkitaab`. That is exactly the default `DATABASE_URL`.
Data persists in `.pgdata\`. Stop with Ctrl+C. (Dev convenience only - not for production.)

### Option B - install PostgreSQL normally
```powershell
winget install PostgreSQL.PostgreSQL.17      # or use the installer from https://www.postgresql.org/download/windows/
```
Remember the password you choose for the `postgres` user. Then (adjust the path to your version):
```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE hisaabkitaab;"
```
Edit `.env.local`: `DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/hisaabkitaab`

### Option C - a free cloud database
Create a Neon database (see DEPLOYMENT.md), paste its connection string into `DATABASE_URL` and set `DATABASE_SSL=true`.

## 5. Create tables and sample data
```powershell
npm run db:migrate    # creates all tables (safe to re-run)
npm run db:seed       # optional: demo users, groups, expenses, budgets
```
Seed logins (development only - public knowledge, never use these passwords for real):

| Username | Password |
|---|---|
| alice | `Password123!` |
| bob | `Password123!` |
| charlie | `Password123!` |
| david | `Password123!` |

Alice is friends with everyone and has two groups ("Goa Trip", "Flatmates"), shared expenses with all four split types, a settlement,
personal transactions, budgets and a recurring Netflix rule.

## 6. Run it
```powershell
npm run dev
```
Open <http://localhost:3000> and log in as `alice`.

## All commands
| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build (run `build` first) |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (money, splits, balances, settle-up, recurrence) |
| `npm run test:e2e` | API end-to-end test against a **running** server + migrated DB (`BASE_URL=http://localhost:3000`) |
| `npm run db:local` | Zero-install local PostgreSQL |
| `npm run db:migrate` | Apply `database/migrations/*.sql` |
| `npm run db:seed` | Load demo data (only if `alice` doesn't exist) |
| `npm run themes:build` | Regenerate `styles/themes.generated.css` after editing `themes/registry.js` |

## Test the PWA install locally
Service workers need HTTPS or `localhost`. Run `npm run build` then `npm run start`, open http://localhost:3000 in Chrome/Edge,
and look for the install icon in the address bar (or Profile → *Install HisaabKitaab*). The service worker is only registered in production builds.

## Test recurring expenses locally
```powershell
$h = @{ Authorization = "Bearer YOUR_CRON_SECRET" }
Invoke-RestMethod -Uri http://localhost:3000/api/cron/recurring -Headers $h
```
Run it twice: the second run reports `created: 0` (no duplicates).

## Troubleshooting
- **`node` not recognised** → close and reopen PowerShell after installing.
- **`ECONNREFUSED 127.0.0.1:5432`** → PostgreSQL isn't running (start `npm run db:local` or the Postgres service).
- **`JWT_SECRET must be set`** → you skipped step 3, or `.env.local` isn't in the project root.
- **`password authentication failed`** → wrong password in `DATABASE_URL`.
- **Port 3000 busy** → `npm run dev -- -p 3001`.
- **macOS/Linux** → same steps; use `cp .env.example .env.local`, and `brew install node postgresql` or your package manager.
