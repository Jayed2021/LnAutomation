import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FINAL_COURIER_STATUSES = new Set([
  "Delivered",
  "Return",
  "Delivery Failed",
  "Paid Return",
  "Exchange",
  "Partial Delivery",
]);

const CS_STATUS_ON_COURIER: Record<string, string> = {
  "Delivered": "delivered",
  "Return": "cancelled_cad",
  "Delivery Failed": "cancelled_cad",
  "Paid Return": "cancelled_cad",
};

async function getPathaoToken(baseUrl: string, creds: {
  client_id: string;
  client_secret: string;
  username: string;
  password: string;
}): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
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
    const data = await res.json();
    return data?.access_token ?? null;
  } catch {
    return null;
  }
}

async function fetchOrderStatus(
  baseUrl: string,
  accessToken: string,
  consignmentId: string
): Promise<{ order_status: string | null; error: string | null }> {
  try {
    const res = await fetch(
      `${baseUrl}/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`,
      { headers: { "Authorization": `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      return { order_status: null, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const status = data?.data?.order_status ?? data?.order_status ?? null;
    return { order_status: status, error: null };
  } catch (err) {
    return { order_status: null, error: String(err) };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry_run") === "true";
    const specificIds = url.searchParams.get("consignment_ids");
    const specificIdList = specificIds ? specificIds.split(",").map(s => s.trim()).filter(Boolean) : null;

    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["pathao_sync_enabled", "pathao_sync_interval_hours", "pathao_sync_lookback_days", "pathao_sync_last_run"]);

    const settingsMap: Record<string, unknown> = {};
    for (const row of settings ?? []) {
      settingsMap[row.key] = row.value;
    }

    const isEnabled = settingsMap["pathao_sync_enabled"] === true || settingsMap["pathao_sync_enabled"] === "true";
    const intervalHours = parseInt(String(settingsMap["pathao_sync_interval_hours"] ?? "1")) || 1;
    const lookbackDays = parseInt(String(settingsMap["pathao_sync_lookback_days"] ?? "14")) || 14;
    const lastRun = settingsMap["pathao_sync_last_run"];

    if (!specificIdList) {
      if (!isEnabled) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "pathao_sync_enabled is false" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (lastRun && lastRun !== "null" && lastRun !== null) {
        const lastRunDate = new Date(lastRun as string);
        const hoursSinceLastRun = (Date.now() - lastRunDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastRun < intervalHours) {
          return new Response(
            JSON.stringify({
              skipped: true,
              reason: `Next run in ${(intervalHours - hoursSinceLastRun).toFixed(1)}h (interval: ${intervalHours}h)`,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const { data: pathaoConfig } = await supabase
      .from("courier_configs")
      .select("is_enabled, base_url, credentials")
      .eq("courier_name", "pathao")
      .maybeSingle();

    if (!pathaoConfig?.is_enabled) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Pathao integration is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const creds = pathaoConfig.credentials as {
      client_id: string;
      client_secret: string;
      username: string;
      password: string;
    };

    if (!creds?.client_id || !creds?.client_secret || !creds?.username || !creds?.password) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Pathao credentials incomplete" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getPathaoToken(pathaoConfig.base_url!, creds);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Failed to obtain Pathao access token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let eligibleQuery = supabase
      .from("order_courier_info")
      .select("id, order_id, consignment_id, courier_status")
      .eq("courier_company", "Pathao")
      .not("consignment_id", "is", null);

    if (specificIdList) {
      eligibleQuery = eligibleQuery.in("consignment_id", specificIdList);
    } else {
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

      eligibleQuery = eligibleQuery
        .or(
          `courier_status.is.null,courier_status.not.in.(${[...FINAL_COURIER_STATUSES].join(",")})`
        )
        .gte("created_at", lookbackDate.toISOString());
    }

    const { data: eligible, error: eligibleErr } = await eligibleQuery;

    if (eligibleErr) {
      return new Response(
        JSON.stringify({ error: eligibleErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!eligible || eligible.length === 0) {
      if (!dryRun) {
        await supabase
          .from("app_settings")
          .update({ value: new Date().toISOString() })
          .eq("key", "pathao_sync_last_run");

        await supabase
          .from("app_settings")
          .update({ value: { checked: 0, updated: 0, unchanged: 0, partial_delivery_count: 0, errors: [] } })
          .eq("key", "pathao_sync_last_result");
      }

      return new Response(
        JSON.stringify({ checked: 0, updated: 0, unchanged: 0, partial_delivery_count: 0, errors: [], message: "No eligible orders to sync" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updated = 0;
    let unchanged = 0;
    let partialDeliveryCount = 0;
    const errors: { consignment_id: string; error: string }[] = [];
    const statuses: Record<string, string> = {};
    const now = new Date().toISOString();

    for (const row of eligible) {
      const { order_status, error: fetchErr } = await fetchOrderStatus(
        pathaoConfig.base_url!,
        accessToken,
        row.consignment_id!
      );

      if (fetchErr || !order_status) {
        errors.push({ consignment_id: row.consignment_id!, error: fetchErr ?? "No status returned" });
        continue;
      }

      statuses[row.consignment_id!] = order_status;

      if (order_status === row.courier_status) {
        unchanged++;
        continue;
      }

      if (!dryRun) {
        await supabase
          .from("order_courier_info")
          .update({
            courier_status: order_status,
            courier_status_updated_at: now,
            updated_at: now,
          })
          .eq("id", row.id);

        const activityLogs: { order_id: string; action: string; performed_by: null }[] = [
          {
            order_id: row.order_id,
            action: `Courier status updated to "${order_status}" via Pathao REST API sync (was "${row.courier_status ?? "unknown"}")`,
            performed_by: null,
          }
        ];

        const newCsStatus = CS_STATUS_ON_COURIER[order_status];
        if (newCsStatus) {
          await supabase
            .from("orders")
            .update({ cs_status: newCsStatus, updated_at: now })
            .eq("id", row.order_id);

          activityLogs.push({
            order_id: row.order_id,
            action: `CS status changed to "${newCsStatus}" via Pathao REST API sync`,
            performed_by: null,
          });
        }

        if (order_status === "Partial Delivery") {
          activityLogs.push({
            order_id: row.order_id,
            action: "Partial delivery confirmed by Pathao — CS status requires manual review",
            performed_by: null,
          });
        }

        await supabase.from("order_activity_log").insert(activityLogs);
      }

      if (order_status === "Partial Delivery") {
        partialDeliveryCount++;
      }

      updated++;
    }

    const result = {
      checked: eligible.length,
      updated,
      unchanged,
      partial_delivery_count: partialDeliveryCount,
      errors,
      statuses,
      dry_run: dryRun,
      timestamp: now,
    };

    if (!dryRun) {
      await supabase
        .from("app_settings")
        .update({ value: now })
        .eq("key", "pathao_sync_last_run");

      await supabase
        .from("app_settings")
        .update({ value: result })
        .eq("key", "pathao_sync_last_result");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
