DROP INDEX IF EXISTS idx_stack_members_member_status_invited_at;
DROP INDEX IF EXISTS idx_stack_members_unique_pending_pair;
DROP INDEX IF EXISTS idx_stack_members_unique_active_member;

ALTER TABLE stack_members
    ADD CONSTRAINT stack_members_unique_member UNIQUE (member_user_id),
    ADD CONSTRAINT stack_members_unique_pair UNIQUE (owner_user_id, member_user_id);
