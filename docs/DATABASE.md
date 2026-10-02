# Database (PostgreSQL)

Single migration: `database/migrations/001_init.sql`. IDs are UUIDs (`gen_random_uuid()`), money is `BIGINT` paise, timestamps are `TIMESTAMPTZ`, calendar dates are `DATE`.

## ER diagram
```mermaid
erDiagram
  users ||--o{ friendships : "user_a / user_b / requester"
  users ||--o{ group_members : joins
  groups ||--o{ group_members : has
  users ||--o{ groups : creates
  groups ||--o{ expenses : contains
  users ||--o{ expenses : "paid_by / created_by"
  expenses ||--|{ expense_splits : "split into"
  users ||--o{ expense_splits : owes
  groups ||--o{ settlements : records
  users ||--o{ settlements : "from_user / to_user"
  users ||--o{ personal_transactions : tracks
  users ||--o{ budgets : sets
  users ||--o{ monthly_income : declares
  users ||--o{ categories : "owns (custom)"
  categories ||--o{ expenses : classifies
  categories ||--o{ personal_transactions : classifies
  categories ||--o{ budgets : limits
  users ||--o{ recurring_rules : schedules
  recurring_rules ||--o{ expenses : generates
  recurring_rules ||--o{ personal_transactions : generates
  users ||--o{ notifications : receives

  users { uuid id PK  text username UK  text email UK  text display_name  text password_hash  text theme }
  friendships { uuid id PK  uuid user_a FK  uuid user_b FK  uuid requester_id FK  text status }
  groups { uuid id PK  text name  uuid created_by FK }
  group_members { uuid group_id PK_FK  uuid user_id PK_FK  text role }
  expenses { uuid id PK  uuid group_id FK  uuid paid_by FK  bigint amount_paise  text split_type  date expense_date  uuid recurring_id FK  date occurrence_date }
  expense_splits { uuid expense_id PK_FK  uuid user_id PK_FK  bigint owed_paise }
  settlements { uuid id PK  uuid group_id FK  uuid from_user FK  uuid to_user FK  bigint amount_paise  timestamptz settled_at }
  personal_transactions { uuid id PK  uuid user_id FK  text kind  bigint amount_paise  date txn_date  uuid recurring_id FK }
  budgets { uuid id PK  uuid user_id FK  date month  uuid category_id FK  bigint limit_paise }
  monthly_income { uuid user_id PK_FK  date month PK  bigint income_paise }
  categories { uuid id PK  uuid user_id FK  text name  text kind }
  recurring_rules { uuid id PK  uuid user_id FK  text target  text frequency  date start_date  date next_run  bigint amount_paise  jsonb split_template }
  notifications { uuid id PK  uuid user_id FK  text type  text message  text dedupe_key  timestamptz read_at }
```

## Tables
| Table | Purpose | Key constraints |
|---|---|---|
| `users` | accounts | `username` unique, must match `^[a-z0-9_]{3,20}$`; `lower(email)` unique; `theme` persisted here |
| `friendships` | friend requests **and** friendships, one row per pair | `CHECK user_a < user_b` + `UNIQUE(user_a,user_b)` ⇒ A→B and B→A can never both exist; `status` PENDING/ACCEPTED; `requester_id` ∈ pair |
| `groups` | expense groups | name 1-60 chars; creator FK |
| `group_members` | membership + role | PK `(group_id,user_id)`; role OWNER/MEMBER; cascade on group/user delete |
| `categories` | system (`user_id NULL`) + custom | unique name per scope & kind (partial unique indexes) |
| `expenses` | a bill in a group | `amount_paise > 0`; `split_type` enum check; unique `(recurring_id, occurrence_date)` where set |
| `expense_splits` | each person's share | PK `(expense_id,user_id)`; `owed_paise ≥ 0`; cascades with expense |
| `settlements` | immutable payment history | `amount > 0`; `from_user <> to_user`; no update/delete endpoints |
| `personal_transactions` | own income/expenses | `kind` EXPENSE/INCOME; unique `(recurring_id, occurrence_date)` |
| `budgets` | monthly limit per category (`category_id NULL` = overall) | `month` must be the 1st; partial unique indexes keep one row per (user, month, category) |
| `monthly_income` | declared income per month | PK `(user_id, month)` |
| `recurring_rules` | schedules | frequency enum; `CHECK` group rules have `group_id` + `split_template`; partial index on `next_run` for active rules |
| `notifications` | in-app inbox | unique `(user_id, dedupe_key)` where set → idempotent alerts |
| `schema_migrations` | created by the migration runner | applied file names |

## Group-less (direct) expenses - migration 002
`expenses.group_id` and `settlements.group_id` are **nullable**. A row with `group_id IS NULL` is a *direct* expense/settlement between friends. Rules are enforced in the service layer
(you are involved, others are your friends). Balance with a friend = Σ (their share of what you paid) − Σ (your share of what they paid) ± direct settlements (`lib/calculations/pairBalance.js`,
mirrored in SQL by `repositories/direct.js`). Partial indexes `expenses_direct_paid_idx` and `settlements_direct_idx` keep these lookups fast.

## Cascade rules
- Delete user → their memberships, friendships, categories, personal data, budgets, rules, notifications are removed. (Expenses/settlements they participated in reference `users` **without** cascade, so a user with group history can't be hard-deleted - there is no account-deletion feature yet.)
- Delete group → its members, expenses, splits, settlements and group recurring rules go too.
- Delete expense → its splits. Delete category → referencing expenses/transactions become uncategorised (`SET NULL`); budgets for that category are deleted.
- Delete recurring rule → generated expenses/transactions stay (`SET NULL`).

## Indexes
`friendships(user_b)`, `group_members(user_id)`, `expenses(group_id, expense_date DESC)`, `expense_splits(user_id)`, `settlements(group_id, settled_at DESC)`,
`personal_transactions(user_id, txn_date DESC)`, `notifications(user_id, created_at DESC)`, plus the unique/partial indexes above.

## Migrations
`npm run db:migrate` runs each `database/migrations/NNN_name.sql` once, in order, inside a transaction, and records it in `schema_migrations`. Add new files; never edit applied ones.
