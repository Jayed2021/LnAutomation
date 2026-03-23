import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function mapWooStatus(wooStatus: string): string {
  switch (wooStatus) {
    case "pending":
    case "processing":
    case "pending-payment":
    case "on-hold":
      return "new_not_called";
    case "completed":
      return "delivered";
    case "cancelled":
      return "cancelled";
    case "refunded":
      return "refund";
    default:
      return "new_not_called";
  }
}

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `ORD-${year}-${rand}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json();

    const wooOrderId = payload?.id;
    if (!wooOrderId) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook payload: missing order id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existing } = await supabase
      .from("orders")
      .select("id, cs_status")
      .eq("woo_order_id", wooOrderId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("orders")
        .update({
          woo_order_status: payload.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      return new Response(
        JSON.stringify({ message: "Order already exists, status updated", order_id: existing.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const billing = payload.billing || {};
    const fullName = [billing.first_name, billing.last_name].filter(Boolean).join(" ") || "Unknown Customer";
    const phone = billing.phone || "";
    const email = billing.email || "";
    const address = [billing.address_1, billing.address_2].filter(Boolean).join(", ");
    const city = billing.city || "";
    const district = billing.state || billing.city || "";

    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone_primary", phone)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: custErr } = await supabase
        .from("customers")
        .insert({
          full_name: fullName,
          email,
          phone_primary: phone,
          address_line1: address,
          city,
          district,
          woo_customer_id: payload.customer_id || null,
        })
        .select("id")
        .single();

      if (custErr) throw custErr;
      customerId = newCustomer.id;
    }

    const csStatus = mapWooStatus(payload.status);
    const subtotal = parseFloat(payload.subtotal || "0");
    const shippingFee = parseFloat(payload.shipping_total || "0");
    const discountAmount = parseFloat(payload.discount_total || "0");
    const totalAmount = parseFloat(payload.total || "0");
    const paymentMethod = payload.payment_method_title || payload.payment_method || "COD";

    let orderNumber = generateOrderNumber();
    let attempts = 0;
    while (attempts < 5) {
      const { data: numCheck } = await supabase
        .from("orders")
        .select("id")
        .eq("order_number", orderNumber)
        .maybeSingle();
      if (!numCheck) break;
      orderNumber = generateOrderNumber();
      attempts++;
    }

    const { data: newOrder, error: orderErr } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        woo_order_id: wooOrderId,
        woo_order_number: String(payload.number || wooOrderId),
        woo_order_status: payload.status,
        customer_id: customerId,
        order_date: payload.date_created || new Date().toISOString(),
        cs_status: csStatus,
        payment_method: paymentMethod,
        payment_status: payload.payment_method === "cod" ? "unpaid" : "paid",
        subtotal,
        shipping_fee: shippingFee,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        order_source: "website",
      })
      .select("id")
      .single();

    if (orderErr) throw orderErr;
    const orderId = newOrder.id;

    const lineItems = payload.line_items || [];
    if (lineItems.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, sku");

      const skuMap: Record<string, string> = {};
      for (const p of products || []) {
        skuMap[p.sku] = p.id;
      }

      const itemsToInsert = lineItems.map((item: any) => ({
        order_id: orderId,
        product_id: skuMap[item.sku] || null,
        sku: item.sku || item.name?.toLowerCase().replace(/\s+/g, "-") || "unknown",
        product_name: item.name || "Unknown Product",
        quantity: item.quantity || 1,
        unit_price: parseFloat(item.price || "0"),
        line_total: parseFloat(item.subtotal || "0"),
        woo_item_id: item.id || null,
      }));

      await supabase.from("order_items").insert(itemsToInsert);
    }

    await supabase.from("order_activity_log").insert({
      order_id: orderId,
      action: "Order created from WooCommerce webhook",
      performed_by: null,
    });

    return new Response(
      JSON.stringify({ message: "Order created successfully", order_id: orderId, order_number: orderNumber }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
