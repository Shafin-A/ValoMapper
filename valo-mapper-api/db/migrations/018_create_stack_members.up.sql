CREATE TABLE stack_members (
    id              SERIAL PRIMARY KEY,
    owner_user_id   INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_user_id  INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'active')),
    invited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    joined_at       TIMESTAMPTZ,
    -- A user may only belong to one stack at a time
    CONSTRAINT stack_members_unique_member UNIQUE (member_user_id),
    -- The same owner/member pair can only appear once
    CONSTRAINT stack_members_unique_pair   UNIQUE (owner_user_id, member_user_id)
);

CREATE INDEX idx_stack_members_owner_user_id  ON stack_members (owner_user_id);
CREATE INDEX idx_stack_members_member_user_id ON stack_members (member_user_id);
