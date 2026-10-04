-- Tighten the existing monetary checks so PostgreSQL NUMERIC NaN is rejected.
ALTER TABLE "foods" DROP CONSTRAINT "foods_price_positive";
ALTER TABLE "foods"
  ADD CONSTRAINT "foods_price_positive"
  CHECK ("price" > 0 AND "price" <> 'NaN'::numeric);

ALTER TABLE "orders" DROP CONSTRAINT "orders_total_nonnegative";
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_total_nonnegative"
  CHECK ("total" >= 0 AND "total" <> 'NaN'::numeric);

ALTER TABLE "order_items" DROP CONSTRAINT "order_items_unit_price_nonnegative";
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_unit_price_nonnegative"
  CHECK ("unit_price_snapshot" >= 0 AND "unit_price_snapshot" <> 'NaN'::numeric);

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_line_total_nonnegative"
  CHECK ("line_total" >= 0 AND "line_total" <> 'NaN'::numeric);
