ALTER TABLE users
ADD COLUMN IF NOT EXISTS has_ever_personal_subscription BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users
SET has_ever_personal_subscription = TRUE
WHERE is_subscribed = TRUE
   OR stripe_subscription_id IS NOT NULL
   OR premium_trial_claimed_at IS NOT NULL
   OR subscription_trial_ends_at IS NOT NULL;