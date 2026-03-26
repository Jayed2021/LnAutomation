import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function normalizePhone(raw: string): string | null {
  let phone = raw.replace(/\s+/g, "").replace(/-/g, "");
  if (phone.startsWith("+88")) phone = phone.slice(3);
  else if (phone.startsWith("88") && phone.length > 11) phone = phone.slice(2);
  if (!/^\d{11}$/.test(phone)) return null;
  return phone;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ success: false, error: "order_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: pathaoConfig, error: configErr } = await supabase
      .from("courier_configs")
      .select("is_enabled, base_url, credentials")
      .eq("courier_name", "pathao")
      .maybeSingle();

    if (configErr || !pathaoConfig) {
      return new Response(JSON.stringify({ success: false, error: "Pathao is not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pathaoConfig.is_enabled) {
      return new Response(JSON.stringify({ success: false, error: "Pathao integration is disabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creds = pathaoConfig.credentials as {
      client_id: string;
      client_secret: string;
      username: string;
      password: string;
      store_id: string;
    };

    if (!creds?.client_id || !creds?.client_secret || !creds?.username || !creds?.password || !creds?.store_id) {
      return new Response(JSON.stringify({ success: false, error: "Pathao credentials are incomplete" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id, woo_order_id, customer_note,
        customer:customers(full_name, phone_primary, address_line1)
      `)
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ success: false, error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customer = order.customer as { full_name: string; phone_primary: string; address_line1: string | null } | null;
    if (!customer) {
      return new Response(JSON.stringify({ success: false, error: "Order has no customer" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = normalizePhone(customer.phone_primary ?? "");
    if (!phone) {
      const errMsg = `Phone number '${customer.phone_primary}' could not be normalized to 11 digits`;
      await supabase.from("order_courier_info").update({
        courier_api_error: errMsg,
        updated_at: new Date().toISOString(),
      }).eq("order_id", order_id);
      await supabase.from("order_activity_log").insert({
        order_id,
        action: `Pathao automatic order creation failed: ${errMsg}`,
        performed_by: null,
      });
      return new Response(JSON.stringify({ success: false, error: errMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const address = customer.address_line1?.trim();
    if (!address) {
      const errMsg = "Customer has no delivery address";
      await supabase.from("order_courier_info").update({
        courier_api_error: errMsg,
        updated_at: new Date().toISOString(),
      }).eq("order_id", order_id);
      await supabase.from("order_activity_log").insert({
        order_id,
        action: `Pathao automatic order creation failed: ${errMsg}`,
        performed_by: null,
      });
      return new Response(JSON.stringify({ success: false, error: errMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_name, sku, quantity")
      .eq("order_id", order_id);

    const { data: courierInfo } = await supabase
      .from("order_courier_info")
      .select("total_receivable")
      .eq("order_id", order_id)
      .maybeSingle();

    const totalReceivable = courierInfo?.total_receivable ?? 0;

    const totalQty = (orderItems ?? []).reduce((sum: number, item: { quantity: number }) => sum + (item.quantity ?? 1), 0);
    const itemDescription = (orderItems ?? [])
      .map((item: { product_name: string; sku: string; quantity: number }) => {
        const parts: string[] = [];
        if (item.product_name) parts.push(item.product_name);
        if (item.sku) parts.push(`(${item.sku})`);
        parts.push(`x${item.quantity}`);
        return parts.join(" ");
      })
      .join(", ");

    const baseUrl = pathaoConfig.base_url!;

    const tokenRes = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        username: creds.username,
        password: creds.password,
        grant_type: "password",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      const errMsg = `Pathao auth failed: ${tokenData?.message || tokenData?.error || "Unknown error"}`;
      await supabase.from("order_courier_info").update({
        courier_api_error: errMsg,
        courier_api_response: tokenData,
        updated_at: new Date().toISOString(),
      }).eq("order_id", order_id);
      await supabase.from("order_activity_log").insert({
        order_id,
        action: `Pathao automatic order creation failed: ${errMsg}`,
        performed_by: null,
      });
      return new Response(JSON.stringify({ success: false, error: errMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = tokenData.access_token;

    const orderPayload: Record<string, unknown> = {
      store_id: parseInt(creds.store_id, 10),
      merchant_order_id: order.woo_order_id ? String(order.woo_order_id) : undefined,
      recipient_name: customer.full_name,
      recipient_phone: phone,
      recipient_address: address,
      delivery_type: 48,
      item_type: 2,
      item_quantity: totalQty || 1,
      item_weight: 0.5,
      item_description: itemDescription || undefined,
      amount_to_collect: Math.round(totalReceivable),
    };

    if (order.customer_note?.trim()) {
      orderPayload.special_instruction = order.customer_note.trim();
    }

    Object.keys(orderPayload).forEach(k => orderPayload[k] === undefined && delete orderPayload[k]);

    const createRes = await fetch(`${baseUrl}/aladdin/api/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      const errMsg = `Pathao order creation failed: ${createData?.message || createData?.error || createRes.status}`;
      await supabase.from("order_courier_info").update({
        courier_api_error: errMsg,
        courier_api_response: createData,
        updated_at: new Date().toISOString(),
      }).eq("order_id", order_id);
      await supabase.from("order_activity_log").insert({
        order_id,
        action: `Pathao automatic order creation failed: ${errMsg}`,
        performed_by: null,
      });
      return new Response(JSON.stringify({ success: false, error: errMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const consignmentId = createData?.consignment_id
      ? String(createData.consignment_id)
      : (createData?.data?.consignment_id ? String(createData.data.consignment_id) : null);

    await supabase.from("order_courier_info").update({
      consignment_id: consignmentId,
      tracking_number: consignmentId,
      courier_status: createData?.order_status ?? createData?.data?.order_status ?? "Pending",
      courier_status_updated_at: new Date().toISOString(),
      courier_api_response: createData,
      courier_api_error: null,
      updated_at: new Date().toISOString(),
    }).eq("order_id", order_id);

    await supabase.from("order_activity_log").insert({
      order_id,
      action: `Pathao order created automatically. Consignment: ${consignmentId}`,
      performed_by: null,
    });

    return new Response(JSON.stringify({ success: true, consignment_id: consignmentId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
