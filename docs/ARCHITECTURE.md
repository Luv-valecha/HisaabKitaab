# Architecture

HisaabKitaab is one Next.js (App Router) application containing the UI **and** the REST API, backed by PostgreSQL. No separate backend repo.

```
Browser (React UI)                         app/(app)/*, components/*
   ↓ hooks/useApi, useAuth                 (loading / error / empty states live here)
API client  lib/api/client.js              (only place that calls fetch)
   ↓ HTTP + JSON, httpOnly cookie
Route handlers  app/api/**/route.js        parse + validate (zod) → call a service → shape response
   ↓
Services  services/*.js                    business rules, authorization, orchestration, notifications
   ↓
Repositories  repositories/*.js            all SQL (parameterised); returns rows
   ↓
PostgreSQL  database/migrations/*.sql
```
Pure logic with **no** framework/DB imports lives in `lib/calculations`, `lib/settlements`, `themes/` - unit-tested and shared by browser and server
(the expense form's live preview uses the very same `computeSplits` as the API).

## Folder map
| Path | Contents |
|---|---|
| `app/(auth)` | login, register |
| `app/(app)` | authenticated pages: dashboard, groups, expenses, friends, settlements, budget, analytics, themes, profile, notifications |
| `app/api` | REST route handlers (thin) |
| `components/` | `ui`/`common` primitives, `themes` (loaders, art, provider), `analytics` charts, `groups`, `expenses` |
| `hooks/` | `useApi`, `useAuth`, `usePalette` |
| `services/`, `repositories/` | business + data layers |
| `lib/auth` | JWT/cookie helpers · `lib/api` handler wrapper, errors, client · `lib/validation` zod schemas · `lib/db` pool/transactions |
| `lib/calculations`, `lib/settlements` | money, splits, balances, recurrence, debt simplification |
| `themes/registry.js`, `styles/` | theme data → generated CSS, effects, transitions |
| `database/` | migrations (and `schema/`, `seed/` reserved; seeding is `scripts/seed.mjs`) |
| `scripts/` | migrate, seed, local-db, generators |
| `tests/` | unit tests (vitest) and API end-to-end test |

`models/` and `types/` from the suggested structure are intentionally empty: DTO mapping is done in services (`toUserDto`, `dto()` functions) and the project is plain JavaScript.

## Money
All amounts are **integer paise** (`BIGINT` in Postgres, `Number` in JS - safe up to ₹90 trillion). Users type rupees (`"19.99"`); `rupeesToPaise` parses the string
(no floats, max 2 decimals). Division uses the **largest-remainder method** (`allocate`): ₹100.00 ÷ 3 → 33.34 + 33.33 + 33.33, always summing exactly.
Percentages are stored/computed as basis points (50.00% = 5000). The API returns amounts in paise; the UI formats with `formatINR` (Indian digit grouping).

## Split types
| Type | Input | Validation |
|---|---|---|
| EQUAL | participant ids | at least one; duplicates ignored |
| EXACT | rupees per person | must sum to the total exactly |
| PERCENT | percent per person (≤ 2 decimals) | must sum to exactly 100.00 |
| SHARES | whole-number shares per person | integers ≥ 0, at least one > 0 |

The server additionally checks the payer and every participant are group members and the category is visible to the user.

## Balances are derived, never stored
For each group: `net(user) = Σ paid − Σ own share + Σ settlements paid − Σ settlements received`. Positive = is owed. Sum over members is always 0.
Editing or deleting an expense simply changes the source rows; the next read recomputes. There is no cached balance to drift.
- *Who owes whom* (`computePairwise`): per expense, each participant owes the payer their share; opposite directions between two people are netted; settlements pay debts down.
- *You owe / are owed / net* (dashboard): sums of negative / positive group nets over all your groups.
- Removing a member with a non-zero balance is refused so the ledger stays consistent.

## Settlement simplification (`lib/settlements/simplify.js`)
Greedy net-balance matching:
1. Compute each person's net balance. Drop zeros.
2. Repeatedly match the **largest debtor** with the **largest creditor**; transfer `min(debt, credit)`; at least one of them reaches zero.
3. Stop when nobody owes anything.

Result: at most *n − 1* payments for *n* people with non-zero balances. Example: A owes B ₹500, B owes C ₹500, C owes A ₹200 →
nets A −300, B 0, C +300 → **one payment: A pays C ₹300**. (The truly minimal set is NP-hard to find; greedy is the standard practical choice and is optimal in the common cases.)
Ties break by user id so output is deterministic. "Mark as paid" records a row in `settlements`; history is permanent (no delete endpoint).

## Direct (no-group) expenses
Expenses may have no group: split among friends you choose, using the same four split types. The server requires you to be involved and every other party to be *your* friend.
Friend balances are derived like group balances (never stored) and are included in the dashboard's *you owe / you are owed*. Your share still counts toward your personal budget exactly like a group share.

## Personal accounting - no double counting (Section 15)
Dinner ₹3,000, Luv pays, 3-way equal split:

| Concept | How it's computed | Value for Luv |
|---|---|---|
| **Personal spending** | his *own share* of each expense (`expense_splits.owed_paise`) + his personal transactions | ₹1,000 |
| **Total paid upfront** | Σ full amount of expenses he paid | ₹3,000 |
| **Paid for others / receivable** | upfront − own share on expenses he paid | ₹2,000 |
| **Owed to him / he owes** | positive / negative net balances | +₹2,000 |

Rules enforced in code (`repositories/spending.js`, `calculations/balances.js`):
- Budgets, monthly totals, category charts and "average daily" use **personal spending only** (own shares).
- Settlements and reimbursements are **transfers**: never income, never spending.
- Group expenses show up in the budget under the expense's category and date, even if someone else paid.
- `Income` is separate: declared monthly income (Budget page) or INCOME-type personal transactions.
This is covered by `tests/core.test.js` and an end-to-end check (a ₹3,000 shared dinner adds ₹1,000, not ₹3,000, to monthly spending).

## Authentication & security
- Passwords: bcrypt (cost 12); unknown-user logins still run a dummy compare (timing parity). Plain text is never stored or logged.
- Session: **JWT (HS256, 7 days)** in an **httpOnly, SameSite=Lax, Secure-in-production** cookie → JavaScript can't read it (XSS-resistant).
- CSRF: SameSite=Lax **plus** an Origin check on every non-GET request (cross-origin → 403). Same-origin deployment means no CORS configuration is needed or enabled.
- Authorization lives in services: group membership (`assertMember`; non-members get 404, not 403, to avoid leaking ids), owner-only actions,
  expense edit/delete only by creator/payer/owner, settlements only by a party to the payment, friends-only group invites, personal data always filtered by `user_id`.
- Validation: zod at the route boundary (types, formats, ranges) + domain validation in services (sums, membership) + DB `CHECK`/FK/unique constraints. SQL is parameterised.
- Errors use one shape (below); unexpected errors return a generic 500 and are logged server-side only.
- Secrets only via environment variables; `.env*` is git-ignored.
- **Not implemented:** login rate limiting, email verification, password reset, token revocation (logout clears the cookie; a copied token stays valid until it expires).

## Recurring expenses
`recurring_rules` stores schedule (`DAILY|WEEKLY|MONTHLY|YEARLY`), `start_date` (anchor), `next_run`, optional `end_date`, and for group rules a split template.
`runDue()` (called by `/api/cron/recurring`) loads due rules; for each one, in a transaction: lock the row (`FOR UPDATE`), generate **every** missed occurrence (capped at 400),
skip any that already exist, advance `next_run`, deactivate after `end_date`. Monthly rules keep their anchor day with month-end clamping (31st → 28th → 31st).
Idempotency is enforced twice: existence check and unique indexes on `(recurring_id, occurrence_date)`. A failing rule is paused and the owner is notified.

## Notifications
Rows in `notifications` (inbox). Created for: friend request/accept, added to group, expense added/updated (with "you owe X"), settlements, budget at 80% and 100%
(deduplicated per month+budget via `dedupe_key`), recurring failures. All creation goes through `lib/notifications/notify.js` - add email/push there later.
The UI polls the unread count every 60 s. Real-time/push/email are not implemented.

## Theme system
`themes/registry.js` is the single source of truth (14 entries). Each theme declares **tokens** (colours, fonts, radius, shadow, background gradients, card border),
a background **fx** id, **loader** id, page **transition** id, **empty-state art** id, and **nav** style. `scripts/gen-theme-css.mjs` turns tokens into `[data-theme="id"]` CSS variable blocks.
Tailwind utilities (`bg-card`, `text-accent`…) read those variables, so every component re-skins automatically. Adding a theme = one registry entry + `npm run themes:build`.
- Persistence: `localStorage` (instant, no flash - an inline script sets `data-theme` before paint) **and** `users.theme` in the database (restored on login from any device).
- Effects are CSS; loaders/art are original SVG. Animations run only on ≥768px screens and are disabled by `prefers-reduced-motion`. Transitions are one-shot clip-path/opacity animations.
- No copyrighted artwork ships. Optional art: see ASSETS_REQUIRED.md. Sound effects are **not** implemented.

## PWA
`app/manifest.js`, icons in `public/icons`, `public/sw.js` (install-only, no caching, never serves stale money data), registered in production by `components/common/Pwa.js`
which also exposes the "Install" button (Profile page). Theme colour meta tag follows the active theme.

## API conventions
Success: `{ "data": … }`. Failure: `{ "error": { "code", "message", "details?" } }` with 400/401/403/404/409/500. See API_DOCUMENTATION.md.
