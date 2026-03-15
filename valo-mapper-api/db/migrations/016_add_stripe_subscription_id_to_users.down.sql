DROP INDEX IF EXISTS users_stripe_subscription_id_unique_idx;

ALTER TABLE users DROP COLUMN stripe_subscription_id;
