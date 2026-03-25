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

async function verifyHmacSignature(
  body: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader) return false;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(body);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const signatureBytes = new Uint8Array(signatureBuffer);
  const computedSignature = btoa(String.fromCharCode(...signatureBytes));

  return computedSignature === signatureHeader;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const rawBody = await req.text();

    const { data: wooConfig } = await supabase
      .from("woocommerce_config")
      .select("id, webhook_secret")
      .maybeSingle();

    if (wooConfig?.webhook_secret) {
      const signature = req.headers.get("X-WC-Webhook-Signature");
      const isValid = await verifyHmacSignature(rawBody, signature, wooConfig.webhook_secret);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: "Invalid webhook signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (wooConfig?.id) {
      await supabase
        .from("woocommerce_config")
        .update({ last_webhook_received_at: new Date().toISOString() })
        .eq("id", wooConfig.id);
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const couponLines = (payload.coupon_lines || []).map((c: any) => ({
      code: c.code || "",
      discount: c.discount || "0",
      discount_tax: c.discount_tax || "0",
    }));

    const feeLines = (payload.fee_lines || []).map((f: any) => ({
      name: f.name || "",
      amount: f.amount || f.total || "0",
      total: f.total || "0",
    }));

    const customerNote = (payload.customer_note || "").trim() || null;

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
        order_date: payload.date_created_gmt ? payload.date_created_gmt + "Z" : (payload.date_created || new Date().toISOString()),
        cs_status: csStatus,
        payment_method: paymentMethod,
        payment_status: payload.payment_method === "cod" ? "unpaid" : "paid",
        subtotal,
        shipping_fee: shippingFee,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        order_source: "website",
        coupon_lines: couponLines.length > 0 ? couponLines : null,
        fee_lines: feeLines.length > 0 ? feeLines : null,
        customer_note: customerNote,
      })
      .select("id")
      .single();

    if (orderErr) throw orderErr;
    const orderId = newOrder.id;

    const lineItems = payload.line_items || [];
    let hasPrescription = feeLines.some((f: any) => {
      const lower = (f.name || "").toLowerCase();
      return ["lens", "power", "anti-blue", "antiblue", "anti blue", "coating", "prescription", "rx"].some(kw => lower.includes(kw));
    });

    if (lineItems.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, sku, selling_price");

      const skuMap: Record<string, string> = {};
      const sellingPriceMap: Record<string, number> = {};
      for (const p of products || []) {
        skuMap[p.sku] = p.id;
        sellingPriceMap[p.sku] = p.selling_price ?? 0;
      }

      const itemsToInsert = lineItems.map((item: any) => {
        const rawMeta: Array<{ key: any; value: any }> = item.meta_data || [];
        const filteredMeta = rawMeta.filter((m) => typeof m.key === "string" && !m.key.startsWith("_"));
        if (filteredMeta.some((m: any) => {
          const k = (m.key || "").toLowerCase();
          const v = typeof m.value === "string" ? m.value.toLowerCase() : "";
          return k.includes("prescription") || k.includes("upload") || k.includes("rx") || v.includes("prescription");
        })) {
          hasPrescription = true;
        }
        const itemSubtotal = parseFloat(item.subtotal || "0");
        const itemTotal = parseFloat(item.total || "0");
        return {
          order_id: orderId,
          product_id: skuMap[item.sku] || null,
          sku: item.sku || item.name?.toLowerCase().replace(/\s+/g, "-") || "unknown",
          product_name: item.name || "Unknown Product",
          quantity: item.quantity || 1,
          unit_price: parseFloat(item.price || "0"),
          line_total: itemSubtotal,
          discount_amount: itemSubtotal - itemTotal,
          woo_item_id: item.id || null,
          meta_data: filteredMeta.length > 0 ? filteredMeta : null,
        };
      });

      const { data: insertedItems } = await supabase
        .from("order_items")
        .insert(itemsToInsert)
        .select("id, sku, unit_price");

      const insertedOrderItems: Array<{ id: string; sku: string; unit_price: number }> = insertedItems ?? [];

      const { data: pkgSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "default_packaging_materials")
        .maybeSingle();

      if (pkgSetting?.value && insertedOrderItems.length > 0) {
        try {
          const defaults = Array.isArray(pkgSetting.value) ? pkgSetting.value : JSON.parse(pkgSetting.value);
          if (defaults.length > 0) {
            const pkgRows: any[] = [];
            for (const orderItem of insertedOrderItems) {
              const systemPrice = sellingPriceMap[orderItem.sku];
              const unitPrice = (systemPrice != null && systemPrice > 0) ? systemPrice : (orderItem.unit_price ?? 0);
              for (const d of defaults) {
                const minPrice = d.min_price != null ? Number(d.min_price) : null;
                const maxPrice = d.max_price != null ? Number(d.max_price) : null;
                const meetsMin = minPrice === null || unitPrice >= minPrice;
                const meetsMax = maxPrice === null || unitPrice <= maxPrice;
                if (meetsMin && meetsMax) {
                  pkgRows.push({
                    order_id: orderId,
                    product_id: d.product_id || null,
                    sku: d.sku || "",
                    product_name: d.product_name || "",
                    quantity: d.quantity || 1,
                    unit_cost: d.unit_cost || 0,
                    line_total: (d.quantity || 1) * (d.unit_cost || 0),
                    source_order_item_id: orderItem.id,
                  });
                }
              }
            }
            if (pkgRows.length > 0) {
              await supabase.from("order_packaging_items").insert(pkgRows);
            }
          }
        } catch {}
      }
    }

    if (hasPrescription) {
      await supabase.from("orders").update({ has_prescription: true }).eq("id", orderId);
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
