CREATE TABLE IF NOT EXISTS wxpay_order_attempts (
  trade_no text NOT NULL,
  order_id text NOT NULL REFERENCES product_orders(order_id) ON DELETE CASCADE,
  amount_fen bigint NOT NULL,
  created_at bigint NOT NULL,
  transaction_id text,
  paid_at bigint,
  PRIMARY KEY (trade_no, order_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS wxpay_order_attempts_order_idx ON wxpay_order_attempts(order_id);
--> statement-breakpoint
INSERT INTO wxpay_order_attempts (trade_no, order_id, amount_fen, created_at, transaction_id, paid_at)
SELECT wxpay_trade_no, order_id, round(greatest(coalesce(amount, 0), 0) * 100)::bigint,
       coalesce(purchased_at, (extract(epoch from now()) * 1000)::bigint),
       CASE WHEN lower(btrim(coalesce(payment_status, ''))) = 'paid' THEN wxpay_transaction_id END,
       CASE WHEN lower(btrim(coalesce(payment_status, ''))) = 'paid' THEN paid_at END
FROM product_orders WHERE coalesce(wxpay_trade_no, '') <> ''
ON CONFLICT DO NOTHING;
