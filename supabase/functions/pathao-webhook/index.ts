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

    if (consignmentId && courierStatus) {
      await supabase
        .from("order_courier_info")
        .update({
          courier_status: courierStatus,
          courier_status_updated_at: new Date().toISOString(),
        })
        .eq("consignment_id", consignmentId);
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
