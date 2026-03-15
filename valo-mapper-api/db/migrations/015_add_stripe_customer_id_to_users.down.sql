DROP INDEX IF EXISTS users_stripe_customer_id_unique_idx;

ALTER TABLE users DROP COLUMN stripe_customer_id;
