# HisaabKitaab

A Splitwise-style expense-sharing web app **plus** a personal budget tracker, with 14 fully-skinned themes (Light, Dark, 8 Marvel, 4 DC).
Built as a full-stack college project: **Next.js (App Router) · React · JavaScript · Tailwind CSS · PostgreSQL**. Installable as an app (PWA). Free-tier deployable.

## What it does
- **Accounts:** register / login / logout (bcrypt + JWT in an httpOnly cookie).
- **Friends:** search by unique username, send / accept / reject / remove. See each friend's balance and settle up with them directly.
- **Groups:** create, edit, delete, add friends, remove members, per-group expenses, balances, settle-up and history.
- **Expenses - three ways to add one:** *Just me* (personal, no split), *With friends* (pick friends directly, no group needed), or *In a group*. Splits can be equal, exact-amount, percentage or shares; edit and delete; exact-to-the-paisa arithmetic (integer paise, largest-remainder rounding).
- **Balances:** *you owe / you are owed / net* and *who owes whom*, always **derived from the data**, never hard-coded or cached.
- **Settle up:** simplified payment plan (greedy debt minimisation) + permanent settlement history.
- **Budget tracker:** personal income/expenses, categories, monthly budgets (budget / spent / remaining / % used), recurring expenses.
- **No double counting:** a ₹3,000 dinner you paid for 3 people adds **₹1,000** to your spending; ₹2,000 is tracked as money owed to you.
- **Analytics:** category donut, 6-month trend, budget vs actual, income vs expenses, MoM change, average daily spend, largest expenses; shared analytics for groups.
- **Notifications:** in-app inbox (expenses, "you owe", settlements, 80%/100% budget alerts).
- **Themes:** gallery with live previews; each theme changes colours, fonts, shapes, background effect, loader, page transition and empty-state art; saved per account.
- **PWA:** install from Chrome/Edge/Android or "Add to Home Screen" on iOS. (No offline mode, by design.)

## Quick start (details in docs/LOCAL_SETUP.md)
```bash
npm install
cp .env.example .env.local        # Windows: copy .env.example .env.local   - then set JWT_SECRET and CRON_SECRET
npm run db:local                  # terminal 2: zero-install Postgres (or use your own and edit DATABASE_URL)
npm run db:migrate && npm run db:seed
npm run dev                       # http://localhost:3000   login: alice / Password123!
```

## Documentation
| File | Contents |
|---|---|
| [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md) | Fresh-Windows install, env vars, DB options, commands, troubleshooting |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Free deployment on Vercel + Neon, cron, env vars, getting your HTTPS URL, free-tier table |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, money model, balance + simplification algorithms, accounting rules, security, themes, PWA |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema, ER diagram, constraints, cascades |
| [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Every endpoint with request/response/errors |
| [docs/ASSETS_REQUIRED.md](docs/ASSETS_REQUIRED.md) | Optional artwork list with exact filenames/sizes |

## Tech choices (all free)
Next.js 16 · React 19 · Tailwind 4 · `pg` (plain SQL, repository layer) · zod · bcryptjs · jose (JWT) · Recharts · Vitest. Hosting: Vercel Hobby. Database: Neon Free.

## Testing & what has actually been verified
- `npm test` - 18 unit tests: money parsing/rounding, all four split types, balances, pairwise debts, settle-up, personal-accounting rule, recurrence maths.
- `npm run test:e2e` - 57 API checks against a real PostgreSQL: auth, CSRF, friend flow, group authorization, all split types and their validation errors, edit/delete recalculation, settle-up and history,
  no-double-counting, budget alerts (deduplicated), analytics, **recurring idempotency (re-running creates nothing)**, theme persistence across login.
- `npm run build` and `npm run lint` pass; the manifest, service worker, icons and iOS meta tags are served correctly.

**Not verified (please test on your side):** the UI has not been viewed in a real browser or on real phones (layout, theme animations, chart rendering, install prompts are built to spec but unseen);
the Windows setup steps and the Vercel/Neon deployment were not executed; performance of animations on low-end devices is unmeasured.

## Known limitations
- Group balances are **per group** and balances with a friend (expenses split without a group) are kept separate; there is no netting between the two.
- A direct (no-group) expense can only involve people who are *your* friends, so two of your friends who aren't friends with each other don't see a balance between themselves.
- Editing an expense shows an even split or exact amounts - the original percent/share inputs aren't stored, only the resulting amounts.
- A recorded settlement may exceed what's owed (it creates a reverse balance); settlements can't be deleted (history is permanent).
- Settle-up uses greedy simplification: never more than n−1 payments, but not guaranteed to be the absolute minimum.
- No password reset, email verification, login rate-limiting or token revocation (logout clears the cookie only).
- Notifications are in-app only (polled every 60 s); no email/push. No sound effects. Currency is INR only.
- Vercel Hobby cron runs once a day (within an hour window); Neon free compute sleeps after 5 idle minutes (first request is slower).
- Optional superhero artwork is not included (copyright) - themes use original CSS/SVG effects. See docs/ASSETS_REQUIRED.md.
- Users with group history can't be hard-deleted (no account-deletion feature).
