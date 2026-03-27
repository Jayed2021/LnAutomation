import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const NEW_STATUSES = [
  "new_not_called",
  "new_called",
  "awaiting_payment",
  "late_delivery",
  "send_to_lab",
  "in_lab",
  "not_printed",
];

interface CsAssignment {
  user_id: string;
  allocation_percentage: number;
  is_active: boolean;
}

interface DistributeResult {
  agentId: string;
  count: number;
}

function buildSequence(assignments: CsAssignment[]): string[] {
  const active = assignments.filter(
    (a) => a.is_active && a.allocation_percentage > 0
  );
  if (active.length === 0) return [];
  const seq: string[] = [];
  for (const a of active) {
    for (let i = 0; i < a.allocation_percentage; i++) {
      seq.push(a.user_id);
    }
  }
  return seq;
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

    // Check if auto distribution is enabled
    const { data: enabledRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "auto_distribution_enabled")
      .maybeSingle();

    const enabled = enabledRow?.value === true || enabledRow?.value === "true";
    if (!enabled) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "auto_distribution_enabled is false" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load active CS assignments
    const { data: assignments, error: assignErr } = await supabase
      .from("cs_assignments")
      .select("user_id, allocation_percentage, is_active")
      .eq("is_active", true);

    if (assignErr) throw assignErr;

    const seq = buildSequence(assignments ?? []);
    if (seq.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No active CS agents with allocation configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalPct = (assignments ?? [])
      .filter((a) => a.is_active)
      .reduce((sum, a) => sum + a.allocation_percentage, 0);

    if (totalPct !== 100) {
      return new Response(
        JSON.stringify({ skipped: true, reason: `Allocations sum to ${totalPct}%, must be 100%` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get today's date range (UTC)
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);

    // Fetch unassigned orders from today
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("id")
      .is("assigned_to", null)
      .in("cs_status", NEW_STATUSES)
      .gte("order_date", todayStart.toISOString())
      .lte("order_date", todayEnd.toISOString())
      .order("order_date", { ascending: true });

    if (ordersErr) throw ordersErr;
    if (!orders || orders.length === 0) {
      await supabase
        .from("app_settings")
        .update({ value: new Date().toISOString() })
        .eq("key", "auto_distribution_last_run");

      return new Response(
        JSON.stringify({ assigned: 0, message: "No unassigned orders found for today" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current counter offset
    const { data: counterRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "cs_assignment_counter")
      .maybeSingle();

    const offset = parseInt(String(counterRow?.value ?? "0")) || 0;

    // Build assignment map
    const updates: { id: string; assigned_to: string }[] = orders.map(
      (order, idx) => ({
        id: order.id,
        assigned_to: seq[(offset + idx) % seq.length],
      })
    );

    // Batch update orders using individual updates (Supabase doesn't support
    // batch updates with different values per row in a single call)
    const resultMap = new Map<string, number>();
    const updatePromises = updates.map((upd) => {
      resultMap.set(upd.assigned_to, (resultMap.get(upd.assigned_to) ?? 0) + 1);
      return supabase
        .from("orders")
        .update({ assigned_to: upd.assigned_to })
        .eq("id", upd.id);
    });
    await Promise.all(updatePromises);

    // Insert activity logs in a single batch
    const activityLogs = updates.map((upd) => ({
      order_id: upd.id,
      action: "Order auto-assigned to CS agent by scheduled distribution",
      performed_by: null as string | null,
    }));
    if (activityLogs.length > 0) {
      await supabase.from("order_activity_log").insert(activityLogs);
    }

    // Advance counter and update last_run
    const newCounter = (offset + orders.length) % seq.length;
    await Promise.all([
      supabase
        .from("app_settings")
        .update({ value: String(newCounter) })
        .eq("key", "cs_assignment_counter"),
      supabase
        .from("app_settings")
        .update({ value: new Date().toISOString() })
        .eq("key", "auto_distribution_last_run"),
    ]);

    const results: DistributeResult[] = [];
    for (const [agentId, count] of resultMap) {
      results.push({ agentId, count });
    }
    results.sort((a, b) => b.count - a.count);

    return new Response(
      JSON.stringify({
        assigned: orders.length,
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("auto-distribute-orders error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
