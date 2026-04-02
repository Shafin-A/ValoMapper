ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_trial_ends_at TIMESTAMPTZ;