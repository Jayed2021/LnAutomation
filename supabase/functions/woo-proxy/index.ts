import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WooRequestBody {
  action: "test-connection" | "fetch-products" | "fetch-products-page" | "fetch-orders" | "fetch-single-order" | "import-order" | "cancel-order" | "update-order-status" | "resync-order" | "sync-order-items" | "register-webhook" | "check-webhook" | "reactivate-webhook" | "delete-webhook";
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
  from_date?: string;
  to_date?: string;
  min_order_id?: number;
  per_page?: number;
  page?: number;
  order_id?: number;
  order?: any;
  status?: string;
  note?: string;
  internal_order_id?: string;
  line_items?: Array<{ product_id?: number; variation_id?: number; sku: string; name: string; quantity: number; price: string }>;
  removed_item_ids?: number[];
  webhook_url?: string;
  webhook_id?: number;
}

function buildAuthHeader(consumerKey: string, consumerSecret: string): string {
  return "Basic " + btoa(`${consumerKey}:${consumerSecret}`);
}

async function wooFetch(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<Response> {
  const url = new URL(`${storeUrl.replace(/\/$/, "")}/wp-json/wc/v3/${endpoint}`);
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, String(val));
  }
  return fetch(url.toString(), {
    headers: {
      Authorization: buildAuthHeader(consumerKey, consumerSecret),
      "Content-Type": "application/json",
    },
  });
}

async function fetchAllProducts(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<any[]> {
  const allProducts: any[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await wooFetch(storeUrl, consumerKey, consumerSecret, "products", {
      per_page: perPage,
      page,
      status: "publish",
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`WooCommerce API error (${res.status}): ${errText}`);
    }

    const products: any[] = await res.json();
    if (!products || products.length === 0) break;

    const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1", 10);

    for (const product of products) {
      if (product.type === "variable") {
        const varRes = await wooFetch(
          storeUrl,
          consumerKey,
          consumerSecret,
          `products/${product.id}/variations`,
          { per_page: 100 }
        );
        if (varRes.ok) {
          const variations: any[] = await varRes.json();
          for (const v of variations) {
            allProducts.push({
              ...v,
              _parent_id: product.id,
              _parent_name: product.name,
              _parent_image: product.images?.[0]?.src || null,
              _parent_categories: product.categories || [],
              type: "variation",
            });
          }
        }
      } else {
        allProducts.push(product);
      }
    }

    if (page >= totalPages) break;
    page++;
  }

  return allProducts;
}

async function fetchProductsPage(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
  page: number
): Promise<{ products: any[]; total_pages: number; total_products: number }> {
  const perPage = 100;

  const res = await wooFetch(storeUrl, consumerKey, consumerSecret, "products", {
    per_page: perPage,
    page,
    status: "publish",
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WooCommerce API error (${res.status}): ${errText}`);
  }

  const rawProducts: any[] = await res.json();
  const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1", 10);
  const totalProducts = parseInt(res.headers.get("X-WP-Total") || "0", 10);

  const expandedProducts: any[] = [];

  for (const product of rawProducts) {
    if (product.type === "variable") {
      const varRes = await wooFetch(
        storeUrl,
        consumerKey,
        consumerSecret,
        `products/${product.id}/variations`,
        { per_page: 100 }
      );
      if (varRes.ok) {
        const variations: any[] = await varRes.json();
        for (const v of variations) {
          expandedProducts.push({
            ...v,
            _parent_id: product.id,
            _parent_name: product.name,
            _parent_image: product.images?.[0]?.src || null,
            _parent_categories: product.categories || [],
            type: "variation",
          });
        }
      }
    } else {
      expandedProducts.push(product);
    }
  }

  return {
    products: expandedProducts,
    total_pages: totalPages,
    total_products: totalProducts,
  };
}

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

function isPrescriptionMeta(key: any): boolean {
  if (typeof key !== "string") return false;
  const lower = key.toLowerCase();
  return (
    lower.includes("prescription") ||
    lower.includes("upload") ||
    lower.includes("rx") ||
    lower.startsWith("pewc_group") ||
    lower.includes("power lens") ||
    lower.includes("lens brand") ||
    lower.includes("lens option") ||
    lower.includes("extra lens") ||
    lower.includes("need extra lens") ||
    lower.includes("power lens option") ||
    lower.includes("choose lens")
  );
}

const LENS_FEE_KEYWORDS = ["lens", "power", "anti-blue", "antiblue", "anti blue", "coating", "prescription", "rx"];

function isLensFee(name: any): boolean {
  if (typeof name !== "string") return false;
  const lower = name.toLowerCase();
  return LENS_FEE_KEYWORDS.some((kw) => lower.includes(kw));
}

function extractFeeLines(payload: any): Array<{ name: string; amount: string; total: string }> {
  const lines = payload.fee_lines || [];
  return lines.map((f: any) => ({
    name: f.name || "",
    amount: f.amount || f.total || "0",
    total: f.total || "0",
  }));
}

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `ORD-${year}-${rand}`;
}

function extractCouponLines(payload: any): Array<{ code: string; discount: string; discount_tax: string }> {
  const lines = payload.coupon_lines || [];
  return lines.map((c: any) => ({
    code: c.code || "",
    discount: c.discount || "0",
    discount_tax: c.discount_tax || "0",
  }));
}

async function importOrderToDb(supabase: any, payload: any): Promise<{ order_id: string; order_number: string; skipped: boolean }> {
  const wooOrderId = payload?.id;
  if (!wooOrderId) throw new Error("Invalid order payload: missing id");

  const { data: existing } = await supabase
    .from("orders")
    .select("id, cs_status, order_number")
    .eq("woo_order_id", wooOrderId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("orders")
      .update({ woo_order_status: payload.status, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    return { order_id: existing.id, order_number: existing.order_number, skipped: true };
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
  const couponLines = extractCouponLines(payload);
  const feeLines = extractFeeLines(payload);
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
  let hasPrescription = false;

  if (feeLines.some((f) => isLensFee(f.name))) {
    hasPrescription = true;
  }

  if (lineItems.length > 0) {
    const { data: products } = await supabase.from("products").select("id, sku, selling_price");
    const skuMap: Record<string, string> = {};
    const sellingPriceMap: Record<string, number> = {};
    for (const p of products || []) {
      skuMap[p.sku] = p.id;
      sellingPriceMap[p.sku] = p.selling_price ?? 0;
    }
    const itemsToInsert = lineItems.map((item: any) => {
      const rawMeta: Array<{ key: any; value: any }> = item.meta_data || [];
      const filteredMeta = rawMeta.filter((m) => typeof m.key === "string" && !m.key.startsWith("_"));
      if (filteredMeta.some((m) => isPrescriptionMeta(m.key) || isPrescriptionMeta(m.value))) {
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
    const { data: insertedItems } = await supabase.from("order_items").insert(itemsToInsert).select("id, sku, unit_price");
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

  const { data: storeProfile } = await supabase
    .from("store_profile")
    .select("preferred_courier")
    .limit(1)
    .maybeSingle();

  const preferredCourier = storeProfile?.preferred_courier || "pathao";

  await supabase.from("order_courier_info").insert({
    order_id: orderId,
    courier_company: preferredCourier,
  });

  await supabase.from("order_activity_log").insert({
    order_id: orderId,
    action: "Order imported from WooCommerce REST API",
    performed_by: null,
  });

  return { order_id: orderId, order_number: orderNumber, skipped: false };
}

async function resyncOrderFromWoo(
  supabase: any,
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
  internalOrderId: string
): Promise<{ success: boolean; message: string }> {
  const { data: order, error: orderFetchErr } = await supabase
    .from("orders")
    .select("id, woo_order_id, order_number")
    .eq("id", internalOrderId)
    .maybeSingle();

  if (orderFetchErr) throw orderFetchErr;
  if (!order) throw new Error("Order not found");
  if (!order.woo_order_id) throw new Error("Order has no WooCommerce ID — cannot re-sync");

  const res = await wooFetch(storeUrl, consumerKey, consumerSecret, `orders/${order.woo_order_id}`);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WooCommerce API error (${res.status}): ${errText}`);
  }

  const wooOrder = await res.json();
  const couponLines = extractCouponLines(wooOrder);
  const feeLines = extractFeeLines(wooOrder);
  const customerNote = (wooOrder.customer_note || "").trim() || null;

  let hasPrescription = feeLines.some((f) => isLensFee(f.name));

  const lineItems = wooOrder.line_items || [];
  for (const item of lineItems) {
    const rawMeta: Array<{ key: any; value: any }> = item.meta_data || [];
    const filteredMeta = rawMeta.filter((m) => typeof m.key === "string" && !m.key.startsWith("_"));
    if (filteredMeta.some((m) => isPrescriptionMeta(m.key) || isPrescriptionMeta(m.value))) {
      hasPrescription = true;
    }
    if (!item.id) continue;
    const itemSubtotal = parseFloat(item.subtotal || "0");
    const itemTotal = parseFloat(item.total || "0");
    await supabase
      .from("order_items")
      .update({
        line_total: itemSubtotal,
        discount_amount: itemSubtotal - itemTotal,
        unit_price: parseFloat(item.price || "0"),
      })
      .eq("order_id", internalOrderId)
      .eq("woo_item_id", item.id);
  }

  await supabase
    .from("orders")
    .update({
      coupon_lines: couponLines.length > 0 ? couponLines : null,
      fee_lines: feeLines.length > 0 ? feeLines : null,
      customer_note: customerNote,
      woo_order_status: wooOrder.status,
      has_prescription: hasPrescription || undefined,
    })
    .eq("id", internalOrderId);

  await supabase.from("order_activity_log").insert({
    order_id: internalOrderId,
    action: "Order data re-synced from WooCommerce",
    performed_by: null,
  });

  return { success: true, message: `Order ${order.order_number} re-synced successfully` };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: WooRequestBody = await req.json();
    const { action, store_url, consumer_key, consumer_secret } = body;

    if (!store_url || !consumer_key || !consumer_secret) {
      return new Response(
        JSON.stringify({ error: "Missing store_url, consumer_key or consumer_secret" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "test-connection") {
      const res = await wooFetch(store_url, consumer_key, consumer_secret, "system_status");
      if (res.ok) {
        const data = await res.json();
        return new Response(
          JSON.stringify({ connected: true, wc_version: data?.environment?.version || "unknown" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ connected: false, error: `HTTP ${res.status}: ${errText}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "fetch-products") {
      const products = await fetchAllProducts(store_url, consumer_key, consumer_secret);
      return new Response(
        JSON.stringify({ products, total: products.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "fetch-products-page") {
      const page = body.page ?? 1;
      const result = await fetchProductsPage(store_url, consumer_key, consumer_secret, page);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "fetch-orders") {
      const { from_date, to_date, min_order_id, per_page = 100 } = body;
      const params: Record<string, string | number> = {
        per_page,
        status: "any",
      };
      if (from_date) params["after"] = from_date;
      if (to_date) params["before"] = to_date;
      if (min_order_id) params["offset"] = 0;

      const allOrders: any[] = [];
      let page = 1;

      while (true) {
        const res = await wooFetch(store_url, consumer_key, consumer_secret, "orders", {
          ...params,
          page,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`WooCommerce API error (${res.status}): ${errText}`);
        }

        const orders: any[] = await res.json();
        if (!orders || orders.length === 0) break;

        const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1", 10);

        const filtered = min_order_id
          ? orders.filter((o: any) => o.id > min_order_id)
          : orders;

        allOrders.push(...filtered);
        if (page >= totalPages) break;
        page++;
      }

      return new Response(
        JSON.stringify({ orders: allOrders, total: allOrders.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "fetch-single-order") {
      const { order_id } = body;
      if (!order_id) {
        return new Response(
          JSON.stringify({ error: "order_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const res = await wooFetch(store_url, consumer_key, consumer_secret, `orders/${order_id}`);
      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ error: `HTTP ${res.status}: ${errText}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const order = await res.json();
      return new Response(
        JSON.stringify({ order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "import-order") {
      const { order } = body;
      if (!order) {
        return new Response(
          JSON.stringify({ error: "order payload is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const result = await importOrderToDb(supabase, order);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "resync-order") {
      const { internal_order_id } = body;
      if (!internal_order_id) {
        return new Response(
          JSON.stringify({ error: "internal_order_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const result = await resyncOrderFromWoo(supabase, store_url, consumer_key, consumer_secret, internal_order_id);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "cancel-order") {
      const { order_id, note } = body;
      if (!order_id) {
        return new Response(
          JSON.stringify({ error: "order_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const url = new URL(`${store_url.replace(/\/$/, "")}/wp-json/wc/v3/orders/${order_id}`);
      const payload: any = { status: "cancelled" };
      if (note) payload.customer_note = note;
      const res = await fetch(url.toString(), {
        method: "PUT",
        headers: {
          Authorization: buildAuthHeader(consumer_key, consumer_secret),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ error: `HTTP ${res.status}: ${errText}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const updated = await res.json();
      return new Response(
        JSON.stringify({ order: updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update-order-status") {
      const { order_id, status } = body;
      if (!order_id || !status) {
        return new Response(
          JSON.stringify({ error: "order_id and status are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const url = new URL(`${store_url.replace(/\/$/, "")}/wp-json/wc/v3/orders/${order_id}`);
      const res = await fetch(url.toString(), {
        method: "PUT",
        headers: {
          Authorization: buildAuthHeader(consumer_key, consumer_secret),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ error: `HTTP ${res.status}: ${errText}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const updated = await res.json();
      return new Response(
        JSON.stringify({ order: updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync-order-items") {
      const { internal_order_id, line_items, removed_item_ids } = body;
      if (!internal_order_id) {
        return new Response(
          JSON.stringify({ error: "internal_order_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const { data: order, error: orderFetchErr } = await supabase
        .from("orders")
        .select("id, woo_order_id, order_number")
        .eq("id", internal_order_id)
        .maybeSingle();

      if (orderFetchErr) throw orderFetchErr;
      if (!order) throw new Error("Order not found");
      if (!order.woo_order_id) throw new Error("Order has no WooCommerce ID — cannot sync items");

      const wooPayload: any = {};

      if (line_items && line_items.length > 0) {
        wooPayload.line_items = line_items;
      }

      if (removed_item_ids && removed_item_ids.length > 0) {
        const removeItems = removed_item_ids.map((id: number) => ({ id, quantity: 0 }));
        wooPayload.line_items = [...(wooPayload.line_items || []), ...removeItems];
      }

      if (!wooPayload.line_items || wooPayload.line_items.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No item changes to sync" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const url = new URL(`${store_url.replace(/\/$/, "")}/wp-json/wc/v3/orders/${order.woo_order_id}`);
      const res = await fetch(url.toString(), {
        method: "PUT",
        headers: {
          Authorization: buildAuthHeader(consumer_key, consumer_secret),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(wooPayload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`WooCommerce API error (${res.status}): ${errText}`);
      }

      await supabase.from("order_activity_log").insert({
        order_id: internal_order_id,
        action: "Order items synced back to WooCommerce",
        performed_by: null,
      });

      return new Response(
        JSON.stringify({ success: true, message: `Order ${order.order_number} items synced to WooCommerce` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "register-webhook") {
      const { webhook_url } = body;
      if (!webhook_url) {
        return new Response(
          JSON.stringify({ error: "webhook_url is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const topics = ["order.created", "order.updated"];
      const registeredWebhooks: any[] = [];

      for (const topic of topics) {
        const res = await fetch(`${store_url.replace(/\/$/, "")}/wp-json/wc/v3/webhooks`, {
          method: "POST",
          headers: {
            Authorization: buildAuthHeader(consumer_key, consumer_secret),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `ERP - ${topic}`,
            topic,
            delivery_url: webhook_url,
            secret,
            status: "active",
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          return new Response(
            JSON.stringify({ error: `Failed to register webhook for ${topic}: ${errText}` }),
            { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const webhook = await res.json();
        registeredWebhooks.push(webhook);
      }

      const primaryWebhook = registeredWebhooks[0];
      await supabase
        .from("woocommerce_config")
        .update({
          webhook_id: primaryWebhook.id,
          webhook_status: "active",
          webhook_secret: secret,
        })
        .eq("store_url", store_url);

      return new Response(
        JSON.stringify({ success: true, webhooks: registeredWebhooks, secret }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check-webhook") {
      const { webhook_id } = body;
      if (!webhook_id) {
        return new Response(
          JSON.stringify({ error: "webhook_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const res = await wooFetch(store_url, consumer_key, consumer_secret, `webhooks/${webhook_id}`);
      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ error: `HTTP ${res.status}: ${errText}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const webhook = await res.json();

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await supabase
        .from("woocommerce_config")
        .update({ webhook_status: webhook.status })
        .eq("store_url", store_url);

      return new Response(
        JSON.stringify({ webhook }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reactivate-webhook") {
      const { webhook_id } = body;
      if (!webhook_id) {
        return new Response(
          JSON.stringify({ error: "webhook_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const url = new URL(`${store_url.replace(/\/$/, "")}/wp-json/wc/v3/webhooks/${webhook_id}`);
      const res = await fetch(url.toString(), {
        method: "PUT",
        headers: {
          Authorization: buildAuthHeader(consumer_key, consumer_secret),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ error: `HTTP ${res.status}: ${errText}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const webhook = await res.json();

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await supabase
        .from("woocommerce_config")
        .update({ webhook_status: "active" })
        .eq("store_url", store_url);

      return new Response(
        JSON.stringify({ webhook }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete-webhook") {
      const { webhook_id } = body;
      if (!webhook_id) {
        return new Response(
          JSON.stringify({ error: "webhook_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const url = new URL(`${store_url.replace(/\/$/, "")}/wp-json/wc/v3/webhooks/${webhook_id}`);
      url.searchParams.set("force", "true");
      const res = await fetch(url.toString(), {
        method: "DELETE",
        headers: { Authorization: buildAuthHeader(consumer_key, consumer_secret) },
      });
      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ error: `HTTP ${res.status}: ${errText}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await supabase
        .from("woocommerce_config")
        .update({ webhook_id: null, webhook_status: null, webhook_secret: null })
        .eq("store_url", store_url);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
