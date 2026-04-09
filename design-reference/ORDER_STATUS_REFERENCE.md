# Order Status Reference

This document describes every status value used across the three status dimensions of an order.

---

## 1. CS Status (`orders.cs_status`)

Managed by the customer service team. Reflects the overall lifecycle state of an order from a business perspective.

### New / Unconfirmed

| Value | Meaning |
|---|---|
| `new_not_called` | Order received but the customer has not yet been contacted. Default status for new orders. |
| `new_called` | Customer has been called at least once but the order is not yet confirmed or scheduled. |
| `awaiting_payment` | Order is on hold, waiting for the customer to complete an advance payment before it is processed. |

### In Warehouse (Fulfillment Pipeline)

| Value | Meaning |
|---|---|
| `not_printed` | Order confirmed and entered the fulfillment pipeline. Invoice has not been printed yet. |
| `printed` | Invoice has been printed. Order is on the picking floor. |
| `packed` | All items have been picked and the parcel is packed. Ready to hand to the courier. |
| `send_to_lab` | Order contains prescription lenses and has been sent to the optical lab for processing. |
| `in_lab` | Order is currently being processed inside the optical lab. |

### Shipped / Delivered

| Value | Meaning |
|---|---|
| `shipped` | Parcel has been handed to the courier. Tracking number assigned. |
| `delivered` | Courier confirmed successful delivery to the customer. Terminal state — payment should be collected in full. |
| `partial_delivery` | Courier delivered only part of the order (e.g. one of two items). A follow-up shipment may be needed. |
| `late_delivery` | Shipment is overdue. Delivery date has passed without confirmation. Scheduled for follow-up. |

### Cancellation / Post-Delivery

| Value | Meaning |
|---|---|
| `cancelled` | Order was cancelled before shipment. No courier action taken. |
| `cancelled_cad` | Cancelled After Dispatch. The parcel was shipped but not delivered — the courier is returning it. Only the delivery charge was collected. |
| `cancelled_cbd` | Cancelled Before Dispatch. The order was confirmed and entered fulfillment but cancelled before being handed to the courier. |
| `refund` | A refund has been issued to the customer after delivery or partial delivery. |
| `exchange` | Customer is exchanging the delivered item. A replacement shipment is being prepared. |
| `exchange_returnable` | Exchange in progress where the original item must be physically returned to the warehouse before the replacement is dispatched. |

---

## 2. Fulfillment Status (`orders.fulfillment_status`)

Managed by warehouse operations. Tracks the physical state of the parcel within the warehouse. This is a tighter, operations-focused sub-status that runs in parallel with `cs_status` during the fulfillment pipeline.

| Value | Meaning |
|---|---|
| `not_printed` | Order is confirmed but the packing slip / invoice has not been printed yet. |
| `printed` | Packing slip has been printed. Items are being picked from the warehouse shelves. |
| `packed` | All items picked and parcel packed. Waiting for courier handoff. `packed_at` timestamp is recorded. |
| `send_to_lab` | Parcel contains prescription items and has been routed to the lab queue. |
| `in_lab` | Parcel is physically inside the optical lab being processed. |
| `shipped` | Parcel has been picked up by the courier. `shipped_at` timestamp is recorded. |

> **Note:** `fulfillment_status` is `NULL` for orders that have not yet entered the warehouse pipeline (e.g. still in `new_not_called` or `awaiting_payment`).

---

## 3. Courier Status (`order_courier_info.courier_status`)

Reported by the courier company (primarily Pathao) via webhooks or API sync. Reflects the real-time physical location and state of the parcel in the courier network.

### Pre-Transit

| Value | Meaning |
|---|---|
| `Pending` | Courier order created, awaiting pickup scheduling. |
| `Pickup Requested` | Pickup has been requested from the warehouse. |
| `Assigned For Pickup` | A courier agent has been assigned to collect the parcel. |
| `Pickup` | Parcel has been physically picked up from the warehouse. |
| `Pickup Failed` | Courier agent attempted pickup but was unsuccessful. |
| `Pickup Cancel` / `Pickup Cancelled` | The pickup request was cancelled. |

### In Transit

| Value | Meaning |
|---|---|
| `At Sorting Hub` / `At the Sorting Hub` | Parcel has arrived at a regional sorting hub. |
| `On the Way To Delivery Hub` | Parcel is in transit from sorting hub to the local delivery hub. |
| `At Delivery Hub` | Parcel has arrived at the local delivery hub, closest to the customer. |
| `In Transit` | Parcel is moving between facilities in the courier network. |
| `Assigned For Delivery` / `Assigned for Delivery` | A delivery agent has been assigned. Parcel is out for delivery. |
| `On Hold` | Delivery is paused — customer unreachable, address issue, or other hold reason. |

### Final States

| Value | Meaning |
|---|---|
| `Delivered` | Courier successfully delivered the parcel to the customer. |
| `Partial Delivered` / `Partial Delivery` | Only part of the order was delivered. |
| `Late Delivery` | Delivery is overdue according to the courier's SLA. |
| `Return` | Parcel is on its way back to the warehouse (not yet received). |
| `Returned` | Parcel has been received back at the warehouse. |
| `Paid Return` | Return completed and the courier has settled the delivery charge on the invoice. This is the settlement event that triggers the CAD payment resolution. |
| `Exchange` | Courier has flagged this consignment as an exchange transaction. |
| `Cancelled` | The courier consignment was cancelled in the courier system. |

---

## Status Relationships

```
CS Status (business)         Fulfillment Status (ops)      Courier Status (courier)
─────────────────────────────────────────────────────────────────────────────────────
new_not_called               NULL                          —
new_called                   NULL                          —
awaiting_payment             NULL                          —
not_printed                  not_printed                   —
printed                      printed                       —
packed                       packed                        —
send_to_lab                  send_to_lab                   —
in_lab                       in_lab                        —
shipped                      shipped                       Pickup → In Transit → ...
delivered                    shipped                       Delivered
partial_delivery             shipped                       Partial Delivered
late_delivery                shipped                       Late Delivery
cancelled_cad                shipped                       Return → Returned → Paid Return
cancelled_cbd                packed or earlier             —
cancelled                    NULL or not_printed           —
exchange                     shipped                       Exchange / Delivered
exchange_returnable          shipped                       Return → Returned
refund                       shipped                       Delivered (post-delivery)
```

---

## Cancellation Types (`orders.cancellation_type`)

Applies only to cancelled orders. Distinguishes how far the order progressed before cancellation.

| Value | Meaning |
|---|---|
| `cad` | Cancelled After Dispatch. Parcel was shipped but returned. Delivery charge applies. |
| `cbd` | Cancelled Before Dispatch. Cancelled inside the warehouse before courier handoff. No delivery charge. |
