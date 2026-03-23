import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WooRequestBody {
  action: "test-connection" | "fetch-products" | "fetch-products-page" | "fetch-orders" | "fetch-single-order" | "import-order" | "cancel-order" | "update-order-status";
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
  from_date?: string;
  min_order_id?: number;
  per_page?: number;
  page?: number;
  order_id?: number;
  order?: any;
  status?: string;
  note?: string;
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

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `ORD-${year}-${rand}`;
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
    const { data: products } = await supabase.from("products").select("id, sku");
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
    action: "Order imported from WooCommerce REST API",
    performed_by: null,
  });

  return { order_id: orderId, order_number: orderNumber, skipped: false };
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
      const { from_date, min_order_id, per_page = 100 } = body;
      const params: Record<string, string | number> = {
        per_page,
        status: "any",
      };
      if (from_date) params["after"] = from_date;
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
