import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order_id") || url.searchParams.get("id");

    let bodyOrderId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        bodyOrderId = body?.order_id ?? body?.id ?? null;
      } catch {
        // ignore
      }
    }

    const lookupId = orderId ?? bodyOrderId;

    if (!lookupId) {
      return new Response(
        JSON.stringify({ success: false, error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        woo_order_id,
        total_amount,
        cs_status,
        customers(full_name, phone_primary),
        order_items(product_name, sku, quantity, unit_price),
        order_courier_info(courier_company, tracking_number, courier_status)
      `)
      .eq("id", lookupId)
      .maybeSingle();

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
    const courier = Array.isArray(order.order_courier_info) ? order.order_courier_info[0] : order.order_courier_info;
    const items = (order.order_items ?? []) as Array<{
      product_name: string;
      sku: string;
      quantity: number;
      unit_price: number;
    }>;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          order_id: order.id,
          order_number: order.order_number,
          woo_order_id: order.woo_order_id,
          customer_name: customer?.full_name ?? null,
          phone: customer?.phone_primary ?? null,
          order_total: order.total_amount,
          cs_status: order.cs_status,
          items: items.map(i => ({
            product_name: i.product_name,
            sku: i.sku,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
          courier_company: courier?.courier_company ?? null,
          tracking_number: courier?.tracking_number ?? null,
          courier_status: courier?.courier_status ?? null,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
