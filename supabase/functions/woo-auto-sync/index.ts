import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: config, error: configErr } = await supabase
      .from("woocommerce_config")
      .select("id, store_url, consumer_key, consumer_secret, auto_sync_enabled, sync_interval_minutes, last_order_sync")
      .maybeSingle();

    if (configErr) throw new Error(`Failed to load woocommerce_config: ${configErr.message}`);

    if (!config) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No WooCommerce config found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.auto_sync_enabled) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Auto sync is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.store_url || !config.consumer_key || !config.consumer_secret) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "WooCommerce credentials not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: logRow } = await supabase
      .from("woo_sync_log")
      .insert({ sync_type: "orders", status: "running" })
      .select("id")
      .maybeSingle();

    let minOrderId: number | null = null;

    const { data: lastImported } = await supabase
      .from("orders")
      .select("woo_order_id")
      .not("woo_order_id", "is", null)
      .order("woo_order_id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastImported?.woo_order_id) {
      minOrderId = lastImported.woo_order_id;
    }

    const wooProxyUrl = `${supabaseUrl}/functions/v1/woo-proxy`;

    const fetchBody: Record<string, unknown> = {
      action: "fetch-orders",
      store_url: config.store_url,
      consumer_key: config.consumer_key,
      consumer_secret: config.consumer_secret,
    };

    if (minOrderId) {
      fetchBody.min_order_id = minOrderId;
    } else {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      fetchBody.from_date = since.toISOString();
    }

    const fetchRes = await fetch(wooProxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(fetchBody),
    });

    if (!fetchRes.ok) {
      const errText = await fetchRes.text();
      throw new Error(`woo-proxy fetch-orders failed (${fetchRes.status}): ${errText}`);
    }

    const fetchData = await fetchRes.json();
    if (fetchData.error) throw new Error(`woo-proxy error: ${fetchData.error}`);

    const orders: any[] = fetchData.orders || [];
    let imported = 0;
    let skipped = 0;

    for (const order of orders) {
      try {
        const importRes = await fetch(wooProxyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            action: "import-order",
            store_url: config.store_url,
            consumer_key: config.consumer_key,
            consumer_secret: config.consumer_secret,
            order,
          }),
        });

        if (importRes.ok) {
          const result = await importRes.json();
          if (result.skipped) {
            skipped++;
          } else if (result.order_id) {
            imported++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }

    await supabase
      .from("woocommerce_config")
      .update({ last_order_sync: new Date().toISOString() })
      .eq("id", config.id);

    if (logRow?.id) {
      await supabase
        .from("woo_sync_log")
        .update({
          completed_at: new Date().toISOString(),
          status: "success",
          records_synced: imported,
        })
        .eq("id", logRow.id);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        fetched: orders.length,
        imported,
        skipped,
        min_order_id_used: minOrderId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
