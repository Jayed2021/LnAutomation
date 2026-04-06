import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-API-Key",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: secretRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "order_lookup_api_secret")
      .maybeSingle();

    const storedSecret = secretRow?.value ? String(secretRow.value) : null;

    if (storedSecret) {
      const urlForAuth = new URL(req.url);
      const providedKey =
        req.headers.get("X-API-Key") ??
        req.headers.get("x-api-key") ??
        urlForAuth.searchParams.get("api_key");

      if (!providedKey || providedKey !== storedSecret) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const url = new URL(req.url);

    let bodyParams: Record<string, string | null> = {};
    if (req.method === "POST") {
      try {
        const body = await req.json();
        bodyParams = {
          order_id: body?.order_id ?? body?.id ?? null,
          woo_order_id: body?.woo_order_id ?? null,
          order_number: body?.order_number ?? null,
          phone: body?.phone ?? null,
        };
      } catch {
        // ignore parse errors
      }
    }

    const phone =
      url.searchParams.get("phone") ?? bodyParams.phone ?? null;

    if (phone) {
      return await handlePhoneLookup(supabase, phone);
    }

    const rawOrderId =
      url.searchParams.get("order_id") ??
      url.searchParams.get("id") ??
      bodyParams.order_id ??
      null;

    const rawWooId =
      url.searchParams.get("woo_order_id") ?? bodyParams.woo_order_id ?? null;

    const rawOrderNumber =
      url.searchParams.get("order_number") ?? bodyParams.order_number ?? null;

    const isNumeric = (v: string) => /^\d+$/.test(v.trim());

    let lookupField: "id" | "woo_order_id" | "order_number" | null = null;
    let lookupValue: string | number | null = null;

    if (rawWooId) {
      lookupField = "woo_order_id";
      lookupValue = parseInt(rawWooId, 10);
    } else if (rawOrderNumber) {
      lookupField = "order_number";
      lookupValue = rawOrderNumber;
    } else if (rawOrderId) {
      if (isNumeric(rawOrderId)) {
        lookupField = "woo_order_id";
        lookupValue = parseInt(rawOrderId, 10);
      } else {
        lookupField = "id";
        lookupValue = rawOrderId;
      }
    }

    if (!lookupField || lookupValue === null) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "A lookup parameter is required: order_id, woo_order_id, order_number, or phone",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        woo_order_id,
        total_amount,
        cs_status,
        payment_status,
        order_date,
        customers(full_name, phone_primary),
        order_items(product_name, sku, quantity, unit_price),
        order_courier_info(courier_company, tracking_number, courier_status)
      `)
      .eq(lookupField, lookupValue as string)
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
        type: "order",
        data: {
          order_id: order.id,
          order_number: order.order_number,
          woo_order_id: order.woo_order_id,
          order_date: order.order_date,
          customer_name: customer?.full_name ?? null,
          phone: customer?.phone_primary ?? null,
          order_total: order.total_amount,
          payment_status: order.payment_status,
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

async function handlePhoneLookup(
  supabase: ReturnType<typeof createClient>,
  phone: string
) {
  const normalised = phone.trim();

  const { data: customers, error: custError } = await supabase
    .from("customers")
    .select("id, full_name, phone_primary, phone_secondary")
    .or(`phone_primary.eq.${normalised},phone_secondary.eq.${normalised}`)
    .limit(10);

  if (custError) {
    return new Response(
      JSON.stringify({ success: false, error: custError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!customers || customers.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: "No customer found with that phone number" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const customerIds = customers.map((c) => c.id);

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      woo_order_id,
      order_date,
      total_amount,
      payment_status,
      cs_status,
      customer_id,
      order_courier_info(courier_company, tracking_number, courier_status)
    `)
    .in("customer_id", customerIds)
    .order("order_date", { ascending: false })
    .limit(50);

  if (ordersError) {
    return new Response(
      JSON.stringify({ success: false, error: ordersError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const result = (orders ?? []).map((o) => {
    const cust = customerMap.get(o.customer_id);
    const courier = Array.isArray(o.order_courier_info)
      ? o.order_courier_info[0]
      : o.order_courier_info;
    return {
      order_id: o.id,
      order_number: o.order_number,
      woo_order_id: o.woo_order_id,
      order_date: o.order_date,
      order_total: o.total_amount,
      payment_status: o.payment_status,
      cs_status: o.cs_status,
      customer_name: cust?.full_name ?? null,
      phone_primary: cust?.phone_primary ?? null,
      courier_company: courier?.courier_company ?? null,
      tracking_number: courier?.tracking_number ?? null,
      courier_status: courier?.courier_status ?? null,
    };
  });

  return new Response(
    JSON.stringify({
      success: true,
      type: "phone_lookup",
      phone: normalised,
      customer_count: customers.length,
      order_count: result.length,
      orders: result,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
