ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;

CREATE UNIQUE INDEX users_stripe_subscription_id_unique_idx
ON users (stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;
