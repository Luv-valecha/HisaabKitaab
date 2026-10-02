-- HisaabKitaab initial schema. All money is stored as integer paise (BIGINT).

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL,
  email         TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  theme         TEXT NOT NULL DEFAULT 'light',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_username_format CHECK (username ~ '^[a-z0-9_]{3,20}$')
);
CREATE UNIQUE INDEX users_username_uq ON users (username);
CREATE UNIQUE INDEX users_email_uq ON users (lower(email));

-- One row per unordered pair. user_a < user_b prevents duplicates (A-B and B-A).
CREATE TABLE friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT friendships_order CHECK (user_a < user_b),
  CONSTRAINT friendships_requester CHECK (requester_id IN (user_a, user_b)),
  UNIQUE (user_a, user_b)
);
CREATE INDEX friendships_b_idx ON friendships (user_b);

CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  description TEXT,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER','MEMBER')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX group_members_user_idx ON group_members (user_id);

-- user_id NULL = system category visible to everyone.
CREATE TABLE categories (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  kind    TEXT NOT NULL DEFAULT 'EXPENSE' CHECK (kind IN ('EXPENSE','INCOME'))
);
CREATE UNIQUE INDEX categories_system_uq ON categories (lower(name), kind) WHERE user_id IS NULL;
CREATE UNIQUE INDEX categories_user_uq ON categories (user_id, lower(name), kind) WHERE user_id IS NOT NULL;

-- Recurring rules generate either personal transactions or group expenses.
CREATE TABLE recurring_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target      TEXT NOT NULL CHECK (target IN ('PERSONAL','GROUP')),
  frequency   TEXT NOT NULL CHECK (frequency IN ('DAILY','WEEKLY','MONTHLY','YEARLY')),
  start_date  DATE NOT NULL,        -- anchor for month-end clamping (e.g. the 31st)
  next_run    DATE NOT NULL,
  end_date    DATE,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT NOT NULL,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  split_template JSONB,             -- for GROUP rules: {type, ...input for computeSplits}
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recurring_group_needs_group CHECK (target <> 'GROUP' OR (group_id IS NOT NULL AND split_template IS NOT NULL))
);
CREATE INDEX recurring_due_idx ON recurring_rules (next_run) WHERE active;

CREATE TABLE expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  paid_by       UUID NOT NULL REFERENCES users(id),
  created_by    UUID NOT NULL REFERENCES users(id),
  amount_paise  BIGINT NOT NULL CHECK (amount_paise > 0),
  description   TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 120),
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  expense_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  split_type    TEXT NOT NULL CHECK (split_type IN ('EQUAL','EXACT','PERCENT','SHARES')),
  recurring_id  UUID REFERENCES recurring_rules(id) ON DELETE SET NULL,
  occurrence_date DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX expenses_group_idx ON expenses (group_id, expense_date DESC);
-- Idempotent recurring generation: one expense per rule per occurrence.
CREATE UNIQUE INDEX expenses_recurring_uq ON expenses (recurring_id, occurrence_date) WHERE recurring_id IS NOT NULL;

CREATE TABLE expense_splits (
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id),
  owed_paise BIGINT NOT NULL CHECK (owed_paise >= 0),
  PRIMARY KEY (expense_id, user_id)
);
CREATE INDEX expense_splits_user_idx ON expense_splits (user_id);

-- Settlements are history; balances are derived from expenses + settlements.
CREATE TABLE settlements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_user    UUID NOT NULL REFERENCES users(id),
  to_user      UUID NOT NULL REFERENCES users(id),
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  note         TEXT,
  settled_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID NOT NULL REFERENCES users(id),
  CONSTRAINT settlements_distinct CHECK (from_user <> to_user)
);
CREATE INDEX settlements_group_idx ON settlements (group_id, settled_at DESC);

CREATE TABLE personal_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL DEFAULT 'EXPENSE' CHECK (kind IN ('EXPENSE','INCOME')),
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  description  TEXT NOT NULL,
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  txn_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  recurring_id UUID REFERENCES recurring_rules(id) ON DELETE SET NULL,
  occurrence_date DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX personal_txn_user_date_idx ON personal_transactions (user_id, txn_date DESC);
CREATE UNIQUE INDEX personal_txn_recurring_uq ON personal_transactions (recurring_id, occurrence_date) WHERE recurring_id IS NOT NULL;

-- month = first day of month. category_id NULL = overall monthly budget.
CREATE TABLE budgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month       DATE NOT NULL CHECK (date_trunc('month', month) = month),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  limit_paise BIGINT NOT NULL CHECK (limit_paise >= 0)
);
CREATE UNIQUE INDEX budgets_cat_uq ON budgets (user_id, month, category_id) WHERE category_id IS NOT NULL;
CREATE UNIQUE INDEX budgets_total_uq ON budgets (user_id, month) WHERE category_id IS NULL;

CREATE TABLE monthly_income (
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month        DATE NOT NULL CHECK (date_trunc('month', month) = month),
  income_paise BIGINT NOT NULL CHECK (income_paise >= 0),
  PRIMARY KEY (user_id, month)
);

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  data       JSONB NOT NULL DEFAULT '{}',
  dedupe_key TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);
CREATE UNIQUE INDEX notifications_dedupe_uq ON notifications (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

INSERT INTO categories (name, kind) VALUES
  ('Food','EXPENSE'),('Shopping','EXPENSE'),('Transport','EXPENSE'),('Entertainment','EXPENSE'),
  ('Bills','EXPENSE'),('Education','EXPENSE'),('Healthcare','EXPENSE'),('Rent','EXPENSE'),
  ('Travel','EXPENSE'),('Groceries','EXPENSE'),('Other','EXPENSE'),
  ('Salary','INCOME'),('Allowance','INCOME'),('Other income','INCOME');
