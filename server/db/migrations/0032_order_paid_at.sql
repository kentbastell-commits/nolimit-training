-- Keep payment completion separate from order creation. Old orders remain
-- unknown until a coach supplies a date; never fabricate historical payments.
ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS paid_at bigint;
