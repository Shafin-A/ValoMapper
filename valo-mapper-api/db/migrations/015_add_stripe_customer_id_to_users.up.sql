ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;

CREATE UNIQUE INDEX users_stripe_customer_id_unique_idx
ON users (stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;
