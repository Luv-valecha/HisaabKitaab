-- Allow expenses and settlements that belong to NO group (split directly between friends).
ALTER TABLE expenses    ALTER COLUMN group_id DROP NOT NULL;
ALTER TABLE settlements ALTER COLUMN group_id DROP NOT NULL;

CREATE INDEX expenses_direct_paid_idx    ON expenses (paid_by) WHERE group_id IS NULL;
CREATE INDEX settlements_direct_idx      ON settlements (from_user, to_user) WHERE group_id IS NULL;
