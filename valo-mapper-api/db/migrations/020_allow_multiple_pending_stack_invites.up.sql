ALTER TABLE stack_members
    DROP CONSTRAINT IF EXISTS stack_members_unique_member,
    DROP CONSTRAINT IF EXISTS stack_members_unique_pair;

-- A user can only be an active member of one stack at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_stack_members_unique_active_member
    ON stack_members (member_user_id)
    WHERE status = 'active';

-- Prevent duplicate pending invites from the same owner to the same member.
CREATE UNIQUE INDEX IF NOT EXISTS idx_stack_members_unique_pending_pair
    ON stack_members (owner_user_id, member_user_id)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_stack_members_member_status_invited_at
    ON stack_members (member_user_id, status, invited_at DESC);
