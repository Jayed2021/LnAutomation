import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WooRequestBody {
  action: "test-connection" | "fetch-products" | "fetch-products-page" | "fetch-orders";
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
  from_date?: string;
  min_order_id?: number;
  per_page?: number;
  page?: number;
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
