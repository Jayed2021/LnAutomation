/*
  # Reset Collection Data Only

  ## What this does
  Resets only the financial settlement fields (collected_amount, delivery_charge) on
  order_courier_info rows that were set via invoice uploads.

  ## Changes
  1. Sets `collected_amount = 0` and `delivery_charge = 0` on all order_courier_info rows
     where settlement_source = 'invoice_upload'
  2. Clears the `settlement_source` field back to NULL on those rows
  3. Resets payment_status back to 'unpaid' on orders where payment was set by invoice upload
     (orders in delivered/cad statuses that are currently marked paid AND have a courier_info
     with settlement_source = 'invoice_upload')
  4. Deletes all collection_line_items rows
  5. Deletes all collection_records rows

  ## What is NOT touched
  - tracking_number, consignment_id, courier_company
  - cs_status on orders
  - Any other fields on orders or order_courier_info
*/

UPDATE order_courier_info
SET
  collected_amount = 0,
  delivery_charge = 0,
  settlement_source = NULL,
  updated_at = now()
WHERE settlement_source = 'invoice_upload';

UPDATE orders
SET
  payment_status = 'unpaid',
  updated_at = now()
WHERE payment_status = 'paid'
  AND cs_status IN ('delivered', 'cancelled_cad', 'exchange', 'exchange_returnable', 'partial_delivery')
  AND id IN (
    SELECT order_id FROM order_courier_info
    WHERE settlement_source IS NULL
      AND collected_amount = 0
      AND delivery_charge = 0
      AND updated_at >= now() - interval '1 minute'
  );

DELETE FROM collection_line_items;

DELETE FROM collection_records;
