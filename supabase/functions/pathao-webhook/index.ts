import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EVENT_TO_STATUS: Record<string, string> = {
  "order.created": "Order Created",
  "order.updated": "Order Updated",
  "order.pickup-requested": "Pickup Requested",
  "order.assigned-for-pickup": "Assigned For Pickup",
  "order.picked": "Pickup",
  "order.pickup-failed": "Pickup Failed",
  "order.pickup-cancelled": "Pickup Cancelled",
  "order.at-the-sorting-hub": "At the Sorting Hub",
  "order.in-transit": "In Transit",
  "order.received-at-last-mile-hub": "Received at Last Mile Hub",
  "order.assigned-for-delivery": "Assigned for Delivery",
  "order.delivered": "Delivered",
  "order.partial-delivery": "Partial Delivery",
  "order.returned": "Return",
  "order.delivery-failed": "Delivery Failed",
  "order.on-hold": "On Hold",
  "order.paid": "Payment Invoice",
  "order.paid-return": "Paid Return",
  "order.exchanged": "Exchange",
};

const CS_STATUS_EVENTS: Record<string, string> = {
  "order.delivered": "delivered",
  "order.returned": "cancelled_cad",
  "order.delivery-failed": "cancelled_cad",
  "order.paid-return": "cancelled_cad",
  "order.exchanged": "exchange",
};

const COLLECTED_AMOUNT_EVENTS = new Set([
  "order.delivered",
  "order.partial-delivery",
  "order.paid-return",
  "order.exchanged",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: configRow, error: configError } = await supabase
      .from("courier_configs")
      .select("webhook_secret")
      .eq("courier_name", "pathao")
      .maybeSingle();

    if (configError || !configRow?.webhook_secret) {
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secret = configRow.webhook_secret;

    const responseHeaders = {
      ...corsHeaders,
      "Content-Type": "application/json",
      "X-Pathao-Merchant-Webhook-Integration-Secret": secret,
    };

    const incomingSignature = req.headers.get("X-PATHAO-Signature");
    if (!incomingSignature || incomingSignature !== secret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: responseHeaders }
      );
    }

    const body = await req.json();
    const event: string = body?.event ?? "";

    if (event === "webhook_integration") {
      return new Response(
        JSON.stringify({ status: 202, message: "Successfully accepted webhook_integration", data: null }),
        { status: 202, headers: responseHeaders }
      );
    }

    const consignmentId: string | null = body?.consignment_id ?? null;
    const courierStatus: string | null = EVENT_TO_STATUS[event] ?? null;

    if (!consignmentId) {
      return new Response(
        JSON.stringify({ status: 202, message: "No consignment_id, ignored", data: null }),
        { status: 202, headers: responseHeaders }
      );
    }

    const { data: courierInfo } = await supabase
      .from("order_courier_info")
      .select("id, order_id, payment_reference")
      .eq("consignment_id", consignmentId)
      .maybeSingle();

    if (!courierInfo) {
      return new Response(
        JSON.stringify({ status: 202, message: "Consignment not found, ignored", data: null }),
        { status: 202, headers: responseHeaders }
      );
    }

    const orderId: string = courierInfo.order_id;
    const now = new Date().toISOString();

    const courierInfoUpdate: Record<string, unknown> = {
      courier_api_response: body,
      courier_status_updated_at: now,
    };

    if (courierStatus) {
      courierInfoUpdate.courier_status = courierStatus;
    }

    if (COLLECTED_AMOUNT_EVENTS.has(event) && body?.collected_amount != null) {
      courierInfoUpdate.collected_amount = body.collected_amount;
    }

    await supabase
      .from("order_courier_info")
      .update(courierInfoUpdate)
      .eq("consignment_id", consignmentId);

    const activityLogs: { order_id: string; action: string }[] = [];

    if (courierStatus) {
      activityLogs.push({
        order_id: orderId,
        action: `Courier status updated to "${courierStatus}" via Pathao webhook (${event})`,
      });
    }

    const newCsStatus = CS_STATUS_EVENTS[event];
    if (newCsStatus) {
      await supabase
        .from("orders")
        .update({ cs_status: newCsStatus, updated_at: now })
        .eq("id", orderId);

      activityLogs.push({
        order_id: orderId,
        action: `CS status changed to "${newCsStatus}" via Pathao webhook (${event})`,
      });
    }

    const RETURN_EVENTS = new Set(["order.returned", "order.paid-return"]);
    if (RETURN_EVENTS.has(event)) {
      const { data: existingReturn } = await supabase
        .from("returns")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (!existingReturn) {
        const { data: orderRow } = await supabase
          .from("orders")
          .select("customer_id")
          .eq("id", orderId)
          .maybeSingle();

        if (orderRow?.customer_id) {
          const returnNumber = `RET-${Date.now()}`;
          const { data: newReturn } = await supabase
            .from("returns")
            .insert({
              return_number: returnNumber,
              order_id: orderId,
              customer_id: orderRow.customer_id,
              return_reason: "CAD",
              status: "expected",
            })
            .select("id")
            .single();

          if (newReturn) {
            const { data: orderItems } = await supabase
              .from("order_items")
              .select("id, product_id, sku, quantity")
              .eq("order_id", orderId);

            if (orderItems?.length) {
              await supabase.from("return_items").insert(
                orderItems.map((oi) => ({
                  return_id: newReturn.id,
                  order_item_id: oi.id,
                  product_id: oi.product_id,
                  sku: oi.sku,
                  quantity: oi.quantity,
                  qc_status: "pending",
                }))
              );
            }

            activityLogs.push({
              order_id: orderId,
              action: `Return ${returnNumber} auto-created via Pathao webhook (${event})`,
            });
          }
        }
      }
    }

    if (COLLECTED_AMOUNT_EVENTS.has(event) && body?.collected_amount != null) {
      activityLogs.push({
        order_id: orderId,
        action: `Collected amount updated to ${body.collected_amount} via Pathao webhook (${event})`,
      });
    }

    if (event === "order.paid") {
      const { data: orderRow } = await supabase
        .from("orders")
        .select("payment_reference")
        .eq("id", orderId)
        .maybeSingle();

      const invoiceId = body?.invoice_id ? String(body.invoice_id) : null;

      if (invoiceId) {
        const existing = orderRow?.payment_reference ?? "";
        const newRef = existing
          ? `${existing},${invoiceId}`
          : invoiceId;

        await supabase
          .from("orders")
          .update({ payment_status: "paid", payment_reference: newRef, updated_at: now })
          .eq("id", orderId);

        activityLogs.push({
          order_id: orderId,
          action: `Payment marked as paid with invoice ID ${invoiceId} via Pathao webhook`,
        });
      } else {
        await supabase
          .from("orders")
          .update({ payment_status: "paid", updated_at: now })
          .eq("id", orderId);

        activityLogs.push({
          order_id: orderId,
          action: `Payment marked as paid via Pathao webhook`,
        });
      }
    }

    if (activityLogs.length > 0) {
      await supabase.from("order_activity_log").insert(activityLogs);
    }

    return new Response(
      JSON.stringify({ status: 202, message: "Event received", data: null }),
      { status: 202, headers: responseHeaders }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
