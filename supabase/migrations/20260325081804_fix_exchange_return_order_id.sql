/*
  # Fix Exchange Return order_id References

  ## Summary
  Prior to this fix, the Exchange action in CsActionPanel was incorrectly setting
  `order_id` on the return record to the NEW exchange order's UUID instead of the
  OLD returnable order's UUID (the one being physically returned).

  The correct data model is:
  - `returns.order_id`       → the OLD order being returned (now EXR status)
  - `returns.exchange_order_id` → the NEW exchange order created for the customer

  ## What This Migration Does
  1. For any return records with reason = 'Exchange' where order_id points to an
     exchange-status order, corrects them by swapping order_id and exchange_order_id
     if exchange_order_id IS populated and points to the EXR order.
  2. Specifically: if a return has order_id pointing to an 'exchange' cs_status order
     and exchange_order_id pointing to an 'exchange_returnable' order, swap the two
     values so order_id = EXR order and exchange_order_id = exchange order.

  ## Notes
  - This is a safe, targeted update — it only touches records where the swap is
    clearly needed (both conditions satisfied simultaneously)
  - No data is deleted
*/

UPDATE returns r
SET
  order_id          = r.exchange_order_id,
  exchange_order_id = r.order_id
FROM orders o_current, orders o_exchange
WHERE r.return_reason = 'Exchange'
  AND r.exchange_order_id IS NOT NULL
  AND o_current.id = r.order_id
  AND o_exchange.id = r.exchange_order_id
  AND o_current.cs_status = 'exchange'
  AND o_exchange.cs_status = 'exchange_returnable';
