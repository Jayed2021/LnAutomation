import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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

    const incomingSecret = req.headers.get("X-Pathao-Merchant-Webhook-Integration-Secret");
    if (!incomingSecret || incomingSecret !== configRow.webhook_secret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    const consignmentId = body?.consignment_id ?? body?.data?.consignment_id ?? null;
    const courierStatus = body?.order_status ?? body?.data?.order_status ?? body?.status ?? null;

    if (consignmentId && courierStatus) {
      await supabase
        .from("order_courier_info")
        .update({
          courier_status: String(courierStatus),
          courier_status_updated_at: new Date().toISOString(),
        })
        .eq("consignment_id", String(consignmentId));
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
